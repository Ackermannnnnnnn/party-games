import { roomManager } from '../core/RoomManager.js';
import { Player } from '../core/Player.js';
import { schemas, validate } from '../utils/schemas.js';
import { getGameClass, listGames } from '../games/registry.js';
import { logger } from '../utils/logger.js';

/**
 * Inscrit tous les handlers sur un socket nouvellement connecté.
 *
 * Chaque socket porte une référence au playerId/roomCode pour les opérations rapides.
 *   socket.data = { playerId, roomCode }
 */
export function registerSocketHandlers(io, socket) {
  roomManager.attachIo(io);

  // ───────── ROOMS ─────────
  socket.on('room:create', (data) => {
    const parsed = validate(socket, schemas.roomCreate, data);
    if (!parsed) return;
    try {
      const room = roomManager.createRoom();
      const player = new Player({ pseudo: parsed.pseudo, avatar: parsed.avatar, socketId: socket.id });
      room.addPlayer(player);
      _attachSocketToRoom(socket, room, player);
      socket.emit('room:joined', { code: room.code, playerId: player.id });
      room.emitRoomState();
    } catch (e) {
      socket.emit('error', { code: e.message });
    }
  });

  socket.on('room:join', (data) => {
    const parsed = validate(socket, schemas.roomJoin, data);
    if (!parsed) return;
    const room = roomManager.get(parsed.code.toUpperCase());
    if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND' });

    // 1) Si quelqu'un de DECONNECTE avait deja ce pseudo -> reconnexion sur sa place
    const existing = room.findDisconnectedByPseudo(parsed.pseudo);
    if (existing) {
      existing.socketId = socket.id;
      existing.connected = true;
      if (parsed.avatar) existing.avatar = parsed.avatar; // MAJ de l'avatar à la reconnexion
      _attachSocketToRoom(socket, room, existing);
      socket.emit('room:joined', { code: room.code, playerId: existing.id, reconnected: true });
      room.emitRoomState();
      if (room.gameInstance) room.emitGameState();
      logger.info({ room: room.code, pseudo: existing.pseudo }, 'Player reconnected by pseudo');
      return;
    }

    // 2) Si quelqu'un de CONNECTE a deja ce pseudo -> refus
    if (room.isPseudoTaken(parsed.pseudo)) {
      return socket.emit('error', { code: 'PSEUDO_TAKEN', message: 'Ce pseudo est deja pris dans la room.' });
    }

    // 3) Sinon : nouveau joueur (autorise meme en cours de partie -> spectateur ou actif selon jeu)
    try {
      const player = new Player({ pseudo: parsed.pseudo, avatar: parsed.avatar, socketId: socket.id });
      room.addPlayer(player);
      _attachSocketToRoom(socket, room, player);
      socket.emit('room:joined', { code: room.code, playerId: player.id });
      room.emitRoomState();
      if (room.gameInstance) room.emitGameState(); // late-join : envoyer l'etat courant
    } catch (e) {
      socket.emit('error', { code: e.message });
    }
  });

  socket.on('room:rejoin', (data) => {
    const parsed = validate(socket, schemas.roomRejoin, data);
    if (!parsed) return;
    const room = roomManager.get(parsed.code.toUpperCase());
    if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND' });
    const player = room.players.get(parsed.playerId);
    if (!player) return socket.emit('error', { code: 'PLAYER_NOT_FOUND' });

    // Remap socket
    player.socketId = socket.id;
    player.connected = true;
    _attachSocketToRoom(socket, room, player);
    socket.emit('room:joined', { code: room.code, playerId: player.id });
    room.emitRoomState();
    if (room.gameInstance) room.emitGameState();
  });

  socket.on('room:leave', () => _leaveRoom(socket));

  // Change l'avatar en cours de partie (broadcast à tous)
  socket.on('player:setAvatar', (data) => {
    const parsed = validate(socket, schemas.setAvatar, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    player.avatar = parsed.avatar;
    room.emitRoomState();
  });

  // ───────── CHAT ─────────
  socket.on('chat:send', (data) => {
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
  socket.on('game:list', () => socket.emit('game:list', listGames()));

  socket.on('room:setGame', (data) => {
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
  socket.on('room:setOptions', (data) => {
    const parsed = validate(socket, schemas.setOptions, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (player.id !== room.hostId) return socket.emit('error', { code: 'NOT_HOST' });
    if (room.gameInstance) return socket.emit('error', { code: 'GAME_IN_PROGRESS' });
    room.gameOptions[parsed.gameId] = parsed.options;
    room.emitRoomState();
  });

  socket.on('game:options', ({ gameId } = {}) => {
    const GameClass = getGameClass(gameId);
    if (!GameClass || typeof GameClass.getOptionsManifest !== 'function') {
      return socket.emit('game:options', { gameId, manifest: null });
    }
    socket.emit('game:options', { gameId, manifest: GameClass.getOptionsManifest() });
  });

  socket.on('game:start', (data) => {
    const parsed = validate(socket, schemas.gameStart, data || {});
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (player.id !== room.hostId) return socket.emit('error', { code: 'NOT_HOST' });

    const gameId = parsed.gameId || 'imposter';
    const GameClass = getGameClass(gameId);
    if (!GameClass) return socket.emit('error', { code: 'UNKNOWN_GAME' });
    if (room.players.size < GameClass.minPlayers) {
      return socket.emit('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Minimum ${GameClass.minPlayers} joueurs.` });
    }
    room.startGame(GameClass, parsed.options);
  });

  socket.on('game:action', (data) => {
    const parsed = validate(socket, schemas.gameAction, data);
    if (!parsed) return;
    const { room, player } = _getContext(socket);
    if (!room || !player) return socket.emit('error', { code: 'NOT_IN_ROOM' });
    if (!room.gameInstance) return socket.emit('error', { code: 'NO_GAME' });
    room.gameInstance.handleAction(player.id, parsed.type, parsed.payload);
  });

  // ───────── DISCONNECT ─────────
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    const { room, player } = _getContext(socket);
    if (player) {
      player.connected = false;
      // On ne retire PAS tout de suite : on laisse 30s pour reconnexion
      setTimeout(() => {
        if (!player.connected && room && room.players.get(player.id) === player) {
          const wasHost = room.removePlayer(player.id);
          if (wasHost && room.players.size > 0) {
            // Hôte définitivement parti -> on ferme la room
            room.close('HOST_LEFT');
            roomManager.delete(room.code);
          } else {
            room.emitRoomState();
          }
        }
      }, 30_000);
      if (room) room.emitRoomState(); // immédiat : montre "déconnecté"
    }
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

function _leaveRoom(socket) {
  const { room, player } = _getContext(socket);
  if (!room || !player) return;
  const wasHost = room.removePlayer(player.id);
  socket.leave(room.code);
  socket.data.roomCode = null;
  socket.data.playerId = null;
  if (wasHost && room.players.size > 0) {
    // Hôte quitte volontairement -> on ferme la room
    room.close('HOST_LEFT');
    roomManager.delete(room.code);
  } else {
    room.emitRoomState();
  }
}
