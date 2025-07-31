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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { AddTaskOutlined, RemoveRedEye, Search, Clear as ClearIcon } from "@mui/icons-material";
import axios from "axios";
import SuccessPopup from "../dialog/successPopup";

const SearchHistory = () => {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [search, setSearch] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tweetText, setTweetText] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [editedReply, setEditedReply] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [highlightedTweetId, setHighlightedTweetId] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fetchHistory = async (accountId = null) => {
    try {
      let url = "http://localhost:5000/api/search/history";
      if (accountId) {
        url += `?accountId=${accountId}`;
      }
      const res = await axios.get(url);
      setHistory(res.data);
    } catch (err) {
      console.error("Error fetching history:", err.message);
    }
  };
  useEffect(() => {
    fetchHistory(selectedAccountId);
    fetchAccounts();
  }, []);

  // Refetch history when selected account changes
  useEffect(() => {
    fetchHistory(selectedAccountId);
  }, [selectedAccountId]);

  // Fetch social media accounts
  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const token = localStorage.getItem("token");
      const response = await getAccountsByPlatform("twitter", token);
      setAccounts(response.data || []);

      // Set default selected account if available
      if (response.data && response.data.length > 0) {
        setSelectedAccountId(response.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };
  
  const handleDelete = async (tweetId) => {
    try {
      await axios.delete(`http://localhost:5000/api/search/delete/${tweetId}`);
      setHistory((prev) => prev.filter((tweet) => tweet.id !== tweetId));
    } catch (err) {
      console.error("Delete failed:", err.message);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (let id of selectedIds) {
        await axios.delete(`http://localhost:5000/api/search/delete/${id}`);
      }
      setHistory((prev) =>
        prev.filter((tweet) => !selectedIds.includes(tweet.id))
      );
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Bulk delete failed:", err.message);
    }
  };

  // const handlePost = async (tweetId, replyText) => {
  //   try {
  //     const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
  //     const res = await axios.post("http://localhost:5000/api/post-reply", {
  //       tweetUrl,
  //       replyText,
  //     });

  //     if (res.data.success) {
  //       alert("✅ Reply posted!");
  //     } else {
  //       alert("❌ Failed to post reply");
  //     }
  //   } catch (err) {
  //     console.error("Reply post failed:", err.message);
  //   }
  // };
  const token = localStorage.getItem("twitter_access_token");
  // const handlePost11 = async (tweetId, replyText, token) => {
  //   try {
  //     const res = await axios.post("http://localhost:5000/api/post-reply", {
  //       tweetId,
  //       replyText,
  //       accessToken: token,
  //     });

  //     if (res.data.message === "Reply posted!") {
  //       alert("✅ Reply posted!");
  //     } else {
  //       alert("❌ Failed to post reply");
  //     }
  //   } catch (err) {
  //     console.error("Reply post failed:", err?.response?.data || err.message);
  //   }
  // };
const handlePost11 = async (tweetId, replyText, selectedAccountId) => {
    try {
      setIsPosting(true);
      const res = await axios.post("http://localhost:5000/api/reply-to-tweet", {
        tweetId,
        replyText,
        selectedAccountId: selectedAccountId
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
  setOpen(false)
 
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("accessToken");
    const tweetId = urlParams.get("tweetId");

    // console.log("Access Token from URL:", token);
    if (token) {
      setAccessToken(token);
    }

    // Set highlighted tweet ID if present in URL
    if (tweetId) {
      setHighlightedTweetId(tweetId);
    }
  }, []);

  // const handlePost = async () => {
  //   try {
  //     const response = await axios.post("http://localhost:5000/api/auth/tweet", {
  //       tweetText:"hello",
  //       accessToken:token,
  //     });
  //     alert("Tweeted: " + response.data.data.text);
  //   } catch (error) {
  //     console.error("Tweet Error:", error.response?.data || error.message);
  //   }
  // };
  const handleSelectAll = () => {
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

  const filteredData = history.filter(
    (item) =>
      item.keyword.toLowerCase().includes(search.toLowerCase()) ||
      item.text.toLowerCase().includes(search.toLowerCase())
  );
  const handlePost = (tweet) => {
    setSelectedTweet(tweet);
    setEditedReply(tweet.reply || "");
  localStorage.setItem("selected_tweet_id", tweet.id);
  localStorage.setItem("selected_tweet_reply", tweet.reply || "");

    setIsEditing(false);
    setOpen(true);

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
      setHistory((prev) =>
        prev.map((tweet) =>
          tweet.id === selectedTweet.id
            ? { ...tweet, reply: editedReply }
            : tweet
        )
      );

      setOpen(false);
      alert("Reply updated successfully!");
    } catch (error) {
      console.error("Error updating reply:", error);
      alert("Failed to update reply");
    }
  };

  const redirectToTwitter = () => {
      if (isPosting) return;
      setIsPosting(true);
    try {
      const clientId = "RVp3MTJpY0ZCWWNwYzlMQzVLN1U6MTpjaQ";
      
      const redirectUri = encodeURIComponent(
        "http://localhost:5000/api/auth/twitter/callback"
      );
      const scope = encodeURIComponent(
       'tweet.read tweet.write users.read offline.access'
      );
      console.log("phase 1")
      // Generate a more unique state with timestamp to help with rate limiting
      const state = `state_${Date.now()}`; // Random string in production for CSRF protection
      const codeChallenge = "challenge"; // For now, static; later use real PKCE

      const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=plain`;

      // Add a small delay before redirecting to avoid rapid successive requests
      setTimeout(() => {
        window.location.href = twitterAuthUrl;
      }, 500);
    } catch (error) {
      console.error("Error redirecting to Twitter:", error);
      setError("Failed to connect to Twitter. Please try again later.");
    } finally {
      setIsPosting(false);
    }
  };
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (!code) return;

  // Exchange code for access token and trigger retweet
  console.log("passed phase 2",code)
  const exchangeCodeAndRetweet = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/twitter/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok && data.access_token) {
        console.log("✅ Twitter Access Token:", data.access_token);
        localStorage.setItem("twitter_access_token", data.access_token);

        // Trigger retweet API on your backend
        const retweetRes = await fetch("http://localhost:5000/api/twitter/retweet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.access_token}`,
          },
          body: JSON.stringify({
            tweetId: '1948117932606984467',
            reply: 'Greatt'
          }),
        });

        const result = await retweetRes.json();
        if (!retweetRes.ok) throw new Error(result.message);

        console.log("✅ Retweet & Reply Success", result);
      } else {
        throw new Error(data.message || "No access token returned");
      }
    } catch (err) {
      console.error("❌ Twitter retweet failed:", err.message);
    }
  };

  exchangeCodeAndRetweet();
}, []);

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
        setHistory((prev) =>
          prev.map((tweet) =>
            tweet.id === tweetId ? { ...tweet, reply } : tweet
          )
        );
        
        setOpen(false);
      }
    } catch (error) {
      
     
      setTimeout(() => {
        setErrorPopup(false);
      }, 3000);
    }
  }

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 6px 25px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Account Selection */}

      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        sx={{
          p: 3,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "linear-gradient(to right, #f9f9f9, #ffffff)",
        }}
      >
        <Grid
          item
          xs={12}
          md={8}
          sx={{ display: "flex", alignItems: "center", gap: 3 }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: "var(--brand-font)",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#333",
              display: "flex",
              alignItems: "center",
              "&::before": {
                content: '""',
                display: "inline-block",
                width: "4px",
                height: "24px",
                backgroundColor: "#FF0000",
                marginRight: "12px",
                borderRadius: "2px",
              },
            }}
          >
            Search History
          </Typography>
          <TextField
            size="small"
            label="Search keyword/tweet"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              minWidth: "250px",
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                transition: "all 0.3s",
              },
            }}
            InputProps={{
              startAdornment: (
                <Search
                  fontSize="small"
                  sx={{ color: "text.secondary", mr: 1 }}
                />
              ),
            }}
          />
        </Grid>
        {selectedIds.length > 0 && (
          <Grid
            item
            xs={12}
            md={4}
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <Button
              variant="contained"
              color="#fef2f2"
              onClick={handleDeleteSelected}
              startIcon={<DeleteIcon />}
              sx={{
                backgroundColor: "#eb5050ff",
                padding: "0.5rem 1.5rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
                fontWeight: 600,

                transition: "all 0.3s ease",
              }}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </Grid>
        )}
      </Grid>

      <TableContainer
        sx={{
          maxHeight: "80vh",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f1f1",
            borderRadius: "10px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#c1c1c1",
            borderRadius: "10px",
            "&:hover": {
              background: "#a8a8a8",
            },
          },
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: "#f5f5f5",
                "& th": {
                  fontWeight: 600,
                  color: "#333",
                  fontSize: "0.9rem",
                  borderBottom: "2px solid #e0e0e0",
                  whiteSpace: "nowrap",
                  padding: "16px 8px",
                },
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  color="primary"
                />
              </TableCell>
              <TableCell>
                <b>Keyword</b>
              </TableCell>
              <TableCell sx={{ width: "200px", maxWidth: "200px" }}>
                <b>Tweet</b>
              </TableCell>
              <TableCell>
                <b>Tweet Link</b>
              </TableCell>
              <TableCell>
                <b>Reply</b>
              </TableCell>
              <TableCell>
                <b>Likes</b>
              </TableCell>
              <TableCell>
                <b>Retweets</b>
              </TableCell>
              <TableCell>
                <b>Actions</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((tweet, index) => (
              <TableRow
                key={tweet.id}
                sx={{
                  transition: "all 0.3s ease",
                  animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`,
                  backgroundColor:
                    highlightedTweetId === tweet.id
                      ? "rgba(248, 3, 3, 0.25)"
                      : "inherit",
                  "&:hover": {
                    backgroundColor:
                      highlightedTweetId === tweet.id
                        ? "rgba(209, 22, 22, 0.32)"
                        : "rgba(0, 0, 0, 0.04)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                  },
                  "& td": {
                    padding: "12px 8px",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "0.9rem",
                  },
                  "@keyframes fadeIn": {
                    "0%": {
                      opacity: 0,
                      transform: "translateY(10px)",
                    },
                    "100%": {
                      opacity: 1,
                      transform: "translateY(0)",
                    },
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(tweet.id)}
                    onChange={() => handleCheckbox(tweet.id)}
                  />
                </TableCell>
                <TableCell>{tweet.keyword}</TableCell>
                <TableCell sx={{ width: "400px", maxWidth: "460px" }}>
                  <Tooltip title={tweet.text} placement="top" arrow>
                    <span>
                      {tweet.text.split(" ").slice(0, 16).join(" ")}
                      {tweet.text.split(" ").length > 16 && (
                        <Button
                          variant="text"
                          size="small"
                          sx={{
                            ml: 1,
                            color: "#f44336", // Simple red
                            fontWeight: 400,
                            fontSize: "0.75rem",
                            textDecoration: "underline",
                            padding: 0,
                            minWidth: "auto",
                            "&:hover": {
                              backgroundColor: "transparent", // Prevent MUI hover bg
                              textDecoration: "underline",
                              transform: "none", // Remove motion
                            },
                          }}
                        >
                          Read more
                        </Button>
                      )}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: "250px", maxWidth: "250px" }}>
                  <Button
                    variant="outlined"
                    href={tweet.tweet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<RemoveRedEye fontSize="small" />}
                    sx={{
                      borderColor: "#FF0000",
                      color: "#FF0000",
                      borderRadius: "4px",
                      fontSize: "0.6rem",
                      fontWeight: 500,
                      padding: "4px 12px",
                      transition: "all 0.3s",
                      "&:hover": {
                        backgroundColor: "rgba(255, 0, 0, 0.08)",
                        borderColor: "#E00000",
                        transform: "translateY(-2px)",
                        boxShadow: "0 2px 8px rgba(255, 0, 0, 0.2)",
                      },
                    }}
                  >
                    View Post
                  </Button>
                </TableCell>

                <TableCell>
                  <Tooltip title={tweet.reply} placement="top" arrow>
                    <span>
                      {tweet.reply?.split(" ").slice(0, 20).join(" ")}
                      {tweet.reply?.split(" ").length > 20 && (
                        <RemoveRedEye
                          fontSize="small"
                          sx={{
                            display: "inline-flex",
                            verticalAlign: "middle",
                            ml: 0.5,
                            color: "text.secondary",
                          }}
                        />
                      )}
                    </span>
                  </Tooltip>
                </TableCell>

                <TableCell>{tweet.like_count}</TableCell>
                <TableCell>{tweet.retweet_count}</TableCell>
                <TableCell>
                  <Grid
                    sx={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "flex-start",
                      alignItems: "center",
                    }}
                  >
                    <IconButton
                      onClick={() => handleEdit(tweet)}
                      sx={{
                        backgroundColor: "rgba(152, 167, 167, 0.2)",
                        transition: "all 0.2s",
                        "&:hover": {
                          backgroundColor: "rgba(255, 0, 0, 0.15)",
                          transform: "scale(1.1)",
                        },
                      }}
                      size="small"
                    >
                      <EditIcon fontSize="small" sx={{ color: "#8e9294ff" }} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(tweet.id)}
                      sx={{
                        backgroundColor: "rgba(211, 47, 47, 0.08)",
                        transition: "all 0.2s",
                        "&:hover": {
                          backgroundColor: "rgba(211, 47, 47, 0.15)",
                          transform: "scale(1.1)",
                        },
                      }}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" sx={{ color: "#d32f2f" }} />
                    </IconButton>
                    <Button
                      variant="contained"
                      onClick={() => handlePost(tweet)}
                      startIcon={<AddTaskOutlined fontSize="small" />}
                      sx={{
                        backgroundColor: "#2d8358ff",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        borderRadius: "6px",
                        padding: "4px 12px",
                        boxShadow: "0 2px 8px rgba(76, 175, 80, 0.2)",
                        transition: "all 0.3s",
                        "&:hover": {
                          backgroundColor: "#43a047",
                          boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      Post
                    </Button>
                  </Grid>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
          },
        }}
        TransitionProps={{
          timeout: 400,
          style: { transition: "all 0.4s ease" },
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
            "&::after": {
              content: '""',
              position: "absolute",
              left: "24px",
              bottom: "-1px",
              width: "40px",
              height: "3px",
              backgroundColor: isEditing ? "#FF0000" : "#4caf50",
              borderRadius: "2px",
            },
          }}
        >
          {isEditing ? "Edit Reply" : "Retweet Confirmation"}
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            padding: "24px",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Original Tweet Title */}
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
                backgroundColor: "#FF0000",
                marginRight: "8px",
                borderRadius: "2px",
              },
            }}
          >
            Original Tweet
          </Typography>

          {/* Original Tweet Content */}
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
              position: "relative",
              "&::before": {
                content: '"“"',
                position: "absolute",
                top: "8px",
                left: "12px",
                fontSize: "24px",
                color: "#bdbdbd",
                fontFamily: "Georgia, serif",
              },
              "&::after": {
                content: '"”"',
                position: "absolute",
                bottom: "8px",
                right: "12px",
                fontSize: "24px",
                color: "#bdbdbd",
                fontFamily: "Georgia, serif",
              },
            }}
          >
            {selectedTweet?.text || "No tweet content available."}
          </Typography>

          {/* Your Reply */}
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
                backgroundColor: isEditing ? "#FF0000" : "#4caf50",
                marginRight: "8px",
                borderRadius: "2px",
              },
            }}
          >
            {isEditing ? "Edit Your Reply" : "Your Reply"}
          </Typography>

          {/* Reply Input or Preview */}
          {isEditing ? (
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
                  transition: "all 0.3s",
                  fontSize: "0.95rem",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FF0000",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FF0000",
                    borderWidth: "2px",
                  },
                },
              }}
            />
          ) : (
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                p: 3,
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                backgroundColor: "#f9f9f9",
                minHeight: "120px",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                position: "relative",
                "&::before": {
                  content: '"“"',
                  position: "absolute",
                  top: "8px",
                  left: "12px",
                  fontSize: "24px",
                  color: "#bdbdbd",
                  fontFamily: "Georgia, serif",
                },
                "&::after": {
                  content: '"”"',
                  position: "absolute",
                  bottom: "8px",
                  right: "12px",
                  fontSize: "24px",
                  color: "#bdbdbd",
                  fontFamily: "Georgia, serif",
                },
              }}
            >
              {editedReply || "No reply content yet."}
            </Typography>
          )}

          {/* Select Account (only if not editing) */}
          {!isEditing && (
            <>
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
                    backgroundColor: "#4caf50",
                    marginRight: "8px",
                    borderRadius: "2px",
                  },
                }}
              >
                <strong>Select Account:</strong>
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  displayEmpty
                  disabled={loadingAccounts}
                  sx={{
                    borderRadius: "8px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4caf50",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4caf50",
                    },
                  }}
                  renderValue={(value) =>
                    value ? value : <em>Default Account</em>
                  }
                >
                  <MenuItem value="">
                    <em>Default Account</em>
                  </MenuItem>
                  {accounts?.length ? (
                    accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.accountName} (@{account.accountId})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No accounts available</MenuItem>
                  )}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{ padding: "16px 24px", backgroundColor: "#f8f8f8" }}
        >
          <Button
            onClick={() => setOpen(false)}
            variant="outlined"
            sx={{
              borderColor: "#9e9e9e",
              color: "#757575",
              borderRadius: "8px",
              fontWeight: 600,
              padding: "6px 16px",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "#757575",
                backgroundColor: "rgba(0,0,0,0.04)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={isEditing ? handleSaveEdit : handleScrapeit}
            variant="contained"
            startIcon={isEditing ? <EditIcon /> : (isPosting ? null : <Search />)}
            disabled={isPosting}
            sx={{
              backgroundColor: isEditing ? "#FF0000" : "#4caf50",
              padding: "6px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              boxShadow: isEditing
                ? "0 4px 12px rgba(255, 0, 0, 0.2)"
                : "0 4px 12px rgba(76, 175, 80, 0.2)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: isEditing ? "#E00000" : "#43a047",
                boxShadow: isEditing
                  ? "0 6px 16px rgba(255, 0, 0, 0.3)"
                  : "0 6px 16px rgba(76, 175, 80, 0.3)",
                transform: "translateY(-2px)",
              },
            }}
          >
            {isPosting ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Posting...
              </>
            ) : (
              isEditing ? "Save Changes" : "Post Reply"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Popup */}
      <Dialog
        open={successPopup}
        onClose={() => setSuccessPopup(false)}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            maxWidth: '400px',
            margin: 'auto',
          }
        }}
      >
        <Box
          sx={{
            backgroundColor: '#4caf50',
            color: 'white',
            p: 3,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <IconButton
            onClick={() => setSuccessPopup(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              }
            }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Success!
          </Typography>
          <Typography variant="body1">
            Your reply has been posted successfully.
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              opacity: 0.1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Search sx={{ fontSize: '120px' }} />
          </Box>
        </Box>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            onClick={() => setSuccessPopup(false)}
            variant="contained"
            color="primary"
            sx={{
              minWidth: 120,
              borderRadius: '8px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(76, 175, 80, 0.3)',
              }
            }}
          >
            Close
          </Button>
        </Box>
      </Dialog>

      {/* Error Popup */}
    <SuccessPopup  open={errorPopup}
        onClose={() => setErrorPopup(false)}/>
    </Paper>
  );
};

export default SearchHistory;