/**
 * Test script to verify Twitter API connection with DNS resolution fallback
 */

require('dotenv').config();
const { axiosWithRetry } = require('../utils/apiUtils');

// Get Twitter API credentials from environment variables
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

async function testTwitterApiConnection() {
  console.log('Testing Twitter API connection with DNS resolution fallback...');
  
  try {
    // Test connection to Twitter API using the bearer token
    console.log('Attempting to connect to Twitter API...');
    
    const response = await axiosWithRetry({
      method: 'get',
      url: 'https://api.twitter.com/2/tweets/search/recent',
      params: {
        query: 'test',
        max_results: 10
      },
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`
      }
    }, {
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 30000,
      forceDnsResolution: true // Enable DNS resolution fallback
    });
    
    console.log('✅ Twitter API connection successful!');
    console.log(`Received ${response.data.meta?.result_count || 0} tweets`);
    return true;
  } catch (error) {
    console.error('❌ Twitter API connection failed:');
    console.error(`Error message: ${error.message}`);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    
    return false;
  }
}

// Run the test
testTwitterApiConnection()
  .then(success => {
    if (success) {
      console.log('Test completed successfully.');
    } else {
      console.log('Test failed. Please check the error messages above.');
    }
  })
  .catch(err => {
    console.error('Unexpected error during test:', err);
  });