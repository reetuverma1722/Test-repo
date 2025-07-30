// Script to add password column to social_media_accounts table
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'buzzly',
  password: process.env.DB_PASSWORD || 'alokozay',
  port: process.env.DB_PORT || 5432,
});

async function addPasswordColumn() {
  try {
    console.log('Adding password column to social_media_accounts table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/add_password_to_social_media_accounts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Password column added successfully!');
  } catch (err) {
    console.error('❌ Error adding password column:', err);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addPasswordColumn();