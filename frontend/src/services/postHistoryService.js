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

// Helper function for POST requests
const apiPost = async (endpoint, data = {}, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
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

// Get all social media accounts for the user
export const getAccounts = async (token = null) => {
  return await apiGet('/accounts', token);
};

// Get post history for a specific account
export const getPostHistory = async (id, token = null) => {
  return await apiGet(`/history/${id}`, token);
};

// Repost a specific post
export const repostPost = async (postId, token = null) => {
  return await apiPost(`/repost/${postId}`, {}, token);
};

// Format time since fetch
export const formatTimeSince = (timeSinceMs) => {
  const minutes = Math.floor(timeSinceMs / (1000 * 60));
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

// Check if repost is allowed (not within 2 hours of fetching)
export const isRepostAllowed = (timeSinceMs) => {
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  return timeSinceMs >= twoHoursInMs;
};

export default {
  getAccounts,
  getPostHistory,
  repostPost,
  formatTimeSince,
  isRepostAllowed
};