// controllers/subscriptionsController.js

import pool from '../config/db.js';

/**
 * Create a new subscription
 * POST /subscriptions
 */
export const createSubscription = async (req, res) => {
  const userId = req.user.user_id;
  const { hashrate, subscriptionPeriodDays } = req.body;

  if (!hashrate || !subscriptionPeriodDays) {
    return res.status(400).json({ success: false, message: 'Hashrate and subscription period are required.' });
  }

  try {
    await pool.query('BEGIN');

    const hashrateRowRes = await pool.query(`
      SELECT id, total_hashrate_th, rented_hashrate_th, available_hashrate_th
      FROM hashrate
      WHERE id = 1
      FOR UPDATE
    `);

    if (hashrateRowRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No hashrate row found. Please initialize the hashrate table.' });
    }

    const row = hashrateRowRes.rows[0];
    const currentAvailable = row.available_hashrate_th;

    if (hashrate > currentAvailable) {
      // ⚠️ Instead of throwing:
      await pool.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient available hashrate. Requested: ${hashrate}, Available: ${currentAvailable}`
      });
    }

    // Otherwise, proceed
    const newRented = row.rented_hashrate_th + hashrate;
    const newAvailable = row.available_hashrate_th - hashrate;

    await pool.query(`
      UPDATE hashrate
      SET rented_hashrate_th = $1, available_hashrate_th = $2
      WHERE id = $3
    `, [newRented, newAvailable, row.id]);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(subscriptionPeriodDays, 10));

    const subscriptionInsertQuery = `
      INSERT INTO subscriptions (
        user_id, hashrate, start_date, end_date, is_valid
      ) VALUES ($1, $2, $3, $4, true)
      RETURNING *;
    `;

    const subResult = await pool.query(subscriptionInsertQuery, [
      userId,
      hashrate,
      startDate,
      endDate
    ]);
    const newSubscription = subResult.rows[0];

    // (Optional) Insert a notification
    const notificationQuery = `
      INSERT INTO notifications (user_id, title, message, importance, icon)
      VALUES ($1, $2, $3, 'normal', 'subscription');
    `;
    await pool.query(notificationQuery, [
      userId,
      'New Subscription Started',
      `You have successfully rented ${hashrate} TH/s of hashrate.`
    ]);

    await pool.query('COMMIT');

    return res.status(201).json({ success: true, subscription: newSubscription });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating subscription:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};



export const getActiveSubscription = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND is_valid = true 
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, subscription: null });
    }

    const subscription = result.rows[0];
    const currentDate = new Date();
    const endDate = new Date(subscription.end_date);
    const timeDiff = endDate - currentDate;
    const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    res.status(200).json({ success: true, subscription: { ...subscription, remainingDays } });
  } catch (error) {
    console.error('Error fetching active subscription:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getBitcoinAllocated = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Get active subscription
    const subscriptionResult = await pool.query(
      `SELECT subscription_id FROM subscriptions 
       WHERE user_id = $1 AND is_valid = true 
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(200).json({ success: true, bitcoinAllocated: 0 });
    }

    const subscriptionId = subscriptionResult.rows[0].subscription_id;

    // Sum bitcoin_allocated from subscription_blocks
    const bitcoinResult = await pool.query(
      `SELECT COALESCE(SUM(bitcoin_allocated), 0) AS total_bitcoin 
       FROM subscription_blocks 
       WHERE subscription_id = $1`,
      [subscriptionId]
    );

    const totalBitcoin = parseFloat(bitcoinResult.rows[0].total_bitcoin);

    res.status(200).json({ success: true, bitcoinAllocated: totalBitcoin });
  } catch (error) {
    console.error('Error fetching bitcoin allocated:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const updateHostingCosts = async (req, res) => {
  const userId = req.user.user_id; // Extracted from verifyToken middleware
  const { hosting_costs } = req.body;

  // Input validation
  if (hosting_costs === undefined || isNaN(hosting_costs)) {
    return res.status(400).json({ success: false, message: 'Invalid hosting_costs value.' });
  }

  try {
    // Fetch the active subscription
    const subscriptionResult = await pool.query(
      `SELECT subscription_id, is_valid 
       FROM subscriptions 
       WHERE user_id = $1 AND is_valid = true 
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active subscription found.' });
    }

    const subscriptionId = subscriptionResult.rows[0].subscription_id;

    // Update the hosting_costs in the subscriptions table
    const updateQuery = `
      UPDATE subscriptions 
      SET hosting_costs = $1 
      WHERE subscription_id = $2 
      RETURNING hosting_costs;
    `;

    const updateResult = await pool.query(updateQuery, [hosting_costs, subscriptionId]);

    res.status(200).json({ success: true, hosting_costs: updateResult.rows[0].hosting_costs });
  } catch (error) {
    console.error('Error updating hosting costs:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


/**
 * Get All Invalid Subscriptions and Their Mined Blocks for a User
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */

export const getInvalidSubscriptions = async (req, res) => {
  const userId = req.user.user_id;
  console.log(`Fetching previous subscriptions for user ID: ${userId}`);

  try {
    // Fetch all invalid subscriptions for the user
    const subscriptionsResult = await pool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND is_valid = false`,
      [userId]
    );

    const subscriptions = subscriptionsResult.rows;
    console.log(`Previous subscriptions found: ${JSON.stringify(subscriptions, null, 2)}`);

    if (subscriptions.length === 0) {
      console.log('No invalid subscriptions found for the user.');
      return res.status(200).json({ success: true, subscriptions: [] });
    }

    // For each subscription, fetch associated mined blocks
    const subscriptionsWithBlocks = await Promise.all(
      subscriptions.map(async (subscription) => {
        const blocksResult = await pool.query(
          `SELECT sb.block_id, sb.height, sb.bitcoin_allocated, b.block_hash, b.timestamp 
           FROM subscription_blocks sb
           JOIN blocks b ON sb.block_id = b.block_id
           WHERE sb.subscription_id = $1`,
          [subscription.subscription_id]
        );

        const blocks = blocksResult.rows;
        // console.log(`Blocks for subscription ID ${subscription.subscription_id}: ${JSON.stringify(blocks, null, 2)}`);

        // Calculate total mined BTC
        const minedBtc = blocks.reduce((sum, block) => sum + parseFloat(block.bitcoin_allocated), 0);

        // Retrieve hosting fees from the subscription record (USD)
        const hostingFeesUSD = parseFloat(subscription.hosting_costs) || 0;

        // Retrieve mining pool fees directly from the subscription record (BTC)
        const miningPoolFees = parseFloat(subscription.mining_pool_fee) || 0;

        // Retrieve hosting fees in BTC from the subscription record
        const hostingFeesBtc = parseFloat(subscription.hosting_fees_btc) || 0;

        // Calculate profit (redundant if already calculated and stored, but kept for reference)
        const profitBtc = minedBtc - hostingFeesBtc - miningPoolFees;

        console.log(`Subscription ID: ${subscription.subscription_id}, Mined BTC: ${minedBtc}, Hosting Fees (USD): ${hostingFeesUSD}, Hosting Fees (BTC): ${hostingFeesBtc}, Mining Pool Fees: ${miningPoolFees}, Profit BTC: ${profitBtc}`);

        return {
          id: subscription.subscription_id,
          startDate: subscription.start_date.toISOString().split('T')[0],
          endDate: subscription.end_date.toISOString().split('T')[0],
          minedBtc: minedBtc.toFixed(6),
          hostingFeesUSD: hostingFeesUSD.toFixed(6), // Still in USD
          hostingFeesBTC: hostingFeesBtc.toFixed(8), // Converted to BTC
          miningPoolFees: miningPoolFees.toFixed(8),
          profitBtc: parseFloat(subscription.profit_btc).toFixed(8),
        };
      })
    );

    console.log(`Final subscription data to send: ${JSON.stringify(subscriptionsWithBlocks, null, 2)}`);
    res.status(200).json({ success: true, subscriptions: subscriptionsWithBlocks });
  } catch (error) {
    console.error('Error fetching invalid subscriptions:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * Fetch user's total mined BTC and number of subscriptions
 */
export const getMiningStats = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // 1. Fetch total mined BTC from user_mined_bitcoins table
    const minedResult = await pool.query(
      `SELECT total_mined_btc FROM user_mined_bitcoins WHERE user_id = $1`,
      [userId]
    );

    const totalMinedBtc =
      minedResult.rows.length > 0 ? parseFloat(minedResult.rows[0].total_mined_btc) : 0;

    // 2. Count number of subscriptions (both valid and invalid)
    const subscriptionsResult = await pool.query(
      `SELECT COUNT(*) FROM subscriptions WHERE user_id = $1`,
      [userId]
    );

    const numberOfSubscriptions = parseInt(subscriptionsResult.rows[0].count, 10);

    res.status(200).json({
      success: true,
      totalMinedBtc,
      numberOfSubscriptions,
    });
  } catch (error) {
    console.error('Error fetching mining stats:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getBlockReward = async (req, res) => {
  const userId = req.user.user_id;
  const { blockId } = req.query;
  
  if (!blockId) {
    return res.status(400).json({ success: false, message: 'Missing blockId parameter.' });
  }

  try {
    // Get the active subscription for the current user
    const subResult = await pool.query(
      `SELECT subscription_id FROM subscriptions 
       WHERE user_id = $1 AND is_valid = true 
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active subscription found.' });
    }

    const subscriptionId = subResult.rows[0].subscription_id;

    // Fetch the block-specific reward from subscription_blocks
    const blockRewardResult = await pool.query(
      `SELECT bitcoin_allocated FROM subscription_blocks 
       WHERE subscription_id = $1 AND block_id = $2`,
      [subscriptionId, blockId]
    );


    if (blockRewardResult.rows.length === 0) {
      return res.status(200).json({ success: true, bitcoin_allocated: 0 });
    }

    const reward = parseFloat(blockRewardResult.rows[0].bitcoin_allocated);
    return res.status(200).json({ success: true, bitcoin_allocated: reward });
  } catch (error) {
    console.error('Error fetching block reward:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

