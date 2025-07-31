import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  getAccounts, 
  createPost, 
  getAllPosts 
} from '../../services/postHistoryService';

const PostCreator = ({ onPostCreated }) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    accountId: '',
    postText: '',
    postType: 'draft',
    priority: 'medium',
    scheduledAt: null
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [recentPosts, setRecentPosts] = useState([]);

  // Fetch accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getAccounts();
        if (result.success && result.data) {
          setAccounts(result.data);
          if (result.data.length > 0) {
            setFormData(prev => ({ ...prev, accountId: result.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Failed to fetch accounts');
      }
    };

    const fetchRecentPosts = async () => {
      try {
        const result = await getAllPosts({ postType: 'manual' });
        if (result.success && result.data) {
          setRecentPosts(result.data.slice(0, 3)); // Show last 3 posts
        }
      } catch (err) {
        console.error('Error fetching recent posts:', err);
      }
    };

    fetchAccounts();
    fetchRecentPosts();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.accountId) {
      setError('Please select an account');
      return false;
    }
    if (!formData.postText.trim()) {
      setError('Please enter post content');
      return false;
    }
    if (formData.postText.length > 280) {
      setError('Post content must be 280 characters or less');
      return false;
    }
    return true;
  };

  const handleCreatePost = async (postType = 'draft') => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const postData = {
        ...formData,
        postType: postType
      };

      const result = await createPost(postData);

      if (result.success) {
        setSuccess(`Post ${postType === 'draft' ? 'saved as draft' : 'created'} successfully!`);
        
        // Reset form
        setFormData(prev => ({
          ...prev,
          postText: '',
          scheduledAt: null
        }));

        // Notify parent component
        if (onPostCreated) {
          onPostCreated(result.data);
        }

        // Refresh recent posts
        const recentResult = await getAllPosts({ postType: 'manual' });
        if (recentResult.success && recentResult.data) {
          setRecentPosts(recentResult.data.slice(0, 3));
        }
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError(`Failed to create post: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSchedulePost = async () => {
    if (!validateForm()) return;
    if (!formData.scheduledAt) {
      setError('Please select a schedule time');
      return;
    }

    await handleCreatePost('scheduled');
    setShowScheduleDialog(false);
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'twitter':
        return <TwitterIcon sx={{ color: '#1DA1F2' }} />;
      case 'linkedin':
        return <LinkedInIcon sx={{ color: '#0077B5' }} />;
      default:
        return null;
    }
  };

  const getSelectedAccount = () => {
    return accounts.find(account => account.id === formData.accountId) || {};
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'pending': return 'warning';
      case 'draft': return 'default';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Grid container spacing={3}>
          {/* Post Creator */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Create New Post
              </Typography>

              {/* Account Selection */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Account</InputLabel>
                <Select
                  value={formData.accountId}
                  onChange={(e) => handleInputChange('accountId', e.target.value)}
                  label="Select Account"
                >
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getPlatformIcon(account.platform)}
                        <Typography>
                          {account.account_name} ({account.platform})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Post Content */}
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Post Content"
                value={formData.postText}
                onChange={(e) => handleInputChange('postText', e.target.value)}
                placeholder="What's on your mind?"
                sx={{ mb: 2 }}
                helperText={`${formData.postText.length}/280 characters`}
                error={formData.postText.length > 280}
              />

              {/* Priority Selection */}
              <FormControl sx={{ minWidth: 120, mb: 3 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              {/* Status Messages */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={() => handleCreatePost('draft')}
                  disabled={loading}
                >
                  Save Draft
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setShowScheduleDialog(true)}
                  disabled={loading}
                >
                  Schedule
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  onClick={() => handleCreatePost('manual')}
                  disabled={loading}
                >
                  Create Post
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Recent Posts */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Recent Posts
              </Typography>

              {recentPosts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No recent posts found
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recentPosts.map((post) => (
                    <Card key={post.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {getPlatformIcon(post.platform)}
                          <Typography variant="caption" color="text.secondary">
                            {post.account_name}
                          </Typography>
                          <Chip
                            label={post.status}
                            size="small"
                            color={getStatusColor(post.status)}
                            sx={{ ml: 'auto' }}
                          />
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mb: 1
                          }}
                        >
                          {post.post_text}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            label={post.priority}
                            size="small"
                            color={getPriorityColor(post.priority)}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(post.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Schedule Dialog */}
        <Dialog 
          open={showScheduleDialog} 
          onClose={() => setShowScheduleDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <DateTimePicker
                label="Schedule Date & Time"
                value={formData.scheduledAt}
                onChange={(newValue) => handleInputChange('scheduledAt', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDateTime={new Date()}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchedulePost}
              variant="contained"
              disabled={loading}
            >
              Schedule Post
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PostCreator;