require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Create a connection pool using the same configuration as the main app
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addViewCountColumn() {
  try {
    console.log('🔄 Adding view_count column to tweets table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/add_view_count_to_tweets.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL query
    await pool.query(sqlQuery);
    
    console.log('✅ Successfully added view_count column to tweets table');
  } catch (error) {
    console.error('❌ Error adding view_count column:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️ The view_count column might already exist in the tweets table');
    }
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addViewCountColumn();