-- Add twitter_id column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'twitter_id'
    ) THEN
        ALTER TABLE users ADD COLUMN twitter_id VARCHAR(255);
    END IF;
END $$;