// create-test-user.js
const pool = require('../db');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Check if user already exists
    const checkResult = await pool.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    
    if (checkResult.rows.length > 0) {
      console.log('Test user already exists.');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert the user
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      ['test@example.com', hashedPassword, 'Test User']
    );
    
    console.log('Test user created successfully:', result.rows[0]);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
createTestUser();