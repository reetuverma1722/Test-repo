// ensure-social-media-account-columns.js
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

async function ensureSocialMediaAccountColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Checking social_media_accounts table for required columns...');
    
    // Check if the table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'social_media_accounts'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.error('Error: social_media_accounts table does not exist!');
      return;
    }
    
    // Get current columns
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'social_media_accounts';
    `);
    
    const columnNames = columns.rows.map(row => row.column_name);
    console.log('Current columns:', columnNames.join(', '));
    
    // Check and add is_premium column if it doesn't exist
    if (!columnNames.includes('is_premium')) {
      console.log('Adding is_premium column...');
      await client.query(`
        ALTER TABLE social_media_accounts 
        ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
      `);
      console.log('Added is_premium column');
      
      // Create index for is_premium
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_social_media_accounts_is_premium 
        ON social_media_accounts(is_premium);
      `);
      console.log('Created index for is_premium column');
    } else {
      console.log('is_premium column already exists');
    }
    
    // Check and add is_default column if it doesn't exist
    if (!columnNames.includes('is_default')) {
      console.log('Adding is_default column...');
      await client.query(`
        ALTER TABLE social_media_accounts 
        ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
      `);
      console.log('Added is_default column');
      
      // Create index for is_default
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_social_media_accounts_is_default 
        ON social_media_accounts(is_default);
      `);
      console.log('Created index for is_default column');
    } else {
      console.log('is_default column already exists');
    }
    
    // Ensure all values are properly set (not null)
    console.log('Ensuring all boolean values are properly set...');
    await client.query(`
      UPDATE social_media_accounts 
      SET is_premium = COALESCE(is_premium, FALSE),
          is_default = COALESCE(is_default, FALSE);
    `);
    console.log('Updated any NULL values to FALSE');
    
    // Verify the columns and their data types
    const verifyColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'social_media_accounts' AND 
            column_name IN ('is_premium', 'is_default');
    `);
    
    console.log('\nVerification:');
    verifyColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\nAll required columns are now present in the social_media_accounts table.');
    
  } catch (error) {
    console.error('Error ensuring social_media_accounts columns:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
ensureSocialMediaAccountColumns();