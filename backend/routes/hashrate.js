// backend/routes/hashrate.js
import express from 'express';
import { getHashrateData } from '../controllers/hashrateController.js';

const router = express.Router();

// GET /api/hashrate
router.get('/', getHashrateData);

export default router;
