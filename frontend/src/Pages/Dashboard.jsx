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
} from "@mui/material";
import {
  CloseOutlined,
  Logout,
  Search,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  ManageSearch as KeywordIcon,
  Settings as SettingsIcon
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import LogoutDialog from "../Components/logoutDialog/LogoutDialog";
import authService from "../services/authService";
import TweetReplyTable from "../Components/tweet-reply-table/SearchHistory";
import Keyword_Management from "./Keyword_Management";
import GoalsTable from "./Post_Manager";
import SocialMediaSettings from "./SocialMediaSettings";

const drawerWidth = 200;

const Dashboard = () => {
  const [keyword, setKeyword] = useState("");
  const [tweets, setTweets] = useState([]);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(false);

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

  const searchTweets = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/search?keyword=${keyword}`
      );
      setTweets(res.data.tweets || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const clearKeyword = () => {
    setKeyword("");
    setTweets([]);
  };
  // Dashboard.jsx
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
        navigate('/dashboard', { replace: true });
      };
      
      convertToken();
    }
    
    // Ensure there's always a token for protected routes
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'dummy-token');
    }
  }, [navigate]);

  // Set active state based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/dashboard')) {
      setActive("");
    } else if (path.includes('/keyword-management')) {
      setActive("keyword-management");
    } else if (path.includes('/history')) {
      setActive("search-history");
    } else if (path.includes('/postmanager')) {
      setActive("post-manager");
    } else if (path.includes('/social-media-settings')) {
      setActive("social-media-settings");
    }
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex" }}>
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
            backgroundColor: '#ffffff',
            boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.05)',
            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important' }} />
        <Box sx={{ overflow: "auto", py: 2 }}>
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '44px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  color: 'primary.main',
                  borderLeft: '3px solid #1976d2',
                  paddingLeft: '13px', // Compensate for the border
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: location.pathname.includes("/dashboard") ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(3px)',
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/dashboard") ? 'inherit' : 'text.secondary'
                }}
              >
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Dashboard"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes("/dashboard") ? 600 : 500
                }}
              />
            </ListItem>
            <ListItem
              button
              selected={location.pathname.includes("/keyword-management")}
              onClick={() => {
                setActive("keyword-management");
                navigate("/keyword-management");
              }}
              sx={{
                mb: 1,
                mx: 1.5,
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '44px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  color: 'primary.main',
                  borderLeft: '3px solid #1976d2',
                  paddingLeft: '13px', // Compensate for the border
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: location.pathname.includes("/keyword-management") ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(3px)',
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/keyword-management") ? 'inherit' : 'text.secondary'
                }}
              >
                <KeywordIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Keyword Management"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes("/keyword-management") ? 600 : 500
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '44px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  color: 'primary.main',
                  borderLeft: '3px solid #1976d2',
                  paddingLeft: '13px', // Compensate for the border
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: location.pathname.includes("/history") ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(3px)',
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/history") ? 'inherit' : 'text.secondary'
                }}
              >
                <HistoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Search History"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes("/history") ? 600 : 500
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '44px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  color: 'primary.main',
                  borderLeft: '3px solid #1976d2',
                  paddingLeft: '13px', // Compensate for the border
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: location.pathname.includes("/social-media-settings") ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(3px)',
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: location.pathname.includes("/social-media-settings") ? 'inherit' : 'text.secondary'
                }}
              >
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Social Media Settings"
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: location.pathname.includes("/social-media-settings") ? 600 : 500
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
            backgroundColor: 'white',
            color: 'text.primary',
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
                color: 'text.primary'
              }}
            >
              Buzzly
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
              <Avatar
                alt="User"
                src="/profile.jpg"
                sx={{
                  width: 32,
                  height: 32,
                  border: '2px solid rgba(0,0,0,0.1)'
                }}
              />
              <IconButton
                onClick={() => setLogoutOpen(true)}
                sx={{
                  color: 'text.primary',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                  }
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Toolbar />
        <Box sx={{ p: 3 }}>
          {/* Always render content within Dashboard component */}
          {location.pathname.includes("/history") ? (
            <TweetReplyTable />
          ) : location.pathname.includes("/keyword-management") ? (
            <Keyword_Management />
          ) : location.pathname.includes("/postmanager") ? (
            <GoalsTable />
          ) : location.pathname.includes("/social-media-settings") ? (
            <SocialMediaSettings />
          ) : (
            <>
              {/* Search Box */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Search Tweets
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, maxWidth: 600 }}>
                <Box sx={{ flex: { sm: 3 }, width: '100%' }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      background: "#fff",
                      borderRadius: 1,
                      border: "1px solid #ccc",
                      px: 2,
                      height: 40,
                    }}
                  >
                    <Search color="action" />
                    <InputBase
                      placeholder="Enter keyword"
                      fullWidth
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      sx={{ ml: 1 }}
                    />
                    {keyword && (
                      <IconButton onClick={clearKeyword}>
                        <CloseOutlined fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Box sx={{ flex: { sm: 1 }, width: '100%' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={searchTweets}
                    startIcon={<Search fontSize="small" />}
                    size="small"
                  >
                    Search
                  </Button>
                </Box>
              </Box>

              {/* Tweets List */}
              {loading ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", mt: 4, py: 6 }}>
                  <CircularProgress color="primary" size={40} thickness={4} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Searching for tweets...
                  </Typography>
                </Box>
              ) : tweets.length > 0 ? (
                <Grid container spacing={2}>
                  {tweets.map((tweet, i) => (
                    <Grid item xs={12} key={i}>
                      <Card elevation={1} sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {tweet.text}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Likes: {tweet?.like_count} | Retweets: {tweet?.retweet_count}
                            </Typography>
                            <Typography variant="caption" color="primary">
                              View Details
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No tweets found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 500 }}>
                    Try searching for a different keyword or check your connection.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
