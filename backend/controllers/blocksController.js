// controllers/blocksController.js

import pool from '../config/db.js';

export const getUserBlocks = async (req, res) => {
  try {
    const userId = req.user.user_id; // Assuming authenticate middleware adds user info to req.user

    // SQL Query to fetch blocks linked to the user's active subscriptions
    const query = `
      SELECT 
        b.block_id AS "blockId",
        b.height, 
        b.block_hash AS "blockHash", 
        b.timestamp, 
        b.bitcoin_mined AS "bitcoinMined"
      FROM blocks b
      JOIN subscription_blocks sb ON b.block_id = sb.block_id
      JOIN subscriptions s ON sb.subscription_id = s.subscription_id
      WHERE s.user_id = $1 AND s.is_valid = TRUE
      ORDER BY b.timestamp DESC
    `;

    const { rows } = await pool.query(query, [userId]);

    // If no blocks found, return an empty array
    if (!rows.length) {
      return res.status(200).json({ blocks: [] });
    }

    // Respond with the blocks data
    return res.status(200).json({ blocks: rows });
  } catch (error) {
    console.error('Error fetching user blocks:', error.message);
    return res.status(500).json({ message: 'Server Error: Unable to fetch blocks.' });
  }
};

export const getAllBlocks = async (req, res) => {
  try {
    // SQL Query to fetch all blocks
    const query = `
      SELECT 
        b.block_id AS "blockId",
        b.height, 
        b.block_hash AS "blockHash", 
        b.timestamp, 
        b.bitcoin_mined AS "bitcoinMined"
      FROM blocks b
      ORDER BY b.timestamp DESC
    `;

    const { rows } = await pool.query(query);

    // If no blocks found, return an empty array
    if (!rows.length) {
      return res.status(200).json({ blocks: [] });
    }

    // Respond with the blocks data
    return res.status(200).json({ blocks: rows });
  } catch (error) {
    console.error('Error fetching all blocks:', error.message);
    return res.status(500).json({ message: 'Server Error: Unable to fetch all blocks.' });
  }
};
