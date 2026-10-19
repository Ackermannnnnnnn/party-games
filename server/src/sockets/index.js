import { roomManager } from '../core/RoomManager.js';
import { Player } from '../core/Player.js';
import { schemas, validate } from '../utils/schemas.js';
import { getGameClass, listGames } from '../games/registry.js';
import { logger } from '../utils/logger.js';
import { storePhoto } from '../utils/photos.js';

/** Temps laissé à un joueur déconnecté pour revenir (écran verrouillé, réseau qui saute…). */
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS) || 2 * 60_000;
/** Si l'hôte reste déconnecté aussi longtemps, quelqu'un d'autre devient hôte. */
const HOST_HANDOVER_MS = Number(process.env.HOST_HANDOVER_MS) || 45_000;

/**
 * Inscrit tous les handlers sur un socket nouvellement connecté.
 *
 * Chaque socket porte une référence au playerId/roomCode pour les opérations rapides.
 *   socket.data = { playerId, roomCode }
 *
 * Tous les handlers passent par `on()` : une erreur dans un jeu est journalisée
 * et signalée au joueur, mais ne fait jamais tomber le serveur.
 */
export function registerSocketHandlers(io, socket) {
  roomManager.attachIo(io);

  const on = (event, handler) => {
    socket.on(event, (...args) => {
      try {
        handler(...args);
      } catch (e) {
        logger.error({ event, socketId: socket.id, err: e?.stack || String(e) }, 'Socket handler error');
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Oups, petit souci technique… la partie continue.' });
        // On renvoie l'état à jour pour que l'écran ne reste pas figé
        try {
          const { room, player } = _getContext(socket);
          if (room && player) { room.emitRoomState(); room.emitGameStateTo(player.id); }
        } catch {}
      }
    });
  };

  /** Avatar choisi : une photo envoyée (stockée) ou un avatar de la liste. */
  const resolveAvatar = (parsed, fallback = null) => {
    if (parsed.photo) {
      const id = storePhoto(parsed.photo);
      if (id) return id;
      socket.emit('error', { code: 'BAD_PHOTO', message: 'Photo refusée (format ou taille). Essaie une autre image.' });
    }
    if (parsed.avatar && parsed.avatar !== 'photo:local') return parsed.avatar;
    return fallback;
  };

  // ───────── ROOMS ─────────
  on('room:create', (data) => {
    const parsed = validate(socket, schemas.roomCreate, data);
    if (!parsed) return;
    _leaveCurrentRoom(socket);
    try {
      const room = roomManager.createRoom();
      const player = new Player({ pseudo: parsed.pseudo, avatar: resolveAvatar(parsed), socketId: socket.id });
      room.addPlayer(player);
      _attachSocketToRoom(socket, room, player);
      socket.emit('room:joined', { code: room.code, playerId: player.id });
      room.emitRoomState();
    } catch (e) {
      socket.emit('error', { code: e.message });
    }
  });

  on('room:join', (data) => {
    const parsed = validate(socket, schemas.roomJoin, data);
    if (!parsed) return;
    const room = roomManager.get(parsed.code.toUpperCase());
    if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: "Cette room n'existe pas (ou plus)." });
    _joinRoom(socket, room, parsed, resolveAvatar(parsed));
  });

  on('room:rejoin', (data) => {
    const parsed = validate(socket, schemas.roomRejoin, data);
    if (!parsed) return;
    const room = roomManager.get(parsed.code.toUpperCase());
    if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND' });
    const player = room.players.get(parsed.playerId);
    if (!player) {
      // Session expirée mais la room existe toujours : on revient avec le même pseudo
      if (parsed.pseudo) return _joinRoom(socket, room, parsed, resolveAvatar(parsed));
      return socket.emit('error', { code: 'PLAYER_NOT_FOUND' });
    }
    // Un ancien onglet resté ouvert pour ce joueur ? Il est détaché.
    if (player.socketId && player.socketId !== socket.id) {
      const old = io.sockets.sockets.get(player.socketId);
      if (old) { old.leave(room.code); old.data.roomCode = null; old.data.playerId = null; }
    }
    player.socketId = socket.id;
    player.connected = true;
    const avatar = resolveAvatar(parsed);
    if (avatar) player.avatar = avatar;
    _attachSocketToRoom(socket, room, player);
    socket.emit('room:joined', { code: room.code, playerId: player.id, reconnected: true });
    // L'hôte était parti trop longtemps et la room est restée sans hôte valide
    if (!room.players.has(room.hostId)) room.transferHost();
    room.emitRoomState();
    room.emitGameStateTo(player.id);
    if (room.gameInstance?.onPlayerReconnected) room.gameInstance.onPlayerReconnected(player.id);
    logger.info({ room: room.code, pseudo: player.pseudo }, 'Player rejoined');
  });

  on('room:leave', () => _leaveRoom(socket));

  // Change l'avatar (photo ou avatar de la liste), même en cours de partie
  on('player:setAvatar', (data) => {
    const parsed = validate(socket, schemas.setAvatar, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    const avatar = resolveAvatar(parsed);
    if (!avatar) return;
    player.avatar = avatar;
    room.emitRoomState();
    if (room.gameInstance) room.emitGameState(); // les jeux recopient parfois l'avatar dans leur état
  });

  // ───────── CHAT ─────────
  on('chat:send', (data) => {
    const parsed = validate(socket, schemas.chatSend, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });

    // Le jeu peut décider de mute un joueur (Loup-Garou : la nuit, ou si mort)
    if (room.gameInstance?.isMuted?.(player.id)) {
      return socket.emit('error', { code: 'MUTED', message: 'Tu ne peux pas parler maintenant.' });
    }

    const msg = {
      from: player.id,
      pseudo: player.pseudo,
      text: parsed.text,
      ts: Date.now(),
    };
    room.addChat(msg);
    room.broadcast('chat:message', msg);
  });

  // ───────── GAME ─────────
  on('game:list', () => socket.emit('game:list', listGames()));

  // Horloge du serveur : sert à lancer les extraits audio au même moment sur tous les appareils
  on('time:sync', (_data, ack) => { if (typeof ack === 'function') ack(Date.now()); });

  on('room:setGame', (data) => {
    const parsed = validate(socket, schemas.setGame, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (player.id !== room.hostId) return socket.emit('error', { code: 'NOT_HOST' });
    if (!getGameClass(parsed.gameId)) return socket.emit('error', { code: 'UNKNOWN_GAME' });
    if (room.gameInstance) return socket.emit('error', { code: 'GAME_IN_PROGRESS' });
    room.selectedGameId = parsed.gameId;
    room.emitRoomState();
  });

  // Synchronisation temps réel des options du jeu sélectionné (lobby uniquement)
  on('room:setOptions', (data) => {
    const parsed = validate(socket, schemas.setOptions, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (player.id !== room.hostId) return socket.emit('error', { code: 'NOT_HOST' });
    if (room.gameInstance) return socket.emit('error', { code: 'GAME_IN_PROGRESS' });
    room.gameOptions[parsed.gameId] = parsed.options;
    room.emitRoomState();
  });

  on('game:options', ({ gameId } = {}) => {
    const GameClass = getGameClass(gameId);
    if (!GameClass || typeof GameClass.getOptionsManifest !== 'function') {
      return socket.emit('game:options', { gameId, manifest: null });
    }
    socket.emit('game:options', { gameId, manifest: GameClass.getOptionsManifest() });
  });

  on('game:start', (data) => {
    const parsed = validate(socket, schemas.gameStart, data || {});
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (player.id !== room.hostId) return socket.emit('error', { code: 'NOT_HOST' });
    if (room.gameInstance) return socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Une partie est déjà en cours.' });

    const gameId = parsed.gameId || 'imposter';
    const GameClass = getGameClass(gameId);
    if (!GameClass) return socket.emit('error', { code: 'UNKNOWN_GAME' });
    const connectedCount = [...room.players.values()].filter((p) => p.connected).length;
    if (connectedCount < GameClass.minPlayers) {
      return socket.emit('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Minimum ${GameClass.minPlayers} joueurs connectés.` });
    }
    room.startGame(GameClass, parsed.options);
  });

  on('game:action', (data) => {
    const parsed = validate(socket, schemas.gameAction, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (!room.gameInstance) return socket.emit('error', { code: 'NO_GAME' });
    try {
      room.gameInstance.handleAction(player.id, parsed.type, parsed.payload);
    } catch (e) {
      logger.error({ room: room.code, game: room.gameId, type: parsed.type, err: e?.stack || String(e) }, 'Game action error');
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Action impossible pour le moment, réessaie.' });
      room.emitGameState();
    }
  });

  // Le client demande l'état à jour (retour au premier plan, écran figé…)
  on('room:sync', () => {
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    socket.emit('room:state', room.toPublicState());
    if (room.gameInstance) room.emitGameStateTo(player.id);
    else socket.emit('game:end', { sync: true });
  });

  // ───────── DISCONNECT ─────────
  on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    const { room, player } = _getContext(socket);
    if (!player || player.socketId !== socket.id) return; // déjà repris par un autre onglet
    player.connected = false;
    const since = Date.now();
    player.disconnectedAt = since;
    room.emitRoomState(); // immédiat : montre "déconnecté"

    // L'hôte ne revient pas vite : on passe la main pour que la partie ne bloque pas
    setTimeout(() => {
      if (!player.connected && player.disconnectedAt === since && room.hostId === player.id && room.players.get(player.id) === player) {
        if ([...room.players.values()].some((p) => p.connected)) room.transferHost(player.id);
      }
    }, HOST_HANDOVER_MS);

    // Après le délai de grâce, le joueur quitte vraiment la room
    setTimeout(() => {
      if (!player.connected && player.disconnectedAt === since && room.players.get(player.id) === player) {
        _removePlayer(room, player.id);
      }
    }, RECONNECT_GRACE_MS);
  });
}

// ───────── Helpers ─────────
function _attachSocketToRoom(socket, room, player) {
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  socket.join(room.code);
}

function _getContext(socket) {
  const room = socket.data.roomCode ? roomManager.get(socket.data.roomCode) : null;
  const player = room && socket.data.playerId ? room.players.get(socket.data.playerId) : null;
  return { room, player };
}

/** Rejoint une room : reprise de la place d'un déconnecté du même pseudo, ou nouveau joueur. */
function _joinRoom(socket, room, parsed, avatar) {
  _leaveCurrentRoom(socket, room.code);
  // 1) Quelqu'un de DÉCONNECTÉ avait ce pseudo -> on reprend sa place
  const existing = room.findDisconnectedByPseudo(parsed.pseudo);
  if (existing) {
    existing.socketId = socket.id;
    existing.connected = true;
    existing.disconnectedAt = null;
    if (avatar) existing.avatar = avatar;
    _attachSocketToRoom(socket, room, existing);
    socket.emit('room:joined', { code: room.code, playerId: existing.id, reconnected: true });
    if (!room.players.has(room.hostId)) room.transferHost();
    room.emitRoomState();
    room.emitGameStateTo(existing.id);
    logger.info({ room: room.code, pseudo: existing.pseudo }, 'Player reconnected by pseudo');
    return;
  }
  // 2) Pseudo déjà pris par quelqu'un de connecté -> refus
  if (room.isPseudoTaken(parsed.pseudo)) {
    return socket.emit('error', { code: 'PSEUDO_TAKEN', message: 'Ce pseudo est déjà pris dans la room.' });
  }
  // 3) Nouveau joueur (même en pleine partie : il joue tout de suite ou à la prochaine manche, selon le jeu)
  try {
    const player = new Player({ pseudo: parsed.pseudo, avatar, socketId: socket.id });
    room.addPlayer(player);
    _attachSocketToRoom(socket, room, player);
    socket.emit('room:joined', { code: room.code, playerId: player.id, midGame: !!room.gameInstance });
    room.emitRoomState();
    if (room.gameInstance) room.emitGameState();
  } catch (e) {
    socket.emit('error', { code: e.message, message: e.message === 'ROOM_FULL' ? 'La room est pleine.' : undefined });
  }
}

/** Si ce socket était déjà dans une autre room, il la quitte proprement. */
function _leaveCurrentRoom(socket, exceptCode = null) {
  if (socket.data.roomCode && socket.data.roomCode !== exceptCode) _leaveRoom(socket);
}

function _leaveRoom(socket) {
  const { room, player } = _getContext(socket);
  socket.data.roomCode = null;
  socket.data.playerId = null;
  if (!room) return;
  socket.leave(room.code);
  if (player) _removePlayer(room, player.id);
}

/** Retire définitivement un joueur : l'hôte passe la main, le jeu continue sans lui. */
function _removePlayer(room, playerId) {
  const wasHost = room.removePlayer(playerId);
  if (room.players.size === 0) {
    try { room.gameInstance?.cleanup?.(); } catch {}
    room.gameInstance = null;
    room.gameId = null;
    return;
  }
  if (wasHost) room.transferHost(playerId);
  _notifyPlayerLeft(room, playerId);
}

/**
 * Un joueur a quitté définitivement la room : on met à jour la liste des joueurs,
 * puis on prévient le jeu en cours pour qu'il continue sans lui (tour de parole, votes...).
 */
function _notifyPlayerLeft(room, playerId) {
  room.emitRoomState();
  if (room.gameInstance && typeof room.gameInstance.onPlayerLeft === 'function') {
    try {
      room.gameInstance.onPlayerLeft(playerId);
    } catch (e) {
      logger.error({ room: room.code, err: e?.stack || String(e) }, 'onPlayerLeft failed');
      room.emitGameState();
    }
  }
}
