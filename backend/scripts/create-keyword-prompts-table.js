// create-keyword-prompts-table.js
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

async function createKeywordPromptsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating keyword_prompts table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/create_keyword_prompts_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL query
    await client.query(sql);
    
    console.log('Keyword prompts table created successfully.');
  } catch (error) {
    console.error('Error creating keyword_prompts table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
createKeywordPromptsTable();