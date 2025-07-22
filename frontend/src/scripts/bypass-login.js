// bypass-login.js
// This script sets a dummy token in localStorage to bypass login
// Run this in the browser console when on the login page

(function() {
  // Generate a dummy token that matches our backend's expected format
  const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjI2MjM5MDIyLCJleHAiOjE2MjYzMjU0MjJ9.3gFPHH5aQnMI3mM3-NUZPIgmKF5rqXzQrQQFQxdEHZs';
  
  // Set the token in localStorage
  localStorage.setItem('token', dummyToken);
  
  // Redirect to the social media settings page
  window.location.href = '/social-media-settings';
  
  console.log('Login bypassed! Redirecting to social media settings...');
})();