import { logger } from '../utils/logger.js';

export const MAX_PLAYERS = 12;
export const MAX_CHAT_HISTORY = 50;

export class Room {
  /**
   * @param {string} code
   * @param {import('socket.io').Server} io
   */
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.players = new Map();   // playerId -> Player
    this.hostId = null;
    this.gameId = null;         // ex: 'imposter' (jeu en cours)
    this.gameInstance = null;   // instance courante
    this.selectedGameId = 'imposter'; // jeu pré-sélectionné dans le lobby
    // Options de jeu synchronisées entre l'hôte et tous les joueurs (par jeu)
    this.gameOptions = {}; // { [gameId]: options }
    this.chat = [];             // historique limité
    this.createdAt = Date.now();
    this.emptySince = null;
    // Anti-répétition : IDs des questions vues lors des 5 dernières parties Quiz
    // Format: [[ids partie 1], [ids partie 2], ...] (max 5 entrées, plus récente en tête)
    this.recentQuizQuestionIds = [];
  }

  /** Enregistre les IDs des questions utilisées pour la dernière partie de quiz. */
  recordQuizGame(questionIds) {
    if (!Array.isArray(questionIds) || questionIds.length === 0) return;
    this.recentQuizQuestionIds.unshift([...questionIds]);
    if (this.recentQuizQuestionIds.length > 5) this.recentQuizQuestionIds.pop();
  }

  /** Renvoie l'ensemble des IDs à exclure (5 dernières parties). */
  getExcludedQuizQuestionIds() {
    return new Set(this.recentQuizQuestionIds.flat());
  }

  // ───────── Players ─────────
  addPlayer(player) {
    if (this.players.size >= MAX_PLAYERS) {
      throw new Error('ROOM_FULL');
    }
    // Note: on autorise le join meme si une partie est en cours.
    // Le jeu lui-meme decide si le joueur est spectateur ou actif.
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.emptySince = null;
    // Si une partie est en cours, on notifie le jeu (option pour init scoring etc.)
    if (this.gameInstance && typeof this.gameInstance.onPlayerJoinedMidGame === 'function') {
      this.gameInstance.onPlayerJoinedMidGame(player.id);
    }
  }

  /** Cherche un joueur deconnecte avec ce pseudo (case-insensitive). */
  findDisconnectedByPseudo(pseudo) {
    const norm = pseudo.trim().toLowerCase();
    for (const p of this.players.values()) {
      if (!p.connected && p.pseudo.trim().toLowerCase() === norm) return p;
    }
    return null;
  }

  /** Vrai si un joueur connecte porte deja ce pseudo. */
  isPseudoTaken(pseudo) {
    const norm = pseudo.trim().toLowerCase();
    for (const p of this.players.values()) {
      if (p.connected && p.pseudo.trim().toLowerCase() === norm) return true;
    }
    return false;
  }

  /**
   * Retire un joueur. Renvoie `true` si le joueur retiré était l'hôte.
   * Le caller (socket handler) doit décider quoi faire (fermer la room).
   */
  removePlayer(playerId) {
    const wasHost = this.hostId === playerId;
    this.players.delete(playerId);
    if (this.players.size === 0) {
      this.hostId = null;
      this.emptySince = Date.now();
    }
    return wasHost;
  }

  /**
   * Ferme la room : notifie tous les sockets et purge l'état.
   * Le caller doit ensuite appeler roomManager.delete(this.code).
   */
  close(reason = 'HOST_LEFT') {
    this.broadcast('room:closed', { reason });
    if (this.gameInstance?.cleanup) this.gameInstance.cleanup();
    // Force chaque socket de la room à la quitter
    const socketsInRoom = this.io.sockets.adapter.rooms.get(this.code);
    if (socketsInRoom) {
      for (const sid of socketsInRoom) {
        const s = this.io.sockets.sockets.get(sid);
        if (s) {
          s.leave(this.code);
          s.data.roomCode = null;
          s.data.playerId = null;
        }
      }
    }
    this.players.clear();
    this.gameInstance = null;
    this.gameId = null;
    logger.info({ code: this.code, reason }, 'Room closed');
  }

  getPlayerBySocket(socketId) {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) return p;
    }
    return null;
  }

  // ───────── Chat ─────────
  addChat(message) {
    this.chat.push(message);
    if (this.chat.length > MAX_CHAT_HISTORY) this.chat.shift();
  }

  // ───────── Broadcast helpers ─────────
  broadcast(event, data) {
    this.io.to(this.code).emit(event, data);
  }

  emitToPlayer(playerId, event, data) {
    const p = this.players.get(playerId);
    if (p && p.connected) this.io.to(p.socketId).emit(event, data);
  }

  // ───────── State publics ─────────
  toPublicState() {
    return {
      code: this.code,
      hostId: this.hostId,
      gameId: this.gameId,
      selectedGameId: this.selectedGameId,
      gameOptions: this.gameOptions, // synchronisé entre tous les joueurs
      players: [...this.players.values()].map(p => p.toPublic()),
    };
  }

  emitRoomState() {
    this.broadcast('room:state', this.toPublicState());
  }

  /** Diffuse l'état de jeu, filtré par joueur. */
  emitGameState() {
    if (!this.gameInstance) return;
    const publicState = this.gameInstance.getPublicState();
    for (const player of this.players.values()) {
      const privateState = this.gameInstance.getPrivateStateFor(player.id);
      this.emitToPlayer(player.id, 'game:state', {
        public: publicState,
        private: privateState,
      });
    }
  }

  // ───────── Game lifecycle ─────────
  startGame(GameClass, options) {
    this.gameInstance = new GameClass(this, options);
    this.gameId = this.gameInstance.id;
    this.gameInstance.start();
    this.emitRoomState();
    this.emitGameState();
    logger.info({ room: this.code, game: this.gameId }, 'Game started');
  }

  endGame(summary) {
    this.broadcast('game:end', summary);
    this.gameInstance = null;
    this.gameId = null;
    this.emitRoomState();
  }
}
