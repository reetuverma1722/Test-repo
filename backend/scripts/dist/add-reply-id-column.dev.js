"use strict";

var pool = require('../db');

var fs = require('fs');

var path = require('path');

function addReplyIdColumn() {
  var sqlPath, sql;
  return regeneratorRuntime.async(function addReplyIdColumn$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          console.log('Adding reply_id column to post_history table...'); // Read the SQL file

          sqlPath = path.join(__dirname, '../sql/add_reply_id_column.sql');
          sql = fs.readFileSync(sqlPath, 'utf8'); // Execute the SQL

          _context.next = 6;
          return regeneratorRuntime.awrap(pool.query(sql));

        case 6:
          console.log('✅ Successfully added reply_id column to post_history table');
          _context.next = 13;
          break;

        case 9:
          _context.prev = 9;
          _context.t0 = _context["catch"](0);
          console.error('❌ Error adding reply_id column:', _context.t0.message);
          throw _context.t0;

        case 13:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 9]]);
} // Run the migration if this file is executed directly


if (require.main === module) {
  addReplyIdColumn().then(function () {
    console.log('Migration completed successfully');
    process.exit(0);
  })["catch"](function (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  addReplyIdColumn: addReplyIdColumn
};