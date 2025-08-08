

// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const authRoutes = require('./routes/authRoutes');
const searchRoutes = require('./routes/searchRoutes');
const keywordRoutes = require('./routes/keywordRoutes');
const socialMediaAccountsRoutes = require('./routes/socialMediaAccountsRoutes');
const trendingRoutes = require('./routes/trendingRoutes');
const postHistoryRoutes = require('./routes/postHistoryRoutes');
const promptRoutes = require('./routes/promptRoutes');
dotenv.config();

// Run the script to check and create tables if they don't exist
require('./scripts/check-and-create-tables');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', searchRoutes);
app.use('/api', keywordRoutes);
app.use('/api', socialMediaAccountsRoutes);
app.use('/api', trendingRoutes);
app.use('/api', postHistoryRoutes); // This registers all routes in postHistoryRoutes.js under /api
app.use('/api', promptRoutes); // Register prompt routes
const PORT = process.env.PORT || 5000;
app.get('/', async (req, res) => {
  const accessToken = req.query.twitterId;
  const tweetId = req.query.tweetId;
  const reply = req.query.reply;

  if (!accessToken || !tweetId) {
    return res.status(400).send('❌ Missing accessToken or tweetId');
  }

  try {
    // ✅ Step 1: Get user ID
    const userRes = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userId = userRes.data?.data?.id;
    if (!userId) return res.status(400).send("❌ Couldn't fetch user ID");

    console.log(`👤 User ID: ${userId}`);
    console.log(`🔁 Retweeting tweet: ${tweetId}`);

    // ✅ Step 2: Retweet
    const retweetRes = await axios.post(
      `https://api.twitter.com/2/users/${userId}/retweets`,
      { tweet_id: tweetId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Step 3: Optional reply
    let replyRes = null;
    if (reply && reply.trim()) {
      replyRes = await axios.post(
        `https://api.twitter.com/2/tweets`,
        {
          text: reply,
          reply: {
            in_reply_to_tweet_id: tweetId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    res.send({
      message: '✅ Retweet and reply successful',
      retweetData: retweetRes.data,
      replyData: replyRes?.data || null,
    });
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(500).send('❌ Failed to retweet or reply');
  }
});

app.get('/auth/linkedin', (req, res) => {
  const state = 'random_string_' + Date.now(); // You should save this to verify later
  const redirectUri = 'http://localhost:3000/auth/linkedin/callback';
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20r_emailaddress&state=${state}`;

  res.redirect(url);
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const redirectUri = 'http://localhost:3000/auth/linkedin/callback';

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

    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenRes.data.access_token;
    const refreshToken = tokenRes.data.refresh_token || null;

    const profileRes = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const linkedinUser = profileRes.data;
    const linkedinId = linkedinUser.id;
    const linkedinName = `${linkedinUser.localizedFirstName} ${linkedinUser.localizedLastName}`;

    // Get email address if available
    let email = null;
    try {
      const emailRes = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (emailRes.data &&
          emailRes.data.elements &&
          emailRes.data.elements.length > 0) {
        email = emailRes.data.elements[0]['handle~'].emailAddress;
      }
    } catch (emailErr) {
      console.error("Failed to fetch LinkedIn email:", emailErr.message);
      // Continue without email if we can't get it
    }

    // If this is a connect flow, add the account to the user's social media accounts
    if (isConnectFlow && userId) {
      const pool = require('./db');
      
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
    
    // If this is a login flow, return the profile and email
    res.json({
      success: true,
      profile: profileRes.data,
      email: email
    });
  } catch (error) {
    console.error('Error exchanging code:', error.response?.data || error.message);
    res.status(500).json({ error: 'LinkedIn login failed' });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
