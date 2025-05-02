// routes/adminRoutes.js

import express from 'express';
import { processWithdrawalRequest } from '../controllers/adminController.js';
import verifyToken, { authorizeAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

// Only admins can process withdrawals
router.post('/withdrawals/:id/process', verifyToken, authorizeAdmin, processWithdrawalRequest);

export default router;
