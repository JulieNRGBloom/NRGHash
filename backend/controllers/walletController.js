// backend/controllers/walletController.js

import pool from '../config/db.js';
import axios from 'axios';

/**
 * Fetches the BTC to NGN exchange rate using CoinGecko API.
 * @returns {Promise<number>} - Current BTC price in NGN.
 */
// const fetchBitcoinPriceNGN = async () => {
//     try {
//       const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCNGN');
//       return parseFloat(response.data.price);
//     } catch (error) {
//       console.error('Error fetching Bitcoin price in NGN:', error.message);
//       throw new Error('Failed to fetch Bitcoin price in NGN.');
//     }
//   };

/**
 * Fetches the BTC to USD exchange rate using CoinGecko API.
 * @returns {Promise<number>} - Current BTC price in USD.
 */
// const fetchBitcoinPriceUSD = async () => {
//   try {
//     const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
//       params: {
//         ids: 'bitcoin',
//         vs_currencies: 'usd',
//       },
//     });
//     return parseFloat(response.data.bitcoin.usd);
//   } catch (error) {
//     console.error('Error fetching Bitcoin price in USD:', error.message);
//     throw new Error('Failed to fetch Bitcoin price in USD.');
//   }
// };

/**
 * Get Wallet Information for the Authenticated User
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getWallet = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const walletRes = await pool.query(
      `SELECT available_btc, pending_withdrawal, created_at, updated_at
       FROM wallets
       WHERE user_id = $1`,
      [userId]
    );

    if (walletRes.rows.length === 0) {
      // If wallet doesn't exist, create one with default values
      const insertRes = await pool.query(
        `INSERT INTO wallets (user_id, available_btc, pending_withdrawal)
         VALUES ($1, $2, $3)
         RETURNING available_btc, pending_withdrawal, created_at, updated_at`,
        [userId, 0, 0]
      );

      return res.status(200).json({ success: true, wallet: insertRes.rows[0] });
    }

    res.status(200).json({ success: true, wallet: walletRes.rows[0] });
  } catch (error) {
    console.error('Error fetching wallet:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * Create a Withdrawal Request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createWithdrawalRequest = async (req, res) => {
    const userId = req.user.user_id;
    const {
      amount_btc,
      bank_name,
      bank_account_number,
      account_holder_name,
    } = req.body;
  
    try {
      // Validate withdrawal amount
      const requested_amount = parseFloat(amount_btc);
      if (isNaN(requested_amount) || requested_amount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid withdrawal amount is required.' });
      }
  
      // Fetch user's wallet with row-level lock
      const walletRes = await pool.query(
        `SELECT available_btc, pending_withdrawal 
         FROM wallets 
         WHERE user_id = $1 
         FOR UPDATE`,
        [userId]
      );
  
      if (walletRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Wallet not found.' });
      }
  
      const { available_btc, pending_withdrawal } = walletRes.rows[0];
    //   const total_available = parseFloat(available_btc) - parseFloat(pending_withdrawal);
      const total_available = parseFloat(available_btc);

  
      if (requested_amount > total_available) {
        return res.status(400).json({ success: false, message: 'Insufficient available BTC for withdrawal.' });
      }
  
      // Fetch Binance BTC price in NGN
      const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCNGN');
      const btcPriceNGN = parseFloat(response.data.price);
      if (isNaN(btcPriceNGN)) {
        throw new Error('Invalid BTC price from Binance.');
      }
      const amount_ngn = requested_amount * btcPriceNGN;
  
      // Start Transaction
      await pool.query('BEGIN');
  
      // Insert into withdrawal_requests (without withdrawal_method)
      const insertWithdrawalRes = await pool.query(
        `INSERT INTO withdrawal_requests 
         (user_id, amount_btc, amount_ngn, bank_name, bank_account_number, account_holder_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
         RETURNING *`,
        [
          userId,
          requested_amount.toFixed(8),
          amount_ngn ? parseFloat(amount_ngn).toFixed(2) : null,
          bank_name,
          bank_account_number,
          account_holder_name,
        ]
      );
  
      // Update wallets.pending_withdrawal
      // ✅ Corrected: Also subtract from available_btc
      await pool.query(
          `UPDATE wallets 
          SET available_btc = available_btc - $1,
              pending_withdrawal = pending_withdrawal + $1,
              updated_at = NOW()
          WHERE user_id = $2`,
          [requested_amount.toFixed(8), userId]
      );
  
  
      // Commit Transaction
      await pool.query('COMMIT');
  
      res.status(201).json({
        success: true,
        withdrawalRequest: insertWithdrawalRes.rows[0],
      });
    } catch (error) {
      // Rollback Transaction
      await pool.query('ROLLBACK');
      console.error('Error processing withdrawal request:', error.message);
      res.status(400).json({ success: false, message: error.message });
    }
  };  
  

/**
 * List Withdrawal Requests for the Authenticated User
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * List Withdrawal Requests for the Admin/User
 */
