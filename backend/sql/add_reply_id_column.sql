-- Add reply_id column to post_history table to store the ID of the posted reply
ALTER TABLE post_history 
ADD COLUMN IF NOT EXISTS reply_id VARCHAR(255);

-- Add index for better performance when querying by reply_id
CREATE INDEX IF NOT EXISTS idx_post_history_reply_id ON post_history(reply_id);

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN post_history.reply_id IS 'Stores the Twitter reply ID when a reply is posted to a tweet';