// add-twitter-id-column.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create a new pool using the connection details from .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function addTwitterIdColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Checking if twitter_id column exists in users table...');
    
    // Check if twitter_id column exists
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'twitter_id'
      );
    `);
    
    if (!columnCheck.rows[0].exists) {
      console.log('Adding twitter_id column to users table...');
      await client.query(`ALTER TABLE users ADD COLUMN twitter_id VARCHAR(255);`);
      console.log('twitter_id column added successfully.');
    } else {
      console.log('twitter_id column already exists in users table.');
    }
    
  } catch (error) {
    console.error('Error adding twitter_id column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
addTwitterIdColumn();