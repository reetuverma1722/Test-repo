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
     
    } else {
      console.log('Users table already exists.');
    }
    
    // Check if social_media_accounts table exists first (since twitter_keywords references it)
    const accountsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'social_media_accounts'
      );
    `);
    
    if (!accountsTableCheck.rows[0].exists) {
      console.log('Creating social_media_accounts table...');
      await client.query(`
        CREATE TABLE social_media_accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          platform VARCHAR(50) NOT NULL,
          account_id VARCHAR(255) NOT NULL,
          account_name VARCHAR(255) NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT NULL,
          UNIQUE (user_id, platform, account_id)
        );
        
        CREATE INDEX idx_social_media_accounts_user_id ON social_media_accounts(user_id);
        CREATE INDEX idx_social_media_accounts_platform ON social_media_accounts(platform);
      `);
      console.log('Social media accounts table created successfully.');
    } else {
      console.log('Social media accounts table already exists.');
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
      await client.query(`
        CREATE TABLE twitter_keywords (
          id SERIAL PRIMARY KEY,
          text VARCHAR(255) NOT NULL,
          min_likes INTEGER DEFAULT 0,
          min_retweets INTEGER DEFAULT 0,
          min_followers INTEGER DEFAULT 0,
          user_id INTEGER NOT NULL,
          account_id INTEGER REFERENCES social_media_accounts(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP DEFAULT NULL
        );
        
        CREATE INDEX idx_twitter_keywords_user_id ON twitter_keywords(user_id);
        CREATE INDEX idx_twitter_keywords_text ON twitter_keywords(text);
        CREATE INDEX idx_twitter_keywords_account_id ON twitter_keywords(account_id);
      `);
     
    } else {
      console.log('Twitter keywords table already exists.');
      
      // Check if account_id column exists in twitter_keywords table
      try {
        const accountIdColumnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'twitter_keywords'
            AND column_name = 'account_id'
          );
        `);
        
        if (!accountIdColumnCheck.rows[0].exists) {
          console.log('Adding account_id column to twitter_keywords table...');
          await client.query(`
            ALTER TABLE twitter_keywords ADD COLUMN account_id INTEGER REFERENCES social_media_accounts(id);
            CREATE INDEX idx_twitter_keywords_account_id ON twitter_keywords(account_id);
          `);
          console.log('Added account_id column to twitter_keywords table.');
        }
      } catch (err) {
        console.log('Error checking for account_id column:', err.message);
      }
    }
    
    // Check if post_history table exists
    const postHistoryTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'post_history'
      );
    `);
    
    if (!postHistoryTableCheck.rows[0].exists) {
      console.log('Creating post_history table...');
      
      // Read the SQL file
      const postHistorySqlPath = path.join(__dirname, '../sql/create_post_history_table.sql');
      const postHistorySql = fs.readFileSync(postHistorySqlPath, 'utf8');
      // Execute the SQL query
      await client.query(postHistorySql);
    } else {
      console.log('Post history table already exists.');
      
      // Check if reply_id column exists in post_history table
      try {
        const replyIdColumnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'post_history'
            AND column_name = 'reply_id'
          );
        `);
        
        if (!replyIdColumnCheck.rows[0].exists) {
          console.log('Adding reply_id column to post_history table...');
          await client.query(`
            ALTER TABLE post_history ADD COLUMN reply_id VARCHAR(255);
            CREATE INDEX idx_post_history_reply_id ON post_history(reply_id);
          `);
          console.log('Added reply_id column to post_history table.');
        } else {
          console.log('reply_id column already exists in post_history table.');
        }
      } catch (err) {
        console.log('Error checking for reply_id column:', err.message);
      }
    }
    
    // Check if prompts table exists
    const promptsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'prompts'
      );
    `);
    
    if (!promptsTableCheck.rows[0].exists) {
      console.log('Creating prompts table...');
      
      // Read the SQL file
      const promptsSqlPath = path.join(__dirname, '../sql/create_prompts_table.sql');
      const promptsSql = fs.readFileSync(promptsSqlPath, 'utf8');
      // Execute the SQL query
      await client.query(promptsSql);
      console.log('Prompts table created successfully.');
    } else {
      console.log('Prompts table already exists.');
    }
    
    // Check if keyword_prompts table exists
    const keywordPromptsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'keyword_prompts'
      );
    `);
    
    if (!keywordPromptsTableCheck.rows[0].exists) {
      console.log('Creating keyword_prompts table...');
      
      // Read the SQL file
      const keywordPromptsSqlPath = path.join(__dirname, '../sql/create_keyword_prompts_table.sql');
      const keywordPromptsSql = fs.readFileSync(keywordPromptsSqlPath, 'utf8');
      // Execute the SQL query
      await client.query(keywordPromptsSql);
      console.log('Keyword prompts table created successfully.');
    } else {
      console.log('Keyword prompts table already exists.');
    }
    
    // Check if twitter_password column exists in social_media_accounts table
    try {
      const passwordColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'social_media_accounts'
          AND column_name = 'password'
        );
      `);
      
      if (!passwordColumnCheck.rows[0].exists) {
        console.log('Adding twitter_password column to social_media_accounts table...');
        await client.query(`
          ALTER TABLE social_media_accounts ADD COLUMN password TEXT;
        `);
        console.log('Added twitter_password column to social_media_accounts table.');
      } else {
        console.log('twitter_password column already exists in social_media_accounts table.');
      }
    } catch (err) {
      console.log('Error checking for twitter_password column:', err.message);
    }
  } catch (error) {
    console.error('Error checking and creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
checkAndCreateTables();