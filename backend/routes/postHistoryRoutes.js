// postHistoryRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // For development purposes, allow requests without a token
      console.log('No token provided, using default user ID');
      req.user = { id: 1 }; // Default user ID for testing
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buzzly-secret-key');
      req.user = decoded;
    } catch (err) {
      console.log('Invalid token, using default user ID');
      req.user = { id: 1 }; // Default user ID for testing
    }
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    req.user = { id: 1 }; // Default user ID for testing
    next();
  }
};

// Get all social media accounts for the user
router.get('/accounts', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, platform, account_name, account_handle 
       FROM social_media_accounts 
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY platform, account_name`,
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
    
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get post history for a specific account
router.get('/history/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    
    // Verify the account belongs to the user
    // const accountCheck = await pool.query(
    //   'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    //   [accountId, userId]
    // );
    
    // if (accountCheck.rows.length === 0) {
    //   return res.status(404).json({ success: false, message: 'Account not found' });
    // }
    
    // Fetch post history for the account
    const result = await pool.query(
      `SELECT ph.id, ph.post_text, ph.post_url, ph.posted_at, ph.engagement_count, 
              ph.likes_count, ph.retweets_count, ph.created_at, ph.updated_at,
              k.text as keyword, k.min_likes, k.min_retweets, k.min_followers,
              (NOW() - ph.created_at) as time_since_fetch
       FROM post_history ph
       LEFT JOIN twitter_keywords k ON ph.keyword_id = k.id
       WHERE ph.account_id = $1 AND ph.deleted_at IS NULL
       ORDER BY ph.posted_at DESC`,
      [accountId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching post history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Repost a specific post
router.post('/repost/:postId', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    
    // Check if the post exists and belongs to the user
    const postCheck = await pool.query(
      `SELECT ph.id, ph.account_id, ph.created_at
       FROM post_history ph
       JOIN social_media_accounts sma ON ph.account_id = sma.id
       WHERE ph.id = $1 AND sma.user_id = $2 AND ph.deleted_at IS NULL`,
      [postId, userId]
    );
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Check if the post was fetched less than 2 hours ago
    const post = postCheck.rows[0];
    const timeSinceFetch = new Date() - new Date(post.created_at);
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    
    if (timeSinceFetch < twoHoursInMs) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot repost within 2 hours of fetching',
        timeSinceFetch: Math.floor(timeSinceFetch / (60 * 1000)) // in minutes
      });
    }
    
    // In a real implementation, this would call the Twitter API to repost
    // For now, we'll just update the database to simulate a repost
    await pool.query(
      `UPDATE post_history 
       SET reposted_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [postId]
    );
    
    res.json({ success: true, message: 'Post reposted successfully' });
  } catch (error) {
    console.error('Error reposting:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a post from search history to post_history
router.post('/add-from-search', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      accountId,
      tweetId,
      tweetText,
      tweetUrl,
      reply,
      keywordId,
      keyword,
      likeCount,
      retweetCount
    } = req.body;
    
    // Validate required fields
    if (!accountId || !tweetText) {
      return res.status(400).json({
        success: false,
        message: 'Account ID and tweet text are required'
      });
    }
    
    // Check if the account belongs to the user
    const accountCheck = await pool.query(
      'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [accountId, userId]
    );
    
    if (accountCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or does not belong to this user'
      });
    }
    
    // Insert into post_history table
    const result = await pool.query(
      `INSERT INTO post_history
       (account_id, post_text, post_url, keyword_id, likes_count, retweets_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [accountId, tweetText, tweetUrl, keywordId, likeCount || 0, retweetCount || 0]
    );
    
    res.status(201).json({
      success: true,
      message: 'Post added to history successfully',
      data: { id: result.rows[0].id }
    });
    
  } catch (error) {
    console.error('Error adding post to history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;