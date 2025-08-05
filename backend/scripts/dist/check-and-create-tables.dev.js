"use strict";

// check-and-create-tables.js
var _require = require('pg'),
    Pool = _require.Pool;

var fs = require('fs');

var path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env')
}); // Create a new pool using the connection details from .env


var pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

function checkAndCreateTables() {
  var client, usersTableCheck, accountsTableCheck, keywordsTableCheck, accountIdColumnCheck, postHistoryTableCheck, postHistorySqlPath, postHistorySql, replyIdColumnCheck, passwordColumnCheck;
  return regeneratorRuntime.async(function checkAndCreateTables$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(pool.connect());

        case 2:
          client = _context.sent;
          _context.prev = 3;
          console.log('Checking if required tables exist...'); // Check if users table exists

          _context.next = 7;
          return regeneratorRuntime.awrap(client.query("\n      SELECT EXISTS (\n        SELECT FROM information_schema.tables\n        WHERE table_schema = 'public'\n        AND table_name = 'users'\n      );\n    "));

        case 7:
          usersTableCheck = _context.sent;

          if (usersTableCheck.rows[0].exists) {
            _context.next = 15;
            break;
          }

          console.log('Creating users table...');
          _context.next = 12;
          return regeneratorRuntime.awrap(client.query("\n        CREATE TABLE users (\n          id SERIAL PRIMARY KEY,\n          email VARCHAR(255) UNIQUE NOT NULL,\n          password VARCHAR(255) NOT NULL,\n          name VARCHAR(255),\n          twitter_id VARCHAR(255),\n          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n        );\n      "));

        case 12:
          console.log('Users table created successfully.');
          _context.next = 16;
          break;

        case 15:
          console.log('Users table already exists.');

        case 16:
          _context.next = 18;
          return regeneratorRuntime.awrap(client.query("\n      SELECT EXISTS (\n        SELECT FROM information_schema.tables\n        WHERE table_schema = 'public'\n        AND table_name = 'social_media_accounts'\n      );\n    "));

        case 18:
          accountsTableCheck = _context.sent;

          if (accountsTableCheck.rows[0].exists) {
            _context.next = 26;
            break;
          }

          console.log('Creating social_media_accounts table...');
          _context.next = 23;
          return regeneratorRuntime.awrap(client.query("\n        CREATE TABLE social_media_accounts (\n          id SERIAL PRIMARY KEY,\n          user_id INTEGER NOT NULL,\n          platform VARCHAR(50) NOT NULL,\n          account_id VARCHAR(255) NOT NULL,\n          account_name VARCHAR(255) NOT NULL,\n          access_token TEXT,\n          refresh_token TEXT,\n          token_expires_at TIMESTAMP,\n          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n          deleted_at TIMESTAMP DEFAULT NULL,\n          UNIQUE (user_id, platform, account_id)\n        );\n        \n        CREATE INDEX idx_social_media_accounts_user_id ON social_media_accounts(user_id);\n        CREATE INDEX idx_social_media_accounts_platform ON social_media_accounts(platform);\n      "));

        case 23:
          console.log('Social media accounts table created successfully.');
          _context.next = 27;
          break;

        case 26:
          console.log('Social media accounts table already exists.');

        case 27:
          _context.next = 29;
          return regeneratorRuntime.awrap(client.query("\n      SELECT EXISTS (\n        SELECT FROM information_schema.tables\n        WHERE table_schema = 'public'\n        AND table_name = 'twitter_keywords'\n      );\n    "));

        case 29:
          keywordsTableCheck = _context.sent;

          if (keywordsTableCheck.rows[0].exists) {
            _context.next = 37;
            break;
          }

          console.log('Creating twitter_keywords table...');
          _context.next = 34;
          return regeneratorRuntime.awrap(client.query("\n        CREATE TABLE twitter_keywords (\n          id SERIAL PRIMARY KEY,\n          text VARCHAR(255) NOT NULL,\n          min_likes INTEGER DEFAULT 0,\n          min_retweets INTEGER DEFAULT 0,\n          min_followers INTEGER DEFAULT 0,\n          user_id INTEGER NOT NULL,\n          account_id INTEGER REFERENCES social_media_accounts(id),\n          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n          deleted_at TIMESTAMP DEFAULT NULL\n        );\n        \n        CREATE INDEX idx_twitter_keywords_user_id ON twitter_keywords(user_id);\n        CREATE INDEX idx_twitter_keywords_text ON twitter_keywords(text);\n        CREATE INDEX idx_twitter_keywords_account_id ON twitter_keywords(account_id);\n      "));

        case 34:
          console.log('Twitter keywords table created successfully.');
          _context.next = 52;
          break;

        case 37:
          console.log('Twitter keywords table already exists.'); // Check if account_id column exists in twitter_keywords table

          _context.prev = 38;
          _context.next = 41;
          return regeneratorRuntime.awrap(client.query("\n          SELECT EXISTS (\n            SELECT FROM information_schema.columns\n            WHERE table_schema = 'public'\n            AND table_name = 'twitter_keywords'\n            AND column_name = 'account_id'\n          );\n        "));

        case 41:
          accountIdColumnCheck = _context.sent;

          if (accountIdColumnCheck.rows[0].exists) {
            _context.next = 47;
            break;
          }

          console.log('Adding account_id column to twitter_keywords table...');
          _context.next = 46;
          return regeneratorRuntime.awrap(client.query("\n            ALTER TABLE twitter_keywords ADD COLUMN account_id INTEGER REFERENCES social_media_accounts(id);\n            CREATE INDEX idx_twitter_keywords_account_id ON twitter_keywords(account_id);\n          "));

        case 46:
          console.log('Added account_id column to twitter_keywords table.');

        case 47:
          _context.next = 52;
          break;

        case 49:
          _context.prev = 49;
          _context.t0 = _context["catch"](38);
          console.log('Error checking for account_id column:', _context.t0.message);

        case 52:
          _context.next = 54;
          return regeneratorRuntime.awrap(client.query("\n      SELECT EXISTS (\n        SELECT FROM information_schema.tables\n        WHERE table_schema = 'public'\n        AND table_name = 'post_history'\n      );\n    "));

        case 54:
          postHistoryTableCheck = _context.sent;

          if (postHistoryTableCheck.rows[0].exists) {
            _context.next = 64;
            break;
          }

          console.log('Creating post_history table...'); // Read the SQL file

          postHistorySqlPath = path.join(__dirname, '../sql/create_post_history_table.sql');
          postHistorySql = fs.readFileSync(postHistorySqlPath, 'utf8'); // Execute the SQL query

          _context.next = 61;
          return regeneratorRuntime.awrap(client.query(postHistorySql));

        case 61:
          console.log('Post history table created successfully.');
          _context.next = 82;
          break;

        case 64:
          console.log('Post history table already exists.'); // Check if reply_id column exists in post_history table

          _context.prev = 65;
          _context.next = 68;
          return regeneratorRuntime.awrap(client.query("\n          SELECT EXISTS (\n            SELECT FROM information_schema.columns\n            WHERE table_schema = 'public'\n            AND table_name = 'post_history'\n            AND column_name = 'reply_id'\n          );\n        "));

        case 68:
          replyIdColumnCheck = _context.sent;

          if (replyIdColumnCheck.rows[0].exists) {
            _context.next = 76;
            break;
          }

          console.log('Adding reply_id column to post_history table...');
          _context.next = 73;
          return regeneratorRuntime.awrap(client.query("\n            ALTER TABLE post_history ADD COLUMN reply_id VARCHAR(255);\n            CREATE INDEX idx_post_history_reply_id ON post_history(reply_id);\n          "));

        case 73:
          console.log('Added reply_id column to post_history table.');
          _context.next = 77;
          break;

        case 76:
          console.log('reply_id column already exists in post_history table.');

        case 77:
          _context.next = 82;
          break;

        case 79:
          _context.prev = 79;
          _context.t1 = _context["catch"](65);
          console.log('Error checking for reply_id column:', _context.t1.message);

        case 82:
          _context.prev = 82;
          _context.next = 85;
          return regeneratorRuntime.awrap(client.query("\n        SELECT EXISTS (\n          SELECT FROM information_schema.columns\n          WHERE table_schema = 'public'\n          AND table_name = 'social_media_accounts'\n          AND column_name = 'password'\n        );\n      "));

        case 85:
          passwordColumnCheck = _context.sent;

          if (passwordColumnCheck.rows[0].exists) {
            _context.next = 93;
            break;
          }

          console.log('Adding password column to social_media_accounts table...');
          _context.next = 90;
          return regeneratorRuntime.awrap(client.query("\n          ALTER TABLE social_media_accounts ADD COLUMN password TEXT;\n        "));

        case 90:
          console.log('Added twitter_password column to social_media_accounts table.');
          _context.next = 94;
          break;

        case 93:
          console.log('twitter_password column already exists in social_media_accounts table.');

        case 94:
          _context.next = 99;
          break;

        case 96:
          _context.prev = 96;
          _context.t2 = _context["catch"](82);
          console.log('Error checking for twitter_password column:', _context.t2.message);

        case 99:
          console.log('All required tables have been checked and created if needed.');
          _context.next = 105;
          break;

        case 102:
          _context.prev = 102;
          _context.t3 = _context["catch"](3);
          console.error('Error checking and creating tables:', _context.t3);

        case 105:
          _context.prev = 105;
          client.release();
          _context.next = 109;
          return regeneratorRuntime.awrap(pool.end());

        case 109:
          return _context.finish(105);

        case 110:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[3, 102, 105, 110], [38, 49], [65, 79], [82, 96]]);
} // Run the function


checkAndCreateTables();