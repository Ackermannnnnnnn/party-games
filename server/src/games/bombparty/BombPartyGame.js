import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { DIFFICULTIES, examplesFor, getDictionary, isValidWord, pickSyllable, wordKey } from './dictionary.js';

/**
 * BombParty (version française).
 *
 * Une bombe passe de joueur en joueur. Celui qui la tient doit taper un mot contenant la
 * syllabe affichée (ex. « ail » -> « travail »). Mot valide : la bombe passe au suivant avec
 * une nouvelle syllabe. La bombe a une mèche cachée qui continue de brûler d'un joueur à
 * l'autre : quand elle explose, celui qui la tient perd une vie. Dernier survivant = gagnant.
 *
 * Bonus : utiliser toutes les lettres de A à V (sauf K) dans ses mots rend une vie.
 *
 * Phases : COUNTDOWN (3 s pour se préparer) -> PLAYING -> GAME_OVER
 */
const PHASES = { COUNTDOWN: 'COUNTDOWN', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };

const COUNTDOWN_MS = 3000;
/** Même si la mèche est presque consumée, chaque joueur a au moins ce temps pour répondre. */
const MIN_TURN_MS = 5000;
/** Nombre d'explosions sur la même syllabe avant d'en changer. */
const PROMPT_LIFE = 2;
const MAX_INPUT = 30;
const HISTORY_SIZE = 8;
/** Lettres à utiliser pour gagner une vie (comme le BombParty français : sans K, W, X, Y, Z). */
const BONUS_LETTERS = 'abcdefghijlmnopqrstuv'.split('');

/** Durée totale de la mèche (secondes), tirée au hasard dans l'intervalle. */
const FUSES = {
  court:  { label: 'Courte (7 à 14 s)',  min: 7,  max: 14 },
  normal: { label: 'Normale (10 à 22 s)', min: 10, max: 22 },
  long:   { label: 'Longue (15 à 32 s)', min: 15, max: 32 },
};

const DEFAULT_OPTIONS = { lives: 2, difficulty: 'normal', fuse: 'normal' };

const REASONS = {
  EMPTY: 'Tape un mot.',
  NO_SYLLABLE: 'Le mot ne contient pas la syllabe.',
  USED: 'Ce mot a déjà été utilisé.',
  UNKNOWN: "Ce mot n'est pas dans le dictionnaire.",
};

export class BombPartyGame extends BaseGame {
  static id = 'bombparty';
  static label = 'BombParty';
  static minPlayers = 2;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return {
      defaults: DEFAULT_OPTIONS,
      limits: { lives: { min: 1, max: 5 } },
      difficulties: Object.entries(DIFFICULTIES).map(([id, d]) => ({ id, label: d.label })),
      fuses: Object.entries(FUSES).map(([id, f]) => ({ id, label: f.label })),
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    const o = { ...DEFAULT_OPTIONS, ...(options || {}) };
    this.options = {
      lives: Math.max(1, Math.min(5, parseInt(o.lives, 10) || DEFAULT_OPTIONS.lives)),
      difficulty: DIFFICULTIES[o.difficulty] ? o.difficulty : DEFAULT_OPTIONS.difficulty,
      fuse: FUSES[o.fuse] ? o.fuse : DEFAULT_OPTIONS.fuse,
    };
    this.maxLives = Math.max(3, this.options.lives);
    this.round = 0;
    this._reset();
  }

  _reset() {
    this.order = [];
    this.stats = new Map();       // playerId -> { pseudo, avatar, lives, alive, left, words, longest, letters }
    this.holderId = null;
    this.syllable = null;
    this.syllableCount = 0;
    this.recentSyllables = [];
    this.failsOnSyllable = 0;
    this.used = new Set();
    this.input = '';
    this.fuseEndsAt = 0;
    this.bombStartedAt = 0;
    this.turnStartedAt = 0;
    this.countdownEndsAt = 0;
    this.lastEvent = null;
    this.eventSeq = 0;
    this.history = [];
    this.eliminated = [];         // ordre d'élimination
    this.winnerId = null;
  }

  // ───────── Helpers ─────────
  _aliveIds() { return this.order.filter(id => this.stats.get(id).alive); }
  isSpectator(playerId) { return !this.stats.has(playerId); }

  /** Prochain joueur encore en vie après `fromId`, dans l'ordre du cercle. */
  _nextAlive(fromId) {
    const n = this.order.length;
    const start = this.order.indexOf(fromId);
    for (let k = 1; k <= n; k++) {
      const id = this.order[(start + k) % n];
      if (this.stats.get(id).alive) return id;
    }
    return null;
  }

  _event(type, data = {}) {
    this.eventSeq += 1;
    this.lastEvent = { seq: this.eventSeq, type, at: Date.now(), ...data };
  }

  _newSyllable() {
    const { syllable, count } = pickSyllable(this.options.difficulty, this.recentSyllables);
    this.syllable = syllable;
    this.syllableCount = count;
    this.failsOnSyllable = 0;
    this.recentSyllables = [syllable, ...this.recentSyllables].slice(0, 20);
  }

  /** Programme l'explosion. */
  _armExplosion(at) {
    this.clearAllTimers();
    this.setTimer(Math.max(0, at - Date.now()), () => this._explode());
  }

  /** Nouvelle bombe : nouvelle mèche, d'une durée tirée au hasard. */
  _newBomb() {
    const { min, max } = FUSES[this.options.fuse];
    const now = Date.now();
    this.bombStartedAt = now;
    this.turnStartedAt = now;
    this.fuseEndsAt = now + (min + Math.random() * (max - min)) * 1000;
    this._armExplosion(this.fuseEndsAt);
  }

  /** La bombe passe à `nextId` ; la mèche continue de brûler (avec un temps minimum de réponse). */
  _giveBombTo(nextId) {
    const now = Date.now();
    this.holderId = nextId;
    this.input = '';
    this.turnStartedAt = now;
    this._armExplosion(Math.max(this.fuseEndsAt, now + MIN_TURN_MS));
  }

