const express = require('express');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
require('dotenv').config();
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const { expandKeyword } = require('../aiSearch');
const axios = require('axios');
const { axiosWithRetry } = require('../utils/apiUtils');
router.post('/register', async (req, res) => {
  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
      [email, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔐 Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secretkey', // fallback secret
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token, // ✅ Send token to client
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/google-login', async (req, res) => {
  const { email, name, googleId } = req.body;

  if (!email || !googleId) {
    return res.status(400).json({ message: 'Missing email or googleId' });
  }

  try {
    // 1. Check if user exists
    let userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    let user;
    if (userRes.rows.length === 0) {
      // 2. If not exists, insert new user
      const insertRes = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *',
        [email, googleId, name] // password will just be googleId placeholder
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Return response
    res.status(200).json({
      message: 'Google login successful',
      user,
      token,
    });

  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// router.get('/api/search', async (req, res) => {
//   const { keyword } = req.query;
//   const expandedQueries = [
//     `${keyword}`,
//     `${keyword} news`,
//     `${keyword} trends`
//   ];

//   const results = [];

//   try {
//     for (const query of expandedQueries) {
//       const response = await axios.get(
//         `https://api.twitter.com/2/tweets/search/recent`,
//         {
//           headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
//           params: {
//             query: query,
//             max_results: 10,
//             'tweet.fields': 'public_metrics',
//           }
//         }
//       );

//       results.push(...response.data.data);

//       // ✅ Add delay here to prevent 429 rate limiting
//       await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second
//     }

//     res.json({ data: results });
//   } catch (error) {
//     console.error("Twitter API Error:", error.response?.data || error.message);
//     res.status(500).json({ error: "Search failed", detail: error.message });
//   }
// });
// router.get('/api/search', async (req, res) => {
//   const { keyword } = req.query;

//   if (!keyword) {
//     return res.status(400).json({ error: 'Keyword is required' });
//   }

//   const expandedQueries = [
//     `${keyword}`,
//     `${keyword} news`,
//     `${keyword} trends`,
//   ];

//   const results = [];

//   try {
//     for (const query of expandedQueries) {
//       const response = await axios.get(
//         'https://api.twitter.com/2/tweets/search/recent',
//         {
//           headers: {
//             Authorization: `Bearer ${BEARER_TOKEN}`,
//           },
//           params: {
//             query,
//             max_results: 10,
//             'tweet.fields': 'public_metrics,author_id,created_at',
//           },
//         }
//       );

//       if (response.data.data) {
//         results.push(...response.data.data);
//       }

//       // Prevent hitting rate limit
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//     }

//     res.json({ keyword, tweets: results });
//   } catch (error) {
//     console.error('Twitter API error:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Search failed', detail: error.message });
//   }
// });
const {
  TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET,
  TWITTER_CALLBACK_URL,
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_CALLBACK_URL
} = process.env;

router.get("/twitter/callback", async (req, res) => {
  const { code, state, error } = req.query;
  
  // Handle case where user cancels the OAuth process
  if (error || !code) {
    console.log("Twitter OAuth error or user cancelled:", error);
    return res.redirect(`http://localhost:3000/social-media-settings?error=cancelled&platform=twitter`);
  }
  
  try {
    // Check if this is a connect account flow or a login flow
    const isConnectFlow = state && state.startsWith("connect_account");
    
    // Extract userId from state if this is a connect flow
    let userId = null;
    if (isConnectFlow) {
      const stateParts = state.split('_');
      if (stateParts.length >= 3) {
        userId = stateParts[2];
      }
    }

    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: TWITTER_CALLBACK_URL,
      code_verifier: "challenge", // should match code_challenge from frontend
    });

    console.log("Making token exchange request to Twitter API...");
    const tokenRes = await axiosWithRetry({
      method: 'post',
      url: "https://api.twitter.com/2/oauth2/token",
      data: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64"),
      }
    }, {
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 30000
    });

    console.log("Token exchange successful");
    const access_token = tokenRes.data.access_token;
    const refresh_token = tokenRes.data.refresh_token;

    // If this is a connect flow, handle it differently
    if (isConnectFlow && userId) {
      // Get user info from Twitter API
      console.log("Fetching Twitter user info...");
      const userResponse = await axiosWithRetry({
        method: 'get',
        url: "https://api.twitter.com/2/users/me",
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }, {
        maxRetries: 3,
        initialDelay: 1000
      });
      console.log("Twitter user info fetched successfully");
      
      const twitterUser = userResponse.data.data;
      
      if (!twitterUser || !twitterUser.id) {
        return res.status(400).send("Invalid Twitter token");
      }
      
      // Check if this Twitter account is already connected to this user
      const existingAccount = await pool.query(
        'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL',
        [userId, 'twitter', twitterUser.id]
      );
      
      if (existingAccount.rows.length > 0) {
        // Update the existing account
        await pool.query(
          `UPDATE social_media_accounts
           SET access_token = $1, refresh_token = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND platform = $4 AND account_id = $5`,
          [access_token, refresh_token, userId, 'twitter', twitterUser.id]
        );
      } else {
        // Add the new account
        await pool.query(
          `INSERT INTO social_media_accounts
           (user_id, platform, account_id, account_name, access_token, refresh_token)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, 'twitter', twitterUser.id, twitterUser.name, access_token, refresh_token]
        );
      }
      
      // Redirect back to the social media settings page
      return res.redirect(`http://localhost:3000/social-media-settings?accountConnected=true&platform=twitter&name=${encodeURIComponent(twitterUser.name)}`);
    }

    // Regular login flow - redirect with token to frontend
    res.redirect(`http://localhost:3000/dashboard?accessToken=${access_token}&refreshToken=${refresh_token}`);
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    console.error("Error details:", err.response?.data || err.message);
    console.error("Error stack:", err.stack);
    
    // Provide a more user-friendly error message for rate limiting
    if (err.response && err.response.status === 429) {
      const retryAfter = err.response.headers && err.response.headers['retry-after']
        ? parseInt(err.response.headers['retry-after'], 10)
        : 60;
        
      console.log(`Rate limit exceeded. Retry after: ${retryAfter} seconds`);
      
      return res.redirect(`http://localhost:3000/social-media-settings?error=rate_limit&retryAfter=${retryAfter}`);
    }
    
    // Send a more detailed error response
    res.status(500).send(`Twitter login failed: ${err.message}. Please check server logs for more details.`);
  }
});

// POST tweet
router.post("/tweet", async (req, res) => {
  const { tweetText, accessToken } = req.body;

  try {
    console.log("Posting tweet to Twitter API...");
    const tweetRes = await axiosWithRetry({
      method: 'post',
      url: "https://api.twitter.com/2/tweets",
      data: { text: tweetText },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      }
    }, {
      maxRetries: 3,
      initialDelay: 1000
    });
    console.log("Tweet posted successfully");

    res.json(tweetRes.data);
  } catch (error) {
    console.error("❌ Tweet post error:", error.response?.data || error.message);
    
    // Provide a more user-friendly error message for rate limiting
    if (error.response && error.response.status === 429) {
      return res.status(429).json({
        error: "Twitter rate limit exceeded. Please try again in a few minutes.",
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: error.response?.data || "Tweet failed" });
  }
});

// Convert Twitter access token to JWT token
router.post("/twitter-to-jwt", async (req, res) => {
  const { accessToken } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ success: false, message: "Twitter access token is required" });
  }
  
  try {
    // Get user info from Twitter API
    console.log("Fetching Twitter user info for JWT conversion...");
    const userResponse = await axiosWithRetry({
      method: 'get',
      url: "https://api.twitter.com/2/users/me",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }, {
      maxRetries: 3,
      initialDelay: 1000
    });
    console.log("Twitter user info fetched successfully for JWT conversion");
    
    const twitterUser = userResponse.data.data;
    
    if (!twitterUser || !twitterUser.id) {
      return res.status(400).json({ success: false, message: "Invalid Twitter token" });
    }
    
    // Check if user exists in our database
    let userResult = await pool.query('SELECT * FROM users WHERE twitter_id = $1', [twitterUser.id]);
    
    let user;
    if (userResult.rows.length === 0) {
      // Create new user if not exists
      const insertResult = await pool.query(
        'INSERT INTO users (name, email, twitter_id) VALUES ($1, $2, $3) RETURNING *',
        [twitterUser.name, `${twitterUser.id}@twitter.com`, twitterUser.id]
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }
    
    // Check if this Twitter account is already in social_media_accounts table
    const accountResult = await pool.query(
      'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL',
      [user.id, 'twitter', twitterUser.id]
    );
    
    // If account doesn't exist, add it
    if (accountResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO social_media_accounts
         (user_id, platform, account_id, account_name, access_token, refresh_token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'twitter', twitterUser.id, twitterUser.name, accessToken, null]
      );
    } else {
      // Update the access token if account exists
      await pool.query(
        `UPDATE social_media_accounts
         SET access_token = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND platform = $3 AND account_id = $4`,
        [accessToken, user.id, 'twitter', twitterUser.id]
      );
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, twitter_id: twitterUser.id },
      process.env.JWT_SECRET || 'buzzly-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        twitter_id: twitterUser.id
      }
    });
  } catch (error) {
    console.error("Error converting Twitter token to JWT:", error);
    console.error("Error details:", error.response?.data || error.message);
    console.error("Error stack:", error.stack);
    
    // Provide a more user-friendly error message for rate limiting
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers && error.response.headers['retry-after']
        ? parseInt(error.response.headers['retry-after'], 10)
        : 60;
        
      console.log(`Twitter rate limit exceeded. Retry after: ${retryAfter} seconds`);
      
      return res.status(429).json({
        success: false,
        message: "Twitter rate limit exceeded. Please try again later.",
        retryAfter: retryAfter,
        error: "rate_limit_exceeded"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to authenticate with Twitter",
      error: error.message,
      details: error.response?.data || "No additional details"
    });
  }
});

