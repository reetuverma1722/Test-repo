-- Add password column to social_media_accounts table
ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS password TEXT;

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN social_media_accounts.password IS 'Encrypted password for direct login accounts';