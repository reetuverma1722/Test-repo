# Database Update Scripts

This directory contains scripts for updating the database schema and data.

## Update Tweets Table

To add author information columns to the tweets table, run:

```bash
node scripts/update-tweets-table.js
```

This script will:
1. Add new columns to the tweets table: `author_name`, `author_username`, and `profile_image_url`
2. Set default values for existing records
3. Verify that the columns were added successfully

## Running the Script

Make sure you have the database connection details set in your environment variables or update the default values in the script:

- DB_USER (default: 'postgres')
- DB_HOST (default: 'localhost')
- DB_NAME (default: 'buzzly')
- DB_PASSWORD (default: 'alokozay')
- DB_PORT (default: 5432)

After running the script, you should see output confirming that the columns were added successfully.