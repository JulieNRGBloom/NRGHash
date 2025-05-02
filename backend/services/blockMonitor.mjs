// services/blockMonitor.mjs

import cron from 'node-cron';
import axios from 'axios';
import pool from '../config/db.js'; // Ensure .js extension
import winston from 'winston';
import PQueue from 'p-queue';
import axiosRetry from 'axios-retry';
import { poolFeesperTHPercentage } from '../utils/api.mjs';

let io; // To store Socket.io instance

// Function to set Socket.io instance
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'blockMonitor.log' })
  ],
});

// Configure axios to retry failed requests
axiosRetry(axios, {
  retries: 3, // Number of retry attempts
  retryDelay: (retryCount) => axiosRetry.exponentialDelay(retryCount),
  retryCondition: (error) => axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error),
});

// Initialize a queue with concurrency 1 (serialize requests) and a delay between requests
const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 }); // 1 request per second

// Define the pool fee percentage (e.g., 1%)
const pool_fee_percentage = poolFeesperTHPercentage;
// console.log(`Pool fee %: ${pool_fee_percentage}`);

// Function to fetch total Luxor pool hashrate
const fetchPoolHashrate = async () => {
  try {
    const response = await axios.post(
      'https://api.luxor.tech/graphql',
      {
        query: `query getPoolHashrate { getPoolHashrate(mpn: BTC, orgSlug: "luxor") }`,
        variables: { mpn: "BTC", orgSlug: "luxor" },
      },
      {
        headers: {
          'x-lux-api-key': process.env.LUXOR_API_KEY, // Ensure this is set in .env
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    if (data.errors) {
      logger.error(`Luxor API Error: ${JSON.stringify(data.errors)}`);
      return null;
    }

    const poolHashrateRaw = parseFloat(data.data.getPoolHashrate);
    const poolHashrate = poolHashrateRaw / 1e12;    logger.info(`Fetched Luxor Pool Hashrate: ${poolHashrate} TH/s`);
    return poolHashrate; // This is in TH/s
  } catch (error) {
    logger.error(`Error fetching Luxor pool hashrate: ${error.message}`);
    return null;
  }
};


// Function to fetch the latest block
const fetchLatestBlock = async () => {
  try {
    const response = await queue.add(() => axios.get(`https://blockchain.info/latestblock`));
    const latestBlock = response.data;

    return {
      hash: latestBlock.hash,
      height: latestBlock.height,
      time: new Date(latestBlock.time * 1000), // Convert UNIX timestamp to JS Date
    };
  } catch (error) {
    logger.error(`Error fetching latest block: ${error.message}`);
    return null;
  }
};

// Function to fetch detailed block information
// Function to fetch detailed block information and detect Luxor Pool from coinbase transaction
const fetchBlockDetails = async (blockHash) => {
  try {
    const response = await queue.add(() =>
      axios.get(`https://blockchain.info/rawblock/${blockHash}`)
    );
    const blockData = response.data;

    // Extract coinbase transaction (first transaction in the block)
    const coinbaseTx = blockData.tx[0]; // Coinbase is always the first transaction
    const coinbaseInput = coinbaseTx.inputs[0];

    const coinbaseHex = coinbaseInput.script; // Coinbase input scriptSig is here (hex-encoded)
    const coinbaseDecoded = Buffer.from(coinbaseHex, 'hex').toString('utf8');

    const coinbaseRewardSats = coinbaseTx.out.reduce((sum, output) => sum + output.value, 0);
    const bitcoin_mined = coinbaseRewardSats / 100000000; // Convert satoshis to BTC

    logger.info(`CoinbaseDecoded: ${coinbaseDecoded}`);

    logger.info(`Mined bitcoins: ${bitcoin_mined}`);

    // Check for Luxor identifier in coinbase message
    const isLuxorBlock =
      coinbaseDecoded.toLowerCase().includes('luxor') ||
      coinbaseDecoded.toLowerCase().includes('powered by luxor');
    

    return {
      hash: blockData.hash,
      height: blockData.height,
      time: new Date(blockData.time * 1000),
      bitcoin_mined,
      size: blockData.size,
      difficulty: blockData.difficulty,
      isLuxorBlock,
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 429) {
        logger.error(`Rate limit exceeded while fetching block ${blockHash}.`);
      } else if (error.response.status === 404) {
        logger.error(`Block ${blockHash} not found.`);
      } else {
        logger.error(
          `Error fetching block ${blockHash}: ${error.response.status} - ${error.response.data}`
        );
      }
    } else if (error.request) {
      logger.error(
        `No response received while fetching block ${blockHash}: ${error.message}`
      );
    } else {
      logger.error(
        `Error in request setup for block ${blockHash}: ${error.message}`
      );
    }
    return null;
  }
};


// Function to get the last processed block hash from the metadata table
const getLastProcessedBlockHash = async (client) => {
  try {
    const res = await client.query('SELECT value FROM metadata WHERE key = $1', ['last_block_hash']);
    if (res.rows.length > 0) {
      return res.rows[0].value;
    }
    return null;
  } catch (error) {
    logger.error(`Error fetching last_block_hash from metadata: ${error.message}`);
    return null;
  }
};

// Function to set the last processed block hash in the metadata table
const setLastProcessedBlockHash = async (client, blockHash) => {
  try {
    const upsertQuery = `
      INSERT INTO metadata (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = $2
    `;
    await client.query(upsertQuery, ['last_block_hash', blockHash]);
    logger.info(`Set last_block_hash to ${blockHash}`);
  } catch (error) {
    logger.error(`Error setting last_block_hash in metadata: ${error.message}`);
  }
};

// Function to check and process new blocks
export const checkForNewBlocks = async () => {
  const latestBlock = await fetchLatestBlock();

  if (!latestBlock) {
    logger.error('Failed to fetch the latest block.');
    return;
  }

  try {
    const client = await pool.connect();

    try {
      const lastBlockHash = await getLastProcessedBlockHash(client);

      if (latestBlock.hash === lastBlockHash) {
        return; // No new block
      }

      const blockDetails = await fetchBlockDetails(latestBlock.hash);
      if (!blockDetails) {
        logger.error(`Failed to fetch detailed data for block ${latestBlock.hash}`);
        return;
      }
      
      if (!blockDetails.isLuxorBlock) {
        logger.info(`Block ${blockDetails.hash} was NOT mined by Luxor. Skipping.`);
        await setLastProcessedBlockHash(client, blockDetails.hash);
        return;
      }
      

      // ✅ Insert the block regardless of interruption status
      const insertBlockQuery = `
        INSERT INTO blocks (height, block_hash, timestamp, bitcoin_mined, size, difficulty)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (height) DO NOTHING
        RETURNING block_id
      `;

      const insertBlockResult = await client.query(insertBlockQuery, [
        blockDetails.height,
        blockDetails.hash,
        blockDetails.time,
        blockDetails.bitcoin_mined,
        blockDetails.size,
        blockDetails.difficulty,
      ]);

      if (insertBlockResult.rows.length === 0) {
        logger.warn(`Block ${blockDetails.hash} already exists. Skipping.`);
        await setLastProcessedBlockHash(client, blockDetails.hash);
        return;
      }

      const newBlockId = insertBlockResult.rows[0].block_id;

      // 🟢 Check for active interruptions during the block timestamp
      const interruptionQuery = `
        SELECT *
        FROM interruptions
        WHERE start_time <= $1
          AND (end_time IS NULL OR end_time >= $1)
      `;

      const interruptionResult = await client.query(interruptionQuery, [blockDetails.time]);
      const isInterrupted = interruptionResult.rows.length > 0;

      if (isInterrupted) {
        logger.warn(`⚠️ Block ${blockDetails.hash} falls within an active interruption. Skipping BTC allocation.`);
        await setLastProcessedBlockHash(client, blockDetails.hash);

        // ✅ Emit block event (0 BTC allocated, 0 pool fees)
        if (io) {
          io.emit('newBlock', {
            blockId: newBlockId,
            height: blockDetails.height,
            blockHash: blockDetails.hash,
            timestamp: blockDetails.time,
            bitcoinMined: blockDetails.bitcoin_mined,
            bitcoinAllocated: 0,
            poolFees: 0,
            size: blockDetails.size,
            difficulty: blockDetails.difficulty,
          });
        }

        logger.info(`Block ${blockDetails.hash} recorded without allocation due to interruption.`);
        return; // Exit early
      }

      const poolHashrate = await fetchPoolHashrate(); // Fetch pool hashrate from Luxor

      if (!poolHashrate) {
        logger.warn(`Skipping allocation: Could not fetch Luxor pool hashrate.`);
        return;
      }
      
      const getTotalUserHashrateQuery = `
        SELECT SUM(hashrate) AS total_hashrate
        FROM subscriptions
        WHERE is_valid = TRUE
          AND start_date <= $1
          AND end_date >= $1
      `;
      
      const totalUserHashrateResult = await client.query(getTotalUserHashrateQuery, [blockDetails.time]);
      const totalUserHashrate = parseFloat(totalUserHashrateResult.rows[0].total_hashrate) || 0;
      

      let totalAllocated = 0;
      let poolFees = 0;

      if (totalUserHashrate === 0) {
        logger.warn(`Total hashrate is zero during block ${blockDetails.hash}. No allocations made.`);
      } else {
        const allocateBitcoinsQuery = `
          INSERT INTO subscription_blocks (subscription_id, block_id, height, bitcoin_allocated)
          SELECT 
            subscription_id, 
            $1, 
            $2, 
            ($3 * (hashrate / $4)) AS bitcoin_allocated
          FROM subscriptions
          WHERE is_valid = TRUE
            AND start_date <= $5
            AND end_date >= $5
          RETURNING subscription_id, bitcoin_allocated;
        `;

        const allocateResult = await client.query(allocateBitcoinsQuery, [
          newBlockId,
          blockDetails.height,
          blockDetails.bitcoin_mined,
          poolHashrate,  // <-- ✅ Replace `$4` with fetched pool hashrate
          blockDetails.time,
        ]);


        logger.info(`Allocated BTC to ${allocateResult.rowCount} subscriptions for block ${blockDetails.hash}`);

        // Notifications for each subscription that received BTC
        for (const allocation of allocateResult.rows) {
          const { subscription_id, bitcoin_allocated } = allocation;
          totalAllocated += bitcoin_allocated;

          const userQuery = `SELECT user_id, hashrate FROM subscriptions WHERE subscription_id = $1;`;
          const userResult = await client.query(userQuery, [subscription_id]);

          if (userResult.rows.length > 0) {
            const { user_id, hashrate } = userResult.rows[0];

            await client.query(
              `INSERT INTO notifications (user_id, title, message, importance, icon)
               VALUES ($1, $2, $3, $4, $5);`,
              [
                user_id,
                'New Block Mined!',
                `Your ${hashrate} TH/s contributed to Block #${blockDetails.height}. You earned ${bitcoin_allocated.toFixed(8)} BTC.`,
                'normal',
                'block',
              ]
            );
          }
        }

        // Calculate pool fees
        poolFees = (pool_fee_percentage / 100) * totalAllocated * 100000000; // Convert BTC to Satoshis
      }

      // ✅ Emit block event with allocation and fees
      if (io) {
        io.emit('newBlock', {
          blockId: newBlockId,
          height: blockDetails.height,
          blockHash: blockDetails.hash,
          timestamp: blockDetails.time,
          bitcoinMined: blockDetails.bitcoin_mined,
          bitcoinAllocated: totalAllocated,
          poolFees: poolFees,
          size: blockDetails.size,
          difficulty: blockDetails.difficulty,
        });
      }

      // ✅ Set last processed block hash
      await setLastProcessedBlockHash(client, blockDetails.hash);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Database error during block processing: ${error.message}`);
  }
};


// Function to start the block monitoring service
export const startBlockMonitoring = () => {
  // Schedule the task to run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    logger.info('Running block monitoring task');
    checkForNewBlocks();
  });

  logger.info('Block monitoring service started. Checking for new blocks every 5 minutes.');
};