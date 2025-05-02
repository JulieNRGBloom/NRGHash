// routes/wallets.js

import express from 'express';
import {
    getWallet,
    createWithdrawalRequest,
    listWithdrawalRequests,
    processWithdrawalRequest,
    rejectWithdrawalRequest,
    reviewWithdrawalRequest,
    deleteWithdrawalRequest,
    listUserWithdrawals
} from '../controllers/walletController.js';
import verifyToken from '../middleware/authenticateToken.js';
import { authorizeAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

// Get Wallet Information
router.get('/', verifyToken, getWallet);

// Create Withdrawal Request
router.post('/withdraw', verifyToken, createWithdrawalRequest);

// List Withdrawal Requests
router.get('/withdrawals', verifyToken, listWithdrawalRequests);

// Process a Withdrawal (Admin Only)
router.patch('/withdrawals/:id/process', verifyToken, authorizeAdmin, processWithdrawalRequest);

// Reject a Withdrawal (Admin Only)
router.patch('/withdrawals/:id/reject', verifyToken, authorizeAdmin, rejectWithdrawalRequest);

// Review a withdrawal (Admin only)
router.patch('/withdrawals/:id/reset', verifyToken, authorizeAdmin, reviewWithdrawalRequest);

// Define new route for user-specific withdrawals
router.get('/my-withdrawals', verifyToken, listUserWithdrawals);

// Delete a Withdrawal Request (Only if it's still pending)
router.delete('/withdrawals/:id', verifyToken, deleteWithdrawalRequest);



export default router;
