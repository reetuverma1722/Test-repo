const db = require('../db');
const fs = require('fs');
const path = require('path');

async function createPromptsTable() {
  try {
    console.log('Creating prompts table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/create_prompts_table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await db.query(sql);
    
    console.log('✅ Prompts table created successfully');
  } catch (error) {
    console.error('❌ Error creating prompts table:', error.message);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

createPromptsTable();