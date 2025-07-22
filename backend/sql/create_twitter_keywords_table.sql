-- Create Twitter keywords table
CREATE TABLE IF NOT EXISTS twitter_keywords (
  id SERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  min_likes INTEGER DEFAULT 0,
  min_retweets INTEGER DEFAULT 0,
  min_followers INTEGER DEFAULT 0,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_twitter_keywords_user_id ON twitter_keywords(user_id);

-- Create index on text for faster searches
CREATE INDEX IF NOT EXISTS idx_twitter_keywords_text ON twitter_keywords(text);