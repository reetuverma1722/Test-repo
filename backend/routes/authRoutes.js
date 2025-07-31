const express = require('express');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
require('dotenv').config();
const puppeteer = require('puppeteer');
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const { expandKeyword } = require('../aiSearch');
const axios = require('axios');
const { axiosWithRetry } = require('../utils/apiUtils');
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
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

  
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token, 
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

    // Get code_verifier from cookie or request body
    // In a production app, you would use a secure cookie or session to store this
    // For now, we'll use a hardcoded value that matches what the frontend is using
    // This is a temporary solution until we implement proper PKCE
    const code_verifier = "challenge";
    
    console.log("Using code_verifier:", code_verifier);
    
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: TWITTER_CALLBACK_URL,
      code_verifier: code_verifier,
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
      maxDelay: 30000,
      forceDnsResolution: true // Enable DNS resolution fallback
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
        initialDelay: 1000,
        forceDnsResolution: true // Enable DNS resolution fallback
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
      initialDelay: 1000,
      forceDnsResolution: true // Enable DNS resolution fallback
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
 
// router.post("/twitter-to-jwt", async (req, res) => {
//   const { accessToken } = req.body;
 
//   if (!accessToken) {
//     return res.status(400).json({
//       success: false,
//       message: "Twitter access token is required",
//     });
//   }
 
//   try {
//     // Step 1: Get Twitter user info
//     console.log("Fetching Twitter user info...");
//     const userResponse = await axiosWithRetry(
//       {
//         method: "get",
//         url: "https://api.twitter.com/2/users/me",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//       {
//         maxRetries: 3,
//         initialDelay: 1000,
//       }
//     );
 
//     const twitterUser = userResponse.data.data;
//     const twitterId = twitterUser.id;
//     const twitterUsername = twitterUser.username;
 
//     if (!twitterId) {
//       return res.status(400).json({ success: false, message: "Invalid Twitter token" });
//     }
 
//     // Step 2: Save or fetch user
//     let userResult = await pool.query("SELECT * FROM users WHERE twitter_id = $1", [twitterId]);
//     let user;
 
//     if (userResult.rows.length === 0) {
//       const insertResult = await pool.query(
//         "INSERT INTO users (name, email, twitter_id) VALUES ($1, $2, $3) RETURNING *",
//         [twitterUser.name, `${twitterId}@twitter.com`, twitterId]
//       );
//       user = insertResult.rows[0];
//     } else {
//       user = userResult.rows[0];
//     }
 
//     // Step 3: Save or update social_media_accounts
//     const accountResult = await pool.query(
//       "SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL",
//       [user.id, "twitter", twitterId]
//     );
 
//     if (accountResult.rows.length === 0) {
//       await pool.query(
//         `INSERT INTO social_media_accounts
//          (user_id, platform, account_id, account_name, access_token, refresh_token)
//          VALUES ($1, $2, $3, $4, $5, $6)`,
//         [user.id, "twitter", twitterId, twitterUser.name, accessToken, null]
//       );
//     } else {
//       await pool.query(
//         `UPDATE social_media_accounts
//          SET access_token = $1, updated_at = CURRENT_TIMESTAMP
//          WHERE user_id = $2 AND platform = $3 AND account_id = $4`,
//         [accessToken, user.id, "twitter", twitterId]
//       );
//     }
 
//     // Step 4: Generate JWT
//     const token = jwt.sign(
//       { id: user.id, twitter_id: twitterId },
//       process.env.JWT_SECRET || "buzzly-secret-key",
//       { expiresIn: "24h" }
//     );
 
//     // Step 5: Hardcoded Tweet Posting (Quote Tweet)
//     const hardcodedTweetId = "1898446369674936755";
//     const hardcodedReply = "Okk Rii";
 
//     let tweetResponse = null;
 
//     try {
//       tweetResponse = await axios.post(
//         "https://api.twitter.com/2/tweets",
//         {
//           text: hardcodedReply,
//           quote_tweet_id: hardcodedTweetId,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );
//       console.log("✅ Hardcoded quote tweet posted:", tweetResponse.data);
//     } catch (postErr) {
//       console.error("❌ Failed to post hardcoded tweet:", postErr.response?.data || postErr.message);
//     }
 
