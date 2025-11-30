// services/database.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Just a small helper to test the connection once at startup
async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    console.log("✅Connected to Postgres. Server time:", result.rows[0].now);
  } catch (err) {
    console.error("❌Error connecting to Postgres:", err.message);
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection,
};