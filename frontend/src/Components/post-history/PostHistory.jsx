import React, { useState, useEffect } from "react";
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
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  Repeat as RepeatIcon,
  BarChart as BarChartIcon,
  Delete as DeleteIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import {
  getAccounts,
  getPostHistory,
  repostPost,
  formatTimeSince,
  isRepostAllowed,
  deletePost,
  updateEngagementMetrics,
  scrapeReplyEngagement,
} from "../../services/postHistoryService";

const PostHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [reposting, setReposting] = useState(null);
  const [repostSuccess, setRepostSuccess] = useState(null);
  const [repostError, setRepostError] = useState(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [loadingEngagement, setLoadingEngagement] = useState(false);

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
        console.error("Error fetching accounts:", err);
        setError("Failed to fetch accounts. Please try again later.");
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
        console.error("Error fetching post history:", err);
        setError("Failed to fetch post history. Please try again later.");
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
      console.error("Error reposting:", err);
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

  // Handle delete
  const handleDelete = async (postId) => {
    try {
      setDeleting(postId);
      setDeleteError(null);
      setDeleteSuccess(null);

      const result = await deletePost(postId);

      if (result.success) {
        setDeleteSuccess(`Post successfully deleted!`);

        // Refresh the post history
        const updatedResult = await getPostHistory(selectedAccount);
        if (updatedResult.success && updatedResult.data) {
          setPosts(updatedResult.data);
        }
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      setDeleteError(`Failed to delete: ${err.message}`);
    } finally {
      setDeleting(null);

      // Clear success/error messages after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
        setDeleteError(null);
      }, 3000);
    }
  };

  // Handle update engagement metrics using real reply ID scraping
  const handleUpdateEngagement = async (postId) => {
    try {
      setUpdating(postId);
      setUpdateError(null);
      setUpdateSuccess(null);

      console.log(`Updating engagement metrics for post ID: ${postId}`);

      // Find the post to get the reply_id
      const post = posts.find(p => p.id === parseInt(postId));
      if (!post) {
        setUpdateError('Post not found');
        return;
      }

      console.log('Found post:', post);

      // Check if the post has a reply_id
      if (!post.reply_id) {
        setUpdateError('No reply ID found for this post. Only posts with reply IDs can have engagement scraped.');
        return;
      }

      console.log(`Scraping engagement for reply ID: ${post.reply_id}`);

      // Call the scraping service to get real engagement data
      const scrapeResult = await scrapeReplyEngagement(post.reply_id,post.account_id);
      
      if (!scrapeResult.success) {
        setUpdateError(`Failed to scrape engagement: ${scrapeResult.message || 'Unknown error'}`);
        return;
      }

      console.log('Scraped engagement data:', scrapeResult.data);

      // Extract metrics from scraped data
      const metrics = {
        likes_count: scrapeResult.data.likes || 0,
        retweets_count: scrapeResult.data.retweets || 0,
        replies_count: scrapeResult.data.replies || 0,
        views_count: scrapeResult.data.views || 0
      };

      console.log("Metrics to update:", metrics);
      
      // Update the database with the scraped metrics
      const updateResult = await updateEngagementMetrics(postId, metrics);
      console.log("Update result:", updateResult);

      if (updateResult.success) {
        setUpdateSuccess(`Reply engagement metrics updated successfully! Scraped real data: ${metrics.likes_count} likes, ${metrics.retweets_count} retweets, ${metrics.replies_count} replies, ${metrics.views_count} views.`);

        // Refresh the post history to show updated data
        const updatedResult = await getPostHistory(selectedAccount);
        if (updatedResult.success && updatedResult.data) {
          setPosts(updatedResult.data);
        }
      } else {
        setUpdateError(`Failed to update database: ${updateResult.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error updating engagement metrics:", err);
      setUpdateError(`Failed to update: ${err.message}`);
    } finally {
      setUpdating(null);

      // Clear success/error messages after 5 seconds
      setTimeout(() => {
        setUpdateSuccess(null);
        setUpdateError(null);
      }, 5000);
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case "twitter":
        return <TwitterIcon sx={{ color: "#1DA1F2" }} />;
      case "linkedin":
        return <LinkedInIcon sx={{ color: "#0077B5" }} />;
      default:
        return null;
    }
  };

  // Get selected account
  const getSelectedAccountDetails = () => {
    return accounts.find((account) => account.id === selectedAccount) || {};
  };

  // Handle engagement view popup with real-time scraping
  const handleEngagementViewClick = async (event, postId) => {
    setPopoverAnchorEl(event.currentTarget);
    setSelectedPostId(postId);

    // Find the post to get the reply_id
    const post = posts.find(p => p.id === postId);
    if (!post) {
      console.error('Post not found');
      return;
    }

    // Check if the post has a reply_id
    if (!post.reply_id) {
      console.log('No reply ID found for this post - showing existing data');
      return;
    }

    console.log(`Fetching real-time engagement for reply ID: ${post.reply_id}`);
    setLoadingEngagement(true);

    try {
      // Call the scraping service to get real engagement data
      const scrapeResult = await scrapeReplyEngagement(post.reply_id,post.account_id);
      
      if (scrapeResult.success && scrapeResult.data) {
        console.log('Scraped engagement data:', scrapeResult.data);
        
        // Update the post data in the local state with scraped metrics
        const updatedPosts = posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likes_count: scrapeResult.data.likes || 0,
              retweets_count: scrapeResult.data.retweets || 0,
              replies_count: scrapeResult.data.replies || 0,
              views_count: scrapeResult.data.views || 0
            };
          }
          return p;
        });
        
        setPosts(updatedPosts);
      } else {
        console.error('Failed to scrape engagement:', scrapeResult.message);
      }
    } catch (err) {
      console.error('Error scraping engagement:', err);
    } finally {
      setLoadingEngagement(false);
    }
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
    setSelectedPostId(null);
  };

  const open = Boolean(popoverAnchorEl);

  // Get the selected post data
  const getSelectedPost = () => {
    return posts.find((post) => post.id === selectedPostId) || {};
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <FormControl sx={{ minWidth: 250, height:"40px" }}>
            <InputLabel id="account-select-label">Select Account</InputLabel>
            <Select
              labelId="account-select-label"
              id="account-select"
              value={selectedAccount}
              onChange={handleAccountChange}
              label="Select Account"
              disabled={loading || accounts.length === 0}
              sx={{height:"50px"}}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 ,mt:1}}>
                    {getPlatformIcon(account.platform)}
                    <Typography sx={{display:"flex",justifyContent:"center",textAlign:"center",height:"0.8rem"}}>{account.accountName}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedAccount && (
            <Chip
              icon={getPlatformIcon(getSelectedAccountDetails().platform)}
              label={`${getSelectedAccountDetails().platform || "Account"}`}
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

      {deleteSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {deleteSuccess}
        </Alert>
      )}

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deleteError}
        </Alert>
      )}

      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {updateSuccess}
        </Alert>
      )}

      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {updateError}
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
        sx={{ borderRadius: 3, overflow: "hidden" }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
              <TableRow>
                <TableCell>Post Content</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Posted At</TableCell>
               
                <TableCell>Last Posted</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress color="error" size={40} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 2 }}
                    >
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
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
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
                            label={post.keyword || "N/A"}
                            size="small"
                            sx={{
                              backgroundColor: "#E5EFEE",
                              color: "#3A7A82",
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(post.posted_at).toLocaleString()}
                        </TableCell>
                       
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <AccessTimeIcon fontSize="small" color="#4896a1" />
                            <Typography sx={{mt:'15px'}}>
                              {formatTimeSince(timeSinceMs)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "center",
                            }}
                          >
                           

                            <Tooltip title="Delete post">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDelete(post.id)}
                                disabled={deleting === post.id}
                                sx={{
                                  border: "none",
                                  borderRadius: 1,
                                 
                                }}
                              >
                                {deleting === post.id ? (
                                  <CircularProgress size={20} color="#4896a1" />
                                ) : (
                                  <DeleteIcon fontSize="small" sx={{color:"#686666ff"}}/>
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
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
          vertical: "center",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "left",
        }}
        sx={{
          "& .MuiPopover-paper": {
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          },
        }}
      >
        <Card sx={{ width: 300, overflow: "hidden" }}>
          <Box
            sx={{
              bgcolor: "#4896a1",
              color: "black",
              py: 1.5,
              px: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <BarChartIcon sx={{color:"white"}}/>
            <Typography variant="subtitle1" fontWeight="bold" sx={{color:"white",fontSize:"0.96rem"}}>
              Reply Engagement Details
            </Typography>
          </Box>
          <CardContent>
            {loadingEngagement ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
                <CircularProgress color="primary" size={40} />
                <Typography variant="body2" color="text.secondary">
                  Scraping real-time engagement data...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Likes */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: "rgba(244, 67, 54, 0.1)",
                    borderRadius: "50%",
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ThumbUpIcon sx={{ color: "#f44336" }} />
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: "rgba(33, 150, 243, 0.1)",
                    borderRadius: "50%",
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <RepeatIcon sx={{ color: "#2196f3" }} />
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

              {/* Replies */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: "rgba(255, 152, 0, 0.1)",
                    borderRadius: "50%",
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <RepeatIcon sx={{ color: "#ff9800" }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Replies
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().replies_count || 0}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Views */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: "rgba(156, 39, 176, 0.1)",
                    borderRadius: "50%",
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <VisibilityIcon sx={{ color: "#9c27b0" }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Views
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().views_count || 0}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Total Engagement */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: "rgba(76, 175, 80, 0.1)",
                    borderRadius: "50%",
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <BarChartIcon sx={{ color: "#4caf50" }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Engagement
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {(getSelectedPost().likes_count || 0) + (getSelectedPost().retweets_count || 0) + (getSelectedPost().replies_count || 0)}
                  </Typography>
                </Box>
              </Box>

              {/* Engagement Rate (if available) */}
              {getSelectedPost().engagement_rate && (
                <>
                  <Divider />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        bgcolor: "rgba(156, 39, 176, 0.1)",
                        borderRadius: "50%",
                        p: 1,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <BarChartIcon sx={{ color: "#9c27b0" }} />
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
           )}
         </CardContent>
        </Card>
      </Popover>
    </Box>
  );
};

export default PostHistory;
