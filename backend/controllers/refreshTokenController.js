import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }

  try {
    // Check if the refresh token exists in the database
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token.' });
    }

    const tokenRecord = result.rows[0];

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(403).json({ success: false, message: 'Refresh token expired.' });
    }

    // Generate a new access token
    const newAccessToken = jwt.sign(
      { user_id: tokenRecord.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Optionally: Generate a new refresh token and update the DB record.
    // For simplicity, we'll reuse the same refresh token here.

    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


export const logoutUser = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }
    try {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
      console.error('Error during logout:', error.message);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  };