// The Twitter connect callback is now handled in the main Twitter callback route

// Route for handling LinkedIn OAuth callback
router.get("/linkedin/callback", async (req, res) => {
  const { code, state, error } = req.query;
  
  // Handle case where user cancels the OAuth process
  if (error || !code) {
    console.log("LinkedIn OAuth error or user cancelled:", error);
    return res.redirect(`http://localhost:3000/social-media-settings?error=cancelled&platform=linkedin`);
  }
  
  try {
    // Check if this is a connect account flow
    const isConnectFlow = state && state.startsWith("connect_account");
    
    // Extract userId from state if this is a connect flow
    let userId = null;
    if (isConnectFlow) {
      const stateParts = state.split('_');
      if (stateParts.length >= 3) {
        userId = stateParts[2];
      }
    }

    if (isConnectFlow && !userId) {
      return res.status(400).send("User ID is required for connecting accounts");
    }

    // Exchange the authorization code for an access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: LINKEDIN_CALLBACK_URL,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET
    });

    console.log("Making token exchange request to LinkedIn API...");
    const tokenResponse = await axiosWithRetry({
      method: 'post',
      url: 'https://www.linkedin.com/oauth/v2/accessToken',
      data: tokenParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 20000
    });
    console.log("LinkedIn token exchange successful");

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token || null;

    // Get user profile information from LinkedIn API
    console.log("Fetching LinkedIn user profile...");
    const profileResponse = await axiosWithRetry({
      method: 'get',
      url: 'https://api.linkedin.com/v2/me',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }, {
      maxRetries: 3,
      initialDelay: 1000
    });
    console.log("LinkedIn user profile fetched successfully");

    const linkedinUser = profileResponse.data;
    const linkedinId = linkedinUser.id;
    const linkedinName = `${linkedinUser.localizedFirstName} ${linkedinUser.localizedLastName}`;

    // Get email address if available
    let email = null;
    try {
      console.log("Fetching LinkedIn user email...");
      const emailResponse = await axiosWithRetry({
        method: 'get',
        url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, {
        maxRetries: 2,
        initialDelay: 1000
      });
      console.log("LinkedIn user email fetched successfully");
      
      if (emailResponse.data &&
          emailResponse.data.elements &&
          emailResponse.data.elements.length > 0) {
        email = emailResponse.data.elements[0]['handle~'].emailAddress;
      }
    } catch (emailErr) {
      console.error("Failed to fetch LinkedIn email:", emailErr.message);
      // Continue without email if we can't get it
    }

    // If this is a connect flow, add the account to the user's social media accounts
    if (isConnectFlow && userId) {
      // Check if this LinkedIn account is already connected to this user
      const existingAccount = await pool.query(
        'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL',
        [userId, 'linkedin', linkedinId]
      );
      
      if (existingAccount.rows.length > 0) {
        // Update the existing account
        await pool.query(
          `UPDATE social_media_accounts
           SET access_token = $1, refresh_token = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND platform = $4 AND account_id = $5`,
          [accessToken, refreshToken, userId, 'linkedin', linkedinId]
        );
      } else {
        // Add the new account
        await pool.query(
          `INSERT INTO social_media_accounts
           (user_id, platform, account_id, account_name, access_token, refresh_token)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, 'linkedin', linkedinId, linkedinName, accessToken, refreshToken]
        );
      }
      
      // Redirect back to the social media settings page
      return res.redirect(`http://localhost:3000/social-media-settings?accountConnected=true&platform=linkedin&name=${encodeURIComponent(linkedinName)}`);
    }
    
    // If this is a login flow, create or update user and generate JWT
    // This part would be similar to the Twitter login flow
    // For now, just redirect to the dashboard with a message
    res.redirect(`http://localhost:3000/dashboard?message=LinkedIn login not fully implemented yet`);
    
  } catch (err) {
    console.error("❌ LinkedIn OAuth failed:", err.response?.data || err.message);
    console.error("Error details:", err.response?.data || err.message);
    console.error("Error stack:", err.stack);
    
    // Provide a more user-friendly error message for rate limiting
    if (err.response && err.response.status === 429) {
      const retryAfter = err.response.headers && err.response.headers['retry-after']
        ? parseInt(err.response.headers['retry-after'], 10)
        : 60;
        
      console.log(`LinkedIn rate limit exceeded. Retry after: ${retryAfter} seconds`);
      
      return res.redirect(`http://localhost:3000/social-media-settings?error=rate_limit&platform=linkedin&retryAfter=${retryAfter}`);
    }
    
    res.status(500).send(`LinkedIn authentication failed: ${err.message}. Please check server logs for more details.`);
  }
});

module.exports = router;
