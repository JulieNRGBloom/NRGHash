// routes/blocks.js

import express from 'express';
import { getUserBlocks, getAllBlocks } from '../controllers/blocksController.js';
import verifyToken from '../middleware/authenticateToken.js'; // Ensure this middleware sets req.user

const router = express.Router();

// @route   GET /api/blocks
// @desc    Get blocks attributed to the authenticated user's subscriptions
// @access  Private
router.get('/blocks', verifyToken, getUserBlocks);

// @route   GET /api/blocks/all-blocks
// @desc    Get all blocks in the database
// @access  Private
router.get('/all-blocks', verifyToken, getAllBlocks);

export default router;
