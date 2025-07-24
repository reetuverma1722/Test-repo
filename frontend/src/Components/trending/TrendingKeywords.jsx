import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material';
import {
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  TrendingUp as TrendingUpIcon,
  Tag as TagIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { getCombinedTrending, getTwitterTrending, getLinkedInTrending } from '../../services/trendingService';

const TrendingKeywords = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendingData, setTrendingData] = useState({
    twitter: null,
    linkedin: null,
    combined: null
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch trending data based on active tab
  const fetchTrendingData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data;
      
      switch (activeTab) {
        case 0: // Combined
          data = await getCombinedTrending();
          setTrendingData(prev => ({ ...prev, combined: data.data }));
          break;
        case 1: // Twitter
          data = await getTwitterTrending();
          setTrendingData(prev => ({ ...prev, twitter: data.data }));
          break;
        case 2: // LinkedIn
          data = await getLinkedInTrending();
          setTrendingData(prev => ({ ...prev, linkedin: data.data }));
          break;
        default:
          break;
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching trending data:', err);
      setError('Failed to fetch trending data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when tab changes
  useEffect(() => {
    fetchTrendingData();
  }, [activeTab]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Render trending hashtags
  const renderTrendingHashtags = (platform) => {
    let data;
    
    switch (platform) {
      case 'twitter':
        data = trendingData.twitter;
        break;
      case 'linkedin':
        data = trendingData.linkedin;
        break;
      case 'combined':
        data = trendingData.combined;
        break;
      default:
        return null;
    }
    
    if (!data) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress color="error" />
        </Box>
      );
    }

    // This is a placeholder rendering - adjust based on actual API response structure
    return (
      <Box>
        {platform === 'combined' && data.analysis && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Common Trends Across Platforms
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {data.analysis.commonTrends && data.analysis.commonTrends.length > 0 ? (
                data.analysis.commonTrends.map((trend, index) => (
                  <Chip
                    key={index}
                    label={trend}
                    icon={<TrendingUpIcon />}
                    color="error"
                    sx={{
                      borderRadius: "16px",
                      px: 1,
                      fontWeight: 500,
                      backgroundColor: "#f44336",
                      color: "#ffffff",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                      '&:hover': {
                        boxShadow: "0 4px 8px rgba(0,0,0,0.12)",
                        backgroundColor: "#e53935",
                      },
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No common trends found
                </Typography>
              )}
            </Box>
          </Box>
        )}

        <Grid container spacing={3}>
          {platform === 'combined' || platform === 'twitter' ? (
            <Grid item xs={12} md={platform === 'combined' ? 6 : 12}>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.8)",
                  height: '100%'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <TwitterIcon sx={{ color: '#1DA1F2' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Twitter Trends
                  </Typography>
                </Box>
                <List dense>
                  {platform === 'combined' 
                    ? (data.analysis?.topTwitterTrends || []).map((trend, index) => (
                        <ListItem key={index} sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <TagIcon sx={{ color: '#1DA1F2' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={trend.name} 
                            secondary={`Volume: ${trend.volume}`} 
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                      ))
                    : (data.twitter?.trends || []).slice(0, 10).map((trend, index) => (
                        <ListItem key={index} sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <TagIcon sx={{ color: '#1DA1F2' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={trend.name || trend.hashtag || trend.text} 
                            secondary={trend.volume ? `Volume: ${trend.volume}` : ''} 
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                      ))
                  }
                </List>
              </Paper>
            </Grid>
          ) : null}

          {platform === 'combined' || platform === 'linkedin' ? (
            <Grid item xs={12} md={platform === 'combined' ? 6 : 12}>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.8)",
                  height: '100%'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <LinkedInIcon sx={{ color: '#0077B5' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    LinkedIn Trends
                  </Typography>
                </Box>
                <List dense>
                  {platform === 'combined' 
                    ? (data.analysis?.topLinkedInTrends || []).map((trend, index) => (
                        <ListItem key={index} sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <TagIcon sx={{ color: '#0077B5' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={trend.name} 
                            secondary={`Volume: ${trend.volume}`} 
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                      ))
                    : (data.linkedin?.trends || []).slice(0, 10).map((trend, index) => (
                        <ListItem key={index} sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <TagIcon sx={{ color: '#0077B5' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={trend.name || trend.hashtag || trend.text} 
                            secondary={trend.volume ? `Volume: ${trend.volume}` : ''} 
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                      ))
                  }
                </List>
              </Paper>
            </Grid>
          ) : null}
        </Grid>
      </Box>
    );
  };

  return (
    <Card elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
      <Box sx={{ height: 6, width: '100%', background: 'linear-gradient(90deg, #f3dddc, #eb8270)' }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ color: '#f44336' }} />
            Trending Keywords & Hashtags
          </Typography>
          <Tooltip title="Refresh data">
            <Chip
              icon={<RefreshIcon />}
              label="Refresh"
              onClick={fetchTrendingData}
              disabled={loading}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.08)',
                }
              }}
            />
          </Tooltip>
        </Box>
        
        {lastUpdated && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
            },
            '& .Mui-selected': {
              color: '#f44336',
              fontWeight: 600,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#f44336',
            },
          }}
        >
          <Tab 
            icon={<BarChartIcon />} 
            iconPosition="start" 
            label="Analytics" 
          />
          <Tab 
            icon={<TwitterIcon />} 
            iconPosition="start" 
            label="Twitter" 
          />
          <Tab 
            icon={<LinkedInIcon />} 
            iconPosition="start" 
            label="LinkedIn" 
          />
        </Tabs>
        
        <Box sx={{ minHeight: 300 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress color="error" />
            </Box>
          ) : (
            <>
              {activeTab === 0 && renderTrendingHashtags('combined')}
              {activeTab === 1 && renderTrendingHashtags('twitter')}
              {activeTab === 2 && renderTrendingHashtags('linkedin')}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrendingKeywords;