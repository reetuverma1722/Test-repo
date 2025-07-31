const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function updatePostHistorySchema() {
  try {
    console.log('🔄 Updating post_history table schema...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/update_post_history_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Post history table schema updated successfully');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'post_history' 
      AND column_name IN ('post_type', 'status', 'priority', 'scheduled_at')
      ORDER BY column_name
    `);
    
    console.log('📋 New columns added:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('❌ Error updating post history schema:', error);
    throw error;
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updatePostHistorySchema()
    .then(() => {
      console.log('🎉 Schema update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = updatePostHistorySchema;