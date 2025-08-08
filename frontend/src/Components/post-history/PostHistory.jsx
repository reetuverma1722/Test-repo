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
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  Repeat as RepeatIcon,
  BarChart as BarChartIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  getAccounts,
  getPostHistory,
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


  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const result = await getAccounts();
        if (result.success && result.data) {
          setAccounts(result.data);
         
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

 
  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
    setPage(0); 
  };

 
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  


  const handleDelete = async (postId) => {
    try {
      setDeleting(postId);
      setDeleteError(null);
      setDeleteSuccess(null);

      const result = await deletePost(postId);

      if (result.success) {
        setDeleteSuccess(`Post successfully deleted!`);

       
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

      setTimeout(() => {
        setDeleteSuccess(null);
        setDeleteError(null);
      }, 3000);
    }
  };

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
