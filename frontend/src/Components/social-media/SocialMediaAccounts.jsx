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
  InputAdornment,
  Checkbox,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import {
  getAllAccounts,
  getAccountsByPlatform,
  addAccount,
  updateAccount,
  deleteAccount,
} from "../../services/socialMediaAccountsService";

// Twitter OAuth configuration
const TWITTER_CLIENT_ID =
  process.env.REACT_APP_TWITTER_CLIENT_ID ||
  "OEkyejYzcXlKVkZmX2RVekFFUFc6MTpjaQ";
// We'll set the redirect URI dynamically in the redirectToTwitterAuth function
const TWITTER_SCOPE = encodeURIComponent(
  process.env.REACT_APP_TWITTER_SCOPE ||
    "tweet.read tweet.write users.read offline.access"
);
const TWITTER_STATE = "connect_account"; // To differentiate from login flow
const TWITTER_CODE_CHALLENGE =
  process.env.REACT_APP_TWITTER_CODE_CHALLENGE || "challenge";
const TWITTER_CALLBACK_URL =
  process.env.REACT_APP_TWITTER_CALLBACK_URL ||
  "http://localhost:5000/api/auth/twitter/callback"; // Must match exactly what's registered with Twitter

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID =
  process.env.REACT_APP_LINKEDIN_CLIENT_ID || "77fqvi8nw1opj1";
const LINKEDIN_REDIRECT_URI = encodeURIComponent(
  process.env.REACT_APP_LINKEDIN_CALLBACK_URL ||
    "http://localhost:5000/api/auth/linkedin/callback"
);
// Reduce the scope to only what's necessary to improve performance
const LINKEDIN_SCOPE = encodeURIComponent(
  process.env.REACT_APP_LINKEDIN_SCOPE || "r_liteprofile r_emailaddress"
);
const LINKEDIN_STATE = "connect_account";

