import React, { useState } from "react";
import {
  TextField,
  Button,
  Chip,
  CircularProgress,
  Typography,
  Grid,
  Slider,
  Card,
  CardContent,
} from "@mui/material";
import axios from "axios";

const mockTrending = [
  "AI",
  "Election2024",
  "Cricket",
  "TechNews",
  "Startup",
  "NASA",
  // 🔽 Digital Marketing Related Topics
  "DigitalMarketing",
  "SEO",
  "ContentMarketing",
  "SocialMediaMarketing",
  "GoogleAds",
  "FacebookAds",
  "MarketingTips",
  "InfluencerMarketing",
  "EmailMarketing",
  "GrowthHacking",
  "PerformanceMarketing",
  "BrandStrategy",
  "LinkedInMarketing",
  "InstagramMarketing",
];


const Keyword_Management = () => {
  const [keywords, setKeywords] = useState([]);
  const [inputKeyword, setInputKeyword] = useState("");
  const [likesFilter, setLikesFilter] = useState(0);
  const [retweetsFilter, setRetweetsFilter] = useState(0);
  const [followersFilter, setFollowersFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tweets, setTweets] = useState([]);

  const handleAddKeyword = () => {
    if (inputKeyword.trim() && !keywords.includes(inputKeyword.trim())) {
      setKeywords((prev) => [...prev, inputKeyword.trim()]);
      setInputKeyword("");
    }
  };

  const handleDeleteKeyword = (k) => {
    setKeywords((prev) => prev.filter((key) => key !== k));
  };

  const handleSelectTrending = (k) => {
    if (!keywords.includes(k)) {
      setKeywords((prev) => [...prev, k]);
    }
  };

  const searchTweetsWithFilters = async () => {
    if (keywords.length === 0) return;
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/search", {
        params: {
          keyword: keywords.join(","), // "modi,cricket"
          minLikes: likesFilter,
          minRetweets: retweetsFilter,
          minFollowers: followersFilter,
        },
      });
      setTweets(res.data.tweets || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

 const clearAllFilters = () => {
  // setKeywords([]); // clear keywords
  setLikesFilter(0); // reset filters
  setRetweetsFilter(0);
  setFollowersFilter(0);
  setTweets([]); // ❗ Clear tweets result also
};


  return (
    <Grid container spacing={2} direction="column" p={3} sx={{ maxWidth: 800 }}>
      <Typography variant="h5" sx={{ fontFamily: "var(--brand-font)", fontSize: "1.2rem" }}>Search Twitter Posts</Typography>

      {/* Keyword Input */}
      <Grid item sx={{ maxWidth: 400 }}>
        <TextField
          size="small"
          label="Enter keyword"
          value={inputKeyword}
          onChange={(e) => setInputKeyword(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") handleAddKeyword();
          }}
          fullWidth
        />
        <Button
          variant="contained"
          onClick={handleAddKeyword}
          sx={{ mt: 1 }}
          size="small"
        >
          Add Keyword
        </Button>
      </Grid>

      {/* Added Keywords */}
      <Grid item sx={{ maxWidth: 600 }}>
        {keywords.map((k) => (
          <Chip
            key={k}
            label={k}
            onDelete={() => handleDeleteKeyword(k)}
            color="primary"
            sx={{ mr: 1, mt: 1 }}
            size="small"
          />
        ))}
      </Grid>

      {/* Trending Keywords */}
      <Grid item sx={{ maxWidth: 600 }}>
        <Typography variant="body2">Or pick trending topics:</Typography>
        {mockTrending.map((t) => (
          <Chip
            key={t}
            label={t}
            variant="outlined"
            onClick={() => handleSelectTrending(t)}
            sx={{ mr: 1, mt: 1 }}
            size="small"
          />
        ))}
      </Grid>

      {/* Filters */}
      <Grid item sx={{ maxWidth: 400 }}>
        <Typography variant="body2">Min Likes: {likesFilter}</Typography>
        <Slider
          value={likesFilter}
          min={0}
          max={1000}
          step={10}
          onChange={(_, val) => setLikesFilter(val)}
          size="small"
        />
        <Typography variant="body2">Min Retweets: {retweetsFilter}</Typography>
        <Slider
          value={retweetsFilter}
          min={0}
          max={1000}
          step={10}
          onChange={(_, val) => setRetweetsFilter(val)}
          size="small"
        />
        <Typography variant="body2">Min Followers: {followersFilter}</Typography>
        <Slider
          value={followersFilter}
          min={0}
          max={100000}
          step={1000}
          onChange={(_, val) => setFollowersFilter(val)}
          size="small"
        />
      </Grid>

      {/* Buttons */}
      <Grid item container spacing={2}>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={searchTweetsWithFilters}
            disabled={loading}
            size="small"
          >
            {loading ? <CircularProgress size={20} /> : "Search Tweets"}
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="primary"
            onClick={clearAllFilters}
            size="small"
          >
            Clear All Filters
          </Button>
        </Grid>
      </Grid>

      {/* Results */}
      {tweets.length > 0 && keywords.length > 0 && (
      <Grid item sx={{ maxWidth: 700 }}>
        
        <Typography variant="h6" mt={3} sx={{ fontFamily: "var(--brand-font)", fontSize: "1rem" }}>
          Results ({tweets.length})
        </Typography>

        {tweets.map((tweet, idx) => (
          <div
            key={idx}
            style={{
              margin: "8px 0",
              paddingBottom: "8px",
            }}
          >
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ padding: '12px' }}>
                <Typography sx={{ fontFamily: "var(--brand-font)", fontSize: "0.9rem" }}>{tweet.text}</Typography>
                <Typography variant="caption" sx={{ fontFamily: "var(--brand-font)", fontSize: "0.8rem" }}>
                  ❤️ {tweet?.like_count ?? 0} | 🔁 {tweet?.retweet_count ?? 0} | 👤
                  Followers: {tweet.followers_count ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </div>
        ))}
      </Grid>)}
    </Grid>
  );
};

export default Keyword_Management;
