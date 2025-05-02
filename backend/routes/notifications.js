// routes/notifications.js

import express from 'express';
import { getUserNotifications, createNotification, markNotificationsAsRead } from '../controllers/notificationController.js';
import verifyToken from '../middleware/authenticateToken.js';
import { authorizeAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

// Get notifications for the logged-in user
router.get('/', verifyToken, getUserNotifications);

// Create a new notification (admin-only)
router.post('/create', verifyToken, authorizeAdmin, createNotification);

router.patch('/mark-as-read', verifyToken, markNotificationsAsRead);


export default router;
