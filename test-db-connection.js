/**
 * Test Database Connection Script
 * Run this to verify your PostgreSQL connection is working
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create connection pool with environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  console.log('Testing PostgreSQL Database Connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Port: ${process.env.DB_PORT || 5432}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NOT SET'}`);
  console.log('\n');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const client = await pool.connect();
    console.log('✓ Successfully connected to PostgreSQL!\n');

    // Test database version
    console.log('2. Checking PostgreSQL version...');
    const versionResult = await client.query('SELECT version()');
    console.log(`✓ PostgreSQL Version: ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Check if tables exist
    console.log('3. Checking for required tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠ No tables found in database.');
      console.log('  Run the schema.sql file to create tables:');
      console.log('  psql -h 127.0.0.1 -U app_user -d main -f schema.sql\n');
    } else {
      console.log('✓ Found the following tables:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      console.log('');
    }

    // Check specific tables we need
    const requiredTables = ['users', 'recipients', 'packages', 'audit_log'];
    console.log('4. Verifying required tables...');
    const existingTables = tablesResult.rows.map(row => row.table_name);

    let allTablesExist = true;
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`  ✓ ${table} table exists`);
      } else {
        console.log(`  ✗ ${table} table is MISSING`);
        allTablesExist = false;
      }
    }
    console.log('');

    if (!allTablesExist) {
      console.log('⚠ Some tables are missing. Please run schema.sql to create them.\n');
    }

    // Test a simple query on users table if it exists
    if (existingTables.includes('users')) {
      console.log('5. Testing query on users table...');
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`✓ Users table has ${usersResult.rows[0].count} record(s)\n`);
    }

    // Release the client back to the pool
    client.release();

    console.log('==============================================');
    console.log('Database connection test completed successfully!');
    console.log('==============================================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Verify your .env file has correct credentials');
    console.error('3. Check that the database exists');
    console.error('4. Ensure the database user has proper permissions\n');

    await pool.end();
    process.exit(1);
  }
}

testConnection();
