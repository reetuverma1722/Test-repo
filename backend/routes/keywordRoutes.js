// keywordRoutes.js
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

// Get all keywords for the authenticated user
router.get('/keywords', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.query.accountId;
    
    let query = `
      SELECT k.id, k.text, k.min_likes AS "minLikes", k.min_retweets AS "minRetweets",
      k.min_followers AS "minFollowers", k.created_at AS "createdAt", k.updated_at AS "updatedAt",
      k.account_id AS "accountId",
      CASE WHEN a.id IS NOT NULL THEN a.account_name ELSE 'Default' END AS "accountName"
      FROM twitter_keywords k
      LEFT JOIN social_media_accounts a ON k.account_id = a.id
      WHERE k.user_id = $1 AND k.deleted_at IS NULL
    `;
    
    const params = [userId];
    
    if (accountId) {
      query += ` AND (k.account_id = $2 OR k.account_id IS NULL)`;
      params.push(accountId);
    }
    
    query += ` ORDER BY k.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Fetch associated prompts for each keyword
    const keywordsWithPrompts = await Promise.all(result.rows.map(async (keyword) => {
      try {
        // Get all associated prompts for this keyword
        const promptQuery = `
          SELECT p.id, p.name, p.model, p.content, p.is_default,
                 p.created_at AS "createdAt", p.updated_at AS "updatedAt"
          FROM prompts p
          JOIN keyword_prompts kp ON p.id = kp.prompt_id
          WHERE kp.keyword_id = $1 AND p.deleted_at IS NULL AND kp.deleted_at IS NULL
          ORDER BY kp.created_at DESC
        `;
        
        const promptResult = await pool.query(promptQuery, [keyword.id]);
        
        if (promptResult.rows.length > 0) {
          // Add all prompts information to the keyword
          return {
            ...keyword,
            prompts: promptResult.rows,
            // Keep the first prompt as default for backward compatibility
            promptId: promptResult.rows[0].id,
            promptName: promptResult.rows[0].name,
            promptModel: promptResult.rows[0].model,
            promptContent: promptResult.rows[0].content
          };
        }
        
        return keyword;
      } catch (error) {
        console.error(`Error fetching prompt for keyword ${keyword.id}:`, error);
        return keyword;
      }
    }));
    
    res.json({ success: true, data: keywordsWithPrompts });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get filtered keywords
router.get('/keywords/filter', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, minLikes, minRetweets, minFollowers, accountId } = req.query;
    
    let query = `
      SELECT k.id, k.text, k.min_likes AS "minLikes", k.min_retweets AS "minRetweets",
      k.min_followers AS "minFollowers", k.created_at AS "createdAt", k.updated_at AS "updatedAt",
      k.account_id AS "accountId",
      CASE WHEN a.id IS NOT NULL THEN a.account_name ELSE 'Default' END AS "accountName"
      FROM twitter_keywords k
      LEFT JOIN social_media_accounts a ON k.account_id = a.id
      WHERE k.user_id = $1 AND k.deleted_at IS NULL
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
      query += ` AND k.min_followers >= $${paramIndex}`;
      params.push(parseInt(minFollowers));
      paramIndex++;
    }
    
    if (accountId) {
      query += ` AND (k.account_id = $${paramIndex} OR k.account_id IS NULL)`;
      params.push(accountId);
      paramIndex++;
    }
    
    query += ` ORDER BY k.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Fetch associated prompts for each keyword
    const keywordsWithPrompts = await Promise.all(result.rows.map(async (keyword) => {
      try {
        // Get all associated prompts for this keyword
        const promptQuery = `
          SELECT p.id, p.name, p.model, p.content, p.is_default,
                 p.created_at AS "createdAt", p.updated_at AS "updatedAt"
          FROM prompts p
          JOIN keyword_prompts kp ON p.id = kp.prompt_id
          WHERE kp.keyword_id = $1 AND p.deleted_at IS NULL AND kp.deleted_at IS NULL
          ORDER BY kp.created_at DESC
        `;
        
        const promptResult = await pool.query(promptQuery, [keyword.id]);
        
        if (promptResult.rows.length > 0) {
          // Add all prompts information to the keyword
          return {
            ...keyword,
            prompts: promptResult.rows,
            // Keep the first prompt as default for backward compatibility
            promptId: promptResult.rows[0].id,
            promptName: promptResult.rows[0].name,
            promptModel: promptResult.rows[0].model,
            promptContent: promptResult.rows[0].content
          };
        }
        
        return keyword;
      } catch (error) {
        console.error(`Error fetching prompt for keyword ${keyword.id}:`, error);
        return keyword;
      }
    }));
    
    res.json({ success: true, data: keywordsWithPrompts });
  } catch (error) {
    console.error('Error fetching filtered keywords:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a new keyword
router.post('/keywords', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, minLikes, minRetweets, minFollowers, accountId } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Keyword text is required' });
    }
    
    // If accountId is provided, verify it belongs to the user
    if (accountId) {
      const accountCheck = await pool.query(
        'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [accountId, userId]
      );
      console.log('Checking account ID:', accountId, 'for user ID:', userId);

      if (accountCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid account ID' });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO twitter_keywords (text, min_likes, min_retweets, min_followers, user_id, account_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, text, min_likes AS "minLikes", min_retweets AS "minRetweets",
       min_followers AS "minFollowers", account_id AS "accountId", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [text, minLikes || 0, minRetweets || 0, minFollowers || 0, userId, accountId || null]
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
    const { text, minLikes, minRetweets, minFollowers, accountId } = req.body;
    
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
    
    // If accountId is provided, verify it belongs to the user
    if (accountId) {
      const accountCheck = await pool.query(
        'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [accountId, userId]
      );
      
      if (accountCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid account ID' });
      }
    }
    
    const result = await pool.query(
      `UPDATE twitter_keywords
       SET text = $1, min_likes = $2, min_retweets = $3, min_followers = $4, account_id = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING id, text, min_likes AS "minLikes", min_retweets AS "minRetweets",
       min_followers AS "minFollowers", account_id AS "accountId", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [text, minLikes || 0, minRetweets || 0, minFollowers || 0, accountId || null, keywordId, userId]
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

