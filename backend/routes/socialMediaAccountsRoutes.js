// socialMediaAccountsRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Get user data from localStorage if available (for development)
    const userStr = req.headers['x-user-data'];
    let userData = null;
    
    if (userStr) {
      try {
        userData = JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data from header:', e);
      }
    }
    
    if (!token) {
      // For development purposes, allow requests without a token
      console.log('No token provided, checking for user data in headers');
      
      // If user data is provided in headers, use that
      if (userData && userData.id) {
        req.user = { id: userData.id };
        console.log('Using user ID from headers:', userData.id);
        return next();
      }
      
      // Otherwise use default user ID
      console.log('No user data in headers, using default user ID');
      req.user = { id: 1 }; // Default user ID for testing
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buzzly-secret-key');
      req.user = decoded;
      console.log('Authenticated user:', req.user);
    } catch (err) {
      console.log('Invalid token, checking for user data in headers');
      
      // If user data is provided in headers, use that
      if (userData && userData.id) {
        req.user = { id: userData.id };
        console.log('Using user ID from headers:', userData.id);
      } else {
        console.log('No user data in headers, using default user ID');
        req.user = { id: 1 }; // Default user ID for testing
      }
    }
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    req.user = { id: 1 }; // Default user ID for testing
    next();
  }
};

// Get all social media accounts for the authenticated user
router.get('/accounts', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching accounts for user ID:', userId);
    
    const result = await pool.query(
      `SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
       created_at AS "createdAt", updated_at AS "updatedAt"
       FROM social_media_accounts
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY platform, created_at DESC`,
      [userId]
    );
    
    console.log('Found accounts:', result.rows.length);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get accounts by platform
router.get('/accounts/:platform', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform } = req.params;
    
    const result = await pool.query(
      `SELECT id, platform, account_id AS "accountId", account_name AS "accountName", 
       created_at AS "createdAt", updated_at AS "updatedAt"
       FROM social_media_accounts
       WHERE user_id = $1 AND platform = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId, platform]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(`Error fetching ${req.params.platform} accounts:`, error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a new social media account
router.post('/accounts', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt, twitterPassword } = req.body;
    
    // Console log the data passed to backend
    console.log('=== Data passed to backend when adding new account ===');
    console.log('User ID:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Twitter Password included:', !!twitterPassword);
    console.log('===================================================');
    
    if (!platform || !accountId || !accountName) {
      return res.status(400).json({
        success: false,
        message: 'Platform, account ID, and account name are required'
      });
    }
    
    // Check if account already exists
    const existingAccount = await pool.query(
      `SELECT id FROM social_media_accounts
       WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL`,
      [userId, platform, accountId]
    );
    
    if (existingAccount.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This account is already connected'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO social_media_accounts
       (user_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, twitter_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, platform, account_id AS "accountId", account_name AS "accountName",
       created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt, twitterPassword]
    );
    
    console.log('Account successfully added to database:', result.rows[0]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding social media account:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a social media account
router.put('/accounts/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    const { accountName, accessToken, refreshToken, tokenExpiresAt } = req.body;
    
    // Check if the account belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [accountId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Build the update query dynamically based on provided fields
    let updateFields = [];
    let queryParams = [accountId, userId];
    let paramIndex = 3;
    
    if (accountName) {
      updateFields.push(`account_name = $${paramIndex}`);
      queryParams.push(accountName);
      paramIndex++;
    }
    
    if (accessToken) {
      updateFields.push(`access_token = $${paramIndex}`);
      queryParams.push(accessToken);
      paramIndex++;
    }
    
    if (refreshToken) {
      updateFields.push(`refresh_token = $${paramIndex}`);
      queryParams.push(refreshToken);
      paramIndex++;
    }
    
    if (tokenExpiresAt) {
      updateFields.push(`token_expires_at = $${paramIndex}`);
      queryParams.push(tokenExpiresAt);
      paramIndex++;
    }
    
    // Always update the updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    if (updateFields.length === 1) {
      // Only updated_at is being updated, nothing else changed
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }
    
    const updateQuery = `
      UPDATE social_media_accounts 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING id, platform, account_id AS "accountId", account_name AS "accountName", 
      created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    
    const result = await pool.query(updateQuery, queryParams);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating social media account:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a social media account (soft delete)
router.delete('/accounts/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    
    // Check if the account belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [accountId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    // Soft delete by setting deleted_at timestamp
    await pool.query(
      'UPDATE social_media_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting social media account:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;