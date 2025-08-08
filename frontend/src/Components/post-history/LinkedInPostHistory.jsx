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
  LinkedIn as LinkedInIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  BarChart as BarChartIcon,
  Delete as DeleteIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import {
  getLinkedInAccounts,
  getLinkedInPostHistory,
  repostLinkedInPost,
  formatTimeSince,
  isRepostAllowed,
  deleteLinkedInPost,
  updateLinkedInEngagementMetrics,
} from "../../services/postHistoryService";

const LinkedInPostHistory = () => {
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

  // Fetch LinkedIn accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const result = await getLinkedInAccounts();
        if (result.success && result.data) {
          setAccounts(result.data);
          // Auto-select the first account if available
          if (result.data.length > 0) {
            setSelectedAccount(result.data[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching LinkedIn accounts:", err);
        setError("Failed to fetch LinkedIn accounts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Fetch LinkedIn post history when selected account changes
  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedAccount) return;

      try {
        setLoading(true);
        const result = await getLinkedInPostHistory(selectedAccount);
        if (result.success && result.data) {
          setPosts(result.data);
        }
      } catch (err) {
        console.error("Error fetching LinkedIn post history:", err);
        setError("Failed to fetch LinkedIn post history. Please try again later.");
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

      const result = await repostLinkedInPost(postId);

      if (result.success) {
        setRepostSuccess(`LinkedIn post successfully reposted!`);

        // Refresh the post history
        const updatedResult = await getLinkedInPostHistory(selectedAccount);
        if (updatedResult.success && updatedResult.data) {
          setPosts(updatedResult.data);
        }
      }
    } catch (err) {
      console.error("Error reposting LinkedIn post:", err);
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

      const result = await deleteLinkedInPost(postId);

      if (result.success) {
        setDeleteSuccess(`LinkedIn post successfully deleted!`);

        // Refresh the post history
        const updatedResult = await getLinkedInPostHistory(selectedAccount);
        if (updatedResult.success && updatedResult.data) {
          setPosts(updatedResult.data);
        }
      }
    } catch (err) {
      console.error("Error deleting LinkedIn post:", err);
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

  // Handle update engagement metrics
  const handleUpdateEngagement = async (postId) => {
    try {
      setUpdating(postId);
      setUpdateError(null);
      setUpdateSuccess(null);

      console.log(`Updating LinkedIn engagement metrics for post ID: ${postId}`);

      // Simulated LinkedIn engagement metrics
      const metrics = {
        likes_count: Math.floor(Math.random() * 50) + 1,
        comments_count: Math.floor(Math.random() * 20) + 1,
        shares_count: Math.floor(Math.random() * 10) + 1,
      };

      console.log('Using simulated LinkedIn engagement metrics:', metrics);

      const result = await updateLinkedInEngagementMetrics(postId, metrics);

      if (result.success) {
        setUpdateSuccess(`LinkedIn post engagement metrics updated successfully! Likes: ${metrics.likes_count}, Comments: ${metrics.comments_count}, Shares: ${metrics.shares_count}`);

        // Refresh the post history
        const updatedResult = await getLinkedInPostHistory(selectedAccount);
        if (updatedResult.success && updatedResult.data) {
          setPosts(updatedResult.data);
        }
      } else {
        setUpdateError(
          `Failed to update: ${result.message || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Error updating LinkedIn engagement metrics:", err);
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

  // Get selected account
  const getSelectedAccountDetails = () => {
    return accounts.find((account) => account.id === selectedAccount) || {};
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
    return posts.find((post) => post.id === selectedPostId) || {};
  };

  return (
    <Box>
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
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel id="linkedin-account-select-label">Select LinkedIn Account</InputLabel>
            <Select
              labelId="linkedin-account-select-label"
              id="linkedin-account-select"
              value={selectedAccount}
              onChange={handleAccountChange}
              label="Select LinkedIn Account"
              disabled={loading || accounts.length === 0}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LinkedInIcon sx={{ color: "#0077B5" }} />
                    <Typography>{account.accountName}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedAccount && (
            <Chip
              icon={<LinkedInIcon sx={{ color: "#0077B5" }} />}
              label="LinkedIn"
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

      {/* LinkedIn Post History Table */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ borderRadius: 3, overflow: "hidden" }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: "rgba(0, 119, 181, 0.02)" }}>
              <TableRow>
                <TableCell>Post Content</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Posted At</TableCell>
                <TableCell>Engagement</TableCell>
                <TableCell>Last Posted</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress color="primary" size={40} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 2 }}
                    >
                      Loading LinkedIn post history...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No LinkedIn post history found for this account.
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
                            <Tooltip title="Open LinkedIn post">
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
                              backgroundColor: "rgba(0, 119, 181, 0.1)",
                              color: "#0077B5",
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(post.posted_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View detailed LinkedIn engagement">
                            <IconButton
                              size="small"
                              onClick={(e) =>
                                handleEngagementViewClick(e, post.id)
                              }
                              sx={{ alignSelf: "center", color: "#0077B5" }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="body2">
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
                            <Tooltip title="Update LinkedIn engagement metrics">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleUpdateEngagement(post.id)}
                                disabled={updating === post.id}
                                sx={{
                                  border: "1px solid rgba(0, 119, 181, 0.5)",
                                  borderRadius: 1,
                                }}
                              >
                                {updating === post.id ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  <UpdateIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete LinkedIn post">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDelete(post.id)}
                                disabled={deleting === post.id}
                                sx={{
                                  border: "1px solid rgba(244, 67, 54, 0.5)",
                                  borderRadius: 1,
                                }}
                              >
                                {deleting === post.id ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  <DeleteIcon fontSize="small" />
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

      {/* LinkedIn Engagement Popup */}
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
              bgcolor: "#0077B5",
              color: "white",
              py: 1.5,
              px: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <BarChartIcon />
            <Typography variant="subtitle1" fontWeight="bold">
              LinkedIn Engagement Details
            </Typography>
          </Box>
          <CardContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Likes */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: "rgba(0, 119, 181, 0.1)",
                    borderRadius: "50%",
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ThumbUpIcon sx={{ color: "#0077B5" }} />
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

              {/* Comments */}
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
                  <CommentIcon sx={{ color: "#4caf50" }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Comments
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().comments_count || 0}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Shares */}
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
                  <ShareIcon sx={{ color: "#ff9800" }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Shares
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {getSelectedPost().shares_count || 0}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Total Engagement */}
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
                    Total Engagement
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {(getSelectedPost().likes_count || 0) + 
                     (getSelectedPost().comments_count || 0) + 
                     (getSelectedPost().shares_count || 0)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
};

export default LinkedInPostHistory;