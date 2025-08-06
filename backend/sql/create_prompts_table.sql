CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Insert default prompts
INSERT INTO prompts (name, model, content, is_default)
VALUES 
  ('Default', 'meta-llama/llama-3-8b-instruct', 'Reply smartly to this tweet:
"{tweetContent}"
Make it personal, friendly, and relevant. Be professional and do not use emojis and crisp and small contents', TRUE),
  
  ('Professional', 'meta-llama/llama-3-8b-instruct', 'Craft a professional response to this tweet:
"{tweetContent}".
Use formal language, be concise, and maintain a business-appropriate tone.', FALSE),
  
  ('Engaging', 'meta-llama/llama-3-8b-instruct', 'Create an engaging reply to this tweet:
"{tweetContent}".
Ask a thoughtful question to encourage further conversation while being relevant to the original content.', FALSE),
  
  ('Supportive', 'meta-llama/llama-3-8b-instruct', 'Write a supportive response to this tweet:
"{tweetContent}".
Show empathy, offer encouragement, and be positive while keeping it brief and genuine.', FALSE)
ON CONFLICT DO NOTHING;