import React, { useEffect, useState } from "react";
import {
  getAccountsByPlatform,
} from "../../services/socialMediaAccountsService";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Button,
  Grid,
  Tooltip,
  Checkbox,
  TextField,
  DialogActions,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { 
  AddTaskOutlined, 
  Search, 
  Clear as ClearIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  History as HistoryIcon
} from "@mui/icons-material";
import axios from "axios";
import SuccessPopup from "../dialog/successPopup";

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-history-tabpanel-${index}`}
      aria-labelledby={`search-history-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Accessibility props for tabs
function a11yProps(index) {
  return {
    id: `search-history-tab-${index}`,
    'aria-controls': `search-history-tabpanel-${index}`,
  };
}

const SearchHistory = () => {
  const [tabValue, setTabValue] = useState(0);
  const [twitterHistory, setTwitterHistory] = useState([]);
  const [linkedinHistory, setLinkedinHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "liked", "retweeted", "deleted"
  const [keywordFilter, setKeywordFilter] = useState(""); // For keyword filtering
  const [availableKeywords, setAvailableKeywords] = useState([]); // Store unique keywords
 
  const [accessToken, setAccessToken] = useState("");
  const [tweetText, setTweetText] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [editedReply, setEditedReply] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [twitterAccounts, setTwitterAccounts] = useState([]);
  const [linkedinAccounts, setLinkedinAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [highlightedTweetId, setHighlightedTweetId] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // State for prompt management
  const [availablePrompts, setAvailablePrompts] = useState([
    {
      id: "default",
      name: "Default",
      content: `Reply smartly to this tweet:\n"{tweetContent}"\nMake it personal, friendly, and relevant. Be professional and do not use emojis and crisp and small contents`
    },
    {
      id: "professional",
      name: "Professional",
      content: `Craft a professional response to this tweet:\n"{tweetContent}".\nUse formal language, be concise, and maintain a business-appropriate tone.`
    },
    {
      id: "engaging",
      name: "Engaging",
      content: `Create an engaging reply to this tweet:\n"{tweetContent}".\nAsk a thoughtful question to encourage further conversation while being relevant to the original content.`
    },
    {
      id: "supportive",
      name: "Supportive",
      content: `Write a supportive response to this tweet:\n"{tweetContent}".\nShow empathy, offer encouragement, and be positive while keeping it brief and genuine.`
    }
  ]);
  const [selectedPromptId, setSelectedPromptId] = useState("default");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedIds([]);
    setSelectAll(false);
    setSearch("");
    setFilterType("all");
    setKeywordFilter("");
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setKeywordFilter("");
  };

  const fetchTwitterHistory = async (accountId = null) => {
    try {
      let url = "http://localhost:5000/api/search/history";
      if (accountId) {
        url += `?accountId=${accountId}&platform=twitter`;
      } else {
        url += `?platform=twitter`;
      }
      const res = await axios.get(url);
      setTwitterHistory(res.data);
    } catch (err) {
      console.error("Error fetching Twitter history:", err.message);
    }
  };

  const fetchLinkedInHistory = async (accountId = null) => {
    try {
      let url = "http://localhost:5000/api/search/history";
      if (accountId) {
        url += `?accountId=${accountId}&platform=linkedin`;
      } else {
        url += `?platform=linkedin`;
      }
      const res = await axios.get(url);
      setLinkedinHistory(res.data);
    } catch (err) {
      console.error("Error fetching LinkedIn history:", err.message);
    }
  };

  useEffect(() => {
    fetchTwitterHistory(selectedAccountId);
    fetchLinkedInHistory(selectedAccountId);
    fetchTwitterAccounts();
    fetchLinkedInAccounts();
    
    // Load saved prompt settings from localStorage
    const savedPrompt = localStorage.getItem("selectedPrompt");
    if (savedPrompt) {
      setSelectedPromptId(savedPrompt === "custom" ? "default" : savedPrompt);
    }
  }, []);
  
  // Extract unique keywords from history data
  useEffect(() => {
    const currentHistory = getCurrentHistory();
    const keywords = new Set();
    
    currentHistory.forEach(item => {
      if (item.keyword) {
        keywords.add(item.keyword);
      }
    });
    
    setAvailableKeywords(Array.from(keywords));
  }, [twitterHistory, linkedinHistory, tabValue]);

  // Refetch history when selected account changes
  useEffect(() => {
    if (tabValue === 0) {
      fetchTwitterHistory(selectedAccountId);
    } else {
      fetchLinkedInHistory(selectedAccountId);
    }
  }, [selectedAccountId, tabValue]);

  // Fetch Twitter accounts
  const fetchTwitterAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const token = localStorage.getItem("token");
      const response = await getAccountsByPlatform("twitter", token);
      setTwitterAccounts(response.data || []);

      // Set default selected account if available
      if (response.data && response.data.length > 0) {
        setSelectedAccountId(response.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching Twitter accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch LinkedIn accounts
  const fetchLinkedInAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await getAccountsByPlatform("linkedin", token);
      setLinkedinAccounts(response.data || []);
    } catch (err) {
      console.error("Error fetching LinkedIn accounts:", err);
    }
  };
  
  const handleDelete = async (tweetId) => {
    try {
      await axios.delete(`http://localhost:5000/api/search/delete/${tweetId}`);
      if (tabValue === 0) {
        setTwitterHistory((prev) => prev.filter((tweet) => tweet.id !== tweetId));
      } else {
        setLinkedinHistory((prev) => prev.filter((tweet) => tweet.id !== tweetId));
      }
    } catch (err) {
      console.error("Delete failed:", err.message);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (let id of selectedIds) {
        await axios.delete(`http://localhost:5000/api/search/delete/${id}`);
      }
      if (tabValue === 0) {
        setTwitterHistory((prev) =>
          prev.filter((tweet) => !selectedIds.includes(tweet.id))
        );
      } else {
        setLinkedinHistory((prev) =>
          prev.filter((tweet) => !selectedIds.includes(tweet.id))
        );
      }
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Bulk delete failed:", err.message);
    }
  };

  const handlePost11 = async (tweetId, replyText, selectedAccountId) => {
    try {
      setIsPosting(true);
      const endpoint = tabValue === 0 ? "reply-to-tweet" : "reply-to-linkedin";
      
      // Get the selected model from localStorage
      const selectedModel = localStorage.getItem("selectedModel") || "meta-llama/llama-3-8b-instruct";
      
      // Get the selected prompt content
      let promptContent;
      const savedPrompt = localStorage.getItem("selectedPrompt");
      
      if (savedPrompt === "custom") {
        promptContent = localStorage.getItem("customPrompt") || availablePrompts[0].content;
      } else {
        const promptObj = availablePrompts.find(p => p.id === (selectedPromptId || savedPrompt || "default"));
        promptContent = promptObj ? promptObj.content : availablePrompts[0].content;
      }
      
      const res = await axios.post(`http://localhost:5000/api/${endpoint}`, {
        tweetId,
        replyText,
        selectedAccountId: selectedAccountId,
        model: selectedModel,
        promptContent: promptContent
      });

      if (res.data.message === "Reply posted!") {
        setSuccessPopup(true);
        setTimeout(() => {
          setSuccessPopup(false);
        }, 3000);
        return true;
      } else {
        setErrorMessage("Failed to post reply");
        setErrorPopup(true);
        setTimeout(() => {
          setErrorPopup(false);
        }, 3000);
        return false;
      }
    } catch (err) {
      console.error("Reply post failed:", err?.response?.data || err.message);
      setErrorMessage(err?.response?.data?.message || err.message || "Failed to post reply");
      setErrorPopup(true);
      setTimeout(() => {
        setErrorPopup(false);
      }, 3000);
      return false;
    } finally {
      setIsPosting(false);
      setOpen(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("accessToken");
    const tweetId = urlParams.get("tweetId");

    if (token) {
      setAccessToken(token);
    }

    // Set highlighted tweet ID if present in URL
    if (tweetId) {
      setHighlightedTweetId(tweetId);
    }
  }, []);

  const handleSelectAll = () => {
    const currentHistory = tabValue === 0 ? twitterHistory : linkedinHistory;
    const filteredData = currentHistory.filter(
      (item) =>
        item.text.toLowerCase().includes(search.toLowerCase())
    );
    
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleCheckbox = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getCurrentHistory = () => {
    return tabValue === 0 ? twitterHistory : linkedinHistory;
  };

  const getCurrentAccounts = () => {
    return tabValue === 0 ? twitterAccounts : linkedinAccounts;
  };

  const filteredData = getCurrentHistory().filter(
    (item) => {
      // First apply text search filter
      const matchesSearch = item.text.toLowerCase().includes(search.toLowerCase());
      
      // Then apply type filter
      let matchesType = true;
      if (filterType === "liked" && (item.like_count <= 0)) {
        matchesType = false;
      } else if (filterType === "retweeted" && (item.retweet_count <= 0)) {
        matchesType = false;
      } 
      
      // Apply keyword filter
      const matchesKeyword = !keywordFilter || item.keyword === keywordFilter;
      
      return matchesSearch && matchesType && matchesKeyword;
    }
  );

  const handlePost = (tweet) => {
    setSelectedTweet(tweet);
    setEditedReply(tweet.reply || "");
    setIsEditing(false);
    setOpen(true);
  };
  
  const generateReply = async () => {
    if (!selectedTweet) return;
    
    try {
      setIsGeneratingReply(true);
      
      // Get the selected model from localStorage
      const selectedModel = localStorage.getItem("selectedModel") || "meta-llama/llama-3-8b-instruct";
      
      // Get the selected prompt content
      let promptContent;
      const savedPrompt = localStorage.getItem("selectedPrompt");
      
      if (savedPrompt === "custom") {
        promptContent = localStorage.getItem("customPrompt") || availablePrompts[0].content;
      } else {
        const promptObj = availablePrompts.find(p => p.id === (selectedPromptId || savedPrompt || "default"));
        promptContent = promptObj ? promptObj.content : availablePrompts[0].content;
      }
      
      // Replace {tweetContent} with the actual tweet text
      const formattedPrompt = promptContent.replace(/{tweetContent}/g, selectedTweet.text);
      
      // Call the backend to generate a reply
      const response = await axios.post("http://localhost:5000/api/generate-reply", {
        model: selectedModel,
        messages: [
          {
            role: "user",
            content: formattedPrompt
          }
        ]
      });
      
      if (response.data && response.data.reply) {
        setEditedReply(response.data.reply);
      } else {
        setErrorMessage("Failed to generate reply");
        setErrorPopup(true);
      }
    } catch (error) {
      console.error("Error generating reply:", error);
      setErrorMessage(error?.response?.data?.message || "Failed to generate reply");
      setErrorPopup(true);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleEdit = (tweet) => {
    setSelectedTweet(tweet);
    setEditedReply(tweet.reply || "");
    setIsEditing(true);
    setOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/update/${selectedTweet.id}`, {
        reply: editedReply,
      });

      // Update the reply in the local state
      if (tabValue === 0) {
        setTwitterHistory((prev) =>
          prev.map((tweet) =>
            tweet.id === selectedTweet.id
              ? { ...tweet, reply: editedReply }
              : tweet
          )
        );
      } else {
        setLinkedinHistory((prev) =>
          prev.map((tweet) =>
            tweet.id === selectedTweet.id
              ? { ...tweet, reply: editedReply }
              : tweet
          )
        );
      }
      setIsEditing(false);
      alert("Reply updated successfully!");
    } catch (error) {
      console.error("Error updating reply:", error);
      alert("Failed to update reply");
    }
  };

  const handleScrapeit = async () => {
    if (!selectedAccountId) {
      setErrorMessage("Please select an account to post from.");
      setErrorPopup(true);
      setTimeout(() => {
        setErrorPopup(false);
      }, 3000);
      return;
    }

    try {
      const tweetId = localStorage.getItem("selected_tweet_id");
      const reply = localStorage.getItem("selected_tweet_reply") || editedReply;
      if (!tweetId || !reply) {
        setErrorMessage("No tweet selected or reply text is empty.");
        setErrorPopup(true);
        setTimeout(() => {
          setErrorPopup(false);
        }, 3000);
        return;
      }

      // Call the backend service to post the reply
      const success = await handlePost11(tweetId, reply, selectedAccountId);

      if (success) {
        // Update the local history state
        if (tabValue === 0) {
          setTwitterHistory((prev) =>
            prev.map((tweet) =>
              tweet.id === tweetId ? { ...tweet, reply } : tweet
            )
          );
        } else {
          setLinkedinHistory((prev) =>
            prev.map((tweet) =>
              tweet.id === tweetId ? { ...tweet, reply } : tweet
            )
          );
        }
        setOpen(false);
      }
    } catch (error) {
      setTimeout(() => {
        setErrorPopup(false);
      }, 3000);
    }
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(46, 125, 50, 0.08)",
        border: "1px solid rgba(46, 125, 50, 0.12)",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 12px 40px rgba(46, 125, 50, 0.12)",
        },
      }}
    >
      {/* Header with Green Theme */}
      <Box
        sx={{
          color: "white",
          p: 4,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"50\" cy=\"50\" r=\"1\" fill=\"%23ffffff\" opacity=\"0.05\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')",
            opacity: 0.3,
          },
        }}
      >
        <Grid container spacing={3} >
         
          {/* Filters first - now at the top for better visibility */}
          <Grid item xs={12}>
            
            <Box sx={{
             display: "flex",
    flexDirection: "row",
    justifyContent: "space-between", 
    alignItems: "flex-start",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    flexWrap: "wrap", 
              backgroundColor: "rgba(255,255,255,0.9)",
             
             
              
            }}>
               <Box sx={{ flex: 1, minWidth: "300px" }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  color: "#4896a1",
                }}
              >
                Search History
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.9,
                  fontSize: "1rem",
                }}
              >
                Manage your social media search history across platforms
              </Typography>
            </Box>
             
              <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography variant="caption"  sx={{
                  fontWeight: 600,
                  color: "#4896a1",
                }}>
                    SEARCH
                  </Typography>
                  <TextField
                    size="medium"
                    placeholder="Search posts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <Search
                          sx={{ color: "#4896a1" }}
                        />
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                       
                        borderRadius: "12px",
                        color: "#333",
                        border: "1px solid #ddd",
                        transition: "all 0.3s",
                        "&:hover": {
                          backgroundColor: "#fff",
                          border: "1px solid #4896a1",
                        },
                        "&.Mui-focused": {
                          backgroundColor: "#fff",
                          border: "1px solid #4896a1",
                        },
                      }
                    }}
                  />
                </Box>
                
               
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: "300px" }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                   
                    
                   
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption"  sx={{
                  fontWeight: 600,
              
                  color: "#4896a1",
                }}>
                        KEYWORD
                      </Typography>
                      <TextField
                        select
                        size="medium"
                        value={keywordFilter}
                        onChange={(e) => setKeywordFilter(e.target.value)}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                           
                            borderRadius: "12px",
                            color: "#333",
                            border: "1px solid #ddd",
                            transition: "all 0.3s",
                            "&:hover": {
                              backgroundColor: "#fff",
                              border: "1px solid #4896a1",
                            },
                            "&.Mui-focused": {
                              backgroundColor: "#fff",
                              border: "1px solid #4896a1",
                            },
                            "& fieldset": {
                              border: "none",
                            },
                          },
                          "& .MuiSelect-select": {
                            color: "#333",
                          },
                          "& .MuiSvgIcon-root": {
                            color: "#4896a1",
                          }
                        }}
                      >
                        <MenuItem value="">All Keywords</MenuItem>
                        {availableKeywords.map((keyword, index) => (
                          <MenuItem key={index} value={keyword}>
                            {keyword}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                </Box>
                 {(search || filterType !== "all" || keywordFilter) && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={clearFilters}
                    endIcon={<ClearIcon />}
                    sx={{
                      backgroundColor: "#4896a1",
                      color: "white",
                      fontWeight: "bold",
                     
                    }}
                  >
                    CLEAR ALL FILTERS
                  </Button>
                </Box>
              )}
              </Box>
              
              
             
            </Box>
          </Grid>
          
          
         
        </Grid>
      </Box>

      {/* Tabs with Green Theme */}
      <Paper
        elevation={0}
        sx={{ 
          borderRadius: 0,
          backgroundColor: "rgba(46, 125, 50, 0.02)",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="search history tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'rgba(46, 125, 50, 0.12)',
            px: 2,
            fontSize:"0.96rem",
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#7e8382ff',
              transition: 'all 0.3s ease',
              '&:hover': {
                color: '#E5EFEE',
                backgroundColor: 'rgba(46, 125, 50, 0.04)',
              },
              '&.Mui-selected': {
                color: '#1a1a1a',
                fontWeight: 600,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#E5EFEE',
              height: 3,
              borderRadius: '2px 2px 0 0',
            },
          }}
        >
          <Tab
           
            label="Twitter History"
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
          
            label="LinkedIn History"
            iconPosition="start"
            {...a11yProps(1)}
          />
        </Tabs>
      </Paper>

      {/* Action Bar */}
      {selectedIds.length > 0 && (
        <Box
          sx={{
            p: 2,
            backgroundColor: "rgba(46, 125, 50, 0.04)",
            borderBottom: "1px solid rgba(46, 125, 50, 0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelected}
            startIcon={<DeleteIcon />}
            sx={{
              borderRadius: "8px",
              fontWeight: 600,
              backgroundColor:"#4896A0",
              border:"none",
              boxShadow: "0 4px 12px rgba(244, 67, 54, 0.2)",
              "&:hover": {
                boxShadow: "0 6px 16px rgba(244, 67, 54, 0.3)",
              },
            }}
          >
            Delete Selected
          </Button>
        </Box>
      )}

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <SearchHistoryTable
          data={filteredData}
          selectedIds={selectedIds}
          selectAll={selectAll}
          onSelectAll={handleSelectAll}
          onCheckbox={handleCheckbox}
          onDelete={handleDelete}
          onPost={handlePost}
          highlightedTweetId={highlightedTweetId}
          platform="twitter"
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <SearchHistoryTable
          data={filteredData}
          selectedIds={selectedIds}
          selectAll={selectAll}
          onSelectAll={handleSelectAll}
          onCheckbox={handleCheckbox}
          onDelete={handleDelete}
          onPost={handlePost}
          highlightedTweetId={highlightedTweetId}
          platform="linkedin"
        />
      </TabPanel>

      {/* Dialog for posting */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            boxShadow: "0 12px 48px rgba(46, 125, 50, 0.15)",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #2e7d32, #43a047)",
            color: "white",
            fontSize: "1.3rem",
            fontWeight: 700,
            py: 3,
            textAlign: "center",
          }}
        >
          {isEditing ? "Edit Reply" : `Post to ${tabValue === 0 ? 'Twitter' : 'LinkedIn'}`}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Original Post */}
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: "#2e7d32",
              mb: 2,
            }}
          >
            Original Post
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              p: 2,
              backgroundColor: "rgba(46, 125, 50, 0.04)",
              borderRadius: "8px",
              border: "1px solid rgba(46, 125, 50, 0.12)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            {selectedTweet?.text || "No content available."}
          </Typography>

          {/* Reply Section */}
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: "#2e7d32",
              mb: 2,
            }}
          >
            Your Reply
          </Typography>

          {/* Prompt Selection */}
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: "#2e7d32",
              mb: 2,
            }}
          >
            Select Prompt Template
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2e7d32",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2e7d32",
                    borderWidth: "2px",
                  },
                },
              }}
            >
              {availablePrompts.map((prompt) => (
                <MenuItem key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </MenuItem>
              ))}
            </Select>
            
            <Button
              variant="contained"
              onClick={generateReply}
              disabled={isGeneratingReply}
              sx={{
                backgroundColor: "#2e7d32",
                "&:hover": { backgroundColor: "#1b5e20" },
                mb: 2
              }}
            >
              {isGeneratingReply ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Generate Reply"
              )}
            </Button>
          </FormControl>

          {isEditing ? (
            <>
              <TextField
                fullWidth
                multiline
                minRows={4}
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                placeholder="Enter your reply here..."
                variant="outlined"
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#2e7d32",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#2e7d32",
                      borderWidth: "2px",
                    },
                  },
                }}
              />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={handleSaveEdit}
                  sx={{
                    backgroundColor: "#2e7d32",
                    "&:hover": { backgroundColor: "#1b5e20" },
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(false)}
                  sx={{
                    borderColor: "#2e7d32",
                    color: "#2e7d32",
                    "&:hover": {
                      borderColor: "#1b5e20",
                      backgroundColor: "rgba(46, 125, 50, 0.04)",
                    },
                  }}
                >
                  Cancel
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  p: 2,
                  border: "1px solid rgba(46, 125, 50, 0.12)",
                  borderRadius: "8px",
                  backgroundColor: "rgba(46, 125, 50, 0.02)",
                  minHeight: "100px",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                {editedReply || "No reply content yet."}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mb: 2 }}>
                <Tooltip title="Edit Reply">
                  <IconButton
                    onClick={() => setIsEditing(true)}
                    sx={{
                      color: "#2e7d32",
                      "&:hover": {
                        backgroundColor: "rgba(46, 125, 50, 0.08)",
                      },
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </>
          )}

          {/* Account Selection */}
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: "#2e7d32",
              mt: 3,
              mb: 1,
            }}
          >
            Select Account
          </Typography>
          <FormControl fullWidth>
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              displayEmpty
              disabled={loadingAccounts}
              sx={{
                borderRadius: "8px",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#2e7d32",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#2e7d32",
                },
              }}
            >
              <MenuItem value="">
                <em>Select Account</em>
              </MenuItem>
              {getCurrentAccounts()?.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.accountName} (@{account.accountId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

      </Dialog>

      {/* Success Popup */}
      <Dialog
        open={successPopup}
        onClose={() => setSuccessPopup(false)}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '16px',
            boxShadow: '0 12px 48px rgba(46, 125, 50, 0.2)',
            overflow: 'hidden',
            maxWidth: '400px',
          }
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, #2e7d32, #43a047)",
            color: 'white',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Success!
          </Typography>
          <Typography variant="body1">
            Your reply has been posted successfully.
          </Typography>
        </Box>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            onClick={() => setSuccessPopup(false)}
            variant="contained"
            sx={{
              backgroundColor: "#2e7d32",
              borderRadius: '8px',
              fontWeight: 600,
              "&:hover": { backgroundColor: "#1b5e20" },
            }}
          >
            Close
          </Button>
        </Box>
      </Dialog>

      {/* Error Popup */}
      <SuccessPopup 
        open={errorPopup}
        onClose={() => setErrorPopup(false)}
      />
    </Paper>
  );
};

// Separate component for the table to avoid repetition
const SearchHistoryTable = ({ 
  data, 
  selectedIds, 
  selectAll, 
  onSelectAll, 
  onCheckbox, 
  onDelete, 
  onPost, 
  highlightedTweetId,
  platform 
}) => {
  return (
    <TableContainer
      sx={{
        maxHeight: "70vh",
        "&::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "&::-webkit-scrollbar-track": {
          background: "rgba(46, 125, 50, 0.04)",
          borderRadius: "10px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(46, 125, 50, 0.2)",
          borderRadius: "10px",
          "&:hover": {
            background: "rgba(46, 125, 50, 0.3)",
          },
        },
      }}
    >
      <Table stickyHeader>
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                backgroundColor: "rgba(46, 125, 50, 0.04)",
                fontWeight: 700,
                color: "#2e7d32",
                fontSize: "0.95rem",
                borderBottom: "2px solid rgba(46, 125, 50, 0.12)",
                whiteSpace: "nowrap",
                padding: "16px 12px",
              },
            }}
          >
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectAll}
                onChange={onSelectAll}
                sx={{
                  color: "#4896A0",
                  "&.Mui-checked": {
                    color: "#4896A0",
                  },
                }}
              />
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight={600}  fontSize={"0.96rem"}>
                Post Content
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight={600} >
                Reply
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight={600}>
                Likes
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight={600}>
                {platform === 'twitter' ? 'Retweets' : 'Shares'}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography variant="subtitle2" fontWeight={600}>
                Actions
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No {platform} history found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your search history will appear here once you start searching.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            data.map((tweet, index) => (
              <TableRow
                key={tweet.id}
                sx={{
                  transition: "all 0.3s ease",
                  backgroundColor:
                    highlightedTweetId === tweet.id
                      ? "rgba(46, 125, 50, 0.08)"
                      : "inherit",
                  "&:hover": {
                    backgroundColor:
                      highlightedTweetId === tweet.id
                        ? "rgba(46, 125, 50, 0.12)"
                        : "rgba(46, 125, 50, 0.04)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 2px 8px rgba(46, 125, 50, 0.1)",
                  },
                  "& td": {
                    padding: "16px 12px",
                    borderBottom: "1px solid rgba(46, 125, 50, 0.08)",
                    fontSize: "0.9rem",
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(tweet.id)}
                    onChange={() => onCheckbox(tweet.id)}
                    sx={{
                      color: "#4896A0",
                      "&.Mui-checked": {
                        color: "#4896A0",
                      },
                    }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 400 }}>
                  <Tooltip title={tweet.text} placement="top" arrow>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.4,
                      }}
                    >
                      {tweet.text}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Tooltip title={tweet.reply || "No reply"} placement="top" arrow>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.4,
                      }}
                    >
                      {tweet.reply || "No reply"}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "#2e7d32",
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {tweet.like_count || 0}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "#2e7d32",
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {platform === 'twitter' ? (tweet.retweet_count || 0) : (tweet.share_count || 0)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Tooltip title="Delete">
                      <IconButton
                        onClick={() => onDelete(tweet.id)}
                        size="small"
                        sx={{
                          backgroundColor: "#d3d2d24f",
                          color: "#6d6b6bff",
                          transition: "all 0.2s",
                          "&:hover": {
                            backgroundColor: "#7c777771",
                            transform: "scale(1.1)",
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                   
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SearchHistory;
