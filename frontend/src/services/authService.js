import axios from 'axios'
const BASE_URL = 'http://localhost:5000/api/auth';

// Login with email and password
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

// Register new user
export const register = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Convert Twitter access token to JWT
export const convertTwitterToken = async (accessToken) => {
  try {
    const tweetId = localStorage.getItem("selected_tweet_id");
    const reply = localStorage.getItem("selected_tweet_reply");

    const response = await axios.post(`${BASE_URL}/twitter-to-jwt`, {
      accessToken,
      tweetId,
      reply
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'] ||
                         error.response.data?.retryAfter;

      throw {
        isRateLimit: true,
        retryAfter: parseInt(retryAfter, 10),
        message: 'Twitter rate limit exceeded. Please try again later.',
        ...error.response?.data
      };
    }

    throw error.response?.data || { message: 'Twitter authentication failed' };
  }
};


// Logout
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('twitter_access_token');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export default {
  login,
  register,
  convertTwitterToken,
  logout,
  isAuthenticated
};
