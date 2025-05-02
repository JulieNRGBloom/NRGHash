// backend/controllers/usersController.js

import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

/**
 * Create a new user.
 */
export const createUser = async (req, res) => {
  const { username, password_hash, role, email } = req.body; // Include role

  if (!username || !password_hash) {
    console.error('Invalid request: Missing username or password');
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Username is already registered.' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password_hash, saltRounds);

    // Ensure role is either 'admin' or 'user' (default is 'user')
    const userRole = role === 'admin' ? 'admin' : 'user';

    // Insert the new user into the database
    const result = await pool.query(`
      INSERT INTO users (username, password_hash, role, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [username, hashedPassword, userRole, email || null]);  // if empty, store null


    const user = result.rows[0];

    console.log('User successfully created:', user);
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      username: user.username,
      role: user.role, // Return role in response
    });
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * Log in a user.
 */
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // ✅ Only include `user_id` in JWT (NOT `role`)
    const token = jwt.sign(
      { user_id: user.user_id }, // ❌ Removed role
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a refresh token (longer-lived)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    // For example, set refresh token to expire in 7 days:
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token to the database
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.user_id, refreshToken, refreshTokenExpiresAt]
    );


    res.status(200).json({ success: true, message: 'Login successful', token, refreshToken });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get the current user's information.
 */
// backend/controllers/usersController.js

export const getCurrentUser = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const userResult = await pool.query(
      `SELECT user_id, username, role, bank_name, bank_account_number, account_holder_name 
       FROM users 
       WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({ success: true, user: userResult.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


/**************************************************
 * PUT /users/me
 * Updates bank details for the current user
 **************************************************/
export const updateCurrentUser = async (req, res) => {
  const userId = req.user.user_id;
  const { bank_name, bank_account_number, account_holder_name } = req.body;

  // Validate input
  // (If you want to allow partial updates, handle that logic here)
  if (!bank_name || !bank_account_number || !account_holder_name) {
    return res.status(400).json({
      success: false,
      message: 'bank_name, bank_account_number, and account_holder_name are required.',
    });
  }

  try {
    // Update user record
    await pool.query(
      `UPDATE users
       SET bank_name = $1,
           bank_account_number = $2,
           account_holder_name = $3
       WHERE user_id = $4`,
      [bank_name, bank_account_number, account_holder_name, userId]
    );

    // Optionally fetch the updated user to return to client
    const updatedUser = await pool.query(
      `SELECT user_id, username, bank_name, bank_account_number, account_holder_name
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found after update.' });
    }

    res.status(200).json({
      success: true,
      user: updatedUser.rows[0],
      message: 'Bank details updated successfully.',
    });
  } catch (error) {
    console.error('Error updating user bank details:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * Get total number of users.
 */
export const getUserCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS count FROM users');
    const userCount = parseInt(result.rows[0].count, 10);

    return res.status(200).json({ success: true, count: userCount });
  } catch (error) {
    console.error('Error getting user count:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT user_id, username, email, role
      FROM users
      ORDER BY user_id ASC
    `);

    return res.status(200).json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Error fetching all users:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


export const updateUserById = async (req, res) => {
  const { id } = req.params;
  const { username, email, password_hash } = req.body; // You can add other fields if you want
  
  // If you want partial updates, handle that logic. For simplicity, let's do it straightforward:
  try {
    let hashedPassword = null;
    if (password_hash) {
     const saltRounds = 10;
     hashedPassword = await bcrypt.hash(password_hash, saltRounds);
   }


    const result = await pool.query(`
      UPDATE users
      SET username = COALESCE($1, username),
          email = COALESCE($2, email),
          password_hash = COALESCE($3, password_hash)
      WHERE user_id = $4
      RETURNING user_id, username, email, role
    `, [
      username || null,
      email || null,
      hashedPassword || null, // if hashedPassword is null, no change
      id
      ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


export const deleteUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      DELETE FROM users
      WHERE user_id = $1
      RETURNING user_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
