const fs = require('fs');
const {Pool} = require('pg')
require('dotenv').config();

// const pool = new Pool({
//     user:'postgres',
//     host: 'localhost',
//     database: 'gtiDB',
//     password: 'alohmora',
//     port: 5432,

// })

const pool = new Pool({
    user:process.env.DB_USER_1,
    host:process.env.DB_HOST_1,
    database:process.env.DB_NAME_1,
    password:process.env.DB_PASS_1,
    port:process.env.DB_PORT_1,
    ssl: {
        // rejectUnauthorized: false
        ca:fs.readFileSync('ca.pem').toString()
    }

})




module.exports = pool;