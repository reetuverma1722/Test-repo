import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Button,
  Grid,
  Drawer,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Chip,
  Divider,
  Paper,
  Menu,
  MenuItem,
  Tooltip,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import {
  CloseOutlined,
  Logout,
  Search,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Twitter as TwitterIcon,
  Tag as TagIcon,
  FindInPage as FindInPageIcon,
  ManageSearch as ManageSearchIcon,
  VpnKey as VpnKeyIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Check as CheckIcon,
  RemoveRedEye as ViewIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import LogoutDialog from "../Components/logoutDialog/LogoutDialog";
import authService from "../services/authService";
import TweetReplyTable from "../Components/tweet-reply-table/SearchHistory";
import GoalsTable from "./Post_Manager";
import SocialMediaSettings from "./SocialMediaSettings";

const drawerWidth = 260;

const Dashboard = () => {
  const [tweets, setTweets] = useState([]);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  
  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (!token) navigate("/login");
  // }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLogoutOpen(false);
    navigate("/login");
  };

  // Fetch all keywords
  const fetchAllKeywords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/keywords", {
        headers: {
          Authorization: `Bearer ${token || "dummy-token"}`,
        },
      });
      return response.data.data || [];
    } catch (err) {
      console.error("Failed to fetch keywords", err);
      return [];
    }
  };

  // Fetch posts for all keywords
  const fetchAllPosts = async () => {
    setLoading(true);
    setTweets([]);

    try {
      // First fetch all keywords
      const allKeywords = await fetchAllKeywords();
      setKeywords(allKeywords);

      if (allKeywords.length === 0) {
        setLoading(false);
        return;
      }

      // Create a comma-separated list of keywords
      const keywordList = allKeywords.map((k) => k.text).join(",");

      // Get the maximum values for filtering criteria from all keywords
      const maxMinLikes = Math.max(...allKeywords.map((k) => k.minLikes || 0));
      const maxMinRetweets = Math.max(...allKeywords.map((k) => k.minRetweets || 0));
      const maxMinFollowers = Math.max(...allKeywords.map((k) => k.minFollowers || 0));

      console.log("Filtering criteria:", { maxMinLikes, maxMinRetweets, maxMinFollowers });

      // Fetch posts for all keywords with filtering parameters
      const res = await axios.get(
        `http://localhost:5000/api/search?keyword=${keywordList}&minLikes=${maxMinLikes}&minRetweets=${maxMinRetweets}&minFollowers=${maxMinFollowers}`
      );

      setTweets(res.data.tweets || []);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };
  // Dashboard.jsx
  // Handle menu open/close
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle password change dialog
  const handlePasswordChange = () => {
    setPasswordDialogOpen(true);
    handleMenuClose();
    // Reset form fields and states
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess(false);
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
  };

  // Validate password
  const validatePassword = () => {
    // Reset error
    setPasswordError("");
    
    // Check if all fields are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return false;
    }
    
    // Check if new password is at least 8 characters
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return false;
    }
    
    // Check if new password contains at least one number and one letter
    const hasNumber = /\d/.test(newPassword);
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    if (!hasNumber || !hasLetter) {
      setPasswordError("New password must contain at least one letter and one number");
      return false;
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return false;
    }
    
    return true;
  };

  // Submit password change
  const handlePasswordSubmit = async () => {
    // Validate form
    if (!validatePassword()) {
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      // Make API call to change password
      const response = await axios.post(
        "http://localhost:5000/api/auth/change-password",
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Handle success
      setPasswordSuccess(true);
      setPasswordError("");
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setPasswordDialogOpen(false);
      }, 2000);
      
    } catch (error) {
      // Handle error
      if (error.response && error.response.data && error.response.data.message) {
        setPasswordError(error.response.data.message);
      } else {
        setPasswordError("Failed to change password. Please try again.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Get user email from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email) {
          setUserEmail(user.email);
        }
      }
    } catch (error) {
      console.error("Error retrieving user data:", error);
    }
  }, []);

  useEffect(() => {
    const twitterToken = new URLSearchParams(window.location.search).get(
      "accessToken"
    );

    if (twitterToken) {
      // Store the Twitter access token
      localStorage.setItem("twitter_access_token", twitterToken);

      // Convert Twitter token to JWT token
      const convertToken = async () => {
        try {
          const response = await authService.convertTwitterToken(twitterToken);

          if (response.success && response.token) {
            // Store the JWT token
            localStorage.setItem("token", response.token);

            if (response.user) {
              localStorage.setItem("user", JSON.stringify(response.user));
            }

            console.log("✅ Successfully converted Twitter token to JWT");
          } else {
            console.error("❌ Failed to convert Twitter token:", response);
          }
        } catch (error) {
          console.error("❌ Error converting Twitter token:", error);
        }

        // Remove query parameters from URL
        navigate("/dashboard", { replace: true });
      };

      convertToken();
    }

    // Ensure there's always a token for protected routes
    if (!localStorage.getItem("token")) {
      localStorage.setItem("token", "dummy-token");
    }
  }, [navigate]);

  // Set active state based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/dashboard")) {
      setActive("");
    } else if (path.includes("/history")) {
      setActive("search-history");
    } else if (path.includes("/postmanager")) {
      setActive("post-manager");
    } else if (path.includes("/social-media-settings")) {
      setActive("social-media-settings");
    }
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex" }}>
      {/* Password Change Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handlePasswordDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxWidth: 400,
            width: '100%',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 600,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <VpnKeyIcon sx={{ color: '#f44336' }} />
          Change Password
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handlePasswordDialogClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
          }}
        >
          <CloseOutlined />
        </IconButton>
        <DialogContent sx={{ pt: 1 }}>
          {passwordSuccess ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 2
            }}>
              <Avatar sx={{
                bgcolor: '#4caf50',
                mb: 2,
                width: 60,
                height: 60
              }}>
                <CheckIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Password Changed!
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Your password has been successfully updated.
              </Typography>
            </Box>
          ) : (
            <>
              {passwordError && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      color: '#f44336'
                    }
                  }}
                >
                  {passwordError}
                </Alert>
              )}
              <TextField
                margin="dense"
                label="Current Password"
                type="password"
                fullWidth
                variant="outlined"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="New Password"
                type="password"
                fullWidth
                variant="outlined"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Password must be at least 8 characters with letters and numbers"
              />
              <TextField
                margin="dense"
                label="Confirm New Password"
                type="password"
                fullWidth
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        {!passwordSuccess && (
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handlePasswordDialogClose}
              sx={{
                borderRadius: 2,
                color: 'text.secondary'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              variant="contained"
              color="error"
              disabled={passwordLoading}
              sx={{
                borderRadius: 2,
                px: 3,
                position: 'relative'
              }}
            >
              {passwordLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <LogoutDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.05)",
            borderRight: "1px solid rgba(0, 0, 0, 0.08)",
          },
        }}
      >
        <Toolbar sx={{ minHeight: "48px !important" }} />
        <Box
          sx={{ overflow: "auto", overflowX: "hidden", marginTop: 4, py: 2 }}
        >
          <List component="nav" disablePadding>
            <ListItem
              button
              selected={location.pathname.includes("/dashboard")}
              onClick={() => {
                setActive("");
                navigate("/dashboard");
              }}
              sx={{
                mb: 1,
                mx: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                // transition: 'all 0.2s ease',
                height: "44px",
                "&.Mui-selected": {
                  backgroundColor: "#fef2f2",
                  // backgroundColor: 'rgba(244, 67, 54, 0.1)', // Light red
                  color: "#fef2f2",
                  borderLeft: "3px",
                  paddingLeft: "13px",
                  "& .MuiListItemIcon-root": {
                    color: "#fef2f2",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/dashboard")
                    ? "inherit"
                    : "text.secondary",
                }}
              >
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Dashboard"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes("/dashboard")
                    ? 600
                    : 500,
                }}
              />
            </ListItem>
            <ListItem
              button
              selected={location.pathname.includes("/history")}
              onClick={() => {
                setActive("search-history");
                navigate("/history");
              }}
              sx={{
                mb: 1,
                mx: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                transition: "all 0.2s ease",
                height: "44px",
                "&.Mui-selected": {
                  backgroundColor: "rgba(244, 67, 54, 0.7)", // Light red
                  color: "#f44336",
                  borderLeft: "3px solid #f44336",
                  paddingLeft: "13px",
                  "& .MuiListItemIcon-root": {
                    color: "#f44336",
                  },
                },

                "&:hover": {
                  backgroundColor: location.pathname.includes("/history")
                    ? "rgba(210, 25, 87, 0.29)"
                    : "rgba(210, 25, 87, 0.29)",
                  transform: "translateX(3px)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/history")
                    ? "inherit"
                    : "text.secondary",
                }}
              >
                <HistoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Search History"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes("/history")
                    ? 600
                    : 500,
                }}
              />
            </ListItem>
            <ListItem
              button
              selected={location.pathname.includes("/social-media-settings")}
              onClick={() => {
                setActive("social-media-settings");
                navigate("/social-media-settings");
              }}
              sx={{
                mb: 1,
                mx: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                transition: "all 0.2s ease",
                height: "44px",
                "&.Mui-selected": {
                  backgroundColor: "rgba(244, 67, 54, 0.1)", // Light red
                  color: "#f44336",
                  borderLeft: "3px solid #f44336",
                  paddingLeft: "13px",
                  "& .MuiListItemIcon-root": {
                    color: "#f44336",
                  },
                },

                "&:hover": {
                  backgroundColor: location.pathname.includes(
                    "/social-media-settings"
                  )
                    ? "rgba(210, 25, 87, 0.29)"
                    : "rgba(119, 76, 76, 0.04)",
                  transform: "translateX(3px)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/social-media-settings")
                    ? "inherit"
                    : "text.secondary",
                }}
              >
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Social Media Settings"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes(
                    "/social-media-settings"
                  )
                    ? 600
                    : 500,
                }}
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: "#f9f9f9", minHeight: "100vh" }}
      >
        {/* Top App Bar */}
        <AppBar
          position="fixed"
          elevation={2}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: "white",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between", height: 48 }}>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 600,
                letterSpacing: "0.5px",
                fontSize: { xs: "1.1rem", sm: "1.2rem" },
                color: "text.primary",
              }}
            >
              Buzzly
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1, sm: 2 },
              }}
            >
              <Tooltip
                title="Account settings"
                arrow
                TransitionComponent={Fade}
                TransitionProps={{ timeout: 600 }}
              >
                <Avatar
                  onClick={handleMenuOpen}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: '#ff5858a1',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: "2px solid rgba(255,255,255,0.8)",
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }
                  }}
                >
                  {userEmail.charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
              
              {/* User Profile Menu */}
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                TransitionComponent={Fade}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    borderRadius: 2,
                    minWidth: 250,
                    overflow: 'visible',
                    mt: 1.5,
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    User Profile
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmailIcon fontSize="small" sx={{ color: '#FF0000' }} />
                    {userEmail}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handlePasswordChange} sx={{ py: 1.5 }}>
                  <VpnKeyIcon sx={{ mr: 2, color: '#FF0000' }} />
                  <Typography variant="body2">Change Password</Typography>
                </MenuItem>
                <MenuItem onClick={() => setLogoutOpen(true)} sx={{ py: 1.5 }}>
                  <Logout sx={{ mr: 2, color: '#FF0000' }} />
                  <Typography variant="body2">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Toolbar />
        <Box sx={{ p: 3 }}>
          {/* Always render content within Dashboard component */}
          {location.pathname.includes("/history") ? (
            <TweetReplyTable />
          ) : location.pathname.includes("/postmanager") ? (
            <GoalsTable />
          ) : location.pathname.includes("/social-media-settings") ? (
            <SocialMediaSettings />
          ) : (
            <>
              {/* Dashboard Header */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", md: "center" },
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
                      color: "#a71900ff",
                    }}
                  >
                    Social Media Dashboard
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Discover and engage with relevant social media content
                  </Typography>
                </Box>
                {/* <Button
                  variant="contained"
                  color="primary"
                  onClick={fetchAllPosts}
                  startIcon={<Search />}
                  size="large"
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)',
                    '&:hover': {
                      boxShadow: '0 6px 20px 0 rgba(25, 118, 210, 0.5)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? 'Fetching...' : 'Re-fetch Posts'}
                </Button> */}
              </Box>

              {/* Quick Actions Cards */}
              <Grid spacing={3} sx={{ mb: 4, display: "flex", gap: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      height: "100%",
                      background: "#fef2f2",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Box
                        sx={{
                          bgcolor: "#f44336",
                          color: "white",
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 10px rgba(244, 67, 54, 0.3)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <FindInPageIcon
                          sx={{ fontSize: "1.5rem", color: "#ffffff" }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600 }}
                        >
                          Search for Posts
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: "text.secondary" }}
                        >
                          Click the Re-fetch Posts button to search for social
                          media posts matching your keywords.
                        </Typography>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={fetchAllPosts}
                          disabled={loading}
                          sx={{
                            borderRadius: 2,
                            transition: "all 0.3s ease",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          Fetch Now
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      height: "100%",
                      background: "#fef2f2",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Box
                        sx={{
                          bgcolor: "#f44336",
                          color: "white",
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 10px rgba(244, 67, 54, 0.3)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <ManageSearchIcon
                          sx={{ fontSize: "1.5rem", color: "#ffffff" }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 600 }}
                        >
                          Manage Keywords
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: "text.secondary" }}
                        >
                          Add or edit keywords to customize your social media
                          search results.
                        </Typography>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => navigate("/social-media-settings")}
                          sx={{
                            borderRadius: 2,
                            transition: "all 0.3s ease",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          Manage Keywords
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Keywords Section */}
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Your Keywords & Posts
                </Typography>

                {keywords.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {keywords.map((keyword, index) => (
                      <Chip
                        key={index}
                        label={keyword.text}
                        size="medium"
                        color="primary"
                        sx={{
                          borderRadius: "16px",
                          px: 1,
                          fontWeight: 500,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                          "&:hover": {
                            boxShadow: "0 4px 8px rgba(0,0,0,0.12)",
                          },
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 3,
                      bgcolor: "#f9f9f9",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No posts fetched yet.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Tweets List */}
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 4,
                    py: 6,
                  }}
                >
                  <CircularProgress color="primary" size={40} thickness={4} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    Searching for tweets...
                  </Typography>
                </Box>
              ) : tweets.length > 0 ? (
                <Box sx={{ position: "relative" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Latest Posts
                  </Typography>
                  <Grid container spacing={3}>
                    {tweets.map((tweet, i) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        key={i}
                        sx={{ maxWidth: "400px" }}
                      >
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 3,
                            overflow: "hidden",
                            border: "1px solid rgba(0,0,0,0.08)",
                            transition: "all 0.3s ease",
                            height: "100%",
                            width: "100%",
                            "&:hover": {
                              transform: "translateY(-5px)",
                              boxShadow: "0 12px 20px -8px rgba(0,0,0,0.15)",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              height: 6,
                              width: "100%",
                              background:
                                "linear-gradient(90deg, #f3dddc, #eb8270)",
                            }}
                          />
                          <CardContent sx={{ p: 3 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                mb: 2,
                                display: "-webkit-box",
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minHeight: "5.5rem",
                              }}
                            >
                              {tweet.text}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: "text.primary",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      color: "#f44336",
                                    }}
                                  >
                                    {tweet?.like_count}
                                  </span>{" "}
                                  Likes
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: "text.primary",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      color: "#f44336",
                                    }}
                                  >
                                    {tweet?.retweet_count}
                                  </span>{" "}
                                  Retweets
                                </Typography>
                              </Box>
                              <Tooltip title="View in Search History">
                                <IconButton
                                  onClick={() => {
                                    navigate(`/history?tweetId=${tweet.id}`)
                                  }}
                                  size="small"
                                  sx={{
                                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      backgroundColor: 'rgba(244, 67, 54, 0.15)',
                                      transform: 'scale(1.1)'
                                    }
                                  }}
                                >
                                  <ViewIcon fontSize="small" sx={{ color: '#f44336' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <></>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
