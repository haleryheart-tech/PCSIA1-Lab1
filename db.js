/**
 * MySQL connection pool for the TESDA STVET Portal.
 * ---------------------------------------------------------
 * server.js imports `pool` from here and runs queries with
 * `pool.query(...)` / `pool.execute(...)`, both of which return
 * promises (mysql2/promise), so route handlers can just `await` them.
 *
 * Connection details come from a .env file (see .env.example) that is
 * git-ignored — never hardcode real credentials here.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tesda_stvet',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

module.exports = pool;