//     // Step 6: Final Response
//     return res.json({
//       success: true,
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         twitter_id: twitterId,
//       },
//       reposted: !!tweetResponse,
//       tweet_response: tweetResponse?.data || null,
//     });
//   } catch (error) {
//     console.error("Error converting Twitter token to JWT:", error);
 
//     if (error.response && error.response.status === 429) {
//       const retryAfter =
//         error.response.headers?.["retry-after"] ||
//         error.response.data?.retryAfter ||
//         60;
 
//       return res.status(429).json({
//         success: false,
//         message: "Twitter rate limit exceeded. Please try again later.",
//         retryAfter,
//         error: "rate_limit_exceeded",
//       });
//     }
 
//     res.status(500).json({
//       success: false,
//       message: "Failed to authenticate with Twitter",
//       error: error.message,
//       details: error.response?.data || "No additional details",
//     });
//   }
// });
 
router.post("/twitter-to-jwt", async (req, res) => {
   const { accessToken, tweetId, reply } = req.body;
 
  if (!accessToken) {
    return res.status(400).json({
      success: false,
      message: "Twitter access token is required",
    });
  }
 
  try {
    // Step 1: Get Twitter user info
    console.log("AccessToken received:", accessToken);
    console.log("Tweet ID:", tweetId);
    console.log("Reply to post:", reply);
    console.log("Fetching Twitter user info...");
    const userResponse = await axiosWithRetry(
      {
        method: "get",
        url: "https://api.twitter.com/2/users/me",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
      }
    );
 
    const twitterUser = userResponse.data.data;
    const twitterId = twitterUser.id;
    const twitterUsername = twitterUser.username;
 
    if (!twitterId) {
      return res.status(400).json({ success: false, message: "Invalid Twitter token" });
    }
 
    // Step 2: Save or fetch user
    let userResult = await pool.query("SELECT * FROM users WHERE twitter_id = $1", [twitterId]);
    let user;
 
    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        "INSERT INTO users (name, email, twitter_id) VALUES ($1, $2, $3) RETURNING *",
        [twitterUser.name, `${twitterId}@twitter.com`, twitterId]
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }
 
    // Step 3: Save or update social_media_accounts
    const accountResult = await pool.query(
      "SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL",
      [user.id, "twitter", twitterId]
    );
 
    if (accountResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO social_media_accounts
         (user_id, platform, account_id, account_name, access_token, refresh_token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, "twitter", twitterId, twitterUser.name, accessToken, null]
      );
    } else {
      await pool.query(
        `UPDATE social_media_accounts
         SET access_token = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND platform = $3 AND account_id = $4`,
        [accessToken, user.id, "twitter", twitterId]
      );
    }
 
    // Step 4: Generate JWT
    const token = jwt.sign(
      { id: user.id, twitter_id: twitterId },
      process.env.JWT_SECRET || "buzzly-secret-key",
      { expiresIn: "24h" }
    );
 
    // Step 5: Hardcoded Tweet Posting (Quote Tweet)
    const hardcodedTweetId = tweetId;
    const hardcodedReply = reply;
 
    let tweetResponse = null;
 
    try {
      tweetResponse = await axios.post(
        "https://api.twitter.com/2/tweets",
        {
          text: hardcodedReply,
          quote_tweet_id: hardcodedTweetId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Hardcoded quote tweet posted:", tweetResponse.data);
    } catch (postErr) {
      console.error("❌ Failed to post hardcoded tweet:", postErr.response?.data || postErr.message);
    }
 
    // Step 6: Final Response
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        twitter_id: twitterId,
      },
      reposted: !!tweetResponse,
      tweet_response: tweetResponse?.data || null,
    });
  } catch (error) {
    console.error("Error converting Twitter token to JWT:", error);
 
    if (error.response && error.response.status === 429) {
      const retryAfter =
        error.response.headers?.["retry-after"] ||
        error.response.data?.retryAfter ||
        60;
 
      return res.status(429).json({
        success: false,
        message: "Twitter rate limit exceeded. Please try again later.",
        retryAfter,
        error: "rate_limit_exceeded",
      });
    }
 
    res.status(500).json({
      success: false,
      message: "Failed to authenticate with Twitter",
      error: error.message,
      details: error.response?.data || "No additional details",
    });
  }
});
 

//  router.post("/twitter-to-jwt", async (req, res) => {
//   const { accessToken, tweetId, reply } = req.body;
// console.log("reetu",accessToken,tweetId,reply)
//   if (!accessToken) {
//     return res.status(400).json({
//       success: false,
//       message: "Twitter access token is required",
//     });
//   }

