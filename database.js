const { Pool } = require('pg');
require("dotenv").config();


const pool = new Pool({
    host: process.env.HOST,
    user: process.env.USER,
    port: process.env.DB_PORT,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    //ssl: true
})

module.exports = pool