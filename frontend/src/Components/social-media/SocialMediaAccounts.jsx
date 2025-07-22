import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Chip
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon
} from "@mui/icons-material";
import {
  getAllAccounts,
  getAccountsByPlatform,
  addAccount,
  updateAccount,
  deleteAccount
} from "../../services/socialMediaAccountsService";

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = "OEkyejYzcXlKVkZmX2RVekFFUFc6MTpjaQ";
// We'll set the redirect URI dynamically in the redirectToTwitterAuth function
const TWITTER_SCOPE = encodeURIComponent('tweet.read tweet.write users.read offline.access');
const TWITTER_STATE = "connect_account"; // To differentiate from login flow
const TWITTER_CODE_CHALLENGE = "challenge";
const TWITTER_CALLBACK_URL = "http://localhost:5000/api/auth/twitter/callback"; // Must match exactly what's registered with Twitter

// LinkedIn OAuth configuration (placeholder - would need actual credentials)
const LINKEDIN_CLIENT_ID = "your-linkedin-client-id";
const LINKEDIN_REDIRECT_URI = encodeURIComponent("http://localhost:5000/api/auth/linkedin/callback");
const LINKEDIN_SCOPE = encodeURIComponent('r_liteprofile r_emailaddress w_member_social');
const LINKEDIN_STATE = "connect_account";

