// Script to add is_premium column to social_media_accounts table
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

async function addIsPremiumColumn() {
  try {
    console.log('Adding is_premium column to social_media_accounts table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/add_is_premium_to_social_media_accounts.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ is_premium column added successfully!');
  } catch (error) {
    console.error('❌ Error adding is_premium column:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addIsPremiumColumn();