// Get prompts associated with a keyword
router.get('/keywords/:id/prompts', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keywordId = req.params.id;
    
    console.log(`Fetching prompts for keyword ID: ${keywordId}, User ID: ${userId}`);
    
    // For development purposes, make this endpoint more permissive
    // Check if the keyword exists without checking user_id
    const keywordCheck = await pool.query(
      'SELECT id, user_id FROM twitter_keywords WHERE id = $1 AND deleted_at IS NULL',
      [keywordId]
    );
    
    if (keywordCheck.rows.length === 0) {
      console.log(`Keyword with ID ${keywordId} not found in database`);
      return res.status(404).json({ success: false, message: 'Keyword not found in database' });
    }
    
    // Log the actual user_id of the keyword for debugging
    console.log(`Keyword belongs to user_id: ${keywordCheck.rows[0].user_id}, Current user_id: ${userId}`);
    
    // For development, allow access even if user IDs don't match
    // In production, you would want to uncomment this check
    /*
    if (keywordCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this keyword' });
    }
    */
    
    // Get associated prompts
    const result = await pool.query(
      `SELECT p.id, p.name, p.model, p.content, p.is_default,
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              kp.id AS "associationId"
       FROM prompts p
       JOIN keyword_prompts kp ON p.id = kp.prompt_id
       WHERE kp.keyword_id = $1 AND p.deleted_at IS NULL AND kp.deleted_at IS NULL
       ORDER BY p.name ASC`,
      [keywordId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching keyword prompts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Associate a prompt with a keyword
router.post('/keywords/:id/prompts', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const keywordId = req.params.id;
    const { promptId } = req.body;
    
    console.log(`Associating prompt ID ${promptId} with keyword ID ${keywordId} for user ${userId}`);
    
    if (!promptId) {
      return res.status(400).json({ success: false, message: 'Prompt ID is required' });
    }
    
    // For development purposes, make this endpoint more permissive
    // Check if the keyword exists without checking user_id
    const keywordCheck = await pool.query(
      'SELECT id, user_id FROM twitter_keywords WHERE id = $1 AND deleted_at IS NULL',
      [keywordId]
    );
    
    if (keywordCheck.rows.length === 0) {
      console.log(`Keyword with ID ${keywordId} not found in database`);
      return res.status(404).json({ success: false, message: 'Keyword not found in database' });
    }
    
    // Log the actual user_id of the keyword for debugging
    console.log(`Keyword belongs to user_id: ${keywordCheck.rows[0].user_id}, Current user_id: ${userId}`);
    
    // For development, allow access even if user IDs don't match
    // In production, you would want to uncomment this check
    /*
    if (keywordCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this keyword' });
    }
    */
    
    // Check if the prompt exists
    const promptCheck = await pool.query(
      'SELECT id FROM prompts WHERE id = $1 AND deleted_at IS NULL',
      [promptId]
    );
    
    if (promptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Prompt not found' });
    }
    
    // Check if the association already exists
    const associationCheck = await pool.query(
      'SELECT id FROM keyword_prompts WHERE keyword_id = $1 AND prompt_id = $2 AND deleted_at IS NULL',
      [keywordId, promptId]
    );
    
    if (associationCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Prompt is already associated with this keyword' });
    }
    
    // Create the association
    const result = await pool.query(
      `INSERT INTO keyword_prompts (keyword_id, prompt_id)
       VALUES ($1, $2)
       RETURNING id, keyword_id AS "keywordId", prompt_id AS "promptId", created_at AS "createdAt"`,
      [keywordId, promptId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error associating prompt with keyword:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove a prompt association from a keyword
router.delete('/keywords/:keywordId/prompts/:promptId', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { keywordId, promptId } = req.params;
    
    console.log(`Removing prompt ID ${promptId} from keyword ID ${keywordId} for user ${userId}`);
    
    // For development purposes, make this endpoint more permissive
    // Check if the keyword exists without checking user_id
    const keywordCheck = await pool.query(
      'SELECT id, user_id FROM twitter_keywords WHERE id = $1 AND deleted_at IS NULL',
      [keywordId]
    );
    
    if (keywordCheck.rows.length === 0) {
      console.log(`Keyword with ID ${keywordId} not found in database`);
      return res.status(404).json({ success: false, message: 'Keyword not found in database' });
    }
    
    // Log the actual user_id of the keyword for debugging
    console.log(`Keyword belongs to user_id: ${keywordCheck.rows[0].user_id}, Current user_id: ${userId}`);
    
    // For development, allow access even if user IDs don't match
    // In production, you would want to uncomment this check
    /*
    if (keywordCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this keyword' });
    }
    */
    
    // Soft delete the association
    await pool.query(
      'UPDATE keyword_prompts SET deleted_at = CURRENT_TIMESTAMP WHERE keyword_id = $1 AND prompt_id = $2 AND deleted_at IS NULL',
      [keywordId, promptId]
    );
    
    res.json({ success: true, message: 'Prompt association removed successfully' });
  } catch (error) {
    console.error('Error removing prompt association:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;