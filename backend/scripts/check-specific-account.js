// check-specific-account.js
const { Pool } = require('pg');
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

async function checkSpecificAccount() {
  const client = await pool.connect();
  
  try {
    const accountId = '@Reetuqss'; // The specific account to check
    
    console.log(`Checking database for account: ${accountId}`);
    
    // Check the raw database values
    const dbResult = await client.query(`
      SELECT id, user_id, platform, account_id, account_name,
             is_premium, is_default,
             created_at, updated_at
      FROM social_media_accounts
      WHERE account_id = $1
    `, [accountId]);
    
    if (dbResult.rows.length === 0) {
      console.log(`No account found with ID: ${accountId}`);
      return;
    }
    
    console.log('Database values:');
    console.log(JSON.stringify(dbResult.rows[0], null, 2));
    
    // Check the values with COALESCE and boolean casting
    const apiResult = await client.query(`
      SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
             COALESCE(is_premium, FALSE)::boolean AS "isPremium",
             COALESCE(is_default, FALSE)::boolean AS "isDefault"
      FROM social_media_accounts
      WHERE account_id = $1
    `, [accountId]);
    
    console.log('\nAPI-style values (with COALESCE and boolean casting):');
    console.log(JSON.stringify(apiResult.rows[0], null, 2));
    
    // Check if the values are being interpreted correctly
    const account = dbResult.rows[0];
    console.log('\nValue interpretation:');
    console.log(`is_premium raw value: ${account.is_premium}`);
    console.log(`is_premium as boolean: ${Boolean(account.is_premium)}`);
    console.log(`is_premium with COALESCE: ${account.is_premium === null ? false : account.is_premium}`);
    console.log(`is_default raw value: ${account.is_default}`);
    console.log(`is_default as boolean: ${Boolean(account.is_default)}`);
    console.log(`is_default with COALESCE: ${account.is_default === null ? false : account.is_default}`);
    
    // Update the account to ensure values are properly set
    console.log('\nUpdating account to ensure proper boolean values...');
    await client.query(`
      UPDATE social_media_accounts
      SET is_premium = TRUE,
          is_default = TRUE
      WHERE account_id = $1
    `, [accountId]);
    
    // Verify the update
    const verifyResult = await client.query(`
      SELECT id, account_id, 
             is_premium, is_default,
             COALESCE(is_premium, FALSE)::boolean AS "isPremium",
             COALESCE(is_default, FALSE)::boolean AS "isDefault"
      FROM social_media_accounts
      WHERE account_id = $1
    `, [accountId]);
    
    console.log('\nAfter update:');
    console.log(JSON.stringify(verifyResult.rows[0], null, 2));
    
  } catch (error) {
    console.error('Error checking specific account:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
checkSpecificAccount();