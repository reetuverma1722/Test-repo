-- Add is_premium column to social_media_accounts table
ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Create index on is_premium for faster queries
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_is_premium ON social_media_accounts(is_premium);