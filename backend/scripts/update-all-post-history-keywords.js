// update-all-post-history-keywords.js
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

async function updateAllPostHistoryKeywords() {
  const client = await pool.connect();
  
  try {
    console.log('Updating all post_history entries with null keyword_id...');
    
    // Get all posts with null keyword_id
    const postsResult = await client.query(`
      SELECT id, account_id FROM post_history 
      WHERE keyword_id IS NULL
    `);
    
    console.log(`Found ${postsResult.rows.length} posts with null keyword_id`);
    
    if (postsResult.rows.length === 0) {
      console.log('No posts need updating.');
      return;
    }
    
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
    
    // Update all posts with null keyword_id
    const updateResult = await client.query(`
      UPDATE post_history 
      SET keyword_id = $1 
      WHERE keyword_id IS NULL
      RETURNING id, account_id, keyword_id
    `, [keywordId]);
    
    console.log(`Updated ${updateResult.rows.length} posts with keyword_id ${keywordId}`);
    console.log('Update result:', JSON.stringify(updateResult.rows, null, 2));
    
    // Verify the update by checking a few posts
    console.log('\nVerifying the update with a join query...');
    const verifyResult = await client.query(`
      SELECT ph.id, ph.account_id, ph.keyword_id, k.text as keyword
      FROM post_history ph
      LEFT JOIN twitter_keywords k ON ph.keyword_id = k.id
      LIMIT 5
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
updateAllPostHistoryKeywords();