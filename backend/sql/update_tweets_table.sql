-- Add new columns to the tweets table for author information
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS author_username VARCHAR(255);
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Update existing records with default values
UPDATE tweets SET 
  author_name = 'Unknown User',
  author_username = 'username',
  profile_image_url = ''
WHERE author_name IS NULL;