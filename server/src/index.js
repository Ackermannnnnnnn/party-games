import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import { logger } from './utils/logger.js';
import { registerSocketHandlers } from './sockets/index.js';
import { roomManager } from './core/RoomManager.js';
import { createAdminRouter } from './admin/router.js';
import { getPhoto } from './utils/photos.js';

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://partygrid.click';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: roomManager.size(), uptime: process.uptime() });
});

// Photos de profil des joueurs (adressées par empreinte : contenu immuable)
app.get('/photos/:hash', (req, res) => {
  const photo = getPhoto(req.params.hash);
  if (!photo) return res.status(404).end();
  res.set('Content-Type', photo.type);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(photo.buf);
});

// Routes admin (CRUD questions Quiz + paires Imposter)
app.use('/admin', createAdminRouter());

const httpServer = http.createServer(app);

const io = new IOServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6,
  // Reprise de connexion transparente après une courte coupure (événements rejoués)
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: true },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Socket connected');
  registerSocketHandlers(io, socket);
});

// Filet de sécurité : une erreur imprévue est journalisée, le serveur continue de tourner
process.on('uncaughtException', (err) => logger.error({ err: err?.stack || String(err) }, 'Uncaught exception'));
process.on('unhandledRejection', (err) => logger.error({ err: err?.stack || String(err) }, 'Unhandled rejection'));

// Cleanup périodique des rooms vides
setInterval(() => roomManager.cleanupEmpty(), 30_000);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server listening on :${PORT}`);
});
