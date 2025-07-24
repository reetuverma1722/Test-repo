const BASE_URL = 'http://localhost:5000/api';

// Helper function for GET requests
const apiGet = async (endpoint, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'API error');
    }

    return result;
  } catch (err) {
    throw new Error(err.message || 'Network error');
  }
};

// Get Twitter trending hashtags
export const getTwitterTrending = async (token = null) => {
  return await apiGet('/trending/twitter', token);
};

// Get LinkedIn trending hashtags
export const getLinkedInTrending = async (token = null) => {
  return await apiGet('/trending/linkedin', token);
};

// Get combined trending data from both platforms
export const getCombinedTrending = async (token = null) => {
  return await apiGet('/trending', token);
};

export default {
  getTwitterTrending,
  getLinkedInTrending,
  getCombinedTrending
};