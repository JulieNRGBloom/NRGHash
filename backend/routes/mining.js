// routes/mining.js

import express from 'express';
import { getMiningData } from '../controllers/miningController.js';

const router = express.Router();

// Endpoint for fetching mining data
router.get('/mining-data', getMiningData);

export default router;
