// index.js

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.js';
import miningRoutes from './routes/mining.js';
import subscriptionRoutes from './routes/subscriptions.js';
import blocksRoutes from './routes/blocks.js'; // Import the blocks route
import walletRoutes from './routes/wallets.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notifications.js'; // ✅ Import the notifications route
import interruptionsRoutes from './routes/interruptions.js';
import contactRoutes from './routes/contact.js';
import hashrateRoutes from './routes/hashrate.js';
import { setInterruptionSocketIO } from './controllers/interruptionController.js';
import { startPriceMonitoring, setSocketIO } from './services/priceMonitor.mjs';
import { startSubscriptionMonitoring, setSocketIO as setSubscriptionSocketIO } from './services/subscriptionMonitor.mjs'; // Import the subscription monitor
import { setNotificationSocketIO } from './controllers/notificationController.js';

dotenv.config();

const app = express();

// Middleware Configuration
app.use(express.json());
app.use(cors({
  origin: '*', // Replace '*' with your frontend's origin for security, e.g., 'http://localhost:3000'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ Ensure Authorization is included
  credentials: true,
}));

app.options('*', cors());


// index.js, after you do `dotenv.config()` and before your other routes:
app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.get('/', (_req, res) => {
  res.send('OK');
});

// API Route Setup
app.use('/api/users', usersRoutes);
app.use('/api', miningRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/blocks', blocksRoutes); 
app.use('/api/wallets', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ Add this line
app.use('/api/interruptions', interruptionsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/hashrate', hashrateRoutes);


// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Server and Socket.io Setup
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Replace '*' with your frontend's origin for security, e.g., 'http://localhost:3000'
    methods: ['GET', 'POST'],
  },
});

// Handle Socket.io Connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Listen for the client to join their user-specific room
  socket.on('joinRoom', async (data) => {
    const { userId } = data;
    if (userId) {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room ${roomName}`);
    } else {
      console.warn(`Socket ${socket.id} did not provide a userId to join a room.`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id);
  });
});

// Pass Socket.io instance to services
setSocketIO(io); 
setSubscriptionSocketIO(io); 
setInterruptionSocketIO(io); 
setNotificationSocketIO(io);



// Start Monitoring Services
startPriceMonitoring();
startSubscriptionMonitoring();

// Dynamically import other monitoring services if any
(async () => {
  try {
    const { startBlockMonitoring, setSocketIO: setBlockSocketIO } = await import('./services/blockMonitor.mjs');
    // Pass Socket.io instance to blockMonitor
    setBlockSocketIO(io);

    // Start block monitoring
    startBlockMonitoring();

    // Start additional price monitoring if needed
    // startAdditionalPriceMonitoring(); // Uncomment if needed

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error loading monitoring services:', error);
  }
})();

// Graceful Shutdown Handling
const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if not closed
  setTimeout(() => {
    console.error('Forced shutdown.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
