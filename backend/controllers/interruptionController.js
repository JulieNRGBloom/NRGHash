import pool from '../config/db.js';
let io;

export const setInterruptionSocketIO = (socketIO) => {
  io = socketIO;
};


/**
 * Start an interruption
 */
export const startInterruption = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const interruptionResult = await client.query(
            `INSERT INTO interruptions (start_time) VALUES ($1) RETURNING *`,
            [new Date()]
        );

        const interruption = interruptionResult.rows[0];

        const notificationResult = await client.query(
            `INSERT INTO notifications (title, message, importance, created_at, icon)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
                'Hashrate Interruption Started',
                `Hashrate interruption started at ${interruption.start_time.toISOString()}`,
                'important',
                new Date(),
                'start_interruption',
            ]
        );

        await client.query('COMMIT');
        
        console.log('Emitting interruptionStarted event:', interruption);
        io.emit('interruptionStarted', interruption);
        
        // ✅ Emit Socket.io Event
        if (io) {
            io.emit('interruptionStarted', interruption);
        }

        res.status(201).json({
            success: true,
            interruption,
            notification: notificationResult.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error starting interruption:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
        client.release();
    }
};


export const endInterruption = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const endTime = new Date();
        const interruptionResult = await client.query(
            `UPDATE interruptions 
             SET end_time = $1 
             WHERE end_time IS NULL
             RETURNING *`,
            [endTime]
        );

        if (interruptionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'No active interruption to end.' });
        }

        const interruption = interruptionResult.rows[0];
        const startTime = new Date(interruption.start_time);
        const durationMinutes = Math.floor((endTime - startTime) / 60000);

        const affectedSubscriptionsResult = await client.query(
            `SELECT subscription_id FROM subscriptions
             WHERE start_date <= $2 AND end_date >= $1`,
            [startTime, endTime]
        );

        const affectedSubscriptions = affectedSubscriptionsResult.rows;

        for (const { subscription_id } of affectedSubscriptions) {
            await client.query(
                `UPDATE subscriptions
                 SET interruption_minutes = interruption_minutes + $1
                 WHERE subscription_id = $2`,
                [durationMinutes, subscription_id]
            );
        }

        if (affectedSubscriptions.length > 0) {
            const subscriptionIds = affectedSubscriptions.map(s => s.subscription_id);

            await client.query(
                `INSERT INTO notifications (user_id, title, message, importance, icon, created_at)
                 SELECT user_id, $1, $2, 'important', 'end_interruption', NOW()
                 FROM subscriptions WHERE subscription_id = ANY($3::int[])`,
                [
                    'End of Hashrate Interruption',
                    `Your hashrate is back online. Interruption lasted ${durationMinutes} minutes.`,
                    subscriptionIds,
                ]
            );
        }

        await client.query('COMMIT');

        // ✅ Emit Socket.io Event
        if (io) {
            io.emit('interruptionEnded');
        }

        res.status(200).json({ success: true, interruption });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error ending interruption:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
        client.release();
    }
};


export const getInterruptions = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM interruptions ORDER BY start_time DESC`);
        res.status(200).json({ success: true, interruptions: result.rows });
    } catch (error) {
        console.error('Error fetching interruptions:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


export const getActiveInterruption = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM interruptions WHERE end_time IS NULL LIMIT 1`
        );

        if (result.rows.length > 0) {
            res.status(200).json({ active: true, interruption: result.rows[0] });
        } else {
            res.status(200).json({ active: false });
        }
    } catch (error) {
        console.error('Error fetching active interruption:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