//   if (!tweetId || !reply) {
//     return res.status(400).json({
//       success: false,
//       message: "Both tweetId and reply are required",
//     });
//   }

//   try {
//     // Step 1: Get Twitter user info
//     console.log("Fetching Twitter user info...");
//     const userResponse = await axiosWithRetry(
//       {
//         method: "get",
//         url: "https://api.twitter.com/2/users/me",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//       { maxRetries: 3, initialDelay: 1000 }
//     );

//     const twitterUser = userResponse.data.data;
//     const twitterId = twitterUser.id;
//     const twitterUsername = twitterUser.username;

//     if (!twitterId) {
//       return res.status(400).json({ success: false, message: "Invalid Twitter token" });
//     }

//     // Step 2: Save or fetch user
//     let userResult = await pool.query("SELECT * FROM users WHERE twitter_id = $1", [twitterId]);
//     let user;

//     if (userResult.rows.length === 0) {
//       const insertResult = await pool.query(
//         "INSERT INTO users (name, email, twitter_id) VALUES ($1, $2, $3) RETURNING *",
//         [twitterUser.name, `${twitterId}@twitter.com`, twitterId]
//       );
//       user = insertResult.rows[0];
//     } else {
//       user = userResult.rows[0];
//     }

//     // Step 3: Save or update social_media_accounts
//     const accountResult = await pool.query(
//       "SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL",
//       [user.id, "twitter", twitterId]
//     );

//     if (accountResult.rows.length === 0) {
//       await pool.query(
//         `INSERT INTO social_media_accounts
//          (user_id, platform, account_id, account_name, access_token, refresh_token)
//          VALUES ($1, $2, $3, $4, $5, $6)`,
//         [user.id, "twitter", twitterId, twitterUser.name, accessToken, null]
//       );
//     } else {
//       await pool.query(
//         `UPDATE social_media_accounts
//          SET access_token = $1, updated_at = CURRENT_TIMESTAMP
//          WHERE user_id = $2 AND platform = $3 AND account_id = $4`,
//         [accessToken, user.id, "twitter", twitterId]
//       );
//     }

//     // Step 4: Generate JWT
//     const token = jwt.sign(
//       { id: user.id, twitter_id: twitterId },
//       process.env.JWT_SECRET || "buzzly-secret-key",
//       { expiresIn: "24h" }
//     );

//     // Step 5: Post quote tweet using provided tweetId and reply
//     let tweetResponse = null;

//     try {
//       tweetResponse = await axios.post(
//         "https://api.twitter.com/2/tweets",
//         {
//           text: reply,
//           quote_tweet_id: tweetId,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );
//       console.log("✅ Quote tweet posted:", tweetResponse.data);
//     } catch (postErr) {
//       console.error("❌ Failed to post tweet:", postErr.response?.data || postErr.message);
//     }

//     // Step 6: Final Response
//     return res.json({
//       success: true,
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         twitter_id: twitterId,
//       },
//       reposted: !!tweetResponse,
//       tweet_response: tweetResponse?.data || null,
//     });
//   } catch (error) {
//     console.error("Error converting Twitter token to JWT:", error);

//     if (error.response && error.response.status === 429) {
//       const retryAfter =
//         error.response.headers?.["retry-after"] ||
//         error.response.data?.retryAfter ||
//         60;

//       return res.status(429).json({
//         success: false,
//         message: "Twitter rate limit exceeded. Please try again later.",
//         retryAfter,
//         error: "rate_limit_exceeded",
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Failed to authenticate with Twitter",
//       error: error.message,
//       details: error.response?.data || "No additional details",
//     });
//   }
// });


// The Twitter connect callback is now handled in the main Twitter callback route

// Route for direct Twitter login with username and password
// router.post("/twitter/direct-login", async (req, res) => {
//   try {
//     const { username, password, userId, passwordRecovery } = req.body;
    
//     // Check if this is a password recovery request
//     if (passwordRecovery) {
//       if (!username || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: "Username and userId are required for password recovery"
//         });
//       }
//     } else {
//       // Regular login requires password
//       if (!username || !password || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: "Username, password, and userId are required"
//         });
//       }
//     }
    
