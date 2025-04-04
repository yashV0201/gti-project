const pool = require('./db')
const bcrypt = require('bcrypt');

// async function createUsersTable() {
//     // Define your SQL query: Create the table if it doesn't exist.
//     const createTableQuery = `
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         username VARCHAR(255) NOT NULL UNIQUE,
//         password VARCHAR(255) NOT NULL,
//         role VARCHAR(50) DEFAULT 'user'
//       );
//     `;
  
//     try {
//       // Execute the query
//       await pool.query(createTableQuery);
//       console.log('Users table created successfully');
//     } catch (err) {
//       console.error('Error creating users table:', err.message);
//     } finally {
//       // Close the connection pool to release resources.
//       await pool.end();
//     }
// }

// createUsersTable();

async function insertAdminUser() {
    // Define the default admin credentials directly in the function.
    const username = 'mayank';
    const plainPassword = 'pass@123';
    
    try {
    // Hash the plain password using bcrypt.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    
    // Define the query to insert an admin user.
    const queryText = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, 'admin')
      RETURNING id
    `;
    
    // Execute the query with the provided values.
    const result = await pool.query(queryText, [username, hashedPassword]);
    
    console.log(`Admin user inserted with id: ${result.rows.id}`);
    } catch (err) {
    console.error('Error inserting admin user:', err.message);
    } finally {
    // Close the connection pool.
    await pool.end();
    }
}

insertAdminUser();
