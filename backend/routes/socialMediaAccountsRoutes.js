// // socialMediaAccountsRoutes.js
// const express = require('express');
// const router = express.Router();
// const pool = require('../db');
// const jwt = require('jsonwebtoken');

// // Middleware to check authentication
// const checkAuth = (req, res, next) => {
//   try {
//     // Get token from Authorization header
//     const token = req.headers.authorization?.split(' ')[1];
    
//     // Get user data from localStorage if available (for development)
//     const userStr = req.headers['x-user-data'];
//     let userData = null;
    
//     if (userStr) {
//       try {
//         userData = JSON.parse(userStr);
//       } catch (e) {
//         console.error('Error parsing user data from header:', e);
//       }
//     }
    
//     if (!token) {
//       // For development purposes, allow requests without a token
//       console.log('No token provided, checking for user data in headers');
      
//       // If user data is provided in headers, use that
//       if (userData && userData.id) {
//         req.user = { id: userData.id };
//         console.log('Using user ID from headers:', userData.id);
//         return next();
//       }
      
//       // Otherwise use default user ID
//       console.log('No user data in headers, using default user ID');
//       req.user = { id: 1 }; // Default user ID for testing
//       return next();
//     }
    
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET || 'buzzly-secret-key');
//       req.user = decoded;
//       console.log('Authenticated user:', req.user);
//     } catch (err) {
//       console.log('Invalid token, checking for user data in headers');
      
//       // If user data is provided in headers, use that
//       if (userData && userData.id) {
//         req.user = { id: userData.id };
//         console.log('Using user ID from headers:', userData.id);
//       } else {
//         console.log('No user data in headers, using default user ID');
//         req.user = { id: 1 }; // Default user ID for testing
//       }
//     }
    
//     next();
//   } catch (error) {
//     console.error('Auth error:', error);
//     req.user = { id: 1 }; // Default user ID for testing
//     next();
//   }
// };

// // Get all social media accounts for the authenticated user
// router.get('/accounts', checkAuth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     console.log('Fetching accounts for user ID:', userId);
    
//     const result = await pool.query(
//       `SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
//        created_at AS "createdAt", updated_at AS "updatedAt"
//        FROM social_media_accounts
//        WHERE user_id = $1 AND deleted_at IS NULL
//        ORDER BY platform, created_at DESC`,
//       [userId]
//     );
    
//     console.log('Found accounts:', result.rows.length);
//     res.json({ success: true, data: result.rows });
//   } catch (error) {
//     console.error('Error fetching social media accounts:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // Get accounts by platform
// router.get('/accounts/:platform', checkAuth, async (req, res) => {
//   try {
//     // Use userId from query parameter if provided, otherwise use from auth
//     const userId = req.query.userId || req.user.id;
//     const { platform } = req.params;
    
//     const result = await pool.query(
//       `SELECT id, platform, account_id AS "accountId", account_name AS "accountName", 
//        created_at AS "createdAt", updated_at AS "updatedAt"
//        FROM social_media_accounts
//        WHERE user_id = $1 AND platform = $2 AND deleted_at IS NULL
//        ORDER BY created_at DESC`,
//       [userId, platform]
//     );
    
//     res.json({ success: true, data: result.rows });
//   } catch (error) {
//     console.error(`Error fetching ${req.params.platform} accounts:`, error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // Add a new social media account
// router.post('/accounts', checkAuth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt } = req.body;
    
//     if (!platform || !accountId || !accountName) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Platform, account ID, and account name are required' 
//       });
//     }
    
//     // Check if account already exists
//     const existingAccount = await pool.query(
//       `SELECT id FROM social_media_accounts 
//        WHERE user_id = $1 AND platform = $2 AND account_id = $3 AND deleted_at IS NULL`,
//       [userId, platform, accountId]
//     );
    
//     if (existingAccount.rows.length > 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'This account is already connected' 
//       });
//     }
    
//     const result = await pool.query(
//       `INSERT INTO social_media_accounts 
//        (user_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at)
//        VALUES ($1, $2, $3, $4, $5, $6, $7)
//        RETURNING id, platform, account_id AS "accountId", account_name AS "accountName", 
//        created_at AS "createdAt", updated_at AS "updatedAt"`,
//       [userId, platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt]
//     );
    
//     res.status(201).json({ success: true, data: result.rows[0] });
//   } catch (error) {
//     console.error('Error adding social media account:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // Update a social media account
// router.put('/accounts/:id', checkAuth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const accountId = req.params.id;
//     const { accountName, accessToken, refreshToken, tokenExpiresAt } = req.body;
    
//     // Check if the account belongs to the user
//     const checkResult = await pool.query(
//       'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
//       [accountId, userId]
//     );
    
//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ success: false, message: 'Account not found' });
//     }
    
