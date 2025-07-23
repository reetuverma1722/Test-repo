// check-and-create-tables.js
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

async function checkAndCreateTables() {
  const client = await pool.connect();
  
  try {
    console.log('Checking if required tables exist...');
    
    // Check if users table exists
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersTableCheck.rows[0].exists) {
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          twitter_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Users table created successfully.');
    } else {
      console.log('Users table already exists.');
    }
    
    // Check if twitter_keywords table exists
    const keywordsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'twitter_keywords'
      );
    `);
    
    if (!keywordsTableCheck.rows[0].exists) {
      console.log('Creating twitter_keywords table...');
      // Read the SQL file for twitter_keywords table
      const keywordsSqlFilePath = path.join(__dirname, '../sql/create_twitter_keywords_table.sql');
      const keywordsSql = fs.readFileSync(keywordsSqlFilePath, 'utf8');
      await client.query(keywordsSql);
      console.log('Twitter keywords table created successfully.');
    } else {
      console.log('Twitter keywords table already exists.');
    }
    
    // Check if social_media_accounts table exists
    const accountsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'social_media_accounts'
      );
    `);
    
    if (!accountsTableCheck.rows[0].exists) {
      console.log('Creating social_media_accounts table...');
      // Read the SQL file for social_media_accounts table
      const accountsSqlFilePath = path.join(__dirname, '../sql/create_social_media_accounts_table.sql');
      const accountsSql = fs.readFileSync(accountsSqlFilePath, 'utf8');
      await client.query(accountsSql);
      console.log('Social media accounts table created successfully.');
    } else {
      console.log('Social media accounts table already exists.');
    }
    
    console.log('All required tables have been checked and created if needed.');
  } catch (error) {
    console.error('Error checking and creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
checkAndCreateTables();