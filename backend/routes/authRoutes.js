const express = require('express');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken'); 
const pool = require('../db');
const router = express.Router();
require('dotenv').config(); 
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const { expandKeyword } = require('../aiSearch');
const axios = require('axios');
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
} = process.env;

router.get("/twitter/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: TWITTER_CALLBACK_URL,
      code_verifier: "challenge", // should match code_challenge from frontend
    });

    const tokenRes = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64"),
        },
      }
    );

    const access_token = tokenRes.data.access_token;
    const refresh_token = tokenRes.data.refresh_token;

    // redirect with token to frontend
    res.redirect(`http://localhost:3000/dashboard?accessToken=${access_token}&refreshToken=${refresh_token}`);
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    res.status(500).send("Twitter login failed");
  }
});

// POST tweet
router.post("/tweet", async (req, res) => {
  const { tweetText, accessToken } = req.body;

  try {
    const tweetRes = await axios.post(
      "https://api.twitter.com/2/tweets",
      { text: tweetText },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(tweetRes.data);
  } catch (error) {
    console.error("❌ Tweet post error:", error.response?.data || error.message);
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
    const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
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
    res.status(500).json({ success: false, message: "Failed to authenticate with Twitter" });
  }
});

module.exports = router;
