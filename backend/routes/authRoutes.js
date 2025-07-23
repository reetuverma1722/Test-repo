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
  const { username, password, userId, passwordRecovery } = req.body;

  // Handle password recovery request
  if (passwordRecovery) {
    if (!username || !userId) {
      return res.status(400).json({
        success: false,
        message: "Username and userId are required for password recovery"
      });
    }
    
    try {
      // For password recovery, we don't verify credentials
      const accountId = `twitter_${username}_recovery`;
      const accountName = `${username} (Recovery)`;
      const accessToken = `recovery_token_${Date.now()}`;
      
      // Check if recovery account already exists
      const existingAccount = await pool.query(
        'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL',
        [userId, 'twitter', accountId]
      );
      
      if (existingAccount.rows.length > 0) {
        // Update existing recovery account
        await pool.query(
          `UPDATE social_media_accounts
           SET updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND platform = $2 AND account_id = $3`,
          [userId, 'twitter', accountId]
        );
      } else {
        // Add new recovery account
        await pool.query(
          `INSERT INTO social_media_accounts
           (user_id, platform, account_id, account_name, access_token, refresh_token)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, 'twitter', accountId, accountName, accessToken, null]
        );
      }
      
      return res.status(200).json({
        success: true,
        message: "Twitter account connected successfully. You can reset your password later.",
        account: {
          platform: 'twitter',
          accountName: accountName,
          accountId: accountId,
          passwordRecovery: true
        }
      });
    } catch (error) {
      console.error("Error connecting Twitter recovery account:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to connect Twitter recovery account",
        error: error.message
      });
    }
  }

  // Regular login flow
  if (!username || !password || !userId) {
    return res.status(400).json({
      success: false,
      message: "Username, password, and userId are required"
    });
  }

  // Check if this Twitter account is already connected to this user
  try {
    const existingAccount = await pool.query(
      'SELECT id FROM social_media_accounts WHERE user_id = $1 AND platform = $2 AND account_name = $3 AND deleted_at IS NULL',
      [userId, 'twitter', username]
    );
    
    if (existingAccount.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This Twitter account is already connected to your profile"
      });
    }
    
    // Launch browser for Twitter verification
    let browser;
    try {
      console.log(`Attempting to verify Twitter credentials for ${username}`);
      
      // Launch browser with additional options to avoid detection
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ]
      });
      
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 800 });
      
      // Navigate to Twitter login page - using the flow URL which is more reliable
      await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });
      console.log('Navigated to Twitter login page');
      
      // Wait for the page to load completely
      // await page.waitForTimeout(3000);
      await new Promise(resolve => setTimeout(resolve, 3000));

      
      // Try different selectors for username field
      const usernameSelectors = [
        'input[name="text"]',
        'input[autocomplete="username"]',
        'input[type="text"]'
      ];
      
      let usernameField = null;
      for (const selector of usernameSelectors) {
        try {
          usernameField = await page.waitForSelector(selector, { timeout: 5000 });
          if (usernameField) {
            console.log(`Found username field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }
      
      if (!usernameField) {
        throw new Error('Could not find username input field');
      }
      
      // Type email instead of username (Twitter now prioritizes email login)
      // Use email format if username doesn't contain @ symbol
      const loginIdentifier = username.includes('@') ? username : `${username}@gmail.com`;
      console.log(`Using login identifier: ${loginIdentifier}`);
      await usernameField.type(loginIdentifier, { delay: 100 });

      // await page.waitForTimeout(1000);
      await new Promise(resolve => setTimeout(resolve, 1000));

      
      // Find and click the Next button
      const nextButtonSelectors = [
        'div[role="button"]',
        'span',
        'button[type="submit"]'
      ];
      
      let nextButton = null;
      for (const selector of nextButtonSelectors) {
        try {
          // Find all elements matching the selector
          const buttons = await page.$$(selector);
          
          // Find the one containing "Next" text
          for (const button of buttons) {
            const buttonText = await page.evaluate(el => el.textContent, button);
            if (buttonText && buttonText.includes('Next')) {
              nextButton = button;
              console.log(`Found next button with text: ${buttonText}`);
              break;
            }
          }
          
          if (nextButton) break;
        } catch (e) {
          console.log(`Next button selector ${selector} not found, trying next...`);
        }
      }
      
      if (!nextButton) {
        throw new Error('Could not find Next button');
      }
      
      await nextButton.click();
      console.log('Clicked Next button after entering username');
      
      // Wait for password field to appear
      // await page.waitForTimeout(3000);
      await new Promise(resolve => setTimeout(resolve, 3000));


      
      // Check if we're asked for additional verification (like phone/email)
      const verificationRequired = await page.evaluate(() => {
        return document.body.innerText.includes('Enter your phone number or username') ||
               document.body.innerText.includes('Enter your email');
      });
      
      if (verificationRequired) {
        console.log('Additional verification required');
        await browser.close();
        return res.status(401).json({
          success: false,
          message: "Twitter requires additional verification. Please use OAuth login instead."
        });
      }
      
      // Try different selectors for password field with increased timeout
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.waitForSelector(selector, { timeout: 10000 });
          if (passwordField) {
            console.log(`Found password field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Password selector ${selector} not found, trying next...`);
        }
      }
      
      if (!passwordField) {
        // Take a screenshot for debugging
        await page.screenshot({ path: 'twitter-login-debug.png' });
        throw new Error('Could not find password input field');
      }
      
      // Type password
      await passwordField.type(password, { delay: 100 });
      // await page.waitForTimeout(1000);
      await new Promise(resolve => setTimeout(resolve, 1000));

      
      // Find and click login button
      const loginButtonSelectors = [
        'div[role="button"]',
        'span',
        'button[type="submit"]'
      ];
      
      let loginButton = null;
      for (const selector of loginButtonSelectors) {
        try {
          // Find all elements matching the selector
          const buttons = await page.$$(selector);
          
          // Find the one containing "Log in" text
          for (const button of buttons) {
            const buttonText = await page.evaluate(el => el.textContent, button);
            if (buttonText && (buttonText.includes('Log in') || buttonText.includes('Login'))) {
              loginButton = button;
              console.log(`Found login button with text: ${buttonText}`);
              break;
            }
          }
          
          if (loginButton) break;
        } catch (e) {
          console.log(`Login button selector ${selector} not found, trying next...`);
        }
      }
      
      if (!loginButton) {
        throw new Error('Could not find Login button');
      }
      
      await loginButton.click();
      console.log('Clicked Login button after entering password');
      
      // Wait for navigation to complete
      // await page.waitForTimeout(5000);
      await new Promise(resolve => setTimeout(resolve, 5000));

      
      // Check for login errors
      const loginError = await page.evaluate(() => {
        const errorMessages = [
          'incorrect',
          'wrong password',
          'doesn\'t exist',
          'couldn\'t find your account',
          'failed',
          'invalid'
        ];
        
        const pageText = document.body.innerText.toLowerCase();
        for (const msg of errorMessages) {
          if (pageText.includes(msg)) {
            return true;
          }
        }
        return false;
      });
      
      if (loginError) {
        console.log('Login error detected');
        await browser.close();
        return res.status(401).json({
          success: false,
          message: "Invalid Twitter credentials. Please check your username and password."
        });
      }
      
      // Check if we're on the home page or still on login page
      const currentUrl = page.url();
      console.log(`Current URL after login attempt: ${currentUrl}`);
      
      if (currentUrl.includes('login') || currentUrl.includes('flow')) {
        console.log('Still on login page, login failed');
        await browser.close();
        return res.status(401).json({
          success: false,
          message: "Failed to log in to Twitter. Please check your credentials."
        });
      }
      
      // Successfully logged in
      console.log('Successfully logged in to Twitter');
      await browser.close();
      
      // Generate account ID and save to database
      const accountId = `twitter_${username}_${Date.now()}`;
      const accessToken = `direct_login_token_${Date.now()}`;
      
      await pool.query(
        `INSERT INTO social_media_accounts
         (user_id, platform, account_id, account_name, access_token, refresh_token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 'twitter', accountId, username, accessToken, null]
      );
      
      return res.status(200).json({
        success: true,
        message: "Twitter account connected successfully",
        account: {
          platform: 'twitter',
          accountName: username,
          accountId: accountId,
          passwordRecovery: false
        }
      });
      
    } catch (browserError) {
      console.error('Error during Twitter login process:', browserError);
      if (browser) await browser.close();
      return res.status(500).json({
        success: false,
        message: "Error during Twitter login process: " + browserError.message
      });
    }
  } catch (error) {
    console.error("Error connecting Twitter account:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to connect Twitter account",
      error: error.message
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

module.exports = router;
