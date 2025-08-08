-- Add view_count column to tweets table
ALTER TABLE tweets ADD COLUMN view_count INTEGER DEFAULT 0;

-- Comment explaining the change
COMMENT ON COLUMN tweets.view_count IS 'Number of views for the tweet';