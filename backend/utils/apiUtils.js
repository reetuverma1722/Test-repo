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
    shouldRetry = (error) => {
      // Retry on rate limiting (HTTP 429)
      if (error.response && error.response.status === 429) {
        return true;
      }
      
      // Retry on DNS resolution errors (ENOTFOUND, ETIMEDOUT, etc.)
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' ||
          error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED') {
        return true;
      }
      
      return false;
    }
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
        
        // Log different messages based on error type
        if (error.code === 'ENOTFOUND') {
          console.log(`DNS resolution error for ${error.hostname || 'unknown host'}. Retrying in ${delay}ms...`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
          console.log(`Network error (${error.code}). Retrying in ${delay}ms...`);
        } else {
          console.log(`Rate limit or server error. Waiting ${delay}ms before retry...`);
        }
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
 * Resolves a hostname to IP address using Node.js DNS module
 * @param {string} hostname - The hostname to resolve
 * @param {boolean} preferIpv4 - Whether to prefer IPv4 addresses (default: true)
 * @returns {Promise<{address: string, family: number}|null>} - Promise that resolves with the IP address info or null if not found
 */
async function resolveHostname(hostname, preferIpv4 = true) {
  const dns = require('dns').promises;
  try {
    // First try to get all addresses (both IPv4 and IPv6)
    const addresses = await dns.lookup(hostname, { all: true });
    
    if (addresses.length === 0) {
      return null;
    }
    
    // If preferIpv4 is true, try to find an IPv4 address first
    if (preferIpv4) {
      const ipv4Address = addresses.find(addr => addr.family === 4);
      if (ipv4Address) {
        return ipv4Address;
      }
    }
    
    // Otherwise, return the first address
    return addresses[0];
  } catch (error) {
    console.error(`Failed to resolve hostname ${hostname}:`, error.message);
    return null;
  }
}

/**
 * Makes an axios request with retry logic for rate limiting and DNS resolution
 * @param {Object} config - Axios request configuration
 * @param {Object} retryOptions - Options for the retry logic
 * @returns {Promise} - Promise that resolves with the axios response
 */
async function axiosWithRetry(config, retryOptions = {}) {
  // Extract hostname from URL for potential DNS resolution
  let hostname = null;
  try {
    const url = new URL(config.url);
    hostname = url.hostname;
  } catch (error) {
    // Invalid URL, continue with original request
  }

  // Try to resolve hostname if we're having DNS issues
  if (hostname && (retryOptions.forceDnsResolution || retryOptions.currentRetry > 0)) {
    try {
      console.log(`Attempting to manually resolve hostname: ${hostname}`);
      const ipInfo = await resolveHostname(hostname, true); // Prefer IPv4
      
      if (ipInfo) {
        const ip = ipInfo.address;
        const isIpv6 = ipInfo.family === 6;
        
        console.log(`Successfully resolved ${hostname} to ${ip} (IPv${ipInfo.family})`);
        
        try {
          // Parse the original URL
          const originalUrl = new URL(config.url);
          
          // Store the original components
          const protocol = originalUrl.protocol;
          const port = originalUrl.port ? `:${originalUrl.port}` : '';
          const path = originalUrl.pathname + originalUrl.search;
          
          // Format the IP address correctly based on whether it's IPv4 or IPv6
          // IPv6 addresses need to be enclosed in square brackets in URLs
          const formattedIp = isIpv6 ? `[${ip}]` : ip;
          
          // Construct a new URL with the IP address
          // Make sure to keep the protocol, port, and path intact
          config.url = `${protocol}//${formattedIp}${port}${path}`;
          
          console.log(`Reconstructed URL: ${config.url}`);
          
          // Add the original hostname in the headers for SNI (Server Name Indication)
          if (!config.headers) config.headers = {};
          config.headers['Host'] = hostname;
        } catch (urlError) {
          console.error('Error reconstructing URL with IP address:', urlError);
          // If URL reconstruction fails, keep the original URL
        }
      }
    } catch (error) {
      console.error('Error during manual DNS resolution:', error);
    }
  }

  return requestWithRetry(() => axios(config), retryOptions);
}

module.exports = {
  requestWithRetry,
  axiosWithRetry,
  resolveHostname
};