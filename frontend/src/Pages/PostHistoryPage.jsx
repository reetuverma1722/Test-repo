import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  ListItemIcon,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab
} from '@mui/material';
import { Twitter as TwitterIcon, LinkedIn as LinkedInIcon } from '@mui/icons-material';
import PostHistory from '../Components/post-history/PostHistory';
import LinkedInPostHistory from '../Components/post-history/LinkedInPostHistory';
import { CircleNotifications, CircleNotificationsOutlined } from '@mui/icons-material';

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`post-history-tabpanel-${index}`}
      aria-labelledby={`post-history-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Accessibility props for tabs
function a11yProps(index) {
  return {
    id: `post-history-tab-${index}`,
    'aria-controls': `post-history-tabpanel-${index}`,
  };
}

const PostHistoryPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: 4,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
               fontWeight: 600,
                      mb: 0.5,
                      color: "#4896a1"
            }}
          >
            Post History
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{fontSize:'0.9rem'}}  >
            View and manage your social media post history
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="post history tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 60,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          <Tab
            icon={<TwitterIcon sx={{ color: '#1DA1F2' }} />}
            label="Twitter"
            iconPosition="start"
            sx={{
              '&.Mui-selected': {
                color: '#1DA1F2',
              },
            }}
            {...a11yProps(0)}
          />
          <Tab
            icon={<LinkedInIcon sx={{ color: '#0077B5' }} />}
            label="LinkedIn"
            iconPosition="start"
            sx={{
              '&.Mui-selected': {
                color: '#0077B5',
              },
            }}
            {...a11yProps(1)}
          />
        </Tabs>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ display: 'flex', flexDirection: 'column' }} >
        <Grid item xs={12}>
          <TabPanel value={tabValue} index={0}>
            <PostHistory />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <LinkedInPostHistory />
          </TabPanel>
        </Grid>

       {/* <Grid item xs={12}>
  <Paper
    elevation={3}
    variant="outlined"
    sx={{
      p: 3,
      borderRadius: 4,
      background: 'linear-gradient(135deg, #ffffffcc, #f5f5f5cc)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
      backdropFilter: 'blur(6px)',
    }}
  >
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
    Post History Overview
    </Typography>

    <Typography variant="body2" sx={{ mb: 3 }}>
      Analyze and manage your social media performance:
    </Typography>

    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <List dense disablePadding>
          <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CircleNotificationsOutlined fontSize="small" sx={{ color: 'primary.main', mt: '4px' }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" fontWeight={600}>Track engagement</Typography>}
              secondary={<Typography variant="body2" color="text.secondary">Monitor likes, retweets, and engagement</Typography>}
            />
          </ListItem>

        
        </List>
      </Grid>

      <Grid item xs={12} md={6}>
        <List dense disablePadding> 
          <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CircleNotificationsOutlined fontSize="small" sx={{ color: 'primary.main', mt: '4px' }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" fontWeight={600}>Analyze performance</Typography>}
              secondary={<Typography variant="body2" color="text.secondary">See which keywords drive results</Typography>}
            />
          </ListItem>

         
        </List>
      </Grid>
       <Grid item xs={12} md={6}>
        <List dense disablePadding> 
         

          <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CircleNotifications fontSize="small" sx={{ color: 'primary.main', mt: '4px' }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" fontWeight={600}>Manage accounts</Typography>}
              secondary={<Typography variant="body2" color="text.secondary">Switch between multiple profiles</Typography>}
            />
          </ListItem>
        </List>
      </Grid>
        <Grid item xs={12} md={6}>
        <List dense disablePadding> 
         

            <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <CircleNotificationsOutlined fontSize="small" sx={{ color: 'primary.main', mt: '4px' }} />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="body2" fontWeight={600}>Repost content</Typography>}
              secondary={<Typography variant="body2" color="text.secondary">Reshare top posts (after 2 hours)</Typography>}
            />
          </ListItem>
        </List>
      </Grid>
    </Grid>

    <Divider sx={{ my: 3 }} />

    <Typography variant="body2" color="text.secondary">
      Select an account to view its history. Reposting is enabled 2 hours after a post is fetched.
    </Typography>
  </Paper>
</Grid> */}


      </Grid>
    </Box>
  );
};

export default PostHistoryPage;