//     // Build the update query dynamically based on provided fields
//     let updateFields = [];
//     let queryParams = [accountId, userId];
//     let paramIndex = 3;
    
//     if (accountName) {
//       updateFields.push(`account_name = $${paramIndex}`);
//       queryParams.push(accountName);
//       paramIndex++;
//     }
    
//     if (accessToken) {
//       updateFields.push(`access_token = $${paramIndex}`);
//       queryParams.push(accessToken);
//       paramIndex++;
//     }
    
//     if (refreshToken) {
//       updateFields.push(`refresh_token = $${paramIndex}`);
//       queryParams.push(refreshToken);
//       paramIndex++;
//     }
    
//     if (tokenExpiresAt) {
//       updateFields.push(`token_expires_at = $${paramIndex}`);
//       queryParams.push(tokenExpiresAt);
//       paramIndex++;
//     }
    
//     // Always update the updated_at timestamp
//     updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
//     if (updateFields.length === 1) {
//       // Only updated_at is being updated, nothing else changed
//       return res.status(400).json({ 
//         success: false, 
//         message: 'No fields to update' 
//       });
//     }
    
//     const updateQuery = `
//       UPDATE social_media_accounts 
//       SET ${updateFields.join(', ')}
//       WHERE id = $1 AND user_id = $2
//       RETURNING id, platform, account_id AS "accountId", account_name AS "accountName", 
//       created_at AS "createdAt", updated_at AS "updatedAt"
//     `;
    
//     const result = await pool.query(updateQuery, queryParams);
    
//     res.json({ success: true, data: result.rows[0] });
//   } catch (error) {
//     console.error('Error updating social media account:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // Delete a social media account (soft delete)
// router.delete('/accounts/:id', checkAuth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const accountId = req.params.id;
    
//     // Check if the account belongs to the user
//     const checkResult = await pool.query(
//       'SELECT id FROM social_media_accounts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
//       [accountId, userId]
//     );
    
//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ success: false, message: 'Account not found' });
//     }
    
//     // Soft delete by setting deleted_at timestamp
//     await pool.query(
//       'UPDATE social_media_accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
//       [accountId, userId]
//     );
    
