// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';

// Cloudinary configuration is now properly set up
import { connectDB } from './config/database';
import { configurePassport } from './config/passport';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import { authenticateJWT } from './middleware/auth.middleware';
import { setupSocketIO } from './socket/socket';

const app = express();
const server = createServer(app);

app.set('trust proxy', 1);

// Socket.IO setup with production configuration
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://astonishing-sfogliatella-579b6f.netlify.app',
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL,
      // Parse CORS_ORIGINS environment variable (comma-separated)
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : [])
    ].filter(Boolean) as string[],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 5000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Connect to database
connectDB();

// Configure Passport
configurePassport();

// Rate limiting - more lenient for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased limit for production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting validation in production to avoid proxy warnings
  validate: {
    trustProxy: false, // Disable proxy validation warnings
    xForwardedForHeader: false, // Disable X-Forwarded-For warnings
  }
});

// Reasonable rate limiting for task operations
const taskLimiter = rateLimit({
  windowMs: 1000, // 1 second window
  max: 10, // Allow 10 requests per second
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  skip: (req) => {
    // Skip rate limiting for non-GET requests
    return req.method !== 'GET';
  }
});

// Specific rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds window
  max: 5, // Allow maximum 5 auth requests per 10 seconds per IP
  message: 'Too many authentication attempts, please wait 10 seconds',
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  skipSuccessfulRequests: true, // Don't count successful requests towards the limit
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(limiter);
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://192.168.46.1:5173',
      'http://192.168.192.1:5173',
      'http://192.168.205.66:5173',
      'https://astonishing-sfogliatella-579b6f.netlify.app',
      'https://task-flow-frontend-bice.vercel.app',
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL,
      // Parse CORS_ORIGINS environment variable (comma-separated)
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : [])
    ].filter(Boolean) as string[];
    
    // console.log(`🔍 Allowed origins: ${JSON.stringify(allowedOrigins)}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Socket.IO setup
setupSocketIO(io);

// Make io available in req object
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Add minimal request logging middleware (only for errors and important requests)
app.use((req, res, next) => {
  // Only log non-OPTIONS requests to reduce noise
  if (req.method !== 'OPTIONS' && !req.path.includes('/health')) {
    console.log(`🌐 ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Todo Task Management API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      tasks: '/api/tasks'
    }
  });
});
app.use('/api/auth', authLimiter, authRoutes);

// Apply rate limiting only to GET /api/tasks
app.use('/api/tasks', (req, res, next) => {
  if (req.method === 'GET') {
    taskLimiter(req, res, next);
  } else {
    next();
  }
}, authenticateJWT, taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(parseInt(PORT.toString()), HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
