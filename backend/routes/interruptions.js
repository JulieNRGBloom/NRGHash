import express from 'express';
import { startInterruption, endInterruption, getInterruptions, getActiveInterruption } from '../controllers/interruptionController.js';
import verifyToken, { authorizeAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

// Start an interruption
router.post('/start', verifyToken, authorizeAdmin, startInterruption);

// End an interruption
router.patch('/end', verifyToken, authorizeAdmin, endInterruption);

// Fetch interruptions (Optional - could be useful for the frontend later)
router.get('/', verifyToken, authorizeAdmin, getInterruptions);

router.get('/active', verifyToken, getActiveInterruption);


export default router;
