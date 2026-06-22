const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

module.exports = { query, pool };
