// fix-default-accounts.js
// This script ensures that only one account per platform is set as default

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixDefaultAccounts() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to fix default accounts...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get all users
    const usersResult = await client.query('SELECT DISTINCT user_id FROM social_media_accounts WHERE deleted_at IS NULL');
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users with social media accounts`);
    
    // For each user
    for (const user of users) {
      const userId = user.user_id;
      console.log(`Processing user ID: ${userId}`);
      
      // Get all platforms for this user
      const platformsResult = await client.query(
        'SELECT DISTINCT platform FROM social_media_accounts WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
      );
      const platforms = platformsResult.rows;
      
      // For each platform
      for (const platform of platforms) {
        const platformName = platform.platform;
        console.log(`  Processing platform: ${platformName}`);
        
        // Check if there are multiple default accounts for this platform
        const defaultAccountsResult = await client.query(
          'SELECT id, account_name FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND is_default = TRUE AND deleted_at IS NULL ORDER BY updated_at DESC',
          [userId, platformName]
        );
        
        const defaultAccounts = defaultAccountsResult.rows;
        
        if (defaultAccounts.length > 1) {
          console.log(`    Found ${defaultAccounts.length} default accounts for ${platformName}, fixing...`);
          
          // Keep the most recently updated account as default, unset the rest
          const keepDefaultId = defaultAccounts[0].id;
          const keepDefaultName = defaultAccounts[0].account_name;
          
          // Unset all other accounts
          await client.query(
            'UPDATE social_media_accounts SET is_default = FALSE WHERE user_id = $1 AND platform = $2 AND id != $3 AND is_default = TRUE',
            [userId, platformName, keepDefaultId]
          );
          
          console.log(`    Kept account "${keepDefaultName}" (ID: ${keepDefaultId}) as default, unset ${defaultAccounts.length - 1} others`);
        } else if (defaultAccounts.length === 1) {
          console.log(`    Found 1 default account for ${platformName}, no fix needed`);
        } else {
          console.log(`    No default account found for ${platformName}`);
        }
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Successfully fixed default accounts');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error fixing default accounts:', error);
  } finally {
    client.release();
    pool.end();
  }
}

fixDefaultAccounts();