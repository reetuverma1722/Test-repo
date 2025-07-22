// test-keyword-api.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = null;

// Login to get token
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    token = response.data.token;
    console.log('Login successful, token received');
    return token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test creating a keyword
async function createKeyword() {
  try {
    console.log('\nCreating keyword...');
    const response = await axios.post(
      `${BASE_URL}/keywords`,
      {
        text: 'TestKeyword',
        minLikes: 5,
        minRetweets: 2,
        minFollowers: 1000
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('Keyword created successfully:', response.data);
    return response.data.data.id;
  } catch (error) {
    console.error('Create keyword failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test getting all keywords
async function getKeywords() {
  try {
    console.log('\nGetting all keywords...');
    const response = await axios.get(
      `${BASE_URL}/keywords`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('Keywords retrieved successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get keywords failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test updating a keyword
async function updateKeyword(id) {
  try {
    console.log(`\nUpdating keyword with ID ${id}...`);
    const response = await axios.put(
      `${BASE_URL}/keywords/${id}`,
      {
        text: 'UpdatedKeyword',
        minLikes: 10,
        minRetweets: 5,
        minFollowers: 2000
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('Keyword updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Update keyword failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test deleting a keyword
async function deleteKeyword(id) {
  try {
    console.log(`\nDeleting keyword with ID ${id}...`);
    const response = await axios.delete(
      `${BASE_URL}/keywords/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('Keyword deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Delete keyword failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run all tests
async function runTests() {
  try {
    await login();
    const keywordId = await createKeyword();
    await getKeywords();
    await updateKeyword(keywordId);
    await deleteKeyword(keywordId);
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTests failed:', error.message);
  }
}

// Run the tests
runTests();