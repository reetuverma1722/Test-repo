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

// Get LinkedIn accounts for the user
export const getLinkedInAccounts = async (token = null) => {
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
    return await apiGet(`/accounts/linkedin?userId=${userId}`, token);
  } else {
    return await apiGet('/accounts/linkedin', token);
  }
};

// Get post history for a specific account
export const getPostHistory = async (id, token = null) => {
  return await apiGet(`/history/${id}`, token);
};


export const getPostHistoryall=async()=>{
  return await apiGet('/historyAll')
}

// Get LinkedIn post history for a specific account
export const getLinkedInPostHistory = async (id, token = null) => {
  return await apiGet(`/history/linkedin/${id}`, token);
};

// Repost a specific post
export const repostPost = async (postId, token = null) => {
  return await apiPost(`/repost/${postId}`, {}, token);
};

// Repost a specific LinkedIn post
export const repostLinkedInPost = async (postId, token = null) => {
  return await apiPost(`/repost/linkedin/${postId}`, {}, token);
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

// Delete a LinkedIn post from history
export const deleteLinkedInPost = async (postId, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    const res = await fetch(`${BASE_URL}/history/linkedin/${postId}`, {
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
  // Ensure postId is a string
  postId = String(postId);
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

// Update engagement metrics for a LinkedIn post
export const updateLinkedInEngagementMetrics = async (postId, metrics, token = null) => {
  // Ensure postId is a string
  postId = String(postId);
  try {
    console.log(`Updating LinkedIn engagement metrics for post ID: ${postId}`, metrics);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    console.log('Request URL:', `${BASE_URL}/update-engagement/linkedin/${postId}`);
    console.log('Request headers:', headers);
    
    const res = await fetch(`${BASE_URL}/update-engagement/linkedin/${postId}`, {
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

// Scrape engagement data for a reply ID
export const scrapeReplyEngagement = async (replyId, accountId, token = null) => {
  try {
    console.log(`Scraping engagement for reply ID: ${replyId}`);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || 'dummy-token'}`,
    };

    const body = JSON.stringify({ replyId, accountId });

    console.log('Request URL:', `${BASE_URL}/scrape-reply-engagement`);
    console.log('Request headers:', headers);
    console.log('Request body:', body);

    const res = await fetch(`${BASE_URL}/scrape-reply-engagement`, {
      method: 'POST',
      headers,
      body,
    });
  console.log(body,"body");
    console.log('Response status:', res.status);

    const result = await res.json();
    console.log('Response data:', result);

    if (!res.ok) {
      console.error('API error:', result);
      return {
        success: false,
        message: result.message || `API error: ${res.status}`,
        error: result,
      };
    }

    return result;
  } catch (err) {
    console.error('Network or parsing error:', err);
    return {
      success: false,
      message: err.message || 'Network error',
      error: err,
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
  getLinkedInAccounts,
  getPostHistory,
  getLinkedInPostHistory,
  repostPost,
  repostLinkedInPost,
  deletePost,
  deleteLinkedInPost,
  addFromSearch,
  updateEngagementMetrics,
  updateLinkedInEngagementMetrics,
  scrapeReplyEngagement,
  formatTimeSince,
  isRepostAllowed
};