  // ───────── Lifecycle ─────────
  start() {
    if (!this._startNewGame()) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Min ${BombPartyGame.minPlayers} joueurs.` });
      this.room.endGame({ aborted: true });
    }
  }

  _startNewGame() {
    const ids = this.playerIds.filter(id => this.room.players.get(id)?.connected);
    if (ids.length < BombPartyGame.minPlayers) return false;
    getDictionary(); // chargé maintenant plutôt qu'au premier mot
    this.clearAllTimers();
    this._reset();
    this.round += 1;
    this.order = this.shuffle(ids);
    for (const id of ids) {
      const p = this.room.players.get(id);
      this.stats.set(id, {
        pseudo: p.pseudo, avatar: p.avatar,
        lives: this.options.lives, alive: true, left: false,
        words: 0, longest: '', letters: new Set(),
      });
    }
    this.countdownEndsAt = Date.now() + COUNTDOWN_MS;
    this.setPhase(PHASES.COUNTDOWN);
    this.setTimer(COUNTDOWN_MS, () => this._startPlaying());
    logger.info({ room: this.room.code, round: this.round, players: ids.length, options: this.options }, 'BombParty: new game');
    return true;
  }

  _startPlaying() {
    const alive = this._aliveIds();
    if (alive.length < 2) return this._finish();
    this.holderId = alive[0];
    this._newSyllable();
    this._newBomb();
    this.setPhase(PHASES.PLAYING);
  }

  _explode() {
    if (this.phase !== PHASES.PLAYING) return;
    const victimId = this.holderId;
    const victim = this.stats.get(victimId);
    victim.lives -= 1;
    if (victim.lives <= 0) {
      victim.lives = 0;
      victim.alive = false;
      this.eliminated.push(victimId);
    }
    this._event('boom', {
      playerId: victimId,
      syllable: this.syllable,
      eliminated: !victim.alive,
      examples: examplesFor(this.syllable, 3, this.used),
    });

    if (this._aliveIds().length <= 1) return this._finish();

    this.failsOnSyllable += 1;
    if (this.failsOnSyllable >= PROMPT_LIFE) this._newSyllable();
    this.holderId = this._nextAlive(victimId);
    this.input = '';
    this._newBomb();
    this.room.emitGameState();
  }

  _finish() {
    this.clearAllTimers();
    const alive = this._aliveIds();
    this.winnerId = alive.length === 1 ? alive[0] : null;
    this.holderId = null;
    this.setPhase(PHASES.GAME_OVER);
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame() {
    this.room.emitGameState();   // spectateur jusqu'à la prochaine partie
  }

  /** Un joueur parti est éliminé ; si c'était son tour, la bombe passe au suivant. */
  onPlayerLeft(playerId) {
    const s = this.stats.get(playerId);
    if (!s || this.phase === PHASES.GAME_OVER) return;
    if (s.alive) {
      s.alive = false;
      s.lives = 0;
      this.eliminated.push(playerId);
    }
    s.left = true;
    if (this._aliveIds().length <= 1) return this._finish();
    if (this.phase === PHASES.PLAYING && this.holderId === playerId) {
      this._giveBombTo(this._nextAlive(playerId));
    }
    this.room.emitGameState();
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    if (['restart', 'endGame'].includes(type)) {
      if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut faire ça.");
      return type === 'restart' ? this._onRestart(playerId) : this._onEndGame();
    }
    if (this.isSpectator(playerId)) {
      return this._error(playerId, 'SPECTATOR', 'Tu es spectateur, attends la prochaine partie.');
    }
    switch (type) {
      case 'typing':     return this._onTyping(playerId, payload);
      case 'submitWord': return this._onSubmitWord(playerId, payload);
      default:           return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  /** Ce que tape le joueur qui a la bombe est montré en direct aux autres. */
  _onTyping(playerId, payload) {
    if (this.phase !== PHASES.PLAYING || playerId !== this.holderId) return;
    const text = String(payload?.text ?? '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_INPUT);
    if (text === this.input) return;
    this.input = text;
    this.room.emitGameState();
  }

  _onSubmitWord(playerId, payload) {
    if (this.phase !== PHASES.PLAYING) return;
    if (playerId !== this.holderId) return this._error(playerId, 'NOT_YOUR_TURN', "Ce n'est pas ton tour.");
    const word = String(payload?.word ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_INPUT).toLowerCase();
    const key = wordKey(word);

    let reason = null;
    if (!key) reason = 'EMPTY';
    else if (!key.includes(this.syllable)) reason = 'NO_SYLLABLE';
    else if (this.used.has(key)) reason = 'USED';
    else if (!isValidWord(key)) reason = 'UNKNOWN';

    if (reason) {
      this._event('fail', { playerId, word, reason, message: REASONS[reason] });
      this.room.emitGameState();
      return;
    }

    // Mot accepté
    const s = this.stats.get(playerId);
    this.used.add(key);
    s.words += 1;
    if (wordKey(word).length > wordKey(s.longest).length) s.longest = word;
    for (const ch of key) if (BONUS_LETTERS.includes(ch)) s.letters.add(ch);
    let bonus = false;
    if (s.letters.size === BONUS_LETTERS.length) {
      s.letters = new Set();
      if (s.lives < this.maxLives) { s.lives += 1; bonus = true; }
    }
    this.history = [{ playerId, word, syllable: this.syllable }, ...this.history].slice(0, HISTORY_SIZE);
    this._event(bonus ? 'bonus' : 'ok', { playerId, word, syllable: this.syllable });

    this._newSyllable();
    this._giveBombTo(this._nextAlive(playerId));
    this.room.emitGameState();
  }

  _onRestart(playerId) {
    if (this.phase !== PHASES.GAME_OVER) return this._error(playerId, 'BAD_PHASE');
    if (!this._startNewGame()) {
      return this._error(playerId, 'NOT_ENOUGH_PLAYERS', `Il faut au moins ${BombPartyGame.minPlayers} joueurs connectés.`);
    }
  }

  _onEndGame() {
    this.cleanup();
    this.room.endGame({ game: 'bombparty', rounds: this.round });
  }

  // ───────── States ─────────
  getPublicState() {
    const players = this.order.map(id => {
      const s = this.stats.get(id);
      return {
        id,
        pseudo: s.pseudo,
        avatar: s.avatar,
        lives: s.lives,
        alive: s.alive,
        left: s.left,
        words: s.words,
        letters: [...s.letters],
      };
    });
    const base = {
      phase: this.phase,
      round: this.round,
      players,
      maxLives: this.maxLives,
      bonusLetters: BONUS_LETTERS,
      options: this.options,
      lastEvent: this.lastEvent,
      history: this.history,
      usedCount: this.used.size,
    };

    if (this.phase === PHASES.COUNTDOWN) return { ...base, countdownEndsAt: this.countdownEndsAt };

    if (this.phase === PHASES.PLAYING) {
      return {
        ...base,
        holderId: this.holderId,
        syllable: this.syllable,
        syllableCount: this.syllableCount,
        input: this.input,
        bombStartedAt: this.bombStartedAt,   // pour l'animation ; la fin de la mèche reste secrète
        turnStartedAt: this.turnStartedAt,
      };
    }

    // GAME_OVER : classement (gagnant, puis les derniers éliminés en premier)
    const ranking = [
      ...(this.winnerId ? [this.winnerId] : []),
      ...[...this.eliminated].reverse(),
    ].map((id, i) => {
      const s = this.stats.get(id);
      return { id, rank: i + 1, pseudo: s.pseudo, avatar: s.avatar, words: s.words, longest: s.longest, left: s.left };
    });
    return { ...base, winnerId: this.winnerId, ranking };
  }

  getPrivateStateFor(playerId) {
    return this.isSpectator(playerId) ? { spectator: true } : {};
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
