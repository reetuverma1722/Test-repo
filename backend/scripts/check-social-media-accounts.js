// check-social-media-accounts.js
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

async function checkSocialMediaAccounts() {
  const client = await pool.connect();
  
  try {
    console.log('Checking social_media_accounts table structure...');
    const tableStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'social_media_accounts'
      ORDER BY ordinal_position;
    `);
    console.log('Table structure:');
    tableStructure.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\nChecking social_media_accounts data...');
    const accountsResult = await client.query(`
      SELECT id, user_id, platform, account_id, account_name,
             CASE WHEN twitter_password IS NULL THEN 'NULL' ELSE 'SET' END as password_status,
             CASE WHEN access_token IS NULL THEN 'NULL' ELSE 'SET' END as access_token_status,
             COALESCE(is_premium, FALSE)::boolean as is_premium,
             COALESCE(is_default, FALSE)::boolean as is_default,
             created_at
      FROM social_media_accounts
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${accountsResult.rows.length} accounts:`);
    accountsResult.rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`User ID: ${row.user_id}`);
      console.log(`Platform: ${row.platform}`);
      console.log(`Account ID: ${row.account_id}`);
      console.log(`Account Name: ${row.account_name}`);
      console.log(`Password: ${row.password_status}`);
      console.log(`Access Token: ${row.access_token_status}`);
      console.log(`Premium: ${row.is_premium}`);
      console.log(`Default: ${row.is_default}`);
      console.log(`Created: ${row.created_at}`);
    });
    
    // Count accounts by platform and password status
    console.log('\nAccounts by platform and password status:');
    const statsByPlatform = await client.query(`
      SELECT platform,
             COUNT(*) as total_accounts,
             SUM(CASE WHEN twitter_password IS NULL THEN 0 ELSE 1 END) as with_password,
             SUM(CASE WHEN twitter_password IS NULL THEN 1 ELSE 0 END) as without_password,
             SUM(CASE WHEN COALESCE(is_premium, FALSE) = TRUE THEN 1 ELSE 0 END) as premium_accounts,
             SUM(CASE WHEN COALESCE(is_default, FALSE) = TRUE THEN 1 ELSE 0 END) as default_accounts
      FROM social_media_accounts
      GROUP BY platform
    `);
    
    statsByPlatform.rows.forEach(row => {
      console.log(`${row.platform}: ${row.total_accounts} accounts (${row.with_password} with password, ${row.without_password} without password, ${row.premium_accounts} premium, ${row.default_accounts} default)`);
    });
    
  } catch (error) {
    console.error('Error checking social_media_accounts table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
checkSocialMediaAccounts();