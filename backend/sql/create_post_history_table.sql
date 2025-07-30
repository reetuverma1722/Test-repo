-- Create post_history table
CREATE TABLE IF NOT EXISTS post_history (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES social_media_accounts(id),
  post_text TEXT NOT NULL,
  post_url TEXT,
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  engagement_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  keyword_id INTEGER REFERENCES twitter_keywords(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL,
  reposted_at TIMESTAMP DEFAULT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_history_account_id ON post_history(account_id);
CREATE INDEX IF NOT EXISTS idx_post_history_keyword_id ON post_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_post_history_created_at ON post_history(created_at);

-- Add comment to explain the purpose of this table
COMMENT ON TABLE post_history IS 'Stores history of posts fetched from social media platforms';