// Script to update the tweets table with new columns for author information
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'buzzly',
  password: process.env.DB_PASSWORD || 'alokozay',
  port: process.env.DB_PORT || 5432,
});

async function updateTweetsTable() {
  try {
    console.log('🔄 Updating tweets table with new columns...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/update_tweets_table.sql');
    const sqlCommands = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL commands
    await pool.query(sqlCommands);
    
    console.log('✅ Tweets table updated successfully!');
    
    // Check if the columns were added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tweets' 
      AND column_name IN ('author_name', 'author_username', 'profile_image_url')
    `);
    
    console.log(`Found ${result.rows.length} new columns:`);
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating tweets table:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
updateTweetsTable();