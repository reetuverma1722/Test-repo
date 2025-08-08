const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a PostgreSQL connection pool using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addFollowersCountColumn() {
  try {
    console.log('Adding followers_count column to post_history table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/add_followers_count_to_post_history.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL query
    await pool.query(sqlQuery);
    
    console.log('✅ Successfully added followers_count column to post_history table');
  } catch (error) {
    console.error('❌ Error adding followers_count column:', error.message);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
addFollowersCountColumn();