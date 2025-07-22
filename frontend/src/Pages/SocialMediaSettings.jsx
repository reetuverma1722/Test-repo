import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Divider,
  useTheme,
  Alert,
  Snackbar,
  Button
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import TwitterKeywords from "../Components/social-media/TwitterKeywords";
import SocialMediaAccounts from "../Components/social-media/SocialMediaAccounts";

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`social-media-tabpanel-${index}`}
      aria-labelledby={`social-media-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 2, sm: 2, md: 2, lg: 2, xl: 1.5 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `social-media-tab-${index}`,
    'aria-controls': `social-media-tabpanel-${index}`,
  };
}

const SocialMediaSettings = () => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [successAlert, setSuccessAlert] = useState({
    open: false,
    message: ""
  });
  const [user, setUser] = useState(null);

  // Check if user is logged in and get user data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      // If in development mode, set a dummy token
      if (process.env.NODE_ENV === 'development') {
        console.log('Setting dummy token for development');
        const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjI2MjM5MDIyLCJleHAiOjE2MjYzMjU0MjJ9.3gFPHH5aQnMI3mM3-NUZPIgmKF5rqXzQrQQFQxdEHZs';
        localStorage.setItem('token', dummyToken);
        localStorage.setItem('user', JSON.stringify({id: 1, name: 'Test User'}));
        setUser({id: 1, name: 'Test User'});
      }
    } else {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    // Check URL parameters for account connection success
    const params = new URLSearchParams(location.search);
    const accountConnected = params.get('accountConnected');
    const platform = params.get('platform');
    const name = params.get('name');
    
    if (accountConnected === 'true' && platform && name) {
      // Show success message
      setSuccessAlert({
        open: true,
        message: `Successfully connected ${platform} account: ${name}`
      });
      
      // Switch to the Account Settings tab
      setTabValue(1);
      
      // Clear the URL parameters
      navigate('/social-media-settings', { replace: true });
    }
  }, [location, navigate]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '100%', md: 1200, lg: 1400, xl: 1600 }, mx: 'auto' }}>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 600,
          color: theme.palette.primary.main
        }}
      >
        Social Media Settings
      </Typography>
      
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="social media settings tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 500,
              }
            }}
          >
            <Tab label="Twitter Keywords" {...a11yProps(0)} />
            <Tab label="Account Settings" {...a11yProps(1)} />
            <Tab label="Automation Rules" {...a11yProps(2)} disabled />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <TwitterKeywords />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <SocialMediaAccounts />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1" color="text.secondary">
            Automation rules will be available soon.
          </Typography>
        </TabPanel>
      </Paper>
      
      {/* Not Logged In Warning */}
      {!user && (
        <Alert
          severity="warning"
          sx={{ mt: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          }
        >
          You must be logged in to connect and manage social media accounts.
        </Alert>
      )}
      
      {/* Success Alert */}
      <Snackbar
        open={successAlert.open}
        autoHideDuration={6000}
        onClose={() => setSuccessAlert({ ...successAlert, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessAlert({ ...successAlert, open: false })}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successAlert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocialMediaSettings;