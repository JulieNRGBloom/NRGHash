// updateSubscriptions.js

import pool from '../config/db.js';
import cron from 'node-cron';

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const updateQuery = `
      UPDATE subscriptions
      SET is_valid = false
      WHERE end_date < $1 AND is_valid = true
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [formattedDate]);

    if (result.rows.length > 0) {
      console.log(`Updated ${result.rows.length} subscriptions to invalid.`);
    } else {
      console.log('No subscriptions to update.');
    }
  } catch (error) {
    console.error('Error updating subscriptions:', error.message);
  }
});

console.log('Subscription updater cron job started.');