const SocialMediaAccounts = () => {
  const [currentUser, setCurrentUser] = useState(null);

  // Get user information when component mounts
  useEffect(() => {
    const userStr = localStorage.getItem("user");
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
    try {
      // Use the state variable instead of reading from localStorage again
      const userId = currentUser?.id;

      if (!userId) {
        // Show a more helpful error message
        setError(
          "You must be logged in to connect a Twitter account. Please log out and log back in if you're seeing this message."
        );
        return;
      }

      // Use the same callback URL that's registered with Twitter
      // We'll differentiate the flow using the state parameter
      const redirectUri = encodeURIComponent(TWITTER_CALLBACK_URL);

      // Include the userId and timestamp in the state parameter to make it unique
      // This helps prevent rate limiting by ensuring each request has a unique state
      const timestamp = Date.now();
      const stateWithUserId = `${TWITTER_STATE}_${userId}_${timestamp}`;

      const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${TWITTER_SCOPE}&state=${stateWithUserId}&code_challenge=${TWITTER_CODE_CHALLENGE}&code_challenge_method=plain`;

      // Add a small delay before redirecting to avoid rapid successive requests
      setNotification({
        open: true,
        message: "Connecting to Twitter...",
        severity: "info",
      });

      setTimeout(() => {
        window.location.href = twitterAuthUrl;
      }, 1000);
    } catch (error) {
      console.error("Error redirecting to Twitter:", error);
      setError("Failed to connect to Twitter. Please try again later.");
    }
  };

  // Function to redirect to LinkedIn OAuth
  const redirectToLinkedInAuth = () => {
    try {
      // Use the state variable instead of reading from localStorage again
      const userId = currentUser?.id;

      if (!userId) {
        // Show a more helpful error message
        setError(
          "You must be logged in to connect a LinkedIn account. Please log out and log back in if you're seeing this message."
        );
        return;
      }

      // We're already using LINKEDIN_REDIRECT_URI which is properly encoded

      // Include the userId and timestamp in the state parameter to make it unique
      // This helps prevent rate limiting by ensuring each request has a unique state
      const timestamp = Date.now();
      const stateWithUserId = `${LINKEDIN_STATE}_${userId}_${timestamp}`;

      // Create the LinkedIn OAuth URL with actual credentials
      const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${LINKEDIN_REDIRECT_URI}&scope=${LINKEDIN_SCOPE}&state=${stateWithUserId}`;

      // Add a small delay before redirecting to avoid rapid successive requests
      setNotification({
        open: true,
        message: "Connecting to LinkedIn...",
        severity: "info",
      });

      // Set a timeout to handle the case where LinkedIn OAuth takes too long
      const timeoutId = setTimeout(() => {
        setNotification({
          open: true,
          message:
            "LinkedIn connection is taking longer than expected. Please try again.",
          severity: "warning",
        });
      }, 10000); // 10 seconds timeout

      // Store the timeout ID in localStorage so we can clear it if the user returns
      localStorage.setItem("linkedinTimeoutId", timeoutId);

      setTimeout(() => {
        window.location.href = linkedinAuthUrl;
      }, 1000);
    } catch (error) {
      console.error("Error redirecting to LinkedIn:", error);
      setError("Failed to connect to LinkedIn. Please try again later.");
    }
  };
  // State for accounts data
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [error, setError] = useState("");

  // State for form
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [passwordRecoveryDialogOpen, setPasswordRecoveryDialogOpen] =
    useState(false);
  const [showTwitterPassword, setShowTwitterPassword] = useState(false);
  const [showLinkedInPassword, setShowLinkedInPassword] = useState(false);
  const [isPremiumAccount, setIsPremiumAccount] = useState(true); // Default to true for premium accounts
  const [isDefaultAccount, setIsDefaultAccount] = useState(true); // Default to true for setting as default
  const [currentAccount, setCurrentAccount] = useState({
    id: null,
    platform: "twitter",
    accountId: "",
    accountName: "",
    accessToken: "",
    refreshToken: "",
    tokenExpiresAt: null,
    twitterUsername: "",
    twitterPassword: "",
    linkedinUsername: "",
    linkedinPassword: "",
  });

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  
  // State for default account confirmation
  const [defaultConfirmDialogOpen, setDefaultConfirmDialogOpen] = useState(false);
  const [accountToSetDefault, setAccountToSetDefault] = useState(null);

  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch accounts on component mount and when URL parameters change
  useEffect(() => {
    fetchAccounts();

    // Clear any existing LinkedIn timeout
    const linkedinTimeoutId = localStorage.getItem("linkedinTimeoutId");
    if (linkedinTimeoutId) {
      clearTimeout(parseInt(linkedinTimeoutId, 10));
      localStorage.removeItem("linkedinTimeoutId");
    }

    // Check URL parameters for errors or success messages
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const platform = urlParams.get("platform") || "social media";
    const retryAfter = urlParams.get("retryAfter");
    const accountConnected = urlParams.get("accountConnected");

    // Handle errors
    if (error === "cancelled") {
      setNotification({
        open: true,
        message: `${
          platform.charAt(0).toUpperCase() + platform.slice(1)
        } connection was cancelled. Please try again if you want to connect your account.`,
        severity: "info",
      });

      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === "rate_limit") {
      const waitTime = retryAfter ? parseInt(retryAfter, 10) : 60;
      const minutes = Math.ceil(waitTime / 60);

      setNotification({
        open: true,
        message: `${
          platform.charAt(0).toUpperCase() + platform.slice(1)
        } rate limit exceeded. Please try again in ${minutes} ${
          minutes === 1 ? "minute" : "minutes"
        }.`,
        severity: "warning",
      });

      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Set up an interval to refresh accounts every few seconds
    // This ensures the table is updated after OAuth redirect
    const refreshInterval = setInterval(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("accountConnected") === "true") {
        fetchAccounts();
        // Clear the URL parameters after refreshing
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
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
      console.log("res", response);
      
      // If any accounts exist, uncheck both checkboxes
      if (response.data && response.data.length > 0) {
        setIsPremiumAccount(false);
        setIsDefaultAccount(false);
      }
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
      [name]: value,
    });
  };

  // Open form for adding new account
  const handleAddAccount = (platform) => {
    setCurrentAccount({
      id: null,
      platform: platform,
      accountId: "",
      accountName: "",
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: null,
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
      accessToken: "", // We don't show the actual token for security
      refreshToken: "", // We don't show the actual token for security
      tokenExpiresAt: account.tokenExpiresAt,
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
    if (
      !currentAccount.accountName.trim() ||
      !currentAccount.accountId.trim()
    ) {
      setNotification({
        open: true,
        message: "Account name and ID are required",
        severity: "error",
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
        severity: "success",
      });
      setFormOpen(false);
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${
          isEditing ? "update" : "add"
        } account. Please try again.`,
        severity: "error",
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
        severity: "success",
      });
    } catch (err) {
      setNotification({
        open: true,
        message: "Failed to delete account. Please try again.",
        severity: "error",
      });
      console.error("Error deleting account:", err);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Handle direct Twitter login with username and password
  const handleTwitterDirectLogin = async () => {
    try {
      // Validate inputs
      if (!currentAccount.twitterUsername || !currentAccount.twitterPassword) {
        setNotification({
          open: true,
          message: "Please enter both Twitter username and password",
          severity: "error",
        });
        return;
      }

      // Get the current user ID
      const userId = currentUser?.id;

      if (!userId) {
        setError(
          "You must be logged in to connect a Twitter account. Please log out and log back in if you're seeing this message."
        );
        return;
      }

      setTwitterLoading(true);

      // Prepare the account data to be sent to backend
      const accountData = {
        platform: "twitter",
        accountId: currentAccount.twitterUsername,
        accountName: currentAccount.twitterUsername,
        accessToken: "", // Will be set by backend if needed
        refreshToken: "", // Will be set by backend if needed
        tokenExpiresAt: null,
        twitterPassword: currentAccount.twitterPassword,
        isPremium: isPremiumAccount, // Add premium status to the account data
        isDefault: isDefaultAccount, // Add default status to the account data
      };

      // Console log the data being sent to backend
      console.log("=== Twitter Direct Login - Data being sent to backend ===");
      console.log("Account Data:", JSON.stringify(accountData, null, 2));
      console.log("User ID:", userId);
      console.log("========================================================");

      // Call the backend API to add the account directly
      const token = localStorage.getItem("token");
      await addAccount(accountData, token);

      // Clear the form
      setCurrentAccount({
        ...currentAccount,
        twitterUsername: "",
        twitterPassword: "",
      });

      // Refresh the accounts list
      await fetchAccounts();

      // Show success notification
      setNotification({
        open: true,
        message: "Twitter account connected successfully",
        severity: "success",
      });

      // Close the form
      setFormOpen(false);
    } catch (error) {
      console.error("Error connecting Twitter account:", error);
      setNotification({
        open: true,
        message:
          error.message ||
          "Failed to connect Twitter account. Please check your credentials and try again.",
        severity: "error",
      });
    } finally {
      setTwitterLoading(false);
    }
  };

  // Handle forgot password button click
  const handleForgotPassword = () => {
    // Check if username is provided
    if (!currentAccount.twitterUsername) {
      setNotification({
        open: true,
        message: "Please enter your Twitter username first",
        severity: "error",
      });
      return;
    }

    // Get the current user ID
    const userId = currentUser?.id;

    if (!userId) {
      setError(
        "You must be logged in to connect a Twitter account. Please log out and log back in if you're seeing this message."
      );
      return;
    }

    // Open the confirmation dialog
    setPasswordRecoveryDialogOpen(true);
  };

  // Handle confirmation of password recovery
  const confirmPasswordRecovery = () => {
    // Get the current user ID
    const userId = currentUser?.id;

    // Show loading state
    setLoading(true);

    // Call the backend API to connect Twitter account with just the username
    fetch(
      `${
        process.env.REACT_APP_API_URL || "http://localhost:5000"
      }/api/auth/twitter/direct-login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          username: currentAccount.twitterUsername,
          userId: userId,
          passwordRecovery: true,
        }),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Show success notification
          setNotification({
            open: true,
            message:
              "Twitter account connected successfully. You can reset your password later.",
            severity: "success",
          });

          // Clear the form
          setCurrentAccount({
            ...currentAccount,
            twitterUsername: "",
            twitterPassword: "",
          });

          // Refresh the accounts list
          fetchAccounts();

          // Close the form
          setFormOpen(false);
        } else {
          throw new Error(data.message || "Failed to connect Twitter account");
        }
      })
      .catch((error) => {
        console.error("Error connecting Twitter account:", error);
        setNotification({
          open: true,
          message:
            error.message ||
            "Failed to connect Twitter account. Please try again later.",
          severity: "error",
        });
      })
      .finally(() => {
        setLoading(false);
        setPasswordRecoveryDialogOpen(false);
      });
  };

  // Handle direct LinkedIn login with username and password
  const handleLinkedInDirectLogin = async () => {
    try {
      // Validate inputs
      if (
        !currentAccount.linkedinUsername ||
        !currentAccount.linkedinPassword
      ) {
        setNotification({
          open: true,
          message: "Please enter both LinkedIn email and password",
          severity: "error",
        });
        return;
      }

      // Get the current user ID
      const userId = currentUser?.id;

      if (!userId) {
        setError(
          "You must be logged in to connect a LinkedIn account. Please log out and log back in if you're seeing this message."
        );
        return;
      }

      setLinkedinLoading(true);

      // Call the backend API to authenticate with LinkedIn
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5000"
        }/api/auth/linkedin/direct-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            username: currentAccount.linkedinUsername,
            password: currentAccount.linkedinPassword,
            userId: userId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to connect LinkedIn account");
      }

      // Clear the form
      setCurrentAccount({
        ...currentAccount,
        linkedinUsername: "",
        linkedinPassword: "",
      });

      // Refresh the accounts list
      await fetchAccounts();

      // Show success notification
      setNotification({
        open: true,
        message: "LinkedIn account connected successfully",
        severity: "success",
      });

      // Close the form
      setFormOpen(false);
    } catch (error) {
      console.error("Error connecting LinkedIn account:", error);
      setNotification({
        open: true,
        message:
          error.message ||
          "Failed to connect LinkedIn account. Please check your credentials and try again.",
        severity: "error",
      });
    } finally {
      setLinkedinLoading(false);
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case "twitter":
        return <TwitterIcon style={{ color: "#1DA1F2" }} />;
      case "linkedin":
        return <LinkedInIcon style={{ color: "#0A66C2" }} />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header and Actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "0.96rem" }}>
          Social Media Accounts
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="primary"
            startIcon={<TwitterIcon />}
            onClick={() => handleAddAccount("twitter")}
            sx={{
              backgroundColor: "#1DA1F2",
              border: "none",
              color:"white"
            }}
          >
            Add Twitter Account
          </Button>
          <Button
            variant="primary"
            startIcon={<LinkedInIcon />}
            onClick={() => handleAddAccount("linkedin")}
            sx={{
              backgroundColor: "#0A66C2",
              border: "none",
                color:"white"
            }}
          >
            Add LinkedIn Account
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
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
              <TableCell>Premium</TableCell>
              <TableCell>Default</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2 }}
                  >
                    No accounts found. Add a new account to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {getPlatformIcon(account.platform)}
                      <Typography
                        variant="body2"
                        sx={{ textTransform: "capitalize", mt: "12px" }}
                      >
                        {account.platform}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountId}</TableCell>
                  <TableCell>
                    <Checkbox
                    size="small"
                      checked={Boolean(account.isPremium)}
                      onChange={(e) => {
                        // Update the account's premium status
                        const updatedAccount = {
                          ...account,
                          isPremium: e.target.checked
                        };
                        updateAccount(account.id, updatedAccount, localStorage.getItem("token"))
                          .then(() => fetchAccounts())
                          .catch(err => {
                            console.error("Error updating premium status:", err);
                            setNotification({
                              open: true,
                              message: "Failed to update premium status",
                              severity: "error"
                            });
                          });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox 
                    size="small"
                      checked={Boolean(account.isDefault)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // If trying to set as default, show confirmation dialog
                          setAccountToSetDefault({
                            id: account.id,
                            platform: account.platform,
                            accountName: account.accountName
                          });
                          setDefaultConfirmDialogOpen(true);
                        } else {
                          // If unchecking, just update directly
                          const updatedAccount = {
                            ...account,
                            isDefault: false
                          };
                          updateAccount(account.id, updatedAccount, localStorage.getItem("token"))
                            .then(() => fetchAccounts())
                            .catch(err => {
                              console.error("Error updating default status:", err);
                              setNotification({
                                open: true,
                                message: "Failed to update default status",
                                severity: "error"
                              });
                            });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
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
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing
            ? "Edit Account"
            : `Connect ${
                currentAccount.platform === "twitter" ? "Twitter" : "LinkedIn"
              } Account`}
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <TwitterIcon fontSize="small" />
                        <Typography>Twitter</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="linkedin">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
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
            <Box>
              <Grid container spacing={3}>
                {currentAccount.platform === "twitter" && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, }}>
                      <Typography variant="h6" gutterBottom>
                        <TwitterIcon
                          sx={{
                            color: "#1DA1F2",
                            mr: 1,
                            verticalAlign: "middle",
                          }}
                        />
                        Connect Twitter Account
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                      >
                        Enter your Twitter credentials to connect your account
                      </Typography>

                      <TextField
                        fullWidth
                        label="Twitter Username or Email"
                        variant="outlined"
                        margin="normal"
                        name="twitterUsername"
                        value={currentAccount.twitterUsername || ""}
                        onChange={(e) =>
                          setCurrentAccount({
                            ...currentAccount,
                            twitterUsername: e.target.value,
                          })
                        }
                        // Username field is editable only when adding a new account
                        InputProps={{
                          readOnly: isEditing,
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Twitter Password"
                        variant="outlined"
                        margin="normal"
                        name="twitterPassword"
                        type={showTwitterPassword ? "text" : "password"}
                        value={currentAccount.twitterPassword || ""}
                        onChange={(e) =>
                          setCurrentAccount({
                            ...currentAccount,
                            twitterPassword: e.target.value,
                          })
                        }
                        // Password field is editable only when adding a new account
                        InputProps={{
                          readOnly: isEditing,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() =>
                                  setShowTwitterPassword(!showTwitterPassword)
                                }
                                edge="end"
                                disabled={isEditing}
                              >
                                {showTwitterPassword ? (
                                  <VisibilityOffIcon />
                                ) : (
                                  <VisibilityIcon />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        helperText={isEditing ? "Password cannot be edited" : ""}
                      />
                      
                      {/* Account Settings Checkboxes */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', mt: 2, gap: 1 }}>
                        {/* Premium Account Checkbox */}
                        <FormControl>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                              checked={isPremiumAccount}
                              onChange={(e) => setIsPremiumAccount(e.target.checked)}
                              sx={{
                                color: '#1DA1F2',
                                '&.Mui-checked': {
                                  color: '#1DA1F2',
                                },
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Premium Account
                            </Typography>
                          </Box>
                        </FormControl>
                        
                        {/* Default Account Checkbox */}
                        <FormControl>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                              checked={isDefaultAccount}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Check if there are existing accounts for this platform
                                  const existingAccounts = accounts.filter(
                                    acc => acc.platform === currentAccount.platform
                                  );
                                  
                                  if (existingAccounts.length > 0) {
                                    // If there are existing accounts, show confirmation dialog
                                    setAccountToSetDefault({
                                      platform: currentAccount.platform,
                                      accountName: currentAccount.twitterUsername || "New account",
                                      isNewAccount: true
                                    });
                                    setDefaultConfirmDialogOpen(true);
                                  } else {
                                    // If no existing accounts, just set it
                                    setIsDefaultAccount(true);
                                  }
                                } else {
                                  // If unchecking, just update directly
                                  setIsDefaultAccount(false);
                                }
                              }}
                              sx={{
                                color: '#1DA1F2',
                                '&.Mui-checked': {
                                  color: '#1DA1F2',
                                },
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Set as default for scanning/fetching
                            </Typography>
                          </Box>
                        </FormControl>
                      </Box>

                      <Button
                        variant="primary"
                        fullWidth
                        size="large"
                        startIcon={twitterLoading ? null : <TwitterIcon />}
                        onClick={handleTwitterDirectLogin}
                        disabled={twitterLoading}
                        sx={{
                          mt: 2,
                          py: 1.5,
                          backgroundColor: "#1DA1F2",
                           color:"white"
                        }}
                      >
                        {twitterLoading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Connect Twitter Account"
                        )}
                      </Button>
                    </Paper>
                  </Grid>
                )}

                {currentAccount.platform === "linkedin" && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, border: "1px solid #e0e0e0" }}>
                      <Typography variant="h6" gutterBottom>
                        <LinkedInIcon
                          sx={{
                            color: "#0A66C2",
                            mr: 1,
                            verticalAlign: "middle",
                          }}
                        />
                        Connect LinkedIn Account
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                      >
                        Enter your LinkedIn credentials to connect your account
                      </Typography>

                      <TextField
                        fullWidth
                        label="LinkedIn Email"
                        variant="outlined"
                        margin="normal"
                        name="linkedinUsername"
                        value={currentAccount.linkedinUsername || ""}
                        onChange={(e) =>
                          setCurrentAccount({
                            ...currentAccount,
                            linkedinUsername: e.target.value,
                          })
                        }
                        // Username field is editable only when adding a new account
                        InputProps={{
                          readOnly: isEditing,
                        }}
                      />

                      <TextField
                        fullWidth
                        label="LinkedIn Password"
                        variant="outlined"
                        margin="normal"
                        name="linkedinPassword"
                        type={showLinkedInPassword ? "text" : "password"}
                        value={currentAccount.linkedinPassword || ""}
                        onChange={(e) =>
                          setCurrentAccount({
                            ...currentAccount,
                            linkedinPassword: e.target.value,
                          })
                        }
                        // Password field is editable only when adding a new account
                        InputProps={{
                          readOnly: isEditing,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() =>
                                  setShowLinkedInPassword(!showLinkedInPassword)
                                }
                                edge="end"
                                disabled={isEditing}
                              >
                                {showLinkedInPassword ? (
                                  <VisibilityOffIcon />
                                ) : (
                                  <VisibilityIcon />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        helperText={isEditing ? "Password cannot be edited" : ""}
                      />

                      <Button
                        variant="primary"
                        fullWidth
                        size="large"
                        startIcon={linkedinLoading ? null : <LinkedInIcon />}
                        onClick={handleLinkedInDirectLogin}
                        disabled={linkedinLoading}
                        sx={{
                          mt: 2,
                          py: 1.5,
                          backgroundColor: "#0A66C2",
                            color:"white"
                        }}
                      >
                        {linkedinLoading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Connect LinkedIn Account"
                        )}
                      </Button>
                    </Paper>
                  </Grid>
                )}
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
            Are you sure you want to delete this account? This will also remove
            any keywords associated with this account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Default Account Confirmation Dialog */}
      <Dialog
        open={defaultConfirmDialogOpen}
        onClose={() => setDefaultConfirmDialogOpen(false)}
      >
        <DialogTitle>Set Default Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to set {accountToSetDefault?.accountName} as your default {accountToSetDefault?.platform} account?
            This will unset any other default {accountToSetDefault?.platform} account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDefaultConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // Update the account's default status
              if (accountToSetDefault) {
                if (accountToSetDefault.isNewAccount) {
                  // For new account being created, just update the state
                  setIsDefaultAccount(true);
                } else {
                  // For existing account, update in the database
                  const updatedAccount = {
                    id: accountToSetDefault.id,
                    isDefault: true
                  };
                  updateAccount(accountToSetDefault.id, updatedAccount, localStorage.getItem("token"))
                    .then(() => {
                      fetchAccounts();
                      setNotification({
                        open: true,
                        message: `${accountToSetDefault.accountName} is now your default ${accountToSetDefault.platform} account`,
                        severity: "success"
                      });
                    })
                    .catch(err => {
                      console.error("Error updating default status:", err);
                      setNotification({
                        open: true,
                        message: "Failed to update default status",
                        severity: "error"
                      });
                    });
                }
              }
              setDefaultConfirmDialogOpen(false);
            }}
            color="primary"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Recovery Confirmation Dialog */}
      <Dialog
        open={passwordRecoveryDialogOpen}
        onClose={() => setPasswordRecoveryDialogOpen(false)}
      >
        <DialogTitle>Password Recovery</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to add a Twitter account without password
            verification. This is useful if you've forgotten your password.
            <br />
            <br />
            You will need to reset your Twitter password later to use this
            account fully.
            <br />
            <br />
            Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordRecoveryDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmPasswordRecovery}
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Continue"}
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
