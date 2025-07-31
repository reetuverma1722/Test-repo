const BASE_URL = 'http://localhost:5000/api';

// Helper function for GET requests
const apiGet = async (endpoint, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    // Add user data from localStorage if available
    const userStr = localStorage.getItem('user');
    if (userStr) {
      headers['X-User-Data'] = userStr;
    }
    
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
  // Get user ID from localStorage
  let userId = null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      userId = user.id;
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }
  
  // If userId is available, include it in the request
  if (userId) {
    return await apiGet(`/accounts/twitter?userId=${userId}`, token);
  } else {
    return await apiGet('/accounts/twitter', token);
  }
};

// Get post history for a specific account
export const getPostHistory = async (id, token = null) => {
  return await apiGet(`/history/${id}`, token);
};

// Repost a specific post
export const repostPost = async (postId, token = null) => {
  return await apiPost(`/repost/${postId}`, {}, token);
};

// Delete a post from history
export const deletePost = async (postId, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    const res = await fetch(`${BASE_URL}/history/${postId}`, {
      method: 'DELETE',
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

// Update engagement metrics for a post
export const updateEngagementMetrics = async (postId, metrics, token = null) => {
  try {
    console.log(`Updating engagement metrics for post ID: ${postId}`, metrics);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    console.log('Request URL:', `${BASE_URL}/update-engagement/${postId}`);
    console.log('Request headers:', headers);
    
    const res = await fetch(`${BASE_URL}/update-engagement/${postId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(metrics),
    });

    console.log('Response status:', res.status);
    
    const result = await res.json();
    console.log('Response data:', result);

    if (!res.ok) {
      console.error('API error:', result);
      return {
        success: false,
        message: result.message || `API error: ${res.status}`,
        error: result
      };
    }

    return result;
  } catch (err) {
    console.error('Network or parsing error:', err);
    return {
      success: false,
      message: err.message || 'Network error',
      error: err
    };
  }
};

// Add a post from search history to post_history
export const addFromSearch = async (postData, token = null) => {
  return await apiPost('/add-from-search', postData, token);
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
  deletePost,
  addFromSearch,
  updateEngagementMetrics,
  formatTimeSince,
  isRepostAllowed
};