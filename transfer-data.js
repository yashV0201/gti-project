const { Pool } = require('pg');
const fs = require('fs');
const { from: copyFrom, to: copyTo } = require('pg-copy-streams');
require('dotenv').config();
// Old (source) database configuration
const sourcePool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'gtiDB',
    password: 'alohmora',
    port: 5432,
});

// New (destination) database configuration
const destPool = new Pool({
     user:process.env.DB_USER_1,
    host:process.env.DB_HOST_1,
    database:process.env.DB_NAME_1,
    password:process.env.DB_PASS_1,
    port:process.env.DB_PORT_1,
    ssl: {
        // rejectUnauthorized: false
        ca:fs.readFileSync('ca.pem').toString()
    }
});

async function setupAutoIncrementColumns(tableName, destClient) {
    try {
        // Get primary key information
        const pkQuery = `
            SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = '${tableName}'::regclass
            AND i.indisprimary;
        `;
        const { rows: pks } = await destClient.query(pkQuery);
        
        if (pks.length > 0) {
            const pkColumn = pks[0].attname;
            
            // Check if the column is already set up as SERIAL or IDENTITY
            const seqQuery = `
                SELECT pg_get_serial_sequence('${tableName}', '${pkColumn}') AS seq_name;
            `;
            const { rows: seqRows } = await destClient.query(seqQuery);
            
            if (!seqRows[0].seq_name) {
                // Create a sequence and set it up for the primary key
                console.log(`Setting up auto-increment for ${tableName}.${pkColumn}`);
                
                // Create sequence
                await destClient.query(`
                    CREATE SEQUENCE IF NOT EXISTS ${tableName}_${pkColumn}_seq
                    OWNED BY ${tableName}.${pkColumn};
                `);
                
                // Set default value to use the sequence
                await destClient.query(`
                    ALTER TABLE ${tableName} 
                    ALTER COLUMN ${pkColumn} SET DEFAULT nextval('${tableName}_${pkColumn}_seq');
                `);
                
                // Set the sequence to start after the maximum value
                await destClient.query(`
                    SELECT setval('${tableName}_${pkColumn}_seq', 
                                 (SELECT COALESCE(MAX(${pkColumn}), 0) FROM ${tableName}), true);
                `);
            }
        }
    } catch (error) {
        console.error(`Error setting up auto-increment for ${tableName}:`, error);
    }
}

async function transferTable(tableName) {
    console.log(`Transferring table: ${tableName}`);
    
    const sourceClient = await sourcePool.connect();
    const destClient = await destPool.connect();
    
    try {
        // Get table structure
        const structureQuery = `
            SELECT column_name, data_type, character_maximum_length, is_nullable, 
                   column_default, is_identity
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `;
        const { rows: columns } = await sourceClient.query(structureQuery, [tableName]);
        
        // Get primary key information
        const pkQuery = `
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = '${tableName}'::regclass
            AND i.indisprimary;
        `;
        const { rows: pks } = await sourceClient.query(pkQuery);
        const pkColumns = pks.map(pk => pk.attname);
        
        // Create table in destination database if it doesn't exist
        let createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (`;
        
        columns.forEach((col, idx) => {
            let type = col.data_type;
            if (col.character_maximum_length) {
                type = `${type}(${col.character_maximum_length})`;
            }
            
            // Handle identity/serial columns
            if (pkColumns.includes(col.column_name) && col.column_name === 'id') {
                createTableQuery += `${col.column_name} SERIAL PRIMARY KEY`;
            } else {
                createTableQuery += `${col.column_name} ${type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`;
            }
            
            if (idx < columns.length - 1) {
                createTableQuery += ', ';
            }
        });
        
        createTableQuery += `);`;
        await destClient.query(createTableQuery);
        
        // Set up auto-increment for primary key columns
        await setupAutoIncrementColumns(tableName, destClient);
        
        // Get column names for the INSERT statement
        const columnNames = columns.map(col => col.column_name).join(', ');
        
        // Get data from source
        const { rows: data } = await sourceClient.query(`SELECT * FROM ${tableName};`);
        
        if (data.length > 0) {
            // For tables with identity/serial columns, use a different approach
            if (pkColumns.includes('id')) {
                // Clear existing data
                await destClient.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
                
                // Special handling for design_methods table to avoid encoding issues
                if (tableName === 'design_methods') {
                    for (const row of data) {
                        try {
                            // Use parameterized query to avoid encoding issues
                            const placeholders = columns.map((_, i) => `$${i+1}`).join(', ');
                            const params = columns.map(col => row[col.column_name]);
                            
                            await destClient.query(
                                `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
                                params
                            );
                        } catch (err) {
                            console.error(`Error inserting row into ${tableName}, skipping: ${err.message}`);
                        }
                    }
                } else {
                    // Insert data row by row for tables with ID columns
                    for (const row of data) {
                        const values = columns.map(col => {
                            if (row[col.column_name] === null) return 'NULL';
                            if (typeof row[col.column_name] === 'string') {
                                return `'${row[col.column_name].replace(/'/g, "''")}'`;
                            }
                            return row[col.column_name];
                        }).join(', ');
                        
                        try {
                            await destClient.query(`INSERT INTO ${tableName} (${columnNames}) VALUES (${values});`);
                        } catch (err) {
                            console.error(`Error inserting row into ${tableName}:`, err);
                        }
                    }
                }
                
                // Reset sequence
                if (pkColumns.includes('id')) {
                    await destClient.query(`
                        SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 
                                     (SELECT COALESCE(MAX(id), 0) FROM ${tableName}), true);
                    `);
                }
            } else {
                // For tables without identity columns, we can use COPY
                // Use a temporary file for the data transfer
                const tempFile = `${tableName}_temp.csv`;
                
                // Export data from source to file
                await new Promise((resolve, reject) => {
                    const outputStream = fs.createWriteStream(tempFile);
                    const sourceStream = sourceClient.query(copyTo(`COPY ${tableName} TO STDOUT WITH CSV HEADER`));
                    
                    sourceStream.on('error', reject);
                    outputStream.on('error', reject);
                    outputStream.on('finish', resolve);
                    
                    sourceStream.pipe(outputStream);
                });
                
                // Import data from file to destination
                await new Promise((resolve, reject) => {
                    const inputStream = fs.createReadStream(tempFile);
                    const destStream = destClient.query(copyFrom(`COPY ${tableName} FROM STDIN WITH CSV HEADER`));
                    
                    destStream.on('error', reject);
                    destStream.on('finish', resolve);
                    
                    inputStream.pipe(destStream);
                });
                
                // Clean up
                fs.unlinkSync(tempFile);
            }
        }
        
        console.log(`Completed transfer of table: ${tableName}`);
    } catch (error) {
        console.error(`Error transferring table ${tableName}:`, error);
        throw error;
    } finally {
        sourceClient.release();
        destClient.release();
    }
}

async function transferData() {
    try {
        // Get list of tables from source database
        const sourceClient = await sourcePool.connect();
        const tableListQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;
        const { rows: tables } = await sourceClient.query(tableListQuery);
        sourceClient.release();
        
        // Transfer each table sequentially
        for (const { table_name } of tables) {
            await transferTable(table_name);
        }
        
        console.log('Data transfer completed successfully');
    } catch (error) {
        console.error('Error during data transfer:', error);
    } finally {
        await sourcePool.end();
        await destPool.end();
    }
}

transferData();
