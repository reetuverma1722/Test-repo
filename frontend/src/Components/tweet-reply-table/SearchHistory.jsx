import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const SearchHistory = () => {
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [search, setSearch] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tweetText, setTweetText] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [editedReply, setEditedReply] = useState("");
  const fetchHistory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/search/history");
      setHistory(res.data);
    } catch (err) {
      console.error("Error fetching history:", err.message);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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
  const handlePost11 = async (tweetId, replyText, token) => {
    try {
      const res = await axios.post("http://localhost:5000/api/post-reply", {
        tweetId,
        replyText,
        accessToken: token,
      });

      if (res.data.message === "Reply posted!") {
        alert("✅ Reply posted!");
      } else {
        alert("❌ Failed to post reply");
      }
    } catch (err) {
      console.error("Reply post failed:", err?.response?.data || err.message);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("accessToken");
    // console.log("Access Token from URL:", token);
    if (token) {
      setAccessToken(token);
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
    setOpen(true);
  };

  const handleRetweet = async () => {
    const tweetId = selectedTweet?.id;
    const tweetReply = editedReply;

    if (!tweetId || !tweetReply) {
      alert("Tweet or reply is missing");
      return;
    }

    const access_token = localStorage.getItem("twitter_access_token");

    if (!access_token) {
      alert("Access token not found. Please login with Twitter.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/postReply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          tweetId,
          reply: tweetReply,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Reply posted successfully!");
        setOpen(false); // close modal
      } else {
        alert("Error posting reply: " + data.message);
      }
    } catch (error) {
      console.error("Tweet post error:", error);
      alert("Failed to post reply.");
    }
  };

  //   const handleRetweet = () => {
  //   const tweetId = selectedTweet?.id;
  //   const tweetReply = editedReply;

  //   if (!tweetId || !tweetReply) {
  //     alert("Tweet or reply is missing");
  //     return;
  //   }

  //   const access_token = localStorage.getItem("twitter_access_token");

  //   if (!access_token) {
  //     alert("Access token not found. Please login with Twitter.");
  //     return;
  //   }

  //   // Pass data via query parameters to backend
  //   const url = `http://localhost:3000?twitterId=${encodeURIComponent(access_token)}&tweetId=${tweetId}&reply=${encodeURIComponent(tweetReply)}`;

  //   console.log("Redirecting to:", url);
  //   window.location.href = url;
  // };
  return (
    <Paper>
      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        sx={{ p: 2 }}
      >
        <Grid sx={{ display: "flex", gap: 3 }}>
          <Typography variant="h6" sx={{ fontFamily: "var(--brand-font)", fontSize: "1.2rem" }}>📜 Search History</Typography>
          <TextField
            size="small"
            label="Search keyword/tweet"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Grid>
        {selectedIds.length > 0 && (
          <Grid container justifyContent="flex-end" sx={{ p: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSelected}
              sx={{ backgroundColor: "var(--brand-color)", padding: "0.5rem 1rem", borderRadius: "0.25rem", fontSize: "1rem" }}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </Grid>
        )}
      </Grid>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
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
              <TableCell>
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
            {filteredData.map((tweet) => (
              <TableRow key={tweet.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(tweet.id)}
                    onChange={() => handleCheckbox(tweet.id)}
                  />
                </TableCell>
                <TableCell>{tweet.keyword}</TableCell>
                <TableCell>
                  <Tooltip title={tweet.text} placement="top" arrow>
                    <span>
                      {tweet.text.split(" ").slice(0, 16).join(" ")}
                      {tweet.text.split(" ").length > 16 && (
                        <Button variant="text" size="small" sx={{ ml: 1 }}>
                          Read more
                        </Button>
                      )}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    href={tweet.tweet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ width: "100px", whiteSpace: "nowrap" }}
                  >
                    View Post
                  </Button>
                </TableCell>

                <TableCell>
                  <Tooltip title={tweet.reply} placement="top" arrow>
                    <span>
                      {tweet.reply?.split(" ").slice(0, 20).join(" ")}
                      {tweet.reply?.split(" ").length > 20 && (
                        <Button variant="text" size="small" sx={{ ml: 1 }}>
                          Read more
                        </Button>
                      )}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>{tweet.like_count}</TableCell>
                <TableCell>{tweet.retweet_count}</TableCell>
                <TableCell>
                  <Grid sx={{ display: "flex", gap: "10px", fontFamily: "var(--brand-font)", fontSize: "0.9rem" }}>
                    <IconButton
                      onClick={() => alert("Edit not implemented yet")}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(tweet.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                    <Button
                      style={{ backgroundColor: "green", color: "white" }}
                      // onClick={() => handlePost(tweet.id, tweet.reply,token)}
                      onClick={() => handlePost(tweet)}
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
      >
        <DialogTitle sx={{ fontFamily: "var(--brand-font)", fontSize: "1.2rem" }}>Retweet Confirmation</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom sx={{ fontFamily: "var(--brand-font)", fontSize: "1rem" }}>
            <strong>Tweet:</strong>
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedTweet?.text}
          </Typography>

          <Typography variant="subtitle1" gutterBottom sx={{ fontFamily: "var(--brand-font)", fontSize: "1rem" }}>
            <strong>Edit Reply:</strong>
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={editedReply}
            onChange={(e) => setEditedReply(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleRetweet} variant="contained" color="primary" sx={{ backgroundColor: "var(--brand-color)", padding: "0.5rem 1rem", borderRadius: "0.25rem", fontSize: "1rem" }}>
            Retweet
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SearchHistory;
