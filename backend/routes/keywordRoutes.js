// keywordRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || localStorage.getItem('token');
    
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

// Get all keywords for the authenticated user
router.get('/keywords', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, text, min_likes AS "minLikes", min_retweets AS "minRetweets",
       min_followers AS "minFollowers", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM twitter_keywords
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get filtered keywords
router.get('/keywords/filter', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, minLikes, minRetweets, minFollowers } = req.query;
    
    let query = `
      SELECT id, text, min_likes AS "minLikes", min_retweets AS "minRetweets", 
      min_followers AS "minFollowers", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM twitter_keywords 
      WHERE user_id = $1 AND deleted_at IS NULL
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    if (text) {
      query += ` AND text ILIKE $${paramIndex}`;
      params.push(`%${text}%`);
      paramIndex++;
    }
    
    if (minLikes) {
      query += ` AND min_likes >= $${paramIndex}`;
      params.push(parseInt(minLikes));
      paramIndex++;
    }
    
    if (minRetweets) {
      query += ` AND min_retweets >= $${paramIndex}`;
      params.push(parseInt(minRetweets));
      paramIndex++;
    }
    
    if (minFollowers) {
      query += ` AND min_followers >= $${paramIndex}`;
      params.push(parseInt(minFollowers));
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching filtered keywords:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a new keyword
router.post('/keywords', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, minLikes, minRetweets, minFollowers } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Keyword text is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO twitter_keywords (text, min_likes, min_retweets, min_followers, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, text, min_likes AS "minLikes", min_retweets AS "minRetweets", 
       min_followers AS "minFollowers", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [text, minLikes || 0, minRetweets || 0, minFollowers || 0, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a keyword
router.put('/keywords/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keywordId = req.params.id;
    const { text, minLikes, minRetweets, minFollowers } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Keyword text is required' });
    }
    
    // Check if the keyword belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM twitter_keywords WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [keywordId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Keyword not found' });
    }
    
    const result = await pool.query(
      `UPDATE twitter_keywords 
       SET text = $1, min_likes = $2, min_retweets = $3, min_followers = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING id, text, min_likes AS "minLikes", min_retweets AS "minRetweets", 
       min_followers AS "minFollowers", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [text, minLikes || 0, minRetweets || 0, minFollowers || 0, keywordId, userId]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating keyword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a keyword (soft delete)
router.delete('/keywords/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keywordId = req.params.id;
    
    // Check if the keyword belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM twitter_keywords WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [keywordId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Keyword not found' });
    }
    
    // Soft delete by setting deleted_at timestamp
    await pool.query(
      'UPDATE twitter_keywords SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [keywordId, userId]
    );
    
    res.json({ success: true, message: 'Keyword deleted successfully' });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;