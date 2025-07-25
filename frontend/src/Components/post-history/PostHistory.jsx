import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Popover,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  Repeat as RepeatIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { getAccounts, getPostHistory, repostPost, formatTimeSince, isRepostAllowed } from '../../services/postHistoryService';

const PostHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [reposting, setReposting] = useState(null);
  const [repostSuccess, setRepostSuccess] = useState(null);
  const [repostError, setRepostError] = useState(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Fetch accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const result = await getAccounts();
        if (result.success && result.data) {
          setAccounts(result.data);
          // Auto-select the first account if available
          if (result.data.length > 0) {
            setSelectedAccount(result.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Failed to fetch accounts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Fetch post history when selected account changes
  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedAccount) return;
      
      try {
        setLoading(true);
        const result = await getPostHistory(selectedAccount);
        if (result.success && result.data) {
          setPosts(result.data);
        }
      } catch (err) {
        console.error('Error fetching post history:', err);
        setError('Failed to fetch post history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedAccount]);

  // Handle account change
  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
    setPage(0); // Reset to first page when changing accounts
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle repost
  const handleRepost = async (postId) => {
    try {
      setReposting(postId);
      setRepostError(null);
      setRepostSuccess(null);
      
      const result = await repostPost(postId);
      
      if (result.success) {
        setRepostSuccess(`Post successfully reposted!`);
        
        // Refresh the post history
        const updatedResult = await getPostHistory(selectedAccount);
        if (updatedResult.success && updatedResult.data) {
          setPosts(updatedResult.data);
        }
      }
    } catch (err) {
      console.error('Error reposting:', err);
      setRepostError(`Failed to repost: ${err.message}`);
    } finally {
      setReposting(null);
      
      // Clear success/error messages after 3 seconds
      setTimeout(() => {
        setRepostSuccess(null);
        setRepostError(null);
      }, 3000);
    }
  };

  // Get platform icon
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

  // Get selected account
  const getSelectedAccountDetails = () => {
    return accounts.find(account => account.id === selectedAccount) || {};
  };

  // Handle engagement view popup
  const handleEngagementViewClick = (event, postId) => {
    setPopoverAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
    setSelectedPostId(null);
  };

  const open = Boolean(popoverAnchorEl);

  // Get the selected post data
  const getSelectedPost = () => {
    return posts.find(post => post.id === selectedPostId) || {};
  };

  return (
    <Box>
      {/* Header */}
      

      {/* Account Selection */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ p: 3, mb: 3, borderRadius: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel id="account-select-label">Select Account</InputLabel>
            <Select
              labelId="account-select-label"
              id="account-select"
              value={selectedAccount}
              onChange={handleAccountChange}
              label="Select Account"
              disabled={loading || accounts.length === 0}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getPlatformIcon(account.platform)}
                    <Typography>
                      {account.accountName} (@{account.account_handle})
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedAccount && (
            <Chip 
              icon={getPlatformIcon(getSelectedAccountDetails().platform)}
              label={`${getSelectedAccountDetails().platform || 'Account'}`}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Status Messages */}
      {repostSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {repostSuccess}
        </Alert>
      )}
      
      {repostError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {repostError}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Post History Table */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ borderRadius: 3, overflow: 'hidden' }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
              <TableRow>
                <TableCell>Post Content</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Posted At</TableCell>
                <TableCell>Engagement</TableCell>
                <TableCell>Last Fetched</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress color="error" size={40} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading post history...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No post history found for this account.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                posts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((post) => {
                    const timeSinceMs = new Date() - new Date(post.created_at);
                    const canRepost = isRepostAllowed(timeSinceMs);
                    
                    return (
                      <TableRow key={post.id} hover>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {post.post_text}
                          </Typography>
                          {post.post_url && (
                            <Tooltip title="Open post">
                              <IconButton 
                                size="small" 
                                href={post.post_url} 
                                target="_blank"
                                sx={{ mt: 0.5 }}
                              >
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={post.keyword || 'N/A'} 
                            size="small"
                            sx={{ 
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              color: '#f44336',
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(post.posted_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginLeft:4,color:'#f44336' }}>
                            {/* <Button
                             
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={(e) => handleEngagementViewClick(e, post.id)}
                              sx={{
                                mt: 1,
                                borderRadius: 6,
                                textTransform: 'none',

                                fontSize: '0.75rem',
                                py: 0.5
                              }}
                            >
                              View
                            </Button> */}
                            <VisibilityIcon  onClick={(e) => handleEngagementViewClick(e, post.id)} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {formatTimeSince(timeSinceMs)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<RefreshIcon />}
                            disabled={!canRepost || reposting === post.id}
                            onClick={() => handleRepost(post.id)}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              minWidth: 100
                            }}
                          >
                            {reposting === post.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              'Refetch'
                            )}
                          </Button>
                          {!canRepost && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              display="block"
                              sx={{ mt: 0.5 }}
                            >
                              Available in {formatTimeSince(2 * 60 * 60 * 1000 - timeSinceMs)}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={posts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Engagement Popup */}
      <Popover
        open={open}
        anchorEl={popoverAnchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPopover-paper': {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }
        }}
      >
        <Card sx={{ width: 300, overflow: 'hidden' }}>
          <Box sx={{
            bgcolor: 'primary.main',
            color: 'white',
            py: 1.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <BarChartIcon />
            <Typography variant="subtitle1" fontWeight="bold">
              Engagement Details
            </Typography>
          </Box>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Likes */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  bgcolor: 'rgba(244, 67, 54, 0.1)',
                  borderRadius: '50%',
                  p: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <ThumbUpIcon sx={{ color: '#f44336' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Likes
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().likes_count || 0}
                  </Typography>
                </Box>
              </Box>
              
              <Divider />
              
              {/* Retweets */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  bgcolor: 'rgba(33, 150, 243, 0.1)',
                  borderRadius: '50%',
                  p: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <RepeatIcon sx={{ color: '#2196f3' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Retweets
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().retweets_count || 0}
                  </Typography>
                </Box>
              </Box>
              
              <Divider />
              
              {/* Total Engagement */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '50%',
                  p: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <BarChartIcon sx={{ color: '#4caf50' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Engagement
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().engagement_count || 0}
                  </Typography>
                </Box>
              </Box>
              
              {/* Engagement Rate (if available) */}
              {getSelectedPost().engagement_rate && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      bgcolor: 'rgba(156, 39, 176, 0.1)',
                      borderRadius: '50%',
                      p: 1,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <BarChartIcon sx={{ color: '#9c27b0' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Engagement Rate
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {getSelectedPost().engagement_rate}%
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
};

export default PostHistory;