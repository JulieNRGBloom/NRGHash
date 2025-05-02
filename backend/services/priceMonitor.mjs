// services/priceMonitor.mjs

import axios from 'axios';

let ioInstance = null;

/**
 * Sets the Socket.io instance to be used for emitting events.
 * @param {Socket} io - The Socket.io server instance.
 */
export const setSocketIO = (io) => {
  ioInstance = io;
};

/**
 * Starts monitoring the Bitcoin prices (USD and NGN) and emits updates via Socket.io.
 * Fetches the prices every 120 seconds.
 */
export const startPriceMonitoring = () => {
  if (!ioInstance) {
    console.error('Socket.io instance not set for price monitoring.');
    return;
  }

  /**
   * Fetches the current Bitcoin prices from Binance API and emits them.
   */
  const fetchPricesAndEmit = async () => {
    try {
      // Fetch BTCUSDT price (USD)
      const responseUSD = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const { price: priceUSD, symbol: symbolUSD } = responseUSD.data;

      // Fetch BTCNGN price (NGN)
      const responseNGN = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCNGN');
      const { price: priceNGN, symbol: symbolNGN } = responseNGN.data;

      // Validate symbols
      if (symbolUSD !== 'BTCUSDT') {
        console.error(`Unexpected symbol received for USD: ${symbolUSD}`);
      }

      if (symbolNGN !== 'BTCNGN') {
        console.error(`Unexpected symbol received for NGN: ${symbolNGN}`);
      }

      // Emit both prices
      ioInstance.emit('bitcoinPriceUpdate', { priceUSD, priceNGN });
      console.log(`Emitted Bitcoin Prices: USD - $${priceUSD}, NGN - ₦${priceNGN}`);
    } catch (error) {
      console.error('Error fetching Bitcoin prices:', error.message);
    }
  };

  // Fetch immediately on start
  fetchPricesAndEmit();

  // Set interval to fetch prices periodically (every 120 seconds)
  const intervalId = setInterval(fetchPricesAndEmit, 120000); // 120,000 ms = 120 seconds

  // Optional: Listen for server shutdown to clear the interval
  const shutdown = () => {
    clearInterval(intervalId);
    console.log('Stopped Bitcoin price monitoring.');
  };

  // Export the shutdown function if needed elsewhere
  return shutdown;
};