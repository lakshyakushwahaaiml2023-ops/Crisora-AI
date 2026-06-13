import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRouter from './routes/auth.js';
import regionsRouter from './routes/regions.js';
import { setIO } from './services/riskEngine.js';
import adminRouter from './routes/admin.js';
import { startAllJobs } from './jobs/ingestCron.js';
import { seedDemoUsers } from './jobs/seedDemoUsers.js';
import { seedHistoricalDisasters } from './jobs/seedHistoricalDisasters.js';
import sosRouter from './routes/sos.js';
import aiRouter from './routes/ai.js';
import simulationRouter from './routes/simulation.js';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import verifyToken from './middleware/auth.js';
import DisasterEvent from './models/DisasterEvent.js';
import Region from './models/Region.js';







// Load environment variables
dotenv.config({ override: true });

const app = express();
const server = http.createServer(app);

// Initialize Socket.io on the HTTP server with CORS support
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Bind Socket.io instance to the Risk Engine
setIO(io);

// Expose io instance to Express request context
app.set('io', io);



// Log Socket.io connections and disconnections
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`Socket client disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// Apply global middlewares
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiter: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

// Login brute-force rate limiter: 5 requests per minute
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 1 minute.',
  },
});

// Apply rate limiters
app.use(globalLimiter);
app.use('/api/auth/login', loginLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/sos', sosRouter);
app.use('/api/ai', aiRouter);
app.use('/api/simulation', simulationRouter);

// GET /api/events — List active disaster events scoped by user district/state
app.get('/api/events', verifyToken, async (req, res) => {
  try {
    const filter = { status: { $ne: 'resolved' } };

    if (req.user.role === 'citizen' || req.user.role === 'collector' || req.user.role === 'district_authority') {
      const userRegions = await Region.find({ district: { $regex: new RegExp(req.user.district, 'i') } }).select('_id');
      const regionIds = userRegions.map(r => r._id);
      filter.regionId = { $in: regionIds };
    } else if (req.user.role === 'state_authority') {
      const userRegions = await Region.find({ state: { $regex: new RegExp(req.user.state, 'i') } }).select('_id');
      const regionIds = userRegions.map(r => r._id);
      filter.regionId = { $in: regionIds };
    } else if (req.user.role === 'ndma') {
      if (req.query.district) {
        const userRegions = await Region.find({ district: { $regex: new RegExp(req.query.district, 'i') } }).select('_id');
        filter.regionId = { $in: userRegions.map(r => r._id) };
      } else if (req.query.state) {
        const userRegions = await Region.find({ state: { $regex: new RegExp(req.query.state, 'i') } }).select('_id');
        filter.regionId = { $in: userRegions.map(r => r._id) };
      }
    }

    const events = await DisasterEvent.find(filter).populate('regionId');
    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});





// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));

  app.get('*splat', (req, res) => {
    res.sendFile(path.resolve(frontendDistPath, 'index.html'));
  });
}

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server after successful MongoDB connection

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedDemoUsers();
  await seedHistoricalDisasters();
  // Start periodic cron jobs
  startAllJobs();
  server.listen(PORT, () => {
    console.log(`Server is running and listening on port ${PORT}`);
  });
};

startServer();

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Close Socket.io server
  io.close(() => {
    console.log('Socket.io server closed.');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Close MongoDB connection
      mongoose.connection.close()
        .then(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        });
    });
  });

  // Force close after 10 seconds if connections hang
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export the io instance
export { io };
