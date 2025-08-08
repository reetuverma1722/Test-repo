import React from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { Favorite as FavoriteIcon,
  Replay as ReplyIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import ViewIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import { useState } from "react";
import { useEffect } from "react";

const PostCard = ({ tweet, postedTweets, dataSource, handlePost }) => {
     const [currentTime, setCurrentTime] = useState(new Date());
  const formatNumber = (num) => {
    if (num >= 1_000_000)
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return num;
  };
  
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


  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        transition: "all 0.3s ease",
        height: "100%",
        width: "18.98vw",
        backgroundColor: "#fafafa",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        cursor: "pointer",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          borderColor: "#d1d5db",
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 3, pb: 2 }}>
            <Avatar
              src={tweet?.profile_image_url || ""}
              sx={{
                width: 48,
                height: 48,
                backgroundColor: "#E5EFEE",
                fontSize: "1.2rem",
                fontWeight: 600,
                border: "2px solid #ffffff",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
              }}
            >
              {tweet?.author_name?.charAt(0)?.toUpperCase() || "U"}
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
            {[{
              icon: <FavoriteIcon sx={{ fontSize: "18px", color: "#21808D"  }} />,
              count: tweet?.like_count || 0,
            }, {
              icon: <ReplyIcon sx={{ fontSize: "18px", color: "#21808D" }} />,
              count: tweet?.retweet_count || 0,
            }, {
              icon: <PeopleIcon sx={{ fontSize: "18px", color: "#21808D" }} />,
              count: tweet?.followers_count || 0,
            }, {
              icon: <ViewIcon sx={{ fontSize: "18px", color: "#21808D"}} />,
              count: tweet?.view_count || 0,
            }].map((item, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {item.icon}
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#1a1a1a" }}
                >
                  {formatNumber(item.count)}
                </Typography>
              </Box>
            ))}
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
              <CalendarIcon sx={{ fontSize: "14px", color: "#21808D" }} />
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
              backgroundColor: postedTweets.includes(tweet.id)
                ? "#4caf50"
                : "#21808db0",
              color: "#E8E8E3",
              fontWeight: 600,
              fontSize: "0.875rem",
              textTransform: "none",
              py: 1.5,
              boxShadow: "0 2px 8px rgba(26, 26, 26, 0.15)",
              "&:hover": {
                backgroundColor: postedTweets.includes(tweet.id)
                  ? "#43a047"
                  : "#E8E8E3",
                color: postedTweets.includes(tweet.id)
                  ? "#E8E8E3"
                  : "#21808db0",
                boxShadow: "0 4px 16px rgba(26, 26, 26, 0.25)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            {postedTweets.includes(tweet.id) ? "Posted" : "Post Reply"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PostCard;
