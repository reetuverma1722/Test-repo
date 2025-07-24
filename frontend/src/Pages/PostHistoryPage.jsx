import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  ListItemIcon,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import PostHistory from '../Components/post-history/PostHistory';
import { CircleNotifications, CircleNotificationsOutlined } from '@mui/icons-material';

const PostHistoryPage = () => {
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
              fontWeight: 700,
              mb: 0.5,
              color: '#a71900ff',
            }}
          >
            Post History
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your social media post history
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ display: 'flex', flexDirection: 'column' }}>

        <Grid item xs={12}>
          <PostHistory />
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