const SocialMediaAccounts = () => {
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get user information when component mounts
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);
  
  // Function to redirect to Twitter OAuth
  const redirectToTwitterAuth = () => {
    // Use the state variable instead of reading from localStorage again
    const userId = currentUser?.id;
    
    if (!userId) {
      // Show a more helpful error message
      setError("You must be logged in to connect a Twitter account. Please log out and log back in if you're seeing this message.");
      return;
    }
    
    // Use the same callback URL that's registered with Twitter
    // We'll differentiate the flow using the state parameter
    const redirectUri = encodeURIComponent(TWITTER_CALLBACK_URL);
    
    // Include the userId in the state parameter
    const stateWithUserId = `${TWITTER_STATE}_${userId}`;
    
    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${TWITTER_SCOPE}&state=${stateWithUserId}&code_challenge=${TWITTER_CODE_CHALLENGE}&code_challenge_method=plain`;
    window.location.href = twitterAuthUrl;
  };
  
  // Function to redirect to LinkedIn OAuth
  const redirectToLinkedInAuth = () => {
    // Use the state variable instead of reading from localStorage again
    const userId = currentUser?.id;
    
    if (!userId) {
      // Show a more helpful error message
      setError("You must be logged in to connect a LinkedIn account. Please log out and log back in if you're seeing this message.");
      return;
    }
    
    // Use the connect callback endpoint instead of the login callback
    const connectRedirectUri = encodeURIComponent("http://localhost:5000/api/auth/linkedin/connect/callback");
    
    // Include the userId in the state parameter instead of the redirect URI
    const stateWithUserId = `${LINKEDIN_STATE}_${userId}`;
    
    // This would need to be implemented with actual LinkedIn OAuth credentials
    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${connectRedirectUri}&scope=${LINKEDIN_SCOPE}&state=${stateWithUserId}`;
    
    // Since we don't have actual LinkedIn credentials, let's simulate a successful connection
    setLoading(true);
    
    try {
      // Simulate API call to connect LinkedIn account
      setTimeout(async () => {
        // Generate a random LinkedIn ID and name for demonstration
        const linkedinId = `linkedin-${Date.now()}`;
        const linkedinName = "LinkedIn Demo Account";
        
        // Add the simulated account to the database
        const token = localStorage.getItem("token");
        await addAccount({
          platform: "linkedin",
          accountId: linkedinId,
          accountName: linkedinName,
          accessToken: "simulated_access_token",
          refreshToken: "simulated_refresh_token"
        }, token);
        
        // Refresh the accounts list
        await fetchAccounts();
        
        setNotification({
          open: true,
          message: "LinkedIn account connected successfully (simulated)",
          severity: "success"
        });
        
        setLoading(false);
        setFormOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Error simulating LinkedIn connection:", error);
      setNotification({
        open: true,
        message: "Failed to simulate LinkedIn connection",
        severity: "error"
      });
      setLoading(false);
    }
    
    // In a real implementation with actual credentials, we would use:
    // window.location.href = linkedinAuthUrl;
  };
  // State for accounts data
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // State for form
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({
    id: null,
    platform: "twitter",
    accountId: "",
    accountName: "",
    accessToken: "",
    refreshToken: "",
    tokenExpiresAt: null
  });
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  
  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // Fetch accounts on component mount and when URL parameters change
  useEffect(() => {
    fetchAccounts();
    
    // Set up an interval to refresh accounts every few seconds
    // This ensures the table is updated after OAuth redirect
    const refreshInterval = setInterval(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('accountConnected') === 'true') {
        fetchAccounts();
        // Clear the URL parameters after refreshing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }, 2000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Fetch all accounts
  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await getAllAccounts(token);
      setAccounts(response.data || []);
    } catch (err) {
      setError("Failed to fetch accounts. Please try again later.");
      console.error("Error fetching accounts:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentAccount({
      ...currentAccount,
      [name]: value
    });
  };

  // Open form for adding new account
  const handleAddAccount = () => {
    setCurrentAccount({
      id: null,
      platform: "twitter",
      accountId: "",
      accountName: "",
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: null
    });
    setIsEditing(false);
    setFormOpen(true);
  };

  // Open form for editing account
  const handleEditAccount = (account) => {
    setCurrentAccount({
      id: account.id,
      platform: account.platform,
      accountId: account.accountId,
      accountName: account.accountName,
      accessToken: "",  // We don't show the actual token for security
      refreshToken: "", // We don't show the actual token for security
      tokenExpiresAt: account.tokenExpiresAt
    });
    setIsEditing(true);
    setFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (id) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Submit form for add/edit
  const handleSubmit = async () => {
    if (!currentAccount.accountName.trim() || !currentAccount.accountId.trim()) {
      setNotification({
        open: true,
        message: "Account name and ID are required",
        severity: "error"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (isEditing) {
        await updateAccount(currentAccount.id, currentAccount, token);
      } else {
        await addAccount(currentAccount, token);
      }
      
      // Refresh the accounts list
      await fetchAccounts();
      
      setNotification({
        open: true,
        message: `Account ${isEditing ? "updated" : "added"} successfully`,
        severity: "success"
      });
      setFormOpen(false);
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${isEditing ? "update" : "add"} account. Please try again.`,
        severity: "error"
      });
      console.error(`Error ${isEditing ? "updating" : "adding"} account:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await deleteAccount(accountToDelete, token);
      
      // Refresh the accounts list
      await fetchAccounts();
      
      setNotification({
        open: true,
        message: "Account deleted successfully",
        severity: "success"
      });
    } catch (err) {
      setNotification({
        open: true,
        message: "Failed to delete account. Please try again.",
        severity: "error"
      });
      console.error("Error deleting account:", err);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return <TwitterIcon color="primary" />;
      case 'linkedin':
        return <LinkedInIcon color="primary" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header and Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Social Media Accounts</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAccount}
          >
            Add Account
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* Accounts Table */}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Account ID</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No accounts found. Add a new account to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(account.platform)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {account.platform}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountId}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditAccount(account)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(account.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Account Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? "Edit Account" : "Connect Social Media Account"}
        </DialogTitle>
        <DialogContent>
          {isEditing ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="platform-label">Platform</InputLabel>
                  <Select
                    labelId="platform-label"
                    name="platform"
                    value={currentAccount.platform}
                    onChange={handleInputChange}
                    label="Platform"
                    disabled
                  >
                    <MenuItem value="twitter">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TwitterIcon fontSize="small" />
                        <Typography>Twitter</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="linkedin">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkedInIcon fontSize="small" />
                        <Typography>LinkedIn</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="accountName"
                  label="Account Name"
                  value={currentAccount.accountName}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  helperText="Display name for this account"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="accountId"
                  label="Account ID"
                  value={currentAccount.accountId}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  helperText="Username or ID from the platform"
                />
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Connect your social media accounts to manage them in one place. Choose a platform to connect:
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<TwitterIcon />}
                    onClick={() => redirectToTwitterAuth()}
                    sx={{
                      py: 1.5,
                      backgroundColor: '#1DA1F2',
                      '&:hover': {
                        backgroundColor: '#0d8bd9'
                      }
                    }}
                  >
                    Connect Twitter Account
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<LinkedInIcon />}
                    onClick={() => redirectToLinkedInAuth()}
                    sx={{
                      py: 1.5,
                      backgroundColor: '#0A66C2',
                      '&:hover': {
                        backgroundColor: '#0850a0'
                      }
                    }}
                  >
                    Connect LinkedIn Account (Simulated)
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    You can connect multiple accounts from the same platform. This allows you to post from different accounts.
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          {isEditing && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Update"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this account? This will also remove any keywords associated with this account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocialMediaAccounts;