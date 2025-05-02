// controllers/notificationController.js

import pool from '../config/db.js';

let ioInstance; 

export const setNotificationSocketIO = (io) => {
    ioInstance = io;
  };

/**
 * Fetch notifications for the logged-in user (including global ones)
 */
export const getUserNotifications = async (req, res) => {
    const userId = req.user.user_id;
    
    try {
        const notifications = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 OR user_id IS NULL 
             ORDER BY created_at DESC`,
            [userId]
        );

        res.status(200).json({ success: true, notifications: notifications.rows });
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Create a new notification (Admin Only)
 */
export const createNotification = async (req, res) => {
    const { user_id, title, message, importance } = req.body;

    try {
        if (!message || !title || !importance || !['normal', 'important'].includes(importance)) {
            return res.status(400).json({ success: false, message: 'Invalid input data.' });
        }

        const insertRes = await pool.query(
            `INSERT INTO notifications (user_id, title, message, importance, icon, created_at) 
             VALUES ($1, $2, $3, $4, 'default', NOW()) 
             RETURNING *`,
            [user_id || null, title, message, importance]
        );

        const newNotification = insertRes.rows[0];

        // Emit notification event to a specific user room
        if (user_id) {
        ioInstance.to(`user_${user_id}`).emit('newNotification', newNotification);
        } else {
        ioInstance.emit('newNotification', newNotification); // Global notifications
        }

        res.status(201).json({ success: true, notification: insertRes.rows[0] });
    } catch (error) {
        console.error('Error creating notification:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = async (req, res) => {
    const { notificationIds } = req.body;
    const userId = req.user.user_id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid notification IDs.' });
    }

    try {
        await pool.query(
            `UPDATE notifications 
             SET is_read = true 
             WHERE id = ANY($1) AND (user_id = $2 OR user_id IS NULL)`,
            [notificationIds, userId]
        );

        res.status(200).json({ success: true, message: 'Notifications marked as read.' });
    } catch (error) {
        console.error('Error marking notifications as read:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

