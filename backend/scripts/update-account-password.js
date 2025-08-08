// update-account-password.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create a new pool using the connection details from .env
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'alokozay',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'buzzly',
});

// Get command line arguments
const accountId = process.argv[2];
const newPassword = process.argv[3];

if (!accountId || !newPassword) {
  console.error('Usage: node update-account-password.js <account_id> <new_password>');
  console.error('Example: node update-account-password.js twitter_@Reetuqss_1753785991944 myNewPassword123');
  process.exit(1);
}

async function updateAccountPassword() {
  const client = await pool.connect();
  
  try {
    console.log(`Updating password for account ID: ${accountId}`);
    
    // First, check if the account exists
    const accountResult = await client.query(
      'SELECT * FROM social_media_accounts WHERE account_id = $1',
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      console.error(`❌ Account with ID ${accountId} not found`);
      return;
    }
    
    const account = accountResult.rows[0];
    console.log(`Found account: ${account.platform} - ${account.account_name}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the account with the new password
    await client.query(
      'UPDATE social_media_accounts SET twitter_password = $1, updated_at = CURRENT_TIMESTAMP WHERE account_id = $2',
      [hashedPassword, accountId]
    );
    
    console.log('✅ Password updated successfully');
    
    // Verify the update
    const updatedAccount = await client.query(
      'SELECT id, user_id, platform, account_name, CASE WHEN twitter_password IS NULL THEN \'NULL\' ELSE \'SET\' END as password_status FROM social_media_accounts WHERE account_id = $1',
      [accountId]
    );
    
    console.log('\nUpdated account:');
    console.log(`ID: ${updatedAccount.rows[0].id}`);
    console.log(`User ID: ${updatedAccount.rows[0].user_id}`);
    console.log(`Platform: ${updatedAccount.rows[0].platform}`);
    console.log(`Account Name: ${updatedAccount.rows[0].account_name}`);
    console.log(`Password: ${updatedAccount.rows[0].password_status}`);
    
  } catch (error) {
    console.error('Error updating account password:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
updateAccountPassword();