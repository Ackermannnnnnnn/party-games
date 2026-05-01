/**
 * Classe abstraite. Tout jeu doit l'étendre.
 *
 * Convention :
 *   - Le jeu ne connaît PAS Socket.io directement.
 *   - Il interagit avec la room via : this.room.broadcast / emitToPlayer / emitGameState
 *   - Toute action joueur passe par handleAction(playerId, type, payload)
 *   - getPublicState() = données vues par tous
 *   - getPrivateStateFor(playerId) = données privées (rôles, mots secrets...)
 */
export class BaseGame {
  static id = 'base';
  static minPlayers = 2;
  static maxPlayers = 12;
  static label = 'Base Game';

  constructor(room, options = {}) {
    this.room = room;
    this.options = options;
    this.id = this.constructor.id;
    this.phase = 'INIT';
    this._timers = new Set();
  }

  // À surcharger ↓
  start() { throw new Error('start() not implemented'); }
  handleAction(_playerId, _type, _payload) { throw new Error('handleAction() not implemented'); }
  getPublicState() { return { phase: this.phase }; }
  getPrivateStateFor(_playerId) { return {}; }

  // ───────── Helpers FSM ─────────
  setPhase(newPhase) {
    this.phase = newPhase;
    this.room.emitGameState();
  }

  setTimer(ms, fn) {
    const t = setTimeout(() => {
      this._timers.delete(t);
      fn();
    }, ms);
    this._timers.add(t);
    return t;
  }

  clearAllTimers() {
    for (const t of this._timers) clearTimeout(t);
    this._timers.clear();
  }

  cleanup() {
    this.clearAllTimers();
  }

  // ───────── Helpers logique ─────────
  get playerIds() { return [...this.room.players.keys()]; }
  get playerCount() { return this.room.players.size; }

  pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
