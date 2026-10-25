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
import { liveState, liveImage } from './admin/liveAvatars.js';
import { liveSounds, soundFile } from './admin/sounds.js';

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://partygrid.click';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
// Les photos d'avatars (admin) ont leur propre limite de taille, voir admin/router.js
const jsonDefault = express.json();
app.use((req, res, next) => (req.path === '/admin/avatars/save' || req.path === '/admin/sounds/save' ? next() : jsonDefault(req, res, next)));

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

// Avatars enregistrés depuis l'admin, visibles tout de suite (avant la reconstruction du site)
app.get('/avatars/live', async (_req, res) => {
  try { res.set('Cache-Control', 'no-store'); res.json(await liveState()); } catch { res.json({ enabled: false, characters: [], images: {} }); }
});
app.get('/avatars/live/:id', async (req, res) => {
  try {
    const im = await liveImage(String(req.params.id).toLowerCase());
    if (!im) return res.status(404).end();
    res.set('Content-Type', im.type);
    res.set('Cache-Control', 'public, max-age=300');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(im.buf);
  } catch { res.status(502).end(); }
});

// Sons de moquerie de Prop Hunt (ajoutés depuis l'admin)
app.get('/sounds/live', async (_req, res) => {
  try { res.set('Cache-Control', 'no-store'); res.json({ sounds: await liveSounds() }); } catch { res.json({ sounds: [] }); }
});
app.get('/sounds/file/:id', async (req, res) => {
  try {
    const f = await soundFile(String(req.params.id).toLowerCase());
    if (!f) return res.status(404).end();
    res.set('Content-Type', f.type);
    res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=60');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(f.buf);
  } catch { res.status(502).end(); }
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
