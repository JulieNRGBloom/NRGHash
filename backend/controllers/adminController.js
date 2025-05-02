// backend/controllers/adminController.js

import pool from '../config/db.js';

/**
 * Process a Withdrawal Request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const processWithdrawalRequest = async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body; // 'Completed' or 'Failed'

  // Input validation
  if (!['Completed', 'Failed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  try {
    // Start Transaction
    await pool.query('BEGIN');

    // Fetch the withdrawal request
    const withdrawalRes = await pool.query(
      `SELECT user_id, amount_btc FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );

    if (withdrawalRes.rows.length === 0) {
      throw new Error('Withdrawal request not found.');
    }

    const { user_id, amount_btc } = withdrawalRes.rows[0];

    // Update the status
    await pool.query(
      `UPDATE withdrawal_requests 
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, requestId]
    );

    if (status === 'Completed') {
      // Deduct the amount from wallets.available_btc and pending_withdrawal
      await pool.query(
        `UPDATE wallets 
         SET available_btc = available_btc - $1,
             pending_withdrawal = pending_withdrawal - $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [amount_btc.toFixed(8), user_id]
      );

      // Optionally, integrate with a BTC transfer service to send BTC to the user's address
      // Handle the actual BTC transfer logic here
    } else if (status === 'Failed') {
      // Refund the amount back to available_btc
      await pool.query(
        `UPDATE wallets 
         SET pending_withdrawal = pending_withdrawal - $1,
             available_btc = available_btc + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [amount_btc.toFixed(8), user_id]
      );
    }

    // Commit Transaction
    await pool.query('COMMIT');

    res.status(200).json({ success: true, message: 'Withdrawal request processed successfully.' });
  } catch (error) {
    // Rollback Transaction
    await pool.query('ROLLBACK');
    console.error('Error processing withdrawal request:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
