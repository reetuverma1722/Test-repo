// import axios from 'axios';

// export const fetchTweets = async (keyword) => {
//   const response = await axios.get(`https://api.twitter.com/2/tweets/search/recent?query=${keyword}`);
//   return response.data.data;
// };

const BASE_URL = 'http://localhost:5000/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const apiPost = async (endpoint, data, token = null) => {
  try {
    const headers = {
      ...defaultHeaders,
      // Always include Authorization header, even with a dummy token for development
      Authorization: `Bearer ${token || 'dummy-token'}`,
    };
    
    // Add user data from localStorage if available
    const userStr = localStorage.getItem('user');
    if (userStr) {
      headers['X-User-Data'] = userStr;
    }
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
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
