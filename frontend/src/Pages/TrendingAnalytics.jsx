import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import TrendingKeywords from '../Components/trending/TrendingKeywords';

const TrendingAnalytics = () => {
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
            Trending Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Discover trending keywords and hashtags across social media platforms
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
  <Grid container spacing={3} sx={{ display: 'flex', flexDirection: 'column' }}>


        <Grid item xs={12}>
          <TrendingKeywords />
        </Grid>

        {/* <Grid item xs={12}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              About Trending Analytics
            </Typography>
            <Typography variant="body2" paragraph>
              This dashboard provides real-time insights into trending keywords and hashtags across Twitter and LinkedIn. 
              Use these insights to:
            </Typography>
            
            <Box component="ul" sx={{ pl: 2 }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>Discover trending topics</strong> - Stay updated with what's trending in your industry
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>Optimize your content</strong> - Incorporate trending keywords into your social media posts
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>Compare platforms</strong> - See differences in trending topics between Twitter and LinkedIn
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2">
                  <strong>Identify opportunities</strong> - Find common trends across platforms for maximum engagement
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Data is fetched from the Trend24 API and updated in real-time. Click the "Refresh" button to get the latest trends.
            </Typography>
          </Paper>
        </Grid> */}
      </Grid>
    </Box>
  );
};

export default TrendingAnalytics;