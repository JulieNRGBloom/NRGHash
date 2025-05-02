// backend/middleware/authenticateToken.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Invalid token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { user_id: decoded.user_id }; // ❌ Removed role
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// backend/middleware/authenticateToken.js

import pool from '../config/db.js';

export const authorizeAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT role FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }

    next(); // ✅ User is admin, proceed
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


export default verifyToken;
