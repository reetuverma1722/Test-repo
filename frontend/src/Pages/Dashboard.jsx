import React, { useState, useEffect } from "react";
import {
  Toolbar,
  Typography,
  IconButton,
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
  Paper,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  CloseOutlined,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  FindInPage as FindInPageIcon,
  ManageSearch as ManageSearchIcon,
  Check as CheckIcon,
  RemoveRedEye as ViewIcon,
  PostAdd as PostAddIcon,
  AddTaskOutlined,
  Edit as EditIcon,
  Favorite as FavoriteIcon,
  Replay as ReplyIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import authService from "../services/authService";
import TweetReplyTable from "../Components/tweet-reply-table/SearchHistory";
import GoalsTable from "./Post_Manager";
import SocialMediaSettings from "./SocialMediaSettings";
import { getAccountsByPlatform } from "../services/socialMediaAccountsService";
import TrendingAnalytics from "./TrendingAnalytics";
import PostHistoryPage from "./PostHistoryPage";
import { getPostHistoryall } from "../services/postHistoryService";
import Header from "../Components/header/Header";

const drawerWidth = 260;

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [filteredTweets, setFilteredTweets] = useState([]);
  const [selectedKeywordForPrompts, setSelectedKeywordForPrompts] =
    useState(null);
  const [keywordPromptsDialogOpen, setKeywordPromptsDialogOpen] =
    useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dataSource, setDataSource] = useState("cache");
  const [postedTweets, setPostedTweets] = useState([]);
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [keywordPromptMap, setKeywordPromptMap] = useState({});
  const [keywordPromptsMap, setKeywordPromptsMap] = useState({});
  const [keywordPrompts, setKeywordPrompts] = useState([]);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [twitterAccounts, setTwitterAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [editedReply, setEditedReply] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Function to format time difference as "X hours ago"
  const getTimeAgo = (timestamp) => {
    if (!timestamp) {
      // If no timestamp but data is from Twitter, it's freshly fetched
      if (dataSource === "twitter") return "Just now";
      return "Unknown";
    }

    const fetchedTime = new Date(timestamp);
    const diffMs = currentTime - fetchedTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  };

  // Function to format posted time for display
  const formatPostedTime = (postedTime) => {
    if (!postedTime) return "Unknown time";

    // Handle relative time formats like "2h", "1d", "3m"
    if (/^\d+[smhd]$/.test(postedTime)) {
      const unit = postedTime.slice(-1);
      const value = postedTime.slice(0, -1);

      switch (unit) {
        case "s":
          return `${value} second${value !== "1" ? "s" : ""} ago`;
        case "m":
          return `${value} minute${value !== "1" ? "s" : ""} ago`;
        case "h":
          return `${value} hour${value !== "1" ? "s" : ""} ago`;
        case "d":
          return `${value} day${value !== "1" ? "s" : ""} ago`;
        default:
          return postedTime;
      }
    }

    if (/^[A-Za-z]{3}\s+\d{1,2}(,\s+\d{4})?$/.test(postedTime)) {
      return `Posted on ${postedTime}`;
    }

    try {
      const date = new Date(postedTime);
      if (!isNaN(date.getTime())) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just posted";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        // For older posts, show the date
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
      }
    } catch (e) {}

    return postedTime;
  };

  const fetchTwitterAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await getAccountsByPlatform("twitter");

      const accounts = response.data || [];

      setTwitterAccounts(accounts);

      const defaultAccount = accounts.find(
        (account) => account.isDefault === true
      );
      if (defaultAccount) {
        setSelectedAccount(defaultAccount.id);
      } else {
        setSelectedAccount(null);
      }
    } catch (err) {
      console.error("Failed to fetch Twitter accounts", err);
      setTwitterAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchPostHistory = async () => {
    try {
      const result = await getPostHistoryall();

      if (result.success && result.data) {
        setPosts(result.data); // still okay if you need it

        // Extract only the tweet IDs into a list
        const tweetIds = result.data.map((post) => post.tweetid);

        // Set posted tweet IDs
        setPostedTweets(tweetIds);
      }

      //console.log("Tweets already posted:", posts);
    } catch (err) {
      console.error("Failed to fetch post history:", err);
    }
  };
  // Fetch keywords and Twitter accounts on component mount
  useEffect(() => {
    fetchTwitterAccounts();
    fetchPostHistory();
    fetchPrompts();
    fetchKeywordPromptAssociations();
  }, []);

  const fetchKeywordPromptAssociations = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/keywords");
      if (response.data.success && response.data.data) {
        const keywordData = response.data.data;
        const promptMap = {};
        const keywordPromptsMap = {};

        keywordData.forEach((keyword) => {
          if (keyword.promptId) {
            promptMap[keyword.text] = keyword.promptId.toString();
          }

          if (keyword.prompts && keyword.prompts.length > 0) {
            keywordPromptsMap[keyword.text] = keyword.prompts;
          }
        });

        setKeywordPromptMap(promptMap);

        setKeywordPromptsMap(keywordPromptsMap);
        console.log("Keyword-prompt associations loaded:", promptMap);
        console.log("All keyword prompts loaded:", keywordPromptsMap);
      }
    } catch (error) {
      console.error("Error fetching keyword-prompt associations:", error);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/prompts");
      if (response.data.success && response.data.data) {
        // Map the prompts from the database to the format we need
        const dbPrompts = response.data.data.map((prompt) => ({
          id: prompt.id.toString(),
          name: prompt.name,
          content: prompt.content,
          model: prompt.model,
        }));

        setAvailablePrompts(dbPrompts);

        const defaultPrompt = dbPrompts.find((p) => p.name === "Default");
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt.id);
        }
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      // If we can't fetch prompts from the database, use default ones
      setAvailablePrompts([
        {
          id: "default",
          name: "Default",
          content: `Reply smartly to this tweet:\n"{tweetContent}"\nMake it personal, friendly, and relevant.`,
          model: "meta-llama/llama-3-8b-instruct",
        },
      ]);
    }
  };

  useEffect(() => {
    if (twitterAccounts.length > 0) {
      fetchAllPosts(selectedAccount);
    }
  }, [selectedAccount, twitterAccounts]);

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

  const fetchAllPosts = async (
    accountId = selectedAccount,
    forceRefresh = false
  ) => {
    setLoading(true);
    setTweets([]);
    setDataSource("cache");

    try {
      const allKeywords = await fetchAllKeywords();

      const filteredKeywords = accountId
        ? allKeywords.filter((k) => {
            console.log(
              "Comparing keyword account:",
              k.accountId,
              "with selected account:",
              accountId
            );

            return String(k.accountId) === String(accountId);
          })
        : allKeywords;

      setKeywords(filteredKeywords);

      if (filteredKeywords.length === 0) {
        setLoading(false);
        return;
      }

      let allFetchedTweets = [];

      for (const keyword of filteredKeywords) {
        const minLikes = Number(keyword.minLikes) || 0;
        const minRetweets = Number(keyword.minRetweets) || 0;
        const minFollowers = Number(keyword.minFollowers) || 0;

        // Build search URL for this specific keyword
        let searchUrl = `http://localhost:5000/api/search?keyword=${keyword.text}&minLikes=${minLikes}&minRetweets=${minRetweets}&minFollowers=${minFollowers}`;

        if (accountId) {
          searchUrl += `&accountId=${accountId}`;
        }

        // Add forceRefresh parameter if true
        if (forceRefresh) {
          searchUrl += `&forceRefresh=true`;
        }

        try {
          const res = await axios.get(searchUrl);

          // Set data source from the response
          if (res.data.from) {
            setDataSource(res.data.from);
          }

          // Add keyword information to each tweet
          const keywordTweets = (res.data.tweets || []).map((tweet) => ({
            ...tweet,
            keyword: keyword.text,
          }));

          allFetchedTweets = [...allFetchedTweets, ...keywordTweets];
        } catch (err) {
          console.error(
            `Error fetching tweets for keyword "${keyword.text}":`,
            err
          );
        }
      }

      // Remove duplicates (in case a tweet matches multiple keywords)
      const uniqueTweets = Array.from(
        new Map(allFetchedTweets.map((tweet) => [tweet.id, tweet])).values()
      );

      setTweets(uniqueTweets);
      // filteredTweets will be updated by the useEffect
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle post button click
  const handlePost = (tweet) => {
    setSelectedTweet(tweet);
    setEditedReply(tweet.reply || "");

    if (tweet.keyword && keywordPromptsMap[tweet.keyword]) {
      const keywordPromptsList = keywordPromptsMap[tweet.keyword];

      setKeywordPrompts(keywordPromptsList);

      const preferredTemplates = [
        "Professional",
        "Supportive",
        "Engaging",
        "Default",
      ];

      // First check if any of the preferred templates exist in available prompts
      let foundPreferredPrompt = false;
      for (const templateName of preferredTemplates) {
        const preferredPrompt = availablePrompts.find(
          (p) => p.name === templateName
        );
        if (preferredPrompt) {
          setSelectedPromptId(preferredPrompt.id);
          foundPreferredPrompt = true;
          console.log(`Selected preferred prompt template: ${templateName}`);
          break;
        }
      }

      // If no preferred template found, use the first keyword-specific prompt
      if (!foundPreferredPrompt && keywordPromptsList.length > 0) {
        setSelectedPromptId(keywordPromptsList[0].id.toString());
        console.log(
          `Selected first keyword-specific prompt: ${keywordPromptsList[0].name}`
        );
      }
    } else {
      const defaultPrompt = availablePrompts.find((p) => p.name === "Default");
      if (defaultPrompt) {
        setSelectedPromptId(defaultPrompt.id);
      }
      setKeywordPrompts([]);
    }

    setPostDialogOpen(true);
  };

  const generateReply = async () => {
    if (!selectedTweet) return;

    try {
      setIsGeneratingReply(true);

      // Find the selected prompt from either availablePrompts or keywordPrompts
      let selectedPrompt = availablePrompts.find(
        (p) => p.id === selectedPromptId
      );

      // If not found in availablePrompts, check keywordPrompts
      if (!selectedPrompt && keywordPrompts.length > 0) {
        selectedPrompt = keywordPrompts.find(
          (p) => p.id.toString() === selectedPromptId
        );
      }

      if (!selectedPrompt) {
        console.error("No prompt selected or prompt not found");
        alert("Error: Selected prompt not found");
        return;
      }

      // Replace {tweetContent} with the actual tweet text
      const formattedPrompt = selectedPrompt.content.replace(
        /{tweetContent}/g,
        selectedTweet.text
      );

      // First check if the API endpoint is accessible
      try {
        await axios.get("http://localhost:5000/api/generate-reply-check");
      } catch (checkError) {
        console.error("API endpoint check failed:", checkError);
        alert(
          "Cannot connect to AI service. Please check if the server is running."
        );
        return;
      }

      // Call the backend to generate a reply
      const response = await axios.post(
        "http://localhost:5000/api/generate-reply",
        {
          model: selectedPrompt.model || "meta-llama/llama-3-8b-instruct",
          messages: [
            {
              role: "user",
              content: formattedPrompt,
            },
          ],
        }
      );

      if (response.data && response.data.reply) {
        setEditedReply(response.data.reply);
      } else {
        alert("Failed to generate reply: No content returned from AI service");
      }
    } catch (error) {
      console.error("Error generating reply:", error);

      // Provide more specific error messages based on the error type
      let errorMessage = "Unknown error occurred";

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 404) {
          errorMessage =
            "AI service endpoint not found. Please check if the server is running.";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage =
          "No response from server. Please check your network connection.";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message;
      }

      alert("Error generating reply: " + errorMessage);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Handle post submission
  const handlePostSubmit = async () => {
    if (!selectedTweet || !editedReply) {
      return;
    }

    setIsPosting(true);

    try {
      const tweetKeyword = selectedTweet.keyword;
      const keywordObj = keywords.find((k) => k.text === tweetKeyword);
      const keywordId = keywordObj ? keywordObj.id : null;

      let selectedPrompt = availablePrompts.find(
        (p) => p.id === selectedPromptId
      );

      if (!selectedPrompt && keywordPrompts.length > 0) {
        selectedPrompt = keywordPrompts.find(
          (p) => p.id.toString() === selectedPromptId
        );
      }

      const model = selectedPrompt
        ? selectedPrompt.model
        : "meta-llama/llama-3-8b-instruct";
      const promptContent = selectedPrompt ? selectedPrompt.content : "";
      const promptName = selectedPrompt ? selectedPrompt.name : "Default";

      console.log("Using prompt:", promptName);
      console.log("Using model:", model);

      const response = await axios.post(
        "http://localhost:5000/api/reply-to-tweet",
        {
          tweetId: selectedTweet.id,
          replyText: editedReply,
          selectedAccountId: selectedAccount,
          keywordId: keywordId,
          tweetText: selectedTweet.text,
          likeCount: selectedTweet.like_count,
          retweetCount: selectedTweet.retweet_count,
          model: model,
          promptContent: promptContent,
          promptName: promptName,
        }
      );

      if (response.data.success) {
        alert("Reply posted successfully!");
        setPostedTweets((prev) => [...prev, selectedTweet.id]);
        setPostDialogOpen(false);
      } else {
        alert(
          "Failed to post reply: " + (response.data.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      alert("Error posting reply: " + (error.message || "Unknown error"));
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    const twitterToken = new URLSearchParams(window.location.search).get(
      "accessToken"
    );

    if (twitterToken) {
      localStorage.setItem("twitter_access_token", twitterToken);

      const convertToken = async () => {
        try {
          const response = await authService.convertTwitterToken(twitterToken);

          if (response.success) {
            localStorage.setItem("token", response.token);
            const response2 = await authService.getReplyIdForTweet();

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
  }, [navigate]);

  const formatNumber = (num) => {
    if (num >= 1_000_000)
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return num;
  };

  const handleKeywordToggle = (keywordText) => {
    setSelectedKeywords((prev) => {
      const isSelected = prev.includes(keywordText);
      const newSelected = isSelected
        ? prev.filter((k) => k !== keywordText)
        : [...prev, keywordText];

      return newSelected;
    });
  };

  useEffect(() => {
    if (selectedKeywords.length === 0) {
      setFilteredTweets(tweets);
    } else {
      const filtered = tweets.filter((tweet) => {
        return selectedKeywords.some(
          (keyword) =>
            tweet.keyword &&
            tweet.keyword.toLowerCase() === keyword.toLowerCase()
        );
      });
      setFilteredTweets(filtered);
    }
  }, [tweets, selectedKeywords]);

  return (
    <Box sx={{ display: "flex" }}>
      <Dialog
        open={keywordPromptsDialogOpen}
        onClose={() => setKeywordPromptsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "var(--brand-font)",
            fontSize: "1.3rem",
            fontWeight: 600,
            backgroundColor: "#f8f8f8",
            borderBottom: "1px solid #eaeaea",
            padding: "16px 24px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ManageSearchIcon sx={{ mr: 1, color: "#4D99A3" }} />
            Prompts for "{selectedKeywordForPrompts?.text}"
          </Box>
          <IconButton
            aria-label="close"
            onClick={() => setKeywordPromptsDialogOpen(false)}
            sx={{
              color: "text.secondary",
            }}
          >
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ padding: "24px" }}>
          {selectedKeywordForPrompts &&
          keywordPromptsMap[selectedKeywordForPrompts.text] ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {keywordPromptsMap[selectedKeywordForPrompts.text].map(
                (prompt, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid #e0e0e0",
                      backgroundColor: prompt.is_default
                        ? "#f5f9fa"
                        : "#ffffff",
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: "#4D99A3" }}
                      >
                        {prompt.name} {prompt.is_default && "(Default)"}
                      </Typography>
                      <Chip
                        label={prompt.model}
                        size="small"
                        sx={{
                          backgroundColor: "#e5efee",
                          color: "#4D99A3",
                          fontSize: "0.7rem",
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", mb: 1 }}
                    >
                      {prompt.content}
                    </Typography>
                  </Paper>
                )
              )}
            </Box>
          ) : (
            <Typography
              variant="body1"
              sx={{ textAlign: "center", py: 2, color: "text.secondary" }}
            >
              No prompts associated with this keyword.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{ padding: "16px 24px", backgroundColor: "#f8f8f8" }}
        >
          <Button
            onClick={() => setKeywordPromptsDialogOpen(false)}
            variant="outlined"
            sx={{
              borderColor: "#4d99a393",
              color: "#4d99a3ff",
              borderRadius: "8px",
              fontWeight: 600,
              padding: "6px 16px",
            }}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              if (selectedKeywordForPrompts) {
                navigate("/social-media-settings");
              }
              setKeywordPromptsDialogOpen(false);
            }}
            variant="contained"
            sx={{
              backgroundColor: "#4D99A3",
              borderRadius: "8px",
              fontWeight: 600,
              padding: "6px 16px",
              "&:hover": {
                backgroundColor: "#3d7e85",
              },
            }}
          >
            Manage Prompts
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={postDialogOpen}
        onClose={() => setPostDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "var(--brand-font)",
            fontSize: "1.3rem",
            fontWeight: 600,
            backgroundColor: "#f8f8f8",
            borderBottom: "1px solid #eaeaea",
            padding: "16px 24px",
            position: "relative",
          }}
        >
          Post Reply
        </DialogTitle>
        <DialogContent dividers sx={{ padding: "24px" }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontFamily: "var(--brand-font)",
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "#333",
              display: "flex",
              alignItems: "center",
              "&::before": {
                content: '""',
                display: "inline-block",
                width: "4px",
                height: "16px",
                backgroundColor: "#4D99A3",
                marginRight: "8px",
                borderRadius: "2px",
              },
            }}
          >
            Original Post Content
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 3,
              p: 2,
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              fontStyle: "italic",
            }}
          >
            {selectedTweet?.text || "No tweet content available."}
          </Typography>

          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontFamily: "var(--brand-font)",
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "#333",
              display: "flex",
              alignItems: "center",
              mt: 2,
              "&::before": {
                content: '""',
                display: "inline-block",
                width: "4px",
                height: "16px",
                backgroundColor: "#4D99A3",
                marginRight: "8px",
                borderRadius: "2px",
              },
            }}
          >
            Select Prompt Template
          </Typography>
          {keywordPrompts.length > 0 && (
            <Typography
              variant="caption"
              sx={{ display: "block", mb: 1, color: "text.secondary" }}
            >
              Showing all available templates including {keywordPrompts.length}{" "}
              keyword-specific prompts
            </Typography>
          )}

          <TextField
            select
            fullWidth
            size="small"
            value={selectedPromptId}
            onChange={(e) => setSelectedPromptId(e.target.value)}
            variant="outlined"
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
              "& .MuiSelect-select": {
                padding: "10px 14px",
              },
              "& .MuiMenuItem-root": {
                fontSize: "0.9rem",
              },
            }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    "& .MuiMenuItem-root": {
                      fontSize: "0.9rem",
                      padding: "8px 16px",
                    },
                    "& .MuiMenuItem-root.Mui-selected": {
                      backgroundColor: "rgba(77, 153, 163, 0.1)",
                    },
                    "& .MuiMenuItem-root.Mui-selected:hover": {
                      backgroundColor: "rgba(77, 153, 163, 0.2)",
                    },
                  },
                },
              },
            }}
          >
            <MenuItem
              disabled
              sx={{
                opacity: 1,
                fontWeight: 600,
                color: "#4D99A3",
                fontSize: "0.85rem",
                py: 0.5,
              }}
            >
              Standard Templates
            </MenuItem>
            {availablePrompts.map((prompt) => {
              const isStandardTemplate = [
                "Default",
                "Professional",
                "Supportive",
                "Engaging",
              ].includes(prompt.name);
              return (
                <MenuItem
                  key={prompt.id}
                  value={prompt.id}
                  sx={{
                    pl: 3,
                    "&.Mui-selected": {
                      backgroundColor: "rgba(77, 153, 163, 0.1)",
                    },
                  }}
                >
                  {prompt.name}
                </MenuItem>
              );
            })}

            {keywordPrompts.length > 0 && (
              <>
                <MenuItem
                  disabled
                  sx={{
                    opacity: 1,
                    fontWeight: 600,
                    color: "#4D99A3",
                    fontSize: "0.85rem",
                    py: 0.5,
                    mt: 1,
                    borderTop: "1px solid #eee",
                  }}
                >
                  Keyword-Specific Prompts
                </MenuItem>
                {keywordPrompts.map((prompt) => {
                  const isDuplicate = availablePrompts.some(
                    (p) => p.id === prompt.id
                  );
                  if (!isDuplicate) {
                    return (
                      <MenuItem
                        key={prompt.id}
                        value={prompt.id.toString()}
                        sx={{
                          pl: 3,
                          "&.Mui-selected": {
                            backgroundColor: "rgba(77, 153, 163, 0.1)",
                          },
                        }}
                      >
                        {prompt.name} {prompt.is_default && "(Default)"}
                      </MenuItem>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </TextField>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              variant="contained"
              onClick={generateReply}
              disabled={isGeneratingReply || !selectedPromptId}
              startIcon={
                isGeneratingReply ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
              sx={{
                backgroundColor: "#4D99A3",
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: "#3d7e85",
                },
              }}
            >
              {isGeneratingReply ? "Generating..." : "Generate Reply"}
            </Button>
          </Box>

          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontFamily: "var(--brand-font)",
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "#333",
              display: "flex",
              alignItems: "center",
              mt: 2,
              "&::before": {
                content: '""',
                display: "inline-block",
                width: "4px",
                height: "16px",
                backgroundColor: "#4D99A3",
                marginRight: "8px",
                borderRadius: "2px",
              },
            }}
          >
            Compose Professional Response
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={4}
            value={editedReply}
            onChange={(e) => setEditedReply(e.target.value)}
            placeholder="Compose a professional and concise response..."
            variant="outlined"
            inputProps={{ maxLength: 220 }}
            helperText={`${editedReply.length}/220 characters ${
              editedReply.length > 220 ? "(limit exceeded)" : ""
            }`}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                transition: "all 0.3s",
                border: "none",
                fontSize: "0.95rem",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "transparent",
              },
              "&:hover fieldset": {
                borderColor: "gray",
              },
              "&.Mui-focused fieldset": {
                borderColor: "transparent",
              },
              "& .MuiFormHelperText-root": {
                color: editedReply.length > 220 ? "#f44336" : "text.secondary",
                fontWeight: editedReply.length > 220 ? 600 : 400,
              },
            }}
          />

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 2,
              color: "text.secondary",
              bgcolor: "rgba(244, 67, 54, 0.08)",
              p: 1,
              borderRadius: 1,
              borderLeft: "3px solid #4D99A3",
            }}
          >
            <strong>Note:</strong> Only premium members can post replies longer
            than 200 characters. Non-premium users must keep replies within the
            200 character limit.
          </Typography>

          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontFamily: "var(--brand-font)",
              fontSize: "1rem",
              mt: 2,
              display: "flex",
              alignItems: "center",
              "&::before": {
                content: '""',
                display: "inline-block",
                width: "4px",
                height: "16px",
                backgroundColor: "#4D99A3",
                marginRight: "8px",
                borderRadius: "2px",
              },
            }}
          >
            <strong>Select Account:</strong>
          </Typography>

          <TextField
            select
            fullWidth
            size="small"
            label="Twitter Account"
            value={selectedAccount || ""}
            onChange={(e) => {
              setSelectedAccount(e.target.value === "" ? null : e.target.value);
            }}
            disabled={loadingAccounts}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          >
            <MenuItem value="">All Accounts</MenuItem>
            {Array.isArray(twitterAccounts) &&
              twitterAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.accountName}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>

        <DialogActions
          sx={{ padding: "16px 24px", backgroundColor: "#f8f8f8" }}
        >
          <Button
            onClick={() => setPostDialogOpen(false)}
            variant="outlined"
            sx={{
              borderColor: "#4d99a393",
              color: "#4d99a3ff",
              borderRadius: "8px",
              fontWeight: 600,
              padding: "6px 16px",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePostSubmit}
            variant="contained"
            startIcon={isPosting ? null : <AddTaskOutlined />}
            disabled={
              isPosting || editedReply.length > 220 || !editedReply.trim()
            }
            sx={{
              backgroundColor: "#4D99A3",
              padding: "6px 20px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "#43a047",
                boxShadow: "0 6px 16px rgba(76, 175, 80, 0.3)",
                transform: "translateY(-2px)",
              },
              "&.Mui-disabled": {
                backgroundColor:
                  editedReply.length > 220
                    ? "rgba(244, 67, 54, 0.5)"
                    : "rgba(0, 0, 0, 0.12)",
              },
            }}
          >
            {isPosting ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Posting...
              </>
            ) : (
              "Post Reply"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#F3F3EE",
            color: "#4F6669",
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.05)",
            borderRight: "1px solid rgba(0, 0, 0, 0.08)",
          },
        }}
      >
        <Toolbar sx={{ minHeight: "48px !important" }} />
        <Box sx={{ overflow: "auto", overflowX: "hidden", marginTop: 4 }}>
          <List component="nav" disablePadding>
            {[
              {
                label: "Dashboard",
                path: "/dashboard",
                icon: <DashboardIcon fontSize="small" />,
                key: "dashboard",
              },
              {
                label: "Search History",
                path: "/history",
                icon: <HistoryIcon fontSize="small" />,
                key: "search-history",
              },

              {
                label: "Post History",
                path: "/post-history",
                icon: <PostAddIcon fontSize="small" />,
                key: "post-history",
              },
              {
                label: "Social Media Settings",
                path: "/social-media-settings",
                icon: <SettingsIcon fontSize="small" />,
                key: "social-media-settings",
              },
            ].map((item, index) => {
              const isSelected = location.pathname.includes(item.path);
              return (
                <ListItem
                  key={item.key}
                  button
                  selected={isSelected}
                  onClick={() => {
                    navigate(item.path);
                  }}
                  sx={{
                    mb: 1,
                    mx: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    height: "44px",
                    transition: "all 0.2s ease",
                    backgroundColor: isSelected ? "#4D99A3" : "transparent",
                    "&:hover": {
                      backgroundColor: isSelected ? "#4D99A3" : "#f0f0f0",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: isSelected ? "#fff" : "#4D99A3",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      sx: {
                        color: isSelected ? "#fff !important" : "#4D99A3",
                        fontSize: "2rem",
                        fontWeight: isSelected ? 900 : 500,
                        marginTop: "16px",
                      },
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: "#f9f9f9", minHeight: "100vh" }}
      >
        <Header />

        <Toolbar />
        <Box sx={{ p: 3 }}>
          {/* Always render content within Dashboard component */}
          {location.pathname.includes("/history") ? (
            <TweetReplyTable />
          ) : location.pathname.includes("/postmanager") ? (
            <GoalsTable />
          ) : location.pathname.includes("/social-media-settings") ? (
            <SocialMediaSettings />
          ) : location.pathname.includes("/trending-analytics") ? (
            <TrendingAnalytics />
          ) : location.pathname.includes("/post-history") ? (
            <PostHistoryPage />
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
                      fontWeight: 600,
                      mb: 0.5,
                      color: "#4896a1",
                    }}
                  >
                    Social Media Dashboard
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ fontSize: "0.9rem" }}
                  >
                    Discover and engage with relevant social media content
                  </Typography>
                </Box>
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
                      background: "#e5efee",
                      width: "40vw",
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
                          bgcolor: "#4896A0",
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
                          color="black"
                          size="small"
                          onClick={() => fetchAllPosts(selectedAccount, true)}
                          disabled={loading}
                          sx={{
                            borderRadius: 2,
                            color: "white",
                            backgroundColor: "#4D99A3",
                            border: "none",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          {loading ? "Fetching..." : "Fetch New"}
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
                      width: "40vw",
                      background: "#e5efee",
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
                          bgcolor: "#4896A0",
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
                            color: "white",
                            backgroundColor: "#4D99A3",
                            border: "none",
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

              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 3,
                  width: "82vw",
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Your Keywords & Posts
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 200 }}>
                    <TextField
                      select
                      size="small"
                      label="Twitter Account"
                      value={selectedAccount || ""}
                      onChange={(e) => {
                        const newAccountId =
                          e.target.value === "" ? null : e.target.value;
                        console.log(
                          "Selected account changed to:",
                          newAccountId
                        );

                        setSelectedAccount(newAccountId);

                        fetchAllPosts(newAccountId);
                      }}
                      disabled={loadingAccounts}
                      fullWidth
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    >
                      <MenuItem value="">All Accounts</MenuItem>
                      {Array.isArray(twitterAccounts) &&
                        twitterAccounts.map((account) => (
                          <MenuItem key={account.id} value={account.id}>
                            {account.accountName}
                          </MenuItem>
                        ))}
                    </TextField>
                  </Box>
                </Box>

                {keywords.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {keywords.map((keyword, index) => {
                        const isSelected = selectedKeywords.includes(
                          keyword.text
                        );
                        const hasPrompts =
                          keywordPromptsMap[keyword.text] &&
                          keywordPromptsMap[keyword.text].length > 0;

                        return (
                          <Chip
                            key={index}
                            label={
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                {keyword.text}
                                {hasPrompts && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      ml: 0.5,
                                      backgroundColor: isSelected
                                        ? "rgba(255,255,255,0.3)"
                                        : "#4896a1",
                                      color: isSelected ? "#ffffff" : "#ffffff",
                                      borderRadius: "50%",
                                      width: 16,
                                      height: 16,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.7rem",
                                    }}
                                  >
                                    {keywordPromptsMap[keyword.text].length}
                                  </Typography>
                                )}
                              </Box>
                            }
                            size="medium"
                            onClick={() => handleKeywordToggle(keyword.text)}
                            onDelete={
                              hasPrompts
                                ? () => {
                                    setSelectedKeywordForPrompts(keyword);
                                    setKeywordPromptsDialogOpen(true);
                                  }
                                : undefined
                            }
                            deleteIcon={
                              hasPrompts ? (
                                <Tooltip title="View prompts">
                                  <ManageSearchIcon fontSize="small" />
                                </Tooltip>
                              ) : undefined
                            }
                            color={isSelected ? "primary" : "default"}
                            sx={{
                              borderRadius: "16px",
                              px: 1,
                              fontWeight: 500,
                              backgroundColor: isSelected
                                ? "#4896a1"
                                : "#ffffff",
                              color: isSelected ? "#ffffff" : "#4896a1",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                              cursor: "pointer",
                              "&:hover": {
                                boxShadow: "0 4px 8px rgba(0,0,0,0.12)",
                                backgroundColor: isSelected
                                  ? "#4896a1"
                                  : "#f5f5f5",
                              },
                            }}
                          />
                        );
                      })}
                    </Box>
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
              ) : filteredTweets.length > 0 ? (
                <Box sx={{ position: "relative" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Latest Posts
                  </Typography>
                  <Grid container spacing={3}>
                    {filteredTweets.map((tweet, i) => (
                      <Grid item xs={12} sm={6} lg={4} key={i}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 4,
                            overflow: "hidden",
                            border: postedTweets.includes(tweet.id)
                              ? "1px solid #e5e7eb"
                              : "1px solid #e5e7eb",
                            transition: "all 0.3s ease",
                            height: "100%",
                            width: "18.98vw",
                            backgroundColor: postedTweets.includes(tweet.id)
                              ? "#fafafa"
                              : "#fafafa",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                            cursor: "pointer",
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                              borderColor: postedTweets.includes(tweet.id)
                                ? "#d1d5db"
                                : "#d1d5db",
                            },
                          }}
                        >
                          <CardContent sx={{ p: 0, height: "100%" }}>
                            <a
                              href={`https://x.com/i/web/status/${tweet.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: "none" }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                  p: 3,
                                  pb: 2,
                                }}
                              >
                                <Avatar
                                  src={tweet?.profile_image_url || ""}
                                  sx={{
                                    width: 48,

                                    height: 48,

                                    backgroundColor: "#E5EFEE",

                                    fontSize: "1.2rem",

                                    fontWeight: 600,

                                    border: "2px solid #ffffff",

                                    boxShadow:
                                      "0 2px 8px rgba(37, 99, 235, 0.2)",
                                  }}
                                >
                                  {tweet?.author_name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: "1rem",
                                      color: "#1a1a1a",
                                      lineHeight: 1.3,
                                      mb: 0.5,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {tweet?.author_name || "Unknown User"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: "#666666",
                                      fontSize: "0.875rem",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    @{tweet?.author_username || "username"}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ px: 3, pb: 2 }}>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontSize: "0.96rem",
                                    lineHeight: 1.6,
                                    color: "#363535ff",
                                    fontWeight: 400,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 4,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    minHeight: "6.4rem",
                                    mb: 3,
                                  }}
                                >
                                  {tweet.text}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  px: 3,
                                  py: 2,
                                  backgroundColor: "#f8f9fa",
                                  borderTop: "1px solid #e5e7eb",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: { xs: 1.5, sm: 2 },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "10px",
                                        color: "white",
                                        fontWeight: 600,
                                      }}
                                    >
                                      <FavoriteIcon
                                        sx={{
                                          fontSize: "18px",
                                          color: "#21808D",
                                          mt: "0.8rem",
                                        }}
                                      />
                                    </Typography>

                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: "#1a1a1a",
                                      }}
                                    >
                                      {formatNumber(tweet?.like_count || 0)}
                                    </Typography>
                                  </Box>

                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "10px",
                                        color: "white",
                                        fontWeight: 600,
                                      }}
                                    >
                                      <ReplyIcon
                                        sx={{
                                          fontSize: "18px",
                                          color: "#21808D",
                                          mt: "0.8rem",
                                        }}
                                      />
                                    </Typography>

                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: "#1a1a1a",
                                      }}
                                    >
                                      {formatNumber(tweet?.retweet_count || 0)}
                                    </Typography>
                                  </Box>

                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "10px",
                                        color: "white",
                                        fontWeight: 600,
                                      }}
                                    >
                                      <PeopleIcon
                                        sx={{
                                          fontSize: "18px",
                                          color: "#21808D",
                                          mt: "0.8rem",
                                        }}
                                      />
                                    </Typography>

                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: "#1a1a1a",
                                      }}
                                    >
                                      {formatNumber(
                                        tweet?.followers_count || 0
                                      )}
                                    </Typography>
                                  </Box>

                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "10px",
                                        color: "white",
                                        fontWeight: 600,
                                      }}
                                    >
                                      <ViewIcon
                                        sx={{
                                          fontSize: "18px",
                                          color: "#21808D",
                                          mt: "0.8rem",
                                        }}
                                      />
                                    </Typography>

                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: "#1a1a1a",
                                      }}
                                    >
                                      {formatNumber(tweet?.view_count || 0)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </a>

                            <Box
                              sx={{
                                px: 3,
                                py: 1.5,
                                backgroundColor: "#f8f9fa",
                                borderTop: "1px solid #e5e7eb",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "#66666698",
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                {dataSource === "twitter" && !tweet?.created_at
                                  ? "Freshly fetched from Twitter"
                                  : `Fetched ${getTimeAgo(tweet?.created_at)}`}
                              </Typography>

                              {tweet?.posted_time && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: "#666666",
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <CalendarIcon
                                    sx={{
                                      fontSize: "14px",
                                      color: "#21808D",
                                    }}
                                  />
                                  Posted {formatPostedTime(tweet.posted_time)}
                                </Typography>
                              )}
                            </Box>

                            <Box sx={{ p: 3, pt: 2 }}>
                              <Button
                                variant="contained"
                                size="medium"
                                startIcon={
                                  postedTweets.includes(tweet.id) ? (
                                    <CheckIcon sx={{ fontSize: "18px" }} />
                                  ) : (
                                    <EditIcon sx={{ fontSize: "18px" }} />
                                  )
                                }
                                onClick={() => handlePost(tweet)}
                                disabled={postedTweets.includes(tweet.id)}
                                sx={{
                                  width: "100%",
                                  borderRadius: 3,
                                  backgroundColor: postedTweets.includes(
                                    tweet.id
                                  )
                                    ? "#4caf50"
                                    : "#21808db0",
                                  color: "#E8E8E3",
                                  border: "none",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  textTransform: "none",
                                  py: 1.5,
                                  boxShadow: "0 2px 8px rgba(26, 26, 26, 0.15)",
                                  "&:hover": {
                                    backgroundColor: postedTweets.includes(
                                      tweet.id
                                    )
                                      ? "#43a047"
                                      : "#E8E8E3",
                                    color: postedTweets.includes(tweet.id)
                                      ? "#E8E8E3"
                                      : "#21808db0",
                                    border: "none",
                                    boxShadow:
                                      "0 4px 16px rgba(26, 26, 26, 0.25)",
                                    transform: "translateY(-1px)",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {postedTweets.includes(tweet.id)
                                  ? "Posted"
                                  : "Post Reply"}
                              </Button>
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
