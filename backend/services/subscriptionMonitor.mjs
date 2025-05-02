// backend/services/subscriptionMonitor.mjs

import cron from 'node-cron';
import pool from '../config/db.js';
import { hostingFeePerKWH, poolFeesperTHPercentage, ASIC_POWER_CONSUMPTION_WATTS, TH_PER_ASIC } from '../utils/api.mjs';
import axios from 'axios';

let io;

// Set the Socket.io instance
export const setSocketIO = (socketIO) => {
  io = socketIO;
  console.log('Socket.io instance has been set.');
};

// Fetch current BTC price in USD
const fetchBitcoinPriceUSD = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'bitcoin', vs_currencies: 'usd' },
    });
    return parseFloat(response.data.bitcoin.usd);
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error.message);
    throw error;
  }
};

// Calculate energy consumption in kWh
const calculateConsumedEnergy = (asicPowerConsumptionWatts, ThPerAsic, hashrate, daysActive, interruptionMinutes) => {
  const powerPerTH = asicPowerConsumptionWatts / ThPerAsic;
  const totalPower = powerPerTH * hashrate;
  const hoursActive = (daysActive * 24) - (interruptionMinutes / 60);
  const totalEnergyKwh = (totalPower * hoursActive) / 1000;
  return totalEnergyKwh;
};

// Calculate mining pool fee in BTC
const calculateMiningPoolFee = (totalBitcoinAllocated) => {
  return (totalBitcoinAllocated * poolFeesperTHPercentage) / 100;
};

// Fetch the actual interruption minutes from interruptions table for a subscription period
const getActualInterruptionMinutes = async (startDate, endDate) => {
  try {
    const result = await pool.query(
      `SELECT start_time, end_time FROM interruptions 
       WHERE start_time <= $2 AND (end_time IS NULL OR end_time >= $1)`,
      [startDate, endDate]
    );

    let totalMinutes = 0;
    const subscriptionStart = new Date(startDate);
    const subscriptionEnd = new Date(endDate);

    result.rows.forEach((interruption) => {
      const start = new Date(interruption.start_time);
      const end = interruption.end_time ? new Date(interruption.end_time) : new Date();

      const overlapStart = start < subscriptionStart ? subscriptionStart : start;
      const overlapEnd = end > subscriptionEnd ? subscriptionEnd : end;

      if (overlapStart < overlapEnd) {
        totalMinutes += (overlapEnd - overlapStart) / (1000 * 60);
      }
    });

    return Math.floor(totalMinutes);
  } catch (error) {
    console.error(`Error fetching interruption minutes: ${error.message}`);
    return 0;
  }
};

