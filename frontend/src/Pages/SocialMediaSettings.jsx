import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Divider,
  useTheme
} from "@mui/material";
import TwitterKeywords from "../Components/social-media/TwitterKeywords";

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
        <Box sx={{ p: 3 }}>
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

  // Ensure a token is set for API calls
  useEffect(() => {
    // Check if token exists, if not set a dummy token for development
    if (!localStorage.getItem('token')) {
      console.log('Setting dummy token for development');
      const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjI2MjM5MDIyLCJleHAiOjE2MjYzMjU0MjJ9.3gFPHH5aQnMI3mM3-NUZPIgmKF5rqXzQrQQFQxdEHZs';
      localStorage.setItem('token', dummyToken);
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
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
            <Tab label="Account Settings" {...a11yProps(1)} disabled />
            <Tab label="Automation Rules" {...a11yProps(2)} disabled />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <TwitterKeywords />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1" color="text.secondary">
            Account settings will be available soon.
          </Typography>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1" color="text.secondary">
            Automation rules will be available soon.
          </Typography>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SocialMediaSettings;