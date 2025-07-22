// init-db.js
const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/create_twitter_keywords_table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();