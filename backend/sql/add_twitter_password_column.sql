-- Add twitter_password column to social_media_accounts table
ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS twitter_password TEXT;

-- Add comment to the column
COMMENT ON COLUMN social_media_accounts.twitter_password IS 'Twitter password (unencrypted)';