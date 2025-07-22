import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DirectLogin = ({ redirectTo = '/social-media-settings' }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Generate a dummy token that matches our backend's expected format
    const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjI2MjM5MDIyLCJleHAiOjE2MjYzMjU0MjJ9.3gFPHH5aQnMI3mM3-NUZPIgmKF5rqXzQrQQFQxdEHZs';
    
    // Set the token in localStorage
    localStorage.setItem('token', dummyToken);
    
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