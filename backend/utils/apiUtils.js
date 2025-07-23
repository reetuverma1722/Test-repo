/**
 * Utility functions for API requests with retry logic
 */

const axios = require('axios');

/**
 * Makes an API request with retry logic for rate limiting
 * @param {Function} requestFn - Function that returns a promise for the API request
 * @param {Object} options - Options for the retry logic
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms before first retry (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if request should be retried (default: retry on 429)
 * @returns {Promise} - Promise that resolves with the API response
 */
async function requestWithRetry(requestFn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => error.response && error.response.status === 429
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      // If not the first attempt, log retry information
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount}/${maxRetries} after ${delay}ms delay...`);
      }
      
      // Make the request
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (retryCount < maxRetries && shouldRetry(error)) {
        // Get retry-after header if available
        let retryAfter = 0;
        if (error.response && error.response.headers && error.response.headers['retry-after']) {
          retryAfter = parseInt(error.response.headers['retry-after'], 10) * 1000;
        }
        
        // Calculate delay with exponential backoff
        delay = retryAfter > 0 ? retryAfter : Math.min(delay * 2, maxDelay);
        
        console.log(`Rate limit exceeded. Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // We've exhausted our retries or shouldn't retry
        throw error;
      }
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw lastError;
}

/**
 * Makes an axios request with retry logic for rate limiting
 * @param {Object} config - Axios request configuration
 * @param {Object} retryOptions - Options for the retry logic
 * @returns {Promise} - Promise that resolves with the axios response
 */
async function axiosWithRetry(config, retryOptions = {}) {
  return requestWithRetry(() => axios(config), retryOptions);
}

module.exports = {
  requestWithRetry,
  axiosWithRetry
};