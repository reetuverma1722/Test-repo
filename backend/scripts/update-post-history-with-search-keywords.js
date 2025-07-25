// update-post-history-with-search-keywords.js
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

async function updatePostHistoryWithSearchKeywords() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching keywords from tweets table (search history)...');
    
    // Get all unique keywords from the tweets table
    const keywordsResult = await client.query(`
      SELECT DISTINCT keyword FROM tweets
      WHERE keyword IS NOT NULL
    `);
    
    if (keywordsResult.rows.length === 0) {
      console.log('No keywords found in the tweets table.');
      return;
    }
    
    console.log(`Found ${keywordsResult.rows.length} unique keywords in the tweets table.`);
    console.log('Keywords:', keywordsResult.rows.map(row => row.keyword).join(', '));
    
    // For each keyword, find or create a corresponding entry in the twitter_keywords table
    for (const keywordRow of keywordsResult.rows) {
      const keyword = keywordRow.keyword;
      
      // Check if the keyword already exists in the twitter_keywords table
      const keywordCheckResult = await client.query(`
        SELECT id FROM twitter_keywords
        WHERE text = $1 AND deleted_at IS NULL
      `, [keyword]);
      
      let keywordId;
      
      if (keywordCheckResult.rows.length > 0) {
        // Keyword exists, use its ID
        keywordId = keywordCheckResult.rows[0].id;
        console.log(`Found existing keyword "${keyword}" with ID ${keywordId}`);
      } else {
        // Keyword doesn't exist, create a new one
        const newKeywordResult = await client.query(`
          INSERT INTO twitter_keywords (text, min_likes, min_retweets, min_followers, user_id, created_at, updated_at)
          VALUES ($1, 0, 0, 0, 1, NOW(), NOW())
          RETURNING id
        `, [keyword]);
        
        keywordId = newKeywordResult.rows[0].id;
        console.log(`Created new keyword "${keyword}" with ID ${keywordId}`);
      }
      
      // Now update post_history entries that match tweets with this keyword
      // First, get tweets with this keyword
      const tweetsResult = await client.query(`
        SELECT id, text FROM tweets
        WHERE keyword = $1
      `, [keyword]);
      
      console.log(`Found ${tweetsResult.rows.length} tweets with keyword "${keyword}"`);
      
      // For each tweet, find matching post_history entries by text and update their keyword_id
      for (const tweet of tweetsResult.rows) {
        const updateResult = await client.query(`
          UPDATE post_history
          SET keyword_id = $1
          WHERE post_text LIKE $2 AND (keyword_id IS NULL OR keyword_id != $1)
          RETURNING id
        `, [keywordId, `%${tweet.text.substring(0, 50)}%`]);
        
        if (updateResult.rows.length > 0) {
          console.log(`Updated ${updateResult.rows.length} post_history entries for tweet "${tweet.text.substring(0, 30)}..."`);
        }
      }
    }
    
    // Verify the updates
    console.log('\nVerifying updates...');
    const verifyResult = await client.query(`
      SELECT ph.id, ph.post_text, ph.keyword_id, k.text as keyword
      FROM post_history ph
      LEFT JOIN twitter_keywords k ON ph.keyword_id = k.id
      LIMIT 10
    `);
    
    console.log('Sample of updated post_history entries:');
    verifyResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Keyword: ${row.keyword || 'NULL'}, Text: "${row.post_text.substring(0, 50)}..."`);
    });
    
  } catch (error) {
    console.error('Error updating post_history with search keywords:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
updatePostHistoryWithSearchKeywords();