export const listWithdrawalRequests = async (req, res) => {
    const userId = req.user.user_id;

    try {
        // ✅ Fetch user role from the database
        const userRoleRes = await pool.query(
            `SELECT role FROM users WHERE user_id = $1`,
            [userId]
        );

        if (userRoleRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const userRole = userRoleRes.rows[0].role;

        let withdrawalsRes;

        if (userRole === 'admin') {
            // ✅ Fetch ALL withdrawals, categorized by status
            const pendingRes = await pool.query(
                `SELECT * FROM withdrawal_requests WHERE is_processed = FALSE AND is_rejected = FALSE ORDER BY created_at DESC`
            );
            const processedRes = await pool.query(
                `SELECT * FROM withdrawal_requests WHERE is_processed = TRUE ORDER BY created_at DESC`
            );
            const rejectedRes = await pool.query(
                `SELECT * FROM withdrawal_requests WHERE is_rejected = TRUE ORDER BY created_at DESC`
            );

            return res.status(200).json({
                success: true,
                pending: pendingRes.rows,
                processed: processedRes.rows,
                rejected: rejectedRes.rows,
            });

        } else {
            // ✅ Normal users can only see their own requests
            withdrawalsRes = await pool.query(
                `SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
        }

        res.status(200).json({ success: true, withdrawals: withdrawalsRes.rows });

    } catch (error) {
        console.error('Error listing withdrawal requests:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


export const listUserWithdrawals = async (req, res) => {
    const userId = req.user.user_id; // Only fetch withdrawals for this user

    try {
        const userWithdrawals = await pool.query(
            `SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );

        res.status(200).json({ success: true, withdrawals: userWithdrawals.rows });
    } catch (error) {
        console.error('Error fetching user-specific withdrawals:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


/**
 * Process a Withdrawal Request (Admin Action)
 * - Deducts from available BTC
 * - Removes from pending withdrawals
 * - Marks withdrawal as processed
 */
export const processWithdrawalRequest = async (req, res) => {
    const { id } = req.params; // Withdrawal ID

    try {
        // Check if the withdrawal request still exists
        const withdrawalRes = await pool.query(
            `SELECT user_id, amount_btc FROM withdrawal_requests WHERE id = $1 AND is_processed = FALSE AND is_rejected = FALSE`,
            [id]
        );

        if (withdrawalRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found. It may have been deleted by the user.' });
        }

        const { user_id, amount_btc } = withdrawalRes.rows[0];

        // Start transaction
        await pool.query('BEGIN');

        // Update wallets table: Deduct from pending withdrawal
        const updateWalletRes = await pool.query(
            `UPDATE wallets
             SET pending_withdrawal = pending_withdrawal - $1,
                 updated_at = NOW()
             WHERE user_id = $2
             RETURNING available_btc, pending_withdrawal`,
            [amount_btc, user_id]
        );

        if (updateWalletRes.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'User wallet not found.' });
        }

        // Mark withdrawal request as processed
        await pool.query(
            `UPDATE withdrawal_requests
             SET is_processed = TRUE, updated_at = NOW()
             WHERE id = $1`,
            [id]
        );

        // ✅ Insert a notification for the user
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, importance, icon)
           VALUES ($1, $2, $3, $4, $5)`,
          [
              user_id,
              'Withdrawal Processed',
              `Your withdrawal of ${amount_btc} BTC has been successfully processed.`,
              'important',
              'withdrawal_processed',
          ]
      );


        // Commit transaction
        await pool.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Withdrawal successfully processed.',
            wallet: updateWalletRes.rows[0],
        });

    } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        console.error('Error processing withdrawal:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  };

  
/**
 * Reject a Withdrawal Request (Admin Action)
 * - Adds the amount back to available BTC
 * - Removes from pending withdrawals
 * - Marks withdrawal as rejected
 */
export const rejectWithdrawalRequest = async (req, res) => {
    const { id } = req.params; // Withdrawal ID
  
    try {
      // Fetch withdrawal details
      const withdrawalRes = await pool.query(
        `SELECT user_id, amount_btc FROM withdrawal_requests WHERE id = $1 AND is_processed = FALSE AND is_rejected = FALSE`,
        [id]
      );
  
      if (withdrawalRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Withdrawal request not found or already processed.' });
      }
  
      const { user_id, amount_btc } = withdrawalRes.rows[0];
  
      // Start transaction
      await pool.query('BEGIN');
  
      // Update wallets table: Add back to available BTC and remove from pending withdrawal
      const updateWalletRes = await pool.query(
        `UPDATE wallets
         SET available_btc = available_btc + $1,
             pending_withdrawal = pending_withdrawal - $1,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING available_btc, pending_withdrawal`,
        [amount_btc, user_id]
      );
  
      if (updateWalletRes.rowCount === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User wallet not found.' });
      }
  
      // Mark withdrawal request as rejected
      await pool.query(
        `UPDATE withdrawal_requests
         SET is_rejected = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // ✅ **Insert a notification for the user**
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, importance, icon)
         VALUES ($1, $2, $3, $4, $5);`,
        [
            user_id,
            'Withdrawal Rejected',
            `Your withdrawal request of ${amount_btc} BTC was rejected by the admin.`,
            'important',
            'withdrawal_rejected',
        ]
      );
  
      // Commit transaction
      await pool.query('COMMIT');
  
      res.status(200).json({
        success: true,
        message: 'Withdrawal successfully rejected.',
        wallet: updateWalletRes.rows[0],
      });
  
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      console.error('Error rejecting withdrawal:', error.message);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  };
  

/**
 * Review a Withdrawal Request (Admin Action)
 * - Moves the request back to "Pending"
 * - Adjusts wallet balances accordingly
 */
export const reviewWithdrawalRequest = async (req, res) => {
    const { id } = req.params; // Withdrawal ID

    try {
        // Fetch withdrawal details
        const withdrawalRes = await pool.query(
            `SELECT id, user_id, amount_btc, is_processed, is_rejected 
             FROM withdrawal_requests WHERE id = $1`,
            [id]
        );

        if (withdrawalRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });
        }

        console.log(`Reviewing Withdrawal ID: ${id}, Query Result:`, withdrawalRes.rows[0]);

        const { user_id, amount_btc, is_processed, is_rejected } = withdrawalRes.rows[0];

        if (!user_id) {
            return res.status(500).json({ success: false, message: 'Withdrawal request is missing user_id.' });
        }

        await pool.query('BEGIN');

        if (is_rejected) {
            // Reviewing a "Rejected" withdrawal
            const walletRes = await pool.query(
                `SELECT available_btc FROM wallets WHERE user_id = $1 FOR UPDATE`,
                [user_id]
            );

            if (walletRes.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'User wallet not found.' });
            }

            const { available_btc } = walletRes.rows[0];

            if (available_btc < amount_btc) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Insufficient BTC to reprocess withdrawal.' });
            }

            await pool.query(
                `UPDATE wallets 
                 SET available_btc = available_btc - $1, 
                     pending_withdrawal = pending_withdrawal + $1, 
                     updated_at = NOW()
                 WHERE user_id = $2`,
                [amount_btc, user_id]
            );

        } else if (is_processed) {
            // Reviewing a "Processed" withdrawal (should NOT subtract from available_btc)
            await pool.query(
                `UPDATE wallets 
                 SET pending_withdrawal = pending_withdrawal + $1, 
                     updated_at = NOW()
                 WHERE user_id = $2`,
                [amount_btc, user_id]
            );
        }

        // Update withdrawal request status back to "Pending"
        const updatedWithdrawalRes = await pool.query(
            `UPDATE withdrawal_requests 
             SET is_processed = FALSE, 
                 is_rejected = FALSE, 
                 updated_at = NOW() 
             WHERE id = $1
             RETURNING *`,  // ✅ This ensures the updated withdrawal is returned
            [id]
        );

        await pool.query(
          `INSERT INTO notifications (user_id, title, message, importance, icon)
           VALUES ($1, $2, $3, $4, $5);`,
          [
              user_id,
              'Withdrawal Reviewed',
              `Your withdrawal request of ${amount_btc} BTC is being reviewed by the admin.`,
              'important',
              'withdrawal_reviewed',
          ]
        );

        await pool.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Withdrawal request has been reviewed and moved back to pending.',
            withdrawal: updatedWithdrawalRes.rows[0],  // ✅ Send the updated withdrawal back
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error reviewing withdrawal:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Delete a Pending Withdrawal Request
 * - Only allows deletion if the withdrawal is still pending.
 * - Returns funds back to `available_btc`.
 */
export const deleteWithdrawalRequest = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;

    try {
        // Fetch withdrawal details
        const withdrawalRes = await pool.query(
            `SELECT amount_btc, is_processed, is_rejected FROM withdrawal_requests 
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (withdrawalRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found.' });
        }

        const { amount_btc, is_processed, is_rejected } = withdrawalRes.rows[0];

        if (is_processed || is_rejected) {
            return res.status(400).json({ success: false, message: 'Cannot delete a processed or rejected withdrawal.' });
        }

        // Begin transaction
        await pool.query('BEGIN');

        // Return funds to available BTC
        await pool.query(
            `UPDATE wallets 
             SET available_btc = available_btc + $1, 
                 pending_withdrawal = pending_withdrawal - $1, 
                 updated_at = NOW() 
             WHERE user_id = $2`,
            [amount_btc, userId]
        );

        // Delete the withdrawal request
        await pool.query(`DELETE FROM withdrawal_requests WHERE id = $1`, [id]);

        // Commit transaction
        await pool.query('COMMIT');

        res.status(200).json({ success: true, message: 'Withdrawal request deleted successfully.' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting withdrawal:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

