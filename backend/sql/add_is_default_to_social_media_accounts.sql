-- Add is_default column to social_media_accounts table
ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create index on is_default for faster queries
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_is_default ON social_media_accounts(is_default);