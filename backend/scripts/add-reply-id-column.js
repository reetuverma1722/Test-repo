const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function addReplyIdColumn() {
  try {
    console.log('Adding reply_id column to post_history table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/add_reply_id_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Successfully added reply_id column to post_history table');
  } catch (error) {
    console.error('❌ Error adding reply_id column:', error.message);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addReplyIdColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addReplyIdColumn };