export const startSubscriptionMonitoring = () => {
  if (!io) {
    console.error('Socket.io instance not set. Call setSocketIO(io) before starting the monitor.');
    return;
  }

  console.log('Starting subscription monitoring tasks...');

  /**
   * Task 1: Monitor Subscription Statuses (Hourly)
   */
  cron.schedule('00 * * * *', async () => {
    console.log('Hourly subscription status check initiated.');
    try {
      const currentDate = new Date();
  
      const res = await pool.query(
        `SELECT subscription_id, user_id, start_date, end_date, is_valid, hashrate 
         FROM subscriptions 
         WHERE is_valid = true`
      );
  
      const subscriptions = res.rows;
  
      for (const subscription of subscriptions) {
        const { subscription_id, user_id, start_date, end_date, hashrate } = subscription;
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
  
        const remainingDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
  
        if (remainingDays < 0) {
          console.log(`Subscription ${subscription_id} expired. Processing...`);
          await pool.query('BEGIN');
  
          try {
            // 1) First, lock the hashrate row
            //    We do this so no one else updates it concurrently
            //    (like another subscription also ending).
            //    If your row has an id=1, adjust as needed:
            const hashrateRowRes = await pool.query(`
              SELECT id, total_hashrate_th, rented_hashrate_th, available_hashrate_th
              FROM hashrate
              WHERE id = 1
              FOR UPDATE
            `);
  
            if (hashrateRowRes.rows.length === 0) {
              throw new Error('No hashrate row found. Please initialize the hashrate table.');
            }
  
            const row = hashrateRowRes.rows[0];
  
            // 2) Subtract the subscription’s hashrate from the rented value
            const newRented = row.rented_hashrate_th - hashrate;
            if (newRented < 0) {
              // Should never happen, but just in case
              throw new Error(`Calculated negative rented hashrate: ${newRented}`);
            }
  
            // 3) Recalculate available = total - newRented
            const newAvailable = row.total_hashrate_th - newRented;
  
            // 4) Update the hashrate table
            await pool.query(`
              UPDATE hashrate
              SET rented_hashrate_th = $1,
                  available_hashrate_th = $2
              WHERE id = $3
            `, [newRented, newAvailable, row.id]);
  
            // 5) Now mark the subscription itself as invalid
            await pool.query(
              `UPDATE subscriptions SET is_valid = false WHERE subscription_id = $1`,
              [subscription_id]
            );
  
            // 6) The rest of your final cost calculations
            const actualInterruptionMinutes = await getActualInterruptionMinutes(startDate, endDate);
  
            const daysActive = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const sanitizedDaysActive = daysActive > 0 ? daysActive : 0;
  
            const totalEnergyKwh = calculateConsumedEnergy(
              ASIC_POWER_CONSUMPTION_WATTS,
              TH_PER_ASIC,
              hashrate,
              sanitizedDaysActive,
              actualInterruptionMinutes
            );
  
            const hosting_costs = hostingFeePerKWH * totalEnergyKwh;
  
            const bitcoinRes = await pool.query(
              `SELECT COALESCE(SUM(bitcoin_allocated), 0) AS total_bitcoin 
               FROM subscription_blocks 
               WHERE subscription_id = $1`,
              [subscription_id]
            );
            const totalBitcoinAllocated = parseFloat(bitcoinRes.rows[0].total_bitcoin);
  
            const mining_pool_fee = calculateMiningPoolFee(totalBitcoinAllocated);
            const btcPriceUSD = await fetchBitcoinPriceUSD();
            const hostingFeesBtc = hosting_costs / btcPriceUSD;
            const profitBtc = totalBitcoinAllocated - hostingFeesBtc - mining_pool_fee;
  
            await pool.query(
              `UPDATE subscriptions 
               SET hosting_costs = $1, hosting_fees_btc = $2, mining_pool_fee = $3, profit_btc = $4, interruption_minutes = $5
               WHERE subscription_id = $6`,
              [
                hosting_costs.toFixed(2),
                hostingFeesBtc.toFixed(8),
                mining_pool_fee.toFixed(8),
                profitBtc.toFixed(8),
                actualInterruptionMinutes,
                subscription_id,
              ]
            );
  
            await pool.query(
              `INSERT INTO notifications (user_id, title, message, importance, icon)
               VALUES ($1, 'Subscription Expired', 'Your mining subscription has ended. Check your rewards!', 'normal', 'end_subscription')`,
              [user_id]
            );
  
            await pool.query(
              `INSERT INTO user_mined_bitcoins (user_id, total_mined_btc)
               VALUES ($1, $2)
               ON CONFLICT (user_id)
               DO UPDATE SET total_mined_btc = user_mined_bitcoins.total_mined_btc + EXCLUDED.total_mined_btc`,
              [user_id, totalBitcoinAllocated.toFixed(8)]
            );
  
            await pool.query(
              `INSERT INTO wallets (user_id, available_btc)
               VALUES ($1, $2)
               ON CONFLICT (user_id)
               DO UPDATE SET available_btc = wallets.available_btc + EXCLUDED.available_btc`,
              [user_id, profitBtc.toFixed(8)]
            );
  
            // 7) Commit if everything is good
            await pool.query('COMMIT');
  
            io.to(`user_${user_id}`).emit('subscriptionExpired', {
              subscriptionId: subscription_id,
              hostingCostsUSD: hosting_costs.toFixed(2),
              hostingFeesBTC: hostingFeesBtc.toFixed(8),
              miningPoolFee: mining_pool_fee.toFixed(8),
              profitBtc: profitBtc.toFixed(8),
            });
          } catch (error) {
            await pool.query('ROLLBACK');
            console.error(`Failed processing subscription ${subscription_id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Hourly subscription check failed:', error.message);
    }
  });
  
  /**
   * Task 2: Update Daily Operational Costs (Daily at Midnight)
   */
  cron.schedule('0 0 * * *', async () => {
    console.log('Daily operational cost update initiated.');
    const currentDate = new Date();

    const res = await pool.query(
      `SELECT subscription_id, hashrate, start_date, end_date 
       FROM subscriptions 
       WHERE is_valid = true`
    );

    const subscriptions = res.rows;

    for (const { subscription_id, hashrate, start_date, end_date } of subscriptions) {
      const interruptionMinutes = await getActualInterruptionMinutes(start_date, endDate);
      const dailyEnergy = calculateConsumedEnergy(ASIC_POWER_CONSUMPTION_WATTS, TH_PER_ASIC, hashrate, 1, interruptionMinutes);
      const dailyCost = hostingFeePerKWH * dailyEnergy;

      await pool.query(
        `UPDATE subscriptions SET hosting_costs = hosting_costs + $1 WHERE subscription_id = $2`,
        [dailyCost.toFixed(2), subscription_id]
      );
    }
  });

  console.log('Subscription monitoring tasks have been scheduled.');
};
