const { Pool } = require('pg');

const pool = new Pool({
  user: 'zafar',
  host: 'zafarullah.ctqsgygqc3t7.eu-north-1.rds.amazonaws.com',
  database: 'myDB',
  password: 'zafarullah123',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
