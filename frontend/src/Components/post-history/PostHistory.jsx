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
  IconButton
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon
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
                      {account.account_name} (@{account.account_handle})
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
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2">
                              Likes: <strong>{post.likes_count || 0}</strong>
                            </Typography>
                            <Typography variant="body2">
                              Retweets: <strong>{post.retweets_count || 0}</strong>
                            </Typography>
                            <Typography variant="body2">
                              Total: <strong>{post.engagement_count || 0}</strong>
                            </Typography>
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
                              'Repost'
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
    </Box>
  );
};

export default PostHistory;