import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { getModel, lookup, nearest, randomSecret, similarity, wordAt } from './semantic.js';

/**
 * Cémantix en multijoueur : trouver le mot secret en proposant des mots.
 * Chaque proposition reçoit une température (proximité de sens × 100, en °C) et, si elle
 * fait partie des 1000 mots les plus proches du secret, une progression en ‰ (999 = le plus proche).
 *
 * Modes :
 *   - course : chacun cherche de son côté ; on voit seulement la meilleure température des autres
 *   - équipe : toutes les propositions sont partagées, on cherche ensemble
 *
 * Phases : PLAYING -> REVEAL (mot révélé, mots les plus proches, classement)
 */
const PHASES = { PLAYING: 'PLAYING', REVEAL: 'REVEAL' };

const DEFAULT_OPTIONS = { mode: 'course', durationMin: 0 };
const DURATIONS = [0, 3, 5, 10, 15];
const MAX_INPUT = 40;
const FEED_SIZE = 6;
const HOT_PROGRESS = 900;         // annoncé aux autres quand quelqu'un s'approche autant

export class CemantixGame extends BaseGame {
  static id = 'cemantix';
  static label = 'Cémantix';
  static minPlayers = 1;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return {
      defaults: DEFAULT_OPTIONS,
      modes: [
        { id: 'course', label: '🏁 Course : chacun cherche de son côté' },
        { id: 'equipe', label: '🤝 Équipe : on cherche tous ensemble' },
      ],
      durations: DURATIONS.map((m) => ({ id: m, label: m === 0 ? 'Sans limite' : `${m} minutes` })),
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    const o = { ...DEFAULT_OPTIONS, ...(options || {}) };
    this.options = {
      mode: o.mode === 'equipe' ? 'equipe' : 'course',
      durationMin: DURATIONS.includes(Number(o.durationMin)) ? Number(o.durationMin) : 0,
    };
    this.round = 0;
    this.recentSecrets = [];
    this._reset();
  }

  _reset() {
    this.secret = -1;
    this.neighborRank = new Map();  // index du mot -> rang parmi les 1000 plus proches (1 = le plus proche)
    this.top = [];                  // 10 mots les plus proches, révélés à la fin
    this.players = new Map();       // playerId -> { pseudo, avatar, guesses: Map(index -> guess), count, best, foundAt, foundRank }
    this.teamGuesses = new Map();   // mode équipe : index -> guess
    this.teamCount = 0;
    this.foundOrder = [];
    this.feed = [];
    this.feedSeq = 0;
    this.startedAt = 0;
    this.endsAt = null;
    this.feedback = new Map();      // playerId -> dernier retour (mot inconnu, déjà proposé…)
  }

  _isTeam() { return this.options.mode === 'equipe'; }

  _addPlayer(id) {
    if (this.players.has(id)) return;
    const p = this.room.players.get(id);
    if (!p) return;
    this.players.set(id, {
      pseudo: p.pseudo, avatar: p.avatar,
      guesses: new Map(), count: 0,
      best: null, foundAt: null, foundRank: null,
    });
  }

  _pushFeed(entry) {
    this.feedSeq += 1;
    this.feed = [{ seq: this.feedSeq, at: Date.now(), ...entry }, ...this.feed].slice(0, FEED_SIZE);
  }

  /** Température (°C, 2 décimales) et progression (‰) d'un mot par rapport au secret. */
  _score(index) {
    if (index === this.secret) return { temp: 100, progress: 1000 };
    const temp = Math.round(similarity(index, this.secret) * 10000) / 100;
    const rank = this.neighborRank.get(index);
    return { temp, progress: rank ? 1000 - rank : null };
  }

  // ───────── Lifecycle ─────────
  start() {
    this._startNewWord();
  }

  _startNewWord() {
    getModel();
    this.clearAllTimers();
    this._reset();
    this.round += 1;
    this.secret = randomSecret(this.recentSecrets);
    this.recentSecrets = [this.secret, ...this.recentSecrets].slice(0, 50);
    const near = nearest(this.secret, 1000);
    near.forEach((n, i) => this.neighborRank.set(n.index, i + 1));
    this.top = near.slice(0, 10).map((n) => ({ word: wordAt(n.index), temp: Math.round(n.sim * 10000) / 100 }));
    for (const id of this.playerIds) this._addPlayer(id);
    this.startedAt = Date.now();
    if (this.options.durationMin > 0) {
      this.endsAt = this.startedAt + this.options.durationMin * 60_000;
      this.setTimer(this.options.durationMin * 60_000, () => this._reveal('TIME'));
    }
    logger.info({ room: this.room.code, round: this.round, mode: this.options.mode }, 'Cémantix: new word');
    this.setPhase(PHASES.PLAYING);
  }

  _reveal(reason) {
    if (this.phase === PHASES.REVEAL) return;
    this.clearAllTimers();
    this.revealReason = reason;
    this.setPhase(PHASES.REVEAL);
  }

  /** Course : la partie s'arrête quand tous les joueurs présents ont trouvé. */
  _checkAllFound() {
    const present = [...this.players.keys()].filter((id) => this.room.players.get(id)?.connected);
    if (present.length > 0 && present.every((id) => this.players.get(id).foundAt)) this._reveal('ALL_FOUND');
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame(playerId) {
    // Pas besoin d'attendre : on peut chercher le mot en cours tout de suite
    if (this.phase === PHASES.PLAYING) this._addPlayer(playerId);
    this.room.emitGameState();
  }

  onPlayerLeft() {
    if (this.phase === PHASES.PLAYING && !this._isTeam()) this._checkAllFound();
    this.room.emitGameState();
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload) {
    if (['reveal', 'nextWord', 'endGame'].includes(type)) {
      if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut faire ça.");
      if (type === 'reveal') return this.phase === PHASES.PLAYING && this._reveal('HOST');
      if (type === 'nextWord') return this._startNewWord();
      this.cleanup();
      return this.room.endGame({ game: 'cemantix', rounds: this.round });
    }
    if (type === 'guess') return this._onGuess(playerId, payload);
    return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
  }

  _onGuess(playerId, payload) {
    if (this.phase !== PHASES.PLAYING) return;
    this._addPlayer(playerId);
    const p = this.players.get(playerId);
    if (!p) return;
    if (!this._isTeam() && p.foundAt) return;   // déjà trouvé : on attend les autres

    const typed = String(payload?.word ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_INPUT);
    if (!typed) return;
    const index = lookup(typed);
    if (index < 0) {
      this.feedback.set(playerId, { type: 'unknown', word: typed, at: Date.now() });
      this.room.emitToPlayer(playerId, 'game:state', this._stateFor(playerId));
      return;
    }

    const pool = this._isTeam() ? this.teamGuesses : p.guesses;
    if (pool.has(index)) {
      this.feedback.set(playerId, { type: 'duplicate', index, at: Date.now() });
      this.room.emitToPlayer(playerId, 'game:state', this._stateFor(playerId));
      return;
    }

    const { temp, progress } = this._score(index);
    const n = this._isTeam() ? ++this.teamCount : p.count + 1;
    const guess = { index, word: wordAt(index), temp, progress, n, by: playerId };
    pool.set(index, guess);
    p.count += 1;
    if (!p.best || temp > p.best.temp) {
      // Annonce aux autres quand quelqu'un s'approche beaucoup (sans dire le mot en mode course)
      if (progress && progress >= HOT_PROGRESS && index !== this.secret && (!p.best?.progress || progress > p.best.progress)) {
        this._pushFeed({ type: 'hot', playerId, progress, temp, word: this._isTeam() ? guess.word : null });
      }
      p.best = { temp, progress };
    }
    this.feedback.set(playerId, { type: 'ok', index, at: Date.now() });

    if (index === this.secret) {
      p.foundAt = Date.now();
      this.foundOrder.push(playerId);
      p.foundRank = this.foundOrder.length;
      this._pushFeed({ type: 'found', playerId, count: this._isTeam() ? this.teamCount : p.count, rank: p.foundRank });
      if (this._isTeam()) return this._reveal('FOUND');
      this.room.emitGameState();
      return this._checkAllFound();
    }
    this.room.emitGameState();
  }

  // ───────── States ─────────
  _playersPublic() {
    return [...this.players.entries()].map(([id, p]) => ({
      id,
      pseudo: p.pseudo,
      avatar: p.avatar,
      count: p.count,
      bestTemp: p.best?.temp ?? null,
      bestProgress: p.best?.progress ?? null,
      found: !!p.foundAt,
      foundRank: p.foundRank,
      foundAfterSec: p.foundAt ? Math.round((p.foundAt - this.startedAt) / 1000) : null,
      left: !this.room.players.has(id),
    }));
  }

  getPublicState() {
    const base = {
      phase: this.phase,
      round: this.round,
      mode: this.options.mode,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      players: this._playersPublic(),
      feed: this.feed,
    };
    if (this._isTeam()) base.guesses = [...this.teamGuesses.values()];
    if (this.phase === PHASES.REVEAL) {
      return {
        ...base,
        secret: wordAt(this.secret),
        top: this.top,
        reason: this.revealReason,
        guesses: this._isTeam() ? base.guesses : undefined,
      };
    }
    return base;
  }

  getPrivateStateFor(playerId) {
    const p = this.players.get(playerId);
    const data = { feedback: this.feedback.get(playerId) || null };
    if (!this._isTeam() && p) {
      data.guesses = [...p.guesses.values()];
      if (p.foundAt) data.secret = wordAt(this.secret);
    }
    return data;
  }

  /** État complet pour un seul joueur (retour immédiat sur un mot inconnu ou déjà proposé). */
  _stateFor(playerId) {
    return { public: this.getPublicState(), private: this.getPrivateStateFor(playerId) };
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
