// init-db.js
const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read and execute the Twitter keywords table SQL file
    const keywordsSqlFilePath = path.join(__dirname, '../sql/create_twitter_keywords_table.sql');
    const keywordsSql = fs.readFileSync(keywordsSqlFilePath, 'utf8');
    await pool.query(keywordsSql);
    
    // Read and execute the social media accounts table SQL file
    const accountsSqlFilePath = path.join(__dirname, '../sql/create_social_media_accounts_table.sql');
    const accountsSql = fs.readFileSync(accountsSqlFilePath, 'utf8');
    await pool.query(accountsSql);
    
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