//     // Generate a unique account ID and name based on the username
//     // For password recovery, use a special account ID
//     const accountId = passwordRecovery
//       ? `twitter_${username}_recovery`
//       : `twitter_${username}_${Date.now()}`;
//     const accountName = passwordRecovery
//       ? `${username} (Recovery)`
//       : username;
    
//     // For password recovery or when adding multiple accounts, we want to allow
//     // connecting multiple accounts with the same username
//     // We'll only check for exact duplicates (same username and account_id)
//     const accountIdToCheck = passwordRecovery
//       ? `twitter_${username}_recovery`
//       : `twitter_${username}_%`;
      
//     // Check if this Twitter account is already connected to this user
//     // For non-recovery accounts, we use LIKE to match any account with this username
//     const existingAccount = await pool.query(
//       passwordRecovery
//         ? 'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL'
//         : 'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id LIKE $3 AND deleted_at IS NULL',
//       [userId, 'twitter', accountIdToCheck]
//     );
    
//     if (existingAccount.rows.length > 0 && !passwordRecovery) {
//       return res.status(400).json({
//         success: false,
//         message: "This Twitter account is already connected to your profile"
//       });
//     }
    
//     // In a real implementation, we would authenticate with Twitter's API
//     let accessToken;
    
//     if (passwordRecovery) {
//       // For password recovery, we don't verify credentials
//       accessToken = `recovery_token_${Date.now()}`;
//     } else {
//       // For direct login, verify credentials with Twitter API
//       try {
//         // This is where you would make a call to Twitter's API to verify credentials
//         // For demonstration purposes, we'll simulate a verification process
        
//         // Verify Twitter credentials
//         // In a real implementation, you would use Twitter's API to verify the credentials
//         const verificationResult = verifyTwitterCredentials(username, password);
        
//         if (!verificationResult.isValid) {
//           return res.status(401).json({
//             success: false,
//             message: verificationResult.message || "Invalid Twitter credentials. Please check your username and password."
//           });
//         }
        
//         accessToken = `direct_login_token_${Date.now()}`;
//       } catch (verificationError) {
//         console.error("Error verifying Twitter credentials:", verificationError);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to verify Twitter credentials. Please try again later."
//         });
//       }
//     }
    
//     // Add the new account to the database
//     await pool.query(
//       `INSERT INTO social_media_accounts
//        (user_id, platform, account_id, account_name, access_token, refresh_token)
//        VALUES ($1, $2, $3, $4, $5, $6)`,
//       [userId, 'twitter', accountId, accountName, accessToken, null]
//     );
    
//     // Create a response message based on whether this is a password recovery or not
//     const message = passwordRecovery
//       ? "Twitter account connected successfully. You can reset your password later."
//       : "Twitter account connected successfully";
      
//     // Note: We already added the account to the database above, no need to do it twice
      
