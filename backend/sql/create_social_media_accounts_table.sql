-- Create social media accounts table
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'twitter', 'linkedin', etc.
  account_id VARCHAR(255) NOT NULL, -- Platform-specific ID
  account_name VARCHAR(255) NOT NULL, -- Display name or username
  access_token TEXT, -- OAuth access token
  refresh_token TEXT, -- OAuth refresh token
  token_expires_at TIMESTAMP, -- When the token expires
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL,
  UNIQUE (user_id, platform, account_id)
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_user_id ON social_media_accounts(user_id);

-- Create index on platform for faster queries
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_platform ON social_media_accounts(platform);

-- Add account_id column to twitter_keywords table
ALTER TABLE twitter_keywords ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES social_media_accounts(id);

-- Create index on account_id for faster queries
CREATE INDEX IF NOT EXISTS idx_twitter_keywords_account_id ON twitter_keywords(account_id);