// backend/controllers/hashrateController.js
import pool from '../config/db.js';

/**
 * GET /api/hashrate
 * Returns the single row in `hashrate` table
 */
export const getHashrateData = async (req, res) => {
  try {
    // Just fetch the first (and only) row
    const query = `
      SELECT 
        id,
        total_hashrate_th,
        rented_hashrate_th,
        available_hashrate_th
      FROM hashrate
      LIMIT 1
    `;
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hashrate data found.'
      });
    }

    // In case you want to *force* available = total - rented on-the-fly, you could do:
    const row = result.rows[0];
    const forcedAvailable = row.total_hashrate_th - row.rented_hashrate_th;
    row.available_hashrate_th = forcedAvailable;

    const data = result.rows[0];
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching hashrate data:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};
