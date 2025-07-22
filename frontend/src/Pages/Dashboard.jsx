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
} from "@mui/material";
import {
  CloseOutlined,
  Logout,
  Search,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
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

      // Fetch posts for all keywords
      const res = await axios.get(
        `http://localhost:5000/api/search?keyword=${keywordList}`
      );

      setTweets(res.data.tweets || []);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
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
    } else if (path.includes('/history')) {
      setActive("search-history");
    } else if (path.includes("/postmanager")) {
      setActive("post-manager");
    } else if (path.includes("/social-media-settings")) {
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
            backgroundColor: "#ffffff",
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.05)",
            borderRight: "1px solid rgba(0, 0, 0, 0.08)",
          },
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important' }} />
        <Box sx={{ overflow: "auto", overflowX:"hidden", marginTop:4, py: 2 }}>
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
  backgroundColor: 'rgba(244, 67, 54, 0.1)', // Light red
  color: '#f44336',
  borderLeft: '3px solid #f44336',
  paddingLeft: '13px',
  '& .MuiListItemIcon-root': {
    color: '#f44336',
  },
},

                '&:hover': {
                  backgroundColor: location.pathname.includes("/dashboard") ? 'rgba(210, 25, 87, 0.29)' : 'rgba(210, 25, 87, 0.29)',
                  transform: 'translateX(3px)',
                }
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '44px',
                '&.Mui-selected': {
  backgroundColor: 'rgba(244, 67, 54, 0.7)', // Light red
  color: '#f44336',
  borderLeft: '3px solid #f44336',
  paddingLeft: '13px',
  '& .MuiListItemIcon-root': {
    color: '#f44336',
  },
},

                '&:hover': {
                  backgroundColor: location.pathname.includes("/history") ? 'rgba(210, 25, 87, 0.29)' : 'rgba(210, 25, 87, 0.29)',
                  transform: 'translateX(3px)',
                }
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '44px',
                '&.Mui-selected': {
  backgroundColor: 'rgba(244, 67, 54, 0.1)', // Light red
  color: '#f44336',
  borderLeft: '3px solid #f44336',
  paddingLeft: '13px',
  '& .MuiListItemIcon-root': {
    color: '#f44336',
  },
},

                '&:hover': {
                  backgroundColor: location.pathname.includes("/social-media-settings") ? 'rgba(210, 25, 87, 0.29)' : 'rgba(119, 76, 76, 0.04)',
                  transform: 'translateX(3px)',
                }
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
              <Avatar
                alt="User"
                src="/profile.jpg"
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid rgba(0,0,0,0.1)",
                }}
              />
              <IconButton
                onClick={() => setLogoutOpen(true)}
                sx={{
                  color: "text.primary",
                  backgroundColor: "rgba(0,0,0,0.05)",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.1)",
                  },
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
                      color:"#a71900ff",
                  
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
                      background:
                        "linear-gradient(135deg, #f5f9ff 0%, #e8f4ff 100%)",
                      border: "1px solid #e0e9fd",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Box
                        sx={{
                          bgcolor: "primary.main",
                          color: "white",
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 10px rgba(25, 118, 210, 0.3)",
                        }}
                      >
                        <Search />
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
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={fetchAllPosts}
                          disabled={loading}
                          sx={{ borderRadius: 2 }}
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
                      background:
                        "linear-gradient(135deg, #f5fff8 0%, #e8fff0 100%)",
                      border: "1px solid #e0fde9",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Box
                        sx={{
                          bgcolor: "#2e7d32",
                          color: "white",
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 10px rgba(46, 125, 50, 0.3)",
                        }}
                      >
                        <KeywordIcon />
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
                          variant="outlined"
                          color="success"
                          size="small"
                          onClick={() => navigate("/social-media-settings")}
                          sx={{ borderRadius: 2 }}
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
                      <Grid item xs={12} sm={6} key={i} sx={{ maxWidth: "400px" }}>
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
                                "linear-gradient(90deg, #1976d2, #42a5f5)",
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
                                    color: "#1976d2",
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
                                    color: "#1976d2",
                                  }}
                                >
                                  {tweet?.retweet_count}
                                </span>{" "}
                                Retweets
                              </Typography>
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
