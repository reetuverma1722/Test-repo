const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'buzzly',
  password: 'alokozay',
  port: 5432,
});

module.exports = {
  login: async (username, password) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
      if (result.rows.length > 0) {
        // Generate JWT token
        const user = result.rows[0];
        const token = jwt.sign(
          { id: user.id, username: user.username },
          process.env.JWT_SECRET || 'buzzly-secret-key',
          { expiresIn: '24h' }
        );
        
        return {
          success: true,
          message: 'Login successfully',
          token,
          user: {
            id: user.id,
            username: user.username
          }
        };
      } else {
        return { success: false, message: 'Invalid username or password' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'An error occurred' };
    }
  },
  
  // Authentication middleware
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'buzzly-secret-key', (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }
      
      req.user = user;
      next();
    });
  }
};