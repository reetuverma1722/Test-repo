// init-social-media-accounts.js
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function initSocialMediaAccountsTables() {
  try {
    console.log('🔄 Initializing social media accounts tables...');

    // Read and execute the SQL file for creating social media accounts table
    const socialMediaAccountsTableSQL = fs.readFileSync(
      path.join(__dirname, '../sql/create_social_media_accounts_table.sql'),
      'utf8'
    );
    
    await pool.query(socialMediaAccountsTableSQL);
    console.log('✅ Social media accounts tables created successfully');

    // Insert some sample data for testing
    console.log('🔄 Adding sample social media accounts...');
    
    // Get the first user ID from the database
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('⚠️ No users found in the database. Please run create-test-user.js first.');
      return;
    }
    
    const userId = userResult.rows[0].id;
    
    // Insert sample Twitter accounts
    await pool.query(`
      INSERT INTO social_media_accounts 
      (user_id, platform, account_id, account_name, access_token, refresh_token)
      VALUES 
      ($1, 'twitter', '123456789', 'Primary Twitter', 'sample-access-token-1', 'sample-refresh-token-1'),
      ($1, 'twitter', '987654321', 'Secondary Twitter', 'sample-access-token-2', 'sample-refresh-token-2'),
      ($1, 'linkedin', 'linkedin-123', 'Work LinkedIn', 'sample-access-token-3', 'sample-refresh-token-3')
      ON CONFLICT (user_id, platform, account_id) DO NOTHING
    `, [userId]);
    
    console.log('✅ Sample social media accounts added successfully');
    
    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the initialization function
initSocialMediaAccountsTables();