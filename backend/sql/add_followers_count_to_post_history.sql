-- Add followers_count column to post_history table
ALTER TABLE post_history ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_post_history_followers_count ON post_history(followers_count);

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN post_history.followers_count IS 'Number of followers the author had when the post was made';