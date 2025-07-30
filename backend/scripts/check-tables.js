// check-tables.js
const { Pool } = require('pg');
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

async function checkTables() {
  const client = await pool.connect();
  
  try {
    console.log('Checking twitter_keywords table...');
    const keywordsResult = await client.query('SELECT * FROM twitter_keywords LIMIT 5');
    console.log('Keywords found:', keywordsResult.rows.length);
    console.log('Keywords data:', JSON.stringify(keywordsResult.rows, null, 2));
    
    console.log('\nChecking post_history table...');
    const postHistoryResult = await client.query('SELECT id, account_id, keyword_id FROM post_history LIMIT 5');
    console.log('Post history entries found:', postHistoryResult.rows.length);
    console.log('Post history data:', JSON.stringify(postHistoryResult.rows, null, 2));
    
    // Check if any post_history entries have a valid keyword_id
    if (postHistoryResult.rows.length > 0) {
      const postIds = postHistoryResult.rows.map(row => row.id).join(',');
      console.log('\nChecking for valid keyword associations...');
      const joinResult = await client.query(`
        SELECT ph.id, ph.account_id, ph.keyword_id, k.text as keyword
        FROM post_history ph
        LEFT JOIN twitter_keywords k ON ph.keyword_id = k.id
        WHERE ph.id IN (${postIds})
      `);
      console.log('Join result:', JSON.stringify(joinResult.rows, null, 2));
    }
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
checkTables();