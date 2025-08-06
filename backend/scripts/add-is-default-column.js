// Script to add is_default column to social_media_accounts table
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a new pool using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/buzzly',
});

async function addIsDefaultColumn() {
  try {
    console.log('Adding is_default column to social_media_accounts table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/add_is_default_to_social_media_accounts.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ is_default column added successfully!');
  } catch (error) {
    console.error('❌ Error adding is_default column:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addIsDefaultColumn();