//     res.status(200).json({
//       success: true,
//       message: message,
//       account: {
//         platform: 'twitter',
//         accountName: accountName,
//         accountId: accountId,
//         passwordRecovery: !!passwordRecovery
//       }
//     });
//   } catch (error) {
//     console.error("Error connecting Twitter account:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to connect Twitter account",
//       error: error.message
//     });
//   }
// });
router.post('/twitter/direct-login', async (req, res) => {
  const { username, password, userId, passwordRecovery, accountId, accountName } = req.body;

  // Check if this is a password recovery request
  if (passwordRecovery) {
    if (!username || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Username and userId are required for password recovery'
      });
    }
    
    try {
      // For password recovery, we don't verify credentials
      // Use the provided accountId and accountName or generate from username
      const actualAccountId = accountId || `twitter_${username}_${Date.now()}`;
      const actualAccountName = accountName || username;
      
      // Add the account to the database
      await pool.query(
        `INSERT INTO social_media_accounts (account_id, user_id, platform, account_name) VALUES ($1, $2, $3, $4)`,
        [actualAccountId, userId, 'twitter', actualAccountName]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Twitter account connected successfully. You can reset your password later.',
        account: {
          platform: 'twitter',
          accountName: actualAccountName,
          accountId: actualAccountId,
          passwordRecovery: true
        }
      });
    } catch (err) {
      console.error('Twitter password recovery error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to connect Twitter account in recovery mode'
      });
    }
  }

  // Regular login flow
  if (!username || !password || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Username, password, and userId are required'
    });
  }

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://twitter.com/login');

    await page.waitForSelector('input[name="text"]');
    await page.type('input[name="text"]', username);
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // password input
    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.type('input[name="password"]', password);
    await page.keyboard.press('Enter');

    // wait and check for error or home redirect
    await new Promise(resolve => setTimeout(resolve, 3000));

    const loginError = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span')).some(
        el => el.textContent.toLowerCase().includes('password is incorrect')
      );
    });

    if (loginError) {
      console.log("Wrong password entered");
      await browser.close();
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    const url = page.url();
    await browser.close();

    if (url.includes('login') || loginError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Twitter credentials'
      });
    }

    // SUCCESS → Save to DB
    // Use the provided accountId and accountName or generate from username
    const actualAccountId = accountId || `twitter_${username}_${Date.now()}`;
    const actualAccountName = accountName || username;
    
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO social_media_accounts (account_id, user_id, platform, account_name, password) VALUES ($1, $2, $3, $4, $5)`,
      [actualAccountId, userId, 'twitter', actualAccountName, hashedPassword]
    );

    res.status(200).json({
      success: true,
      message: 'Twitter connected successfully',
      account: {
        platform: 'twitter',
        accountName: actualAccountName,
        accountId: actualAccountId
      }
    });
  } catch (err) {
    console.error('Twitter login error:', err);
    res.status(500).json({
      success: false,
      message: 'Twitter login failed'
    });
  }
});
// Helper function to verify Twitter credentials
// In a real implementation, this would make an API call to Twitter
function verifyTwitterCredentials(username, password) {
  // This is a simulated verification
  // In a real implementation, you would use Twitter's API to verify the credentials
  
  // Basic validation
  if (!username || username.trim().length === 0) {
    return { isValid: false, message: "Username cannot be empty" };
  }
  
  if (!password || password.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters long" };
  }
  
  // For demonstration purposes, we'll simulate some basic validation
  // In a real implementation, you would verify against Twitter's API
  
  // Simulate some common validation rules
  if (username.includes(' ')) {
    return { isValid: false, message: "Twitter usernames cannot contain spaces" };
  }
  
  if (username.length > 15) {
    return { isValid: false, message: "Twitter usernames cannot be longer than 15 characters" };
  }
  
  // Log the verification result (for debugging)
  console.log(`Verifying credentials for ${username}: Valid`);
  
  // In a real implementation, this would return the result from Twitter's API
  return { isValid: true };
}

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

// Route for direct LinkedIn login with username and password
router.post('/linkedin/direct-login', async (req, res) => {
  const { username, password, userId, accountId, accountName } = req.body;

  // Validate required fields
  if (!username || !password || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Username, password, and userId are required'
    });
  }

  try {
    // Launch browser in headless mode
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to LinkedIn login page
    await page.goto('https://www.linkedin.com/login');

    // Wait for username field and enter username
    await page.waitForSelector('input#username');
    await page.type('input#username', username);
    
    // Enter password
    await page.waitForSelector('input#password');
    await page.type('input#password', password);
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Check for login errors
    const loginError = await page.evaluate(() => {
      const errorElement = document.querySelector('#error-for-password');
      return errorElement ? errorElement.textContent.trim() : null;
    });

    if (loginError) {
      console.log("LinkedIn login error:", loginError);
      await browser.close();
      return res.status(401).json({
        success: false,
        message: "Invalid LinkedIn credentials. Please check your email and password."
      });
    }

    // Check if we're on the dashboard/feed page
    const url = page.url();
    await browser.close();

    if (url.includes('login') || url.includes('checkpoint')) {
      return res.status(401).json({
        success: false,
        message: 'LinkedIn login failed. You may need to verify your account or solve a CAPTCHA.'
      });
    }

    // SUCCESS → Save to DB
    // Use the provided accountId and accountName or generate from username
    const actualAccountId = accountId || `linkedin_${username}_${Date.now()}`;
    const actualAccountName = accountName || username;
    
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO social_media_accounts (account_id, user_id, platform, account_name, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [actualAccountId, userId, 'linkedin', actualAccountName, hashedPassword]
    );

    res.status(200).json({
      success: true,
      message: 'LinkedIn account connected successfully',
      account: {
        platform: 'linkedin',
        accountName: actualAccountName,
        accountId: actualAccountId
      }
    });
  } catch (err) {
    console.error('LinkedIn login error:', err);
    res.status(500).json({
      success: false,
      message: 'LinkedIn login failed. Please try again later.'
    });
  }
});

module.exports = router;
