// update-post-history-keyword.js
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

async function updatePostHistoryKeyword() {
  const client = await pool.connect();
  
  try {
    console.log('Updating post_history entry with a keyword_id...');
    
    // Get an active keyword ID (not deleted)
    const keywordResult = await client.query(`
      SELECT id FROM twitter_keywords 
      WHERE deleted_at IS NULL 
      LIMIT 1
    `);
    
    if (keywordResult.rows.length === 0) {
      console.log('No active keywords found. Please create a keyword first.');
      return;
    }
    
    const keywordId = keywordResult.rows[0].id;
    console.log(`Found active keyword with ID: ${keywordId}`);
    
    // Update the first post_history entry with this keyword_id
    const updateResult = await client.query(`
      UPDATE post_history 
      SET keyword_id = $1 
      WHERE id = 1
      RETURNING id, account_id, keyword_id
    `, [keywordId]);
    
    console.log('Update result:', JSON.stringify(updateResult.rows, null, 2));
    
    // Verify the update by checking the join
    console.log('\nVerifying the update with a join query...');
    const verifyResult = await client.query(`
      SELECT ph.id, ph.account_id, ph.keyword_id, k.text as keyword
      FROM post_history ph
      LEFT JOIN twitter_keywords k ON ph.keyword_id = k.id
      WHERE ph.id = 1
    `);
    
    console.log('Verification result:', JSON.stringify(verifyResult.rows, null, 2));
    
  } catch (error) {
    console.error('Error updating post_history:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
updatePostHistoryKeyword();