//     res.json({ success: true, message: 'Account deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting social media account:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// module.exports = router;


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
    
    // Try to query with is_premium column, but fall back to query without it if it doesn't exist
    try {
      const result = await pool.query(
        `SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
         created_at AS "createdAt", updated_at AS "updatedAt",
         COALESCE(is_premium, FALSE) AS "isPremium",
         COALESCE(is_default, FALSE) AS "isDefault"
         FROM social_media_accounts
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY platform, created_at DESC`,
        [userId]
      );
      
      console.log('Found accounts:', result.rows.length);
      res.json({ success: true, data: result.rows });
    } catch (columnError) {
      // If the error is about the is_premium column not existing, try without it
      if (columnError.code === '42703') { // PostgreSQL error code for undefined_column
        console.log('is_premium column does not exist, querying without it');
        const result = await pool.query(
          `SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
           created_at AS "createdAt", updated_at AS "updatedAt"
           FROM social_media_accounts
           WHERE user_id = $1 AND deleted_at IS NULL
           ORDER BY platform, created_at DESC`,
          [userId]
        );
        
        // Add default isPremium and isDefault values (false) to each row
        const dataWithDefaults = result.rows.map(row => ({
          ...row,
          isPremium: false,
          isDefault: false
        }));
        
        console.log('Found accounts:', dataWithDefaults.length);
        res.json({ success: true, data: dataWithDefaults });
      } else {
        // If it's a different error, rethrow it
        throw columnError;
      }
    }
    // Remove the duplicate response that was causing the ERR_HTTP_HEADERS_SENT error
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
    
    // Try to query with is_premium column, but fall back to query without it if it doesn't exist
    try {
      const result = await pool.query(
        `SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
         created_at AS "createdAt", updated_at AS "updatedAt",
         COALESCE(is_premium, FALSE) AS "isPremium",
         COALESCE(is_default, FALSE) AS "isDefault"
         FROM social_media_accounts
         WHERE user_id = $1 AND platform = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [userId, platform]
      );
      
      res.json({ success: true, data: result.rows });
      return; // Add return to prevent further execution
    } catch (columnError) {
      // If the error is about the is_premium column not existing, try without it
      if (columnError.code === '42703') { // PostgreSQL error code for undefined_column
        console.log('is_premium column does not exist, querying without it');
        const result = await pool.query(
          `SELECT id, platform, account_id AS "accountId", account_name AS "accountName",
           created_at AS "createdAt", updated_at AS "updatedAt"
           FROM social_media_accounts
           WHERE user_id = $1 AND platform = $2 AND deleted_at IS NULL
           ORDER BY created_at DESC`,
          [userId, platform]
        );
        
        // Add default isPremium and isDefault values (false) to each row
        const dataWithDefaults = result.rows.map(row => ({
          ...row,
          isPremium: false,
          isDefault: false
        }));
        
        res.json({ success: true, data: dataWithDefaults });
        return; // Add return to prevent further execution
      } else {
        // If it's a different error, rethrow it
        throw columnError;
      }
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.platform} accounts:`, error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a new social media account
router.post('/accounts', checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt, twitterPassword, isPremium, isDefault } = req.body;
    
    // Console log the data passed to backend
    console.log('=== Data passed to backend when adding new account ===');
    console.log('User ID:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Twitter Password included:', !!twitterPassword);
    console.log('Is Premium:', isPremium);
    console.log('Is Default:', isDefault);
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
    
    // Try to insert with is_premium column, but fall back to insert without it if it doesn't exist
    try {
      const result = await pool.query(
        `INSERT INTO social_media_accounts
         (user_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, twitter_password, is_premium, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, platform, account_id AS "accountId", account_name AS "accountName",
         created_at AS "createdAt", updated_at AS "updatedAt",
         COALESCE(is_premium, FALSE)::boolean AS "isPremium",
         COALESCE(is_default, FALSE)::boolean AS "isDefault"`,
        [userId, platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt, twitterPassword, isPremium || false, isDefault || false]
      );
      
      // If this account is set as default, unset any other default accounts for this platform
      if (isDefault) {
        await pool.query(
          'UPDATE social_media_accounts SET is_default = FALSE WHERE platform = $1 AND user_id = $2 AND id != $3 AND is_default = TRUE',
          [platform, userId, result.rows[0].id]
        );
        
        console.log(`Set account ${result.rows[0].id} as default and unset others for platform ${platform}`);
      }
      
      console.log('Account successfully added to database with premium and default status:', result.rows[0]);
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (columnError) {
      // If the error is about the is_premium column not existing, try without it
      if (columnError.code === '42703') { // PostgreSQL error code for undefined_column
        console.log('is_premium or is_default column does not exist, inserting without them');
        
        // First, insert the account without the missing columns
        const result = await pool.query(
          `INSERT INTO social_media_accounts
           (user_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, twitter_password)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, platform, account_id AS "accountId", account_name AS "accountName",
           created_at AS "createdAt", updated_at AS "updatedAt"`,
          [userId, platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt, twitterPassword]
        );
        
        // If premium or default is checked, try to add the columns to the table
        if (isPremium || isDefault) {
          try {
            console.log('Attempting to add missing columns to the table...');
            
            // Try to add is_premium column if it doesn't exist and isPremium is true
            if (isPremium) {
              await pool.query(
                `ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;`
              );
              
              // Update the newly inserted record with isPremium=true
              await pool.query(
                `UPDATE social_media_accounts SET is_premium = TRUE WHERE id = $1`,
                [result.rows[0].id]
              );
              
              console.log(`Added is_premium column and set it to TRUE for account ID ${result.rows[0].id}`);
            }
            
            // Try to add is_default column if it doesn't exist and isDefault is true
            if (isDefault) {
              await pool.query(
                `ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;`
              );
              
              // First unset any existing default accounts for this platform
              await pool.query(
                'UPDATE social_media_accounts SET is_default = FALSE WHERE platform = $1 AND user_id = $2 AND is_default = TRUE',
                [platform, userId]
              );
              
              console.log(`Unset default status for other ${platform} accounts`);
              
              // Then update the newly inserted record with isDefault=true
              await pool.query(
                `UPDATE social_media_accounts SET is_default = TRUE WHERE id = $1`,
                [result.rows[0].id]
              );
              
              console.log(`Added is_default column and set it to TRUE for account ID ${result.rows[0].id}`);
            }
          } catch (alterError) {
            console.error('Error adding columns to the table:', alterError);
            // Continue with the response even if column addition fails
          }
        }
        
        // Add isPremium and isDefault properties to the returned data based on the input values
        const dataWithDefaults = {
          ...result.rows[0],
          isPremium: Boolean(isPremium || false),
          isDefault: Boolean(isDefault || false)
        };
        
        console.log('Account successfully added to database with user-specified premium/default status:', dataWithDefaults);
        res.status(201).json({ success: true, data: dataWithDefaults });
      } else {
        // If it's a different error, rethrow it
        throw columnError;
      }
    }
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
    const { accountName, accessToken, refreshToken, tokenExpiresAt, isPremium, isDefault } = req.body;
    
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
    
    // Try to update with premium and default fields
    try {
      // Add isPremium and isDefault fields if provided
      if (isPremium !== undefined) {
        updateFields.push(`is_premium = $${paramIndex}`);
        queryParams.push(isPremium);
        paramIndex++;
      }
      
      // Handle the default account logic
      if (isDefault !== undefined) {
        // If setting an account as default
        if (isDefault === true) {
          // First, unset any existing default accounts for this platform
          try {
            // Get the platform of the account being updated
            const platformResult = await pool.query(
              'SELECT platform FROM social_media_accounts WHERE id = $1',
              [accountId]
            );
            
            if (platformResult.rows.length > 0) {
              const platform = platformResult.rows[0].platform;
              
              // Unset default for all other accounts of the same platform
              await pool.query(
                'UPDATE social_media_accounts SET is_default = FALSE WHERE platform = $1 AND user_id = $2 AND id != $3 AND is_default = TRUE',
                [platform, userId, accountId]
              );
              
              console.log(`Unset default status for other ${platform} accounts`);
            }
          } catch (error) {
            console.error('Error updating other accounts default status:', error);
            // Continue with the update even if this fails
          }
        }
        
        // Now set the default status for this account
        updateFields.push(`is_default = $${paramIndex}`);
        queryParams.push(isDefault);
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
        created_at AS "createdAt", updated_at AS "updatedAt",
        COALESCE(is_premium, FALSE)::boolean AS "isPremium", COALESCE(is_default, FALSE)::boolean AS "isDefault"
      `;
      
      const result = await pool.query(updateQuery, queryParams);
      
      res.json({ success: true, data: result.rows[0] });
    } catch (columnError) {
      // If the error is about columns not existing, try to add them first
      if (columnError.code === '42703') { // PostgreSQL error code for undefined_column
        console.log('is_premium or is_default column does not exist, attempting to add them');
        
        // Try to add is_premium column if it doesn't exist and isPremium is provided
        if (isPremium !== undefined) {
          try {
            await pool.query(
              `ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;`
            );
            console.log('Added is_premium column to the table');
          } catch (alterError) {
            console.error('Error adding is_premium column:', alterError);
          }
        }
        
        // Try to add is_default column if it doesn't exist and isDefault is provided
        if (isDefault !== undefined) {
          try {
            await pool.query(
              `ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;`
            );
            console.log('Added is_default column to the table');
          } catch (alterError) {
            console.error('Error adding is_default column:', alterError);
          }
        }
        
        // Now try the update again, but without the columns that might not exist
        updateFields = updateFields.filter(field =>
          !field.startsWith('is_premium =') && !field.startsWith('is_default =')
        );
        
        // Always update the updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        // Remove the isPremium and isDefault parameters if they were added
        queryParams = queryParams.filter((_, index) => {
          // Keep the first two parameters (accountId and userId)
          if (index < 2) return true;
          
          // Check if this parameter corresponds to isPremium or isDefault
          const paramPosition = index + 1;
          const correspondingField = `$${paramPosition}`;
          return !updateFields.some(field =>
            (field.includes('is_premium') && field.includes(correspondingField)) ||
            (field.includes('is_default') && field.includes(correspondingField))
          );
        });
        
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
        
        // After the basic update, try to update the premium and default status separately
        if (isPremium !== undefined) {
          try {
            await pool.query(
              `UPDATE social_media_accounts SET is_premium = $1 WHERE id = $2 AND user_id = $3`,
              [isPremium, accountId, userId]
            );
            console.log(`Updated is_premium to ${isPremium} for account ID ${accountId}`);
          } catch (updateError) {
            console.error('Error updating is_premium:', updateError);
          }
        }
        
        if (isDefault !== undefined) {
          try {
            // If setting an account as default
            if (isDefault === true) {
              // Get the platform of the account being updated
              const platformResult = await pool.query(
                'SELECT platform FROM social_media_accounts WHERE id = $1',
                [accountId]
              );
              
              if (platformResult.rows.length > 0) {
                const platform = platformResult.rows[0].platform;
                
                // Unset default for all other accounts of the same platform
                await pool.query(
                  'UPDATE social_media_accounts SET is_default = FALSE WHERE platform = $1 AND user_id = $2 AND id != $3 AND is_default = TRUE',
                  [platform, userId, accountId]
                );
                
                console.log(`Unset default status for other ${platform} accounts`);
              }
            }
            
            // Now set the default status for this account
            await pool.query(
              `UPDATE social_media_accounts SET is_default = $1 WHERE id = $2 AND user_id = $3`,
              [isDefault, accountId, userId]
            );
            console.log(`Updated is_default to ${isDefault} for account ID ${accountId}`);
          } catch (updateError) {
            console.error('Error updating is_default:', updateError);
          }
        }
        
        // Add isPremium and isDefault properties to the returned data based on the input values
        const dataWithDefaults = {
          ...result.rows[0],
          isPremium: isPremium !== undefined ? Boolean(isPremium) : false,
          isDefault: isDefault !== undefined ? Boolean(isDefault) : false
        };
        
        res.json({ success: true, data: dataWithDefaults });
      } else {
        // If it's a different error, rethrow it
        throw columnError;
      }
    }
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