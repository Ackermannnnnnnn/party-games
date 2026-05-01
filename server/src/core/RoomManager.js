import { Room } from './Room.js';
import { generateRoomCode } from '../utils/codeGen.js';
import { logger } from '../utils/logger.js';

const MAX_ROOMS = 50;
const EMPTY_TTL_MS = 60_000; // 60s

class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    this.io = null;
  }

  /** Injecté au boot. */
  attachIo(io) { this.io = io; }

  size() { return this.rooms.size; }

  createRoom() {
    if (this.rooms.size >= MAX_ROOMS) throw new Error('TOO_MANY_ROOMS');
    let code;
    do { code = generateRoomCode(); } while (this.rooms.has(code));
    const room = new Room(code, this.io);
    this.rooms.set(code, room);
    logger.info({ code }, 'Room created');
    return room;
  }

  get(code) { return this.rooms.get(code) || null; }

  delete(code) {
    if (this.rooms.delete(code)) {
      logger.info({ code }, 'Room deleted');
    }
  }

  /** Supprime les rooms vides depuis > TTL. */
  cleanupEmpty() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.players.size === 0 && room.emptySince && (now - room.emptySince) > EMPTY_TTL_MS) {
        if (room.gameInstance?.cleanup) room.gameInstance.cleanup();
        this.delete(code);
      }
    }
  }
}

export const roomManager = new RoomManager();
