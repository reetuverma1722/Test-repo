import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DirectLogin = ({ redirectTo = '/social-media-settings' }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // IMPORTANT: This component is used for development/testing purposes only
    // It creates a development authentication token and user object in localStorage
    // This is necessary because the social media connection functionality requires a user ID
    // to associate social media accounts with a user in the database
    
    // In production, this would be replaced with a real authentication flow
    
    // Generate a development token that matches our backend's expected format
    const developmentToken = process.env.REACT_APP_DEV_TOKEN ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjI2MjM5MDIyLCJleHAiOjE2MjYzMjU0MjJ9.3gFPHH5aQnMI3mM3-NUZPIgmKF5rqXzQrQQFQxdEHZs';
    
    // Set the token in localStorage
    localStorage.setItem('token', developmentToken);
    
    // Set development user data in localStorage
    // This user ID is required for the social media OAuth flow to work correctly
    console.log("Setting development token and user for testing");
    const developmentUser = {
      id: process.env.REACT_APP_DEV_USER_ID || 1,
      email: process.env.REACT_APP_DEV_USER_EMAIL || 'test@example.com',
      name: process.env.REACT_APP_DEV_USER_NAME || 'Test User'
    };
    localStorage.setItem('user', JSON.stringify(developmentUser));
    
    // Redirect to the specified page
    navigate(redirectTo);
  }, [navigate, redirectTo]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Logging in automatically...</h2>
      <p>Please wait while we redirect you.</p>
    </div>
  );
};

export default DirectLogin;