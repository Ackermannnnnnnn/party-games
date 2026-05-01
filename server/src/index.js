import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import { logger } from './utils/logger.js';
import { registerSocketHandlers } from './sockets/index.js';
import { roomManager } from './core/RoomManager.js';

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: roomManager.size(), uptime: process.uptime() });
});

const httpServer = http.createServer(app);

const io = new IOServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Socket connected');
  registerSocketHandlers(io, socket);
});

// Cleanup périodique des rooms vides
setInterval(() => roomManager.cleanupEmpty(), 30_000);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server listening on :${PORT}`);
});
