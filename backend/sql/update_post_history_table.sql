-- Update post_history table to support new post functionality
-- Add new columns for post management

-- Add post_type column (manual, scheduled, draft, fetched)
ALTER TABLE post_history 
ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) DEFAULT 'fetched';

-- Add status column (draft, pending, published, failed)
ALTER TABLE post_history 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';

-- Add priority column (low, medium, high)
ALTER TABLE post_history 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

-- Add scheduled_at column for scheduled posts
ALTER TABLE post_history 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP DEFAULT NULL;

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_post_history_post_type ON post_history(post_type);
CREATE INDEX IF NOT EXISTS idx_post_history_status ON post_history(status);
CREATE INDEX IF NOT EXISTS idx_post_history_scheduled_at ON post_history(scheduled_at);

-- Update existing records to have proper post_type
UPDATE post_history 
SET post_type = 'fetched', status = 'published' 
WHERE post_type IS NULL OR post_type = 'fetched';

-- Add comments to explain new columns
COMMENT ON COLUMN post_history.post_type IS 'Type of post: manual, scheduled, draft, fetched';
COMMENT ON COLUMN post_history.status IS 'Status of post: draft, pending, published, failed';
COMMENT ON COLUMN post_history.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN post_history.scheduled_at IS 'When the post is scheduled to be published';