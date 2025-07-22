// update-users-table.js
const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function updateUsersTable() {
  try {
    console.log('Updating users table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/add_twitter_id_to_users.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('Users table updated successfully.');
  } catch (error) {
    console.error('Error updating users table:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the update
updateUsersTable();