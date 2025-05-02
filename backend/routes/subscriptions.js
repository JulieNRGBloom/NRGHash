// routes/subscriptions.js

import express from 'express';
import { 
  createSubscription, 
  getActiveSubscription, 
  getBitcoinAllocated, 
  updateHostingCosts,
  getInvalidSubscriptions,
  getMiningStats,
  getBlockReward
} from '../controllers/subscriptionsController.js';
import verifyToken from '../middleware/authenticateToken.js'; // Middleware to authenticate the user

const router = express.Router();

// Debugging Logs
console.log('createSubscription:', createSubscription);
console.log('getActiveSubscription:', getActiveSubscription);
console.log('getBitcoinAllocated:', getBitcoinAllocated);
console.log('updateHostingCosts:', updateHostingCosts);
console.log('getInvalidSubscriptions:', getInvalidSubscriptions); // Optional

// Existing Routes
router.post('/', verifyToken, createSubscription);
router.get('/active', verifyToken, getActiveSubscription);
router.get('/active/bitcoin-allocated', verifyToken, getBitcoinAllocated);
router.patch('/active/hosting_costs', verifyToken, updateHostingCosts);
router.get('/mining-stats', verifyToken, getMiningStats);
router.get('/active/bitcoin-allocated/block', verifyToken, getBlockReward);



// New Route: GET /api/subscriptions/invalid
router.get('/invalid', verifyToken, getInvalidSubscriptions);

export default router;
