/* ─── InkBoard Backend Server ─── */
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { initDatabase } from './db.js';
import { authRouter } from './routes/auth.js';
import { boardsRouter } from './routes/boards.js';
import { setupYjsWebSocket } from './yjs-ws.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// 1. Security & CORS middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// 2. Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many authentication attempts, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please slow down' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

// 3. API Routes
app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'inkboard-server' });
});

// 4. WebSocket Server for Yjs Realtime Collaboration
const wss = new WebSocketServer({ server });
setupYjsWebSocket(wss);

// 5. Bootstrap
async function start() {
  try {
    await initDatabase();
    console.log('[DB] SQLite database initialized successfully.');

    server.listen(PORT, () => {
      console.log(`🚀 [InkBoard Server] running on http://localhost:${PORT}`);
      console.log(`⚡ [InkBoard Collab WS] ready on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

start();
