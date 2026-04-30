const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trim_db',
  password: '12345',
  port: 5432,
  ssl: false
});

module.exports = pool;