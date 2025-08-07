-- Create a table to associate prompts with keywords
CREATE TABLE IF NOT EXISTS keyword_prompts (
  id SERIAL PRIMARY KEY,
  keyword_id INTEGER NOT NULL REFERENCES twitter_keywords(id) ON DELETE CASCADE,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE (keyword_id, prompt_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_keyword_prompts_keyword_id ON keyword_prompts(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_prompts_prompt_id ON keyword_prompts(prompt_id);