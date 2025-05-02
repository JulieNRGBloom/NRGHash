// controllers/miningController.js

import axios from 'axios';

/**
 * Handler for fetching mining data.
 * Endpoint: GET /mining-data?hashrate=<value>
 */
export const getMiningData = async (req, res) => {
  try {
    const { hashrate } = req.query; // Get hashrate from query parameters

    if (!hashrate || isNaN(hashrate) || hashrate <= 0) {
      return res.status(400).json({ message: 'Invalid or missing hashrate parameter' });
    }

    // Fetch coin data from Minerstat API
    const response = await axios.get('https://api.minerstat.com/v2/coins?list=BTC');
    const coinData = response.data.find((coin) => coin.coin === 'BTC');

    if (!coinData) {
      return res.status(404).json({ message: 'Bitcoin data not found' });
    }

    const { difficulty, reward_block, price } = coinData;

    // Constants
    const SECONDS_PER_DAY = 86400;
    const TWO_POW_32 = Math.pow(2, 32);

    res.json({
      price
    });
  } catch (error) {
    console.error('Error fetching mining data:', error.message);
    res.status(500).json({ message: 'Error fetching mining data' });
  }
};
