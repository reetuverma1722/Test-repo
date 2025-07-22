import { apiPost } from './api';

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

// Helper function for DELETE requests
const apiDelete = async (endpoint, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
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

// Helper function for PUT requests
const apiPut = async (endpoint, data, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Always include Authorization header, even with a dummy token for development
    headers.Authorization = `Bearer ${token || 'dummy-token'}`;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
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

// Get all keywords
export const getKeywords = async (token = null) => {
  return await apiGet('/keywords', token);
};

// Add a new keyword
export const addKeyword = async (keywordData, token = null) => {
  return await apiPost('/keywords', keywordData, token);
};

// Update a keyword
export const updateKeyword = async (id, keywordData, token = null) => {
  return await apiPut(`/keywords/${id}`, keywordData, token);
};

// Delete a keyword (soft delete)
export const deleteKeyword = async (id, token = null) => {
  return await apiDelete(`/keywords/${id}`, token);
};

// Get filtered keywords
export const getFilteredKeywords = async (filters, token = null) => {
  const queryParams = new URLSearchParams();
  
  if (filters.text) queryParams.append('text', filters.text);
  if (filters.minLikes) queryParams.append('minLikes', filters.minLikes);
  if (filters.minRetweets) queryParams.append('minRetweets', filters.minRetweets);
  if (filters.minFollowers) queryParams.append('minFollowers', filters.minFollowers);
  
  return await apiGet(`/keywords/filter?${queryParams.toString()}`, token);
};