import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { CHAR_BY_ID, QUESTION_BY_ID, QUESTION_LIST, UNIVERSES, charactersFor } from './characters.js';

/**
 * Qui est-ce ? — 4 façons de jouer avec les personnages (avatars) du site.
 *
 *  duel     Le classique : 2 camps (2 joueurs, ou 2 équipes), un plateau de visages, chaque camp a un perso secret.
 *           À ton tour : une question (l'adversaire répond) OU une proposition. Trouver le perso adverse = victoire.
 *  akinator L'app devine : un joueur choisit un perso en secret, l'app pose les questions et propose des noms.
 *  postit   Qui suis-je ? : chacun a un perso que tout le monde voit sauf lui ; on pose des questions pour trouver le sien.
 *  meneur   Un meneur (l'app ou un joueur) cache un perso du plateau, les autres posent des questions chacun leur tour ;
 *           le premier qui le trouve marque des points. Une mauvaise proposition = éliminé pour la manche.
 *
 * Questions : toutes prêtes (l'app répond grâce aux fiches des persos) et/ou libres (un joueur répond Oui / Non / Je ne sais pas).
 */
const PH = { PICK: 'PICK', PLAY: 'PLAY', WAIT_ANSWER: 'WAIT_ANSWER', AKI: 'AKI', AKI_GUESS: 'AKI_GUESS', RESULT: 'RESULT', GAME_OVER: 'GAME_OVER' };
const MODES = ['duel', 'akinator', 'postit', 'meneur'];
const BOARD_SIZES = [16, 24, 32];
const RESULT_MS = 9000;
const AKI_MAX_QUESTIONS = 22;
const AKI_MAX_GUESSES = 3;
const ANSWERS = ['yes', 'no', 'idk'];
const AKI_ANSWERS = ['yes', 'probably', 'idk', 'probably_not', 'no'];

const DEFAULT_OPTIONS = {
  mode: 'duel', universes: [], boardSize: 24, questions: 'both', wrongGuess: 'skip', meneur: 'app', rounds: 5, autoFlip: true,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class WhoIsItGame extends BaseGame {
  static id = 'whoisit';
  static label = 'Qui est-ce ?';
  static minPlayers = 1;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return { defaults: DEFAULT_OPTIONS, universes: UNIVERSES, boardSizes: BOARD_SIZES, modes: MODES };
  }

  static sanitize(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    o.mode = MODES.includes(o.mode) ? o.mode : 'duel';
    const valid = new Set(UNIVERSES.map((u) => u.id));
    o.universes = Array.isArray(o.universes) ? [...new Set(o.universes.filter((u) => valid.has(u)))] : [];
    const bs = parseInt(o.boardSize, 10);
    o.boardSize = BOARD_SIZES.includes(bs) ? bs : 24;
    o.questions = ['both', 'ready', 'free'].includes(o.questions) ? o.questions : 'both';
    o.wrongGuess = o.wrongGuess === 'lose' ? 'lose' : 'skip';
    o.meneur = o.meneur === 'players' ? 'players' : 'app';
    const r = parseInt(o.rounds, 10);
    o.rounds = [3, 5, 8, 10].includes(r) ? r : 5;
    o.autoFlip = o.autoFlip !== false;
    return o;
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = WhoIsItGame.sanitize(options);
    this.gameNo = 0;
    this._reset();
  }

  _reset() {
    this.order = [];
    this.names = new Map();
    this.pool = charactersFor(this.options.universes).map((c) => c.id);
    this.board = null;
    this.flips = new Map();      // clé (camp ou joueur) → Set(id de perso abaissé)
    this.log = [];               // questions, réponses, propositions…
    this.pending = null;         // question libre en attente : { by, text, at, to }
    this.round = 0;
    this.result = null;          // fin de manche / partie : qui a gagné, persos révélés
    this.scores = new Map();
    this.turnId = null;          // joueur (ou camp en duel) dont c'est le tour
    // duel
    this.sides = null;           // { A: { members, secret }, B: {...} }
    // meneur
    this.meneurId = null;        // null = l'app
    this.secret = null;
    this.out = new Set();
    // postit
    this.secrets = new Map();
    this.found = new Map();      // id → { rank, questions }
    this.qcount = new Map();
    // akinator
    this.aki = null;
    this.akiStats = { app: 0, players: 0 };
  }

  // ───────── Démarrage ─────────
  start() {
    this.clearAllTimers();
    this._reset();
    this.gameNo += 1;
    const ids = this.playerIds.filter((id) => this.room.players.get(id)?.connected);
    const need = { duel: 2, postit: 2, akinator: 1, meneur: this.options.meneur === 'players' ? 2 : 1 }[this.options.mode];
    if (ids.length < need) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Il faut au moins ${need} joueurs pour ce mode.` });
      this.room.endGame({ aborted: true });
      return;
    }
    if (this.pool.length < 6) this.pool = charactersFor([]).map((c) => c.id);
    this.order = shuffle(ids);
    for (const id of this.order) {
      const p = this.room.players.get(id);
      this.names.set(id, { pseudo: p.pseudo, avatar: p.avatar || null });
      this.scores.set(id, 0);
    }
    logger.info({ room: this.room.code, mode: this.options.mode, players: ids.length }, 'Qui est-ce started');
    if (this.options.mode === 'duel') this._startDuel();
    else if (this.options.mode === 'meneur') this._startMeneurRound();
    else if (this.options.mode === 'postit') this._startPostit();
    else this._startAkiRound();
  }

  _drawBoard() {
    return shuffle(this.pool).slice(0, Math.min(this.options.boardSize, this.pool.length));
  }

  // ───────── Duel ─────────
  _startDuel() {
    this.board = this._drawBoard();
    const A = []; const B = [];
    this.order.forEach((id, i) => (i % 2 ? B : A).push(id));
    const [sa, sb] = shuffle(this.board);
    this.sides = { A: { members: A, secret: sa }, B: { members: B, secret: sb } };
    this.flips.set('A', new Set()); this.flips.set('B', new Set());
    this.turnId = Math.random() < 0.5 ? 'A' : 'B';
    this._push({ t: 'start', text: `Duel : ${this._sideName('A')} contre ${this._sideName('B')}` });
    this.setPhase(PH.PLAY);
  }

  _sideOf(pid) {
    if (!this.sides) return null;
    if (this.sides.A.members.includes(pid)) return 'A';
    if (this.sides.B.members.includes(pid)) return 'B';
    return null;
  }

  _other(side) { return side === 'A' ? 'B' : 'A'; }

  _sideName(side) {
    const m = this.sides[side].members.map((id) => this._name(id));
    return m.length === 1 ? m[0] : `l'équipe ${side === 'A' ? 'bleue' : 'rouge'}`;
  }

  // ───────── Meneur ─────────
  _startMeneurRound() {
    this.round += 1;
    this.board = this._drawBoard();
    this.out = new Set();
    this.pending = null;
    this.result = null;
    for (const id of this.order) this.flips.set(id, new Set());
    if (this.options.meneur === 'players') {
      this.meneurId = this.order[(this.round - 1) % this.order.length];
      this.secret = null;
      this._push({ t: 'round', round: this.round, text: `Manche ${this.round} : ${this._name(this.meneurId)} cache un personnage` });
      this.setPhase(PH.PICK);
    } else {
      this.meneurId = null;
      this.secret = this.board[Math.floor(Math.random() * this.board.length)];
      this._push({ t: 'round', round: this.round, text: `Manche ${this.round} : l'app a caché un personnage` });
      this.turnId = this._guessers()[0] || null;
      this.setPhase(PH.PLAY);
    }
  }

  _guessers() {
    return this.order.filter((id) => id !== this.meneurId && !this.out.has(id) && this.room.players.has(id));
  }

  _endMeneurRound(winnerId) {
    this.clearAllTimers();
    if (winnerId) this.scores.set(winnerId, (this.scores.get(winnerId) || 0) + 3);
    else if (this.meneurId) this.scores.set(this.meneurId, (this.scores.get(this.meneurId) || 0) + 2);
    this.result = { winnerId, secret: this.secret, meneurId: this.meneurId, round: this.round };
    const last = this.options.meneur === 'players' ? this.round >= this.order.length : this.round >= this.options.rounds;
    this.setPhase(PH.RESULT);
    this.setTimer(RESULT_MS, () => (last ? this._gameOver() : this._startMeneurRound()));
  }

  // ───────── Qui suis-je (post-it) ─────────
  _startPostit() {
    const picks = shuffle(this.pool);
    this.order.forEach((id, i) => { this.secrets.set(id, picks[i % picks.length]); this.qcount.set(id, 0); });
    this.board = null;
    this.turnId = this.order[0];
    this._push({ t: 'start', text: 'Chacun a son personnage sur le front : à vous de trouver qui vous êtes !' });
    this.setPhase(PH.PLAY);
  }

  _postitPlayers() { return this.order.filter((id) => !this.found.has(id) && this.room.players.has(id)); }

  // ───────── L'app devine ─────────
  _startAkiRound() {
    this.round += 1;
    const thinkers = this.order.filter((id) => this.room.players.has(id));
    if (this.round > thinkers.length || !thinkers.length) return this._gameOver();
    this.aki = { thinker: thinkers[this.round - 1], secret: null, weights: null, asked: new Set(), current: null, guess: null, wrong: new Set(), count: 0 };
    this.result = null;
    this.setPhase(PH.PICK);
  }

  _akiNext() {
    const a = this.aki;
    const cands = this.pool.filter((id) => !a.wrong.has(id));
    const total = cands.reduce((s, id) => s + a.weights.get(id), 0) || 1;
    const ranked = [...cands].sort((x, y) => a.weights.get(y) - a.weights.get(x));
    const top = ranked[0];
    const topShare = a.weights.get(top) / total;
    // la meilleure question : celle qui coupe les candidats probables le plus près de 50/50
    let best = null; let bestScore = 0;
    for (const q of QUESTION_LIST) {
      if (a.asked.has(q.id)) continue;
      const test = QUESTION_BY_ID.get(q.id).test;
      let yes = 0;
      for (const id of cands) if (test(CHAR_BY_ID.get(id))) yes += a.weights.get(id);
      const p = yes / total;
      if (p <= 0.001 || p >= 0.999) continue;
      const score = -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
      if (score > bestScore) { bestScore = score; best = q.id; }
    }
    const wantGuess = topShare > 0.82 || !best || bestScore < 0.12 || a.count >= AKI_MAX_QUESTIONS;
    if (wantGuess) {
      if (a.wrong.size >= AKI_MAX_GUESSES || !top) return this._akiEnd(false);
      a.guess = top;
      a.current = null;
      this.setPhase(PH.AKI_GUESS);
      return;
    }
    a.current = best;
    a.count += 1;
    this.setPhase(PH.AKI);
  }

  _akiAnswer(answer) {
    const a = this.aki;
    const test = QUESTION_BY_ID.get(a.current).test;
    const factor = { yes: [1, 0.08], probably: [1, 0.45], idk: [1, 1], probably_not: [0.45, 1], no: [0.08, 1] }[answer];
    for (const id of this.pool) {
      const match = test(CHAR_BY_ID.get(id));
      a.weights.set(id, a.weights.get(id) * (match ? factor[0] : factor[1]));
    }
    a.asked.add(a.current);
    this._push({ t: 'aki_q', qid: a.current, text: QUESTION_BY_ID.get(a.current).text, answer, by: a.thinker });
    this._akiNext();
  }

  _akiEnd(appWon) {
    const a = this.aki;
    if (appWon) this.akiStats.app += 1;
    else { this.akiStats.players += 1; this.scores.set(a.thinker, (this.scores.get(a.thinker) || 0) + 3); }
    this.result = { appWon, secret: a.secret, thinker: a.thinker, questions: a.count, guesses: a.wrong.size + (appWon ? 1 : 0) };
    this._push({ t: 'aki_end', text: appWon ? `L'app a trouvé ${this._char(a.secret)} en ${a.count} questions` : `L'app n'a pas trouvé ${this._char(a.secret)}`, accent: true });
    this.setPhase(PH.RESULT);
    this.setTimer(RESULT_MS, () => this._startAkiRound());
  }

  // ───────── Questions et réponses ─────────
  _canAsk(pid) {
    const m = this.options.mode;
    if (this.phase !== PH.PLAY) return false;
    if (m === 'duel') return this._sideOf(pid) === this.turnId;
    if (m === 'meneur') return pid === this.turnId;
    if (m === 'postit') return pid === this.turnId;
    return false;
  }

  /** Secret visé par une question de `pid`. */
  _targetSecret(pid) {
    const m = this.options.mode;
    if (m === 'duel') return this.sides[this._other(this._sideOf(pid))].secret;
    if (m === 'meneur') return this.secret;
    if (m === 'postit') return this.secrets.get(pid);
    return null;
  }

  _ask(pid, payload) {
    if (!this._canAsk(pid)) return;
    const m = this.options.mode;
    if (payload?.qid) {
      if (this.options.questions === 'free') return;
      const q = QUESTION_BY_ID.get(payload.qid);
      if (!q) return;
      const answer = q.test(CHAR_BY_ID.get(this._targetSecret(pid))) ? 'yes' : 'no';
      this._push({ t: 'q', by: pid, qid: q.id, text: q.text, answer, auto: true });
      if (m === 'postit') this.qcount.set(pid, (this.qcount.get(pid) || 0) + 1);
      if (this.options.autoFlip && m !== 'postit') this._autoFlip(pid, q, answer);
      this._nextTurn();
      return;
    }
    const text = String(payload?.text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!text || this.options.questions === 'ready') return;
    if (m === 'meneur' && !this.meneurId) return; // l'app ne comprend que les questions toutes prêtes
    this.pending = { by: pid, text, at: Date.now() };
    if (m === 'postit') this.qcount.set(pid, (this.qcount.get(pid) || 0) + 1);
    this.setPhase(PH.WAIT_ANSWER);
  }

  _canAnswer(pid) {
    if (this.phase !== PH.WAIT_ANSWER || !this.pending) return false;
    const m = this.options.mode;
    if (m === 'duel') return this._sideOf(pid) === this._other(this._sideOf(this.pending.by));
    if (m === 'meneur') return pid === this.meneurId;
    if (m === 'postit') return pid !== this.pending.by && this.order.includes(pid);
    return false;
  }

  _answer(pid, answer) {
    if (!this._canAnswer(pid) || !ANSWERS.includes(answer)) return;
    const p = this.pending;
    this.pending = null;
    this._push({ t: 'q', by: p.by, text: p.text, answer, answeredBy: pid });
    this.phase = PH.PLAY;
    this._nextTurn();
  }

  /** Abaisse les visages qui ne collent pas avec la réponse (plateau du camp / des joueurs qui devinent). */
  _autoFlip(pid, q, answer) {
    const keys = this.options.mode === 'duel' ? [this._sideOf(pid)] : this._guessers();
    for (const key of keys) {
      const set = this.flips.get(key) || new Set();
      for (const id of this.board || []) {
        if (q.test(CHAR_BY_ID.get(id)) !== (answer === 'yes')) set.add(id);
      }
      this.flips.set(key, set);
    }
  }

  _nextTurn() {
    const m = this.options.mode;
    if (m === 'duel') this.turnId = this._other(this.turnId);
    else if (m === 'meneur') {
      const g = this._guessers();
      if (!g.length) return this._endMeneurRound(null);
      const i = g.indexOf(this.turnId);
      this.turnId = g[(i + 1) % g.length] || g[0];
    } else if (m === 'postit') {
      const g = this._postitPlayers();
      if (g.length <= 1) return this._postitEnd();
      const i = this.order.indexOf(this.turnId);
      for (let k = 1; k <= this.order.length; k++) {
        const id = this.order[(i + k) % this.order.length];
        if (g.includes(id)) { this.turnId = id; break; }
      }
    }
    this.setPhase(PH.PLAY);
  }

  // ───────── Propositions ─────────
  _guess(pid, charId) {
    if (!CHAR_BY_ID.has(charId)) return;
    const m = this.options.mode;
    if (this.phase !== PH.PLAY) return;
    if (m === 'duel') {
      const side = this._sideOf(pid);
      if (side !== this.turnId) return;
      const target = this.sides[this._other(side)].secret;
      const ok = charId === target;
      this._push({ t: 'guess', by: pid, char: charId, ok, accent: true });
      if (ok) return this._duelEnd(side, `${this._sideName(side)} a trouvé ${this._char(target)} !`);
      if (this.options.wrongGuess === 'lose') return this._duelEnd(this._other(side), `${this._sideName(side)} s'est trompé : ce n'était pas ${this._char(charId)}.`);
      this.flips.get(side)?.add(charId);
      return this._nextTurn();
    }
    if (m === 'meneur') {
      if (pid !== this.turnId) return;
      const ok = charId === this.secret;
      this._push({ t: 'guess', by: pid, char: charId, ok, accent: true });
      if (ok) return this._endMeneurRound(pid);
      this.out.add(pid);
      if (!this._guessers().length) return this._endMeneurRound(null);
      return this._nextTurn();
    }
    if (m === 'postit') {
      if (pid !== this.turnId) return;
      const ok = charId === this.secrets.get(pid);
      this._push({ t: 'guess', by: pid, char: charId, ok, accent: true });
      if (ok) {
        this.found.set(pid, { rank: this.found.size + 1, questions: this.qcount.get(pid) || 0 });
        this.scores.set(pid, Math.max(1, 10 - this.found.size * 2 + 2));
      }
      return this._nextTurn();
    }
  }

  _duelEnd(winnerSide, text) {
    this.clearAllTimers();
    for (const id of this.sides[winnerSide].members) this.scores.set(id, (this.scores.get(id) || 0) + 1);
    this.result = { winnerSide, text, secrets: { A: this.sides.A.secret, B: this.sides.B.secret } };
    this._gameOver();
  }

  _postitEnd() {
    for (const id of this._postitPlayers()) this.found.set(id, { rank: null, questions: this.qcount.get(id) || 0 });
    this.result = { secrets: Object.fromEntries(this.secrets) };
    this._gameOver();
  }

  _gameOver() {
    this.clearAllTimers();
    this.pending = null;
    this.setPhase(PH.GAME_OVER);
  }

  // ───────── Utilitaires ─────────
  _name(id) { return this.names.get(id)?.pseudo || '?'; }
  _char(id) { return CHAR_BY_ID.get(id)?.name || '?'; }
  _push(e) { this.log.push({ ...e, at: Date.now(), round: this.round }); if (this.log.length > 300) this.log.shift(); }

  // ───────── Arrivées / départs ─────────
  onPlayerJoinedMidGame() { this.room.emitGameState(); }
  onPlayerReconnected() { this.room.emitGameState(); }

  onPlayerLeft(playerId) {
    if (!this.order.includes(playerId)) return this.room.emitGameState();
    const m = this.options.mode;
    this._push({ t: 'left', by: playerId });
    if (this.phase === PH.GAME_OVER) return this.room.emitGameState();
    if (m === 'duel') {
      const side = this._sideOf(playerId);
      if (side) this.sides[side].members = this.sides[side].members.filter((id) => id !== playerId);
      if (side && !this.sides[side].members.length) return this._duelEnd(this._other(side), `${this._name(playerId)} est parti.`);
      if (this.pending && this._sideOf(this.pending.by) === null) { this.pending = null; this.phase = PH.PLAY; }
      return this.room.emitGameState();
    }
    if (m === 'meneur') {
      if (playerId === this.meneurId) return this._endMeneurRound(null);
      if (this.pending?.by === playerId) { this.pending = null; this.phase = PH.PLAY; }
      if (this.turnId === playerId) return this._nextTurn();
      if (!this._guessers().length) return this._endMeneurRound(null);
      return this.room.emitGameState();
    }
    if (m === 'postit') {
      if (this.pending?.by === playerId) { this.pending = null; this.phase = PH.PLAY; }
      if (this.turnId === playerId || this._postitPlayers().length <= 1) return this._nextTurn();
      return this.room.emitGameState();
    }
    if (m === 'akinator' && this.aki?.thinker === playerId && this.phase !== PH.RESULT) {
      this.clearAllTimers();
      return this._startAkiRound();
    }
    return this.room.emitGameState();
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload = {}) {
    const isHost = playerId === this.room.hostId;
    switch (type) {
      case 'ask': return this._ask(playerId, payload);
      case 'answer': return this._answer(playerId, payload?.answer);
      case 'guess': return this._guess(playerId, payload?.charId);
      case 'flip': {
        const key = this.options.mode === 'duel' ? this._sideOf(playerId) : playerId;
        if (!key || !this.board?.includes(payload?.charId)) return;
        const set = this.flips.get(key) || new Set();
        if (payload.down === false || (payload.down === undefined && set.has(payload.charId))) set.delete(payload.charId);
        else set.add(payload.charId);
        this.flips.set(key, set);
        return this.room.emitGameState();
      }
      case 'resetFlips': {
        const key = this.options.mode === 'duel' ? this._sideOf(playerId) : playerId;
        if (key) this.flips.set(key, new Set());
        return this.room.emitGameState();
      }
      case 'pick': {
        // meneur joueur : choisit le perso caché ; app devine : le joueur qui pense choisit le sien
        const charId = payload?.random ? null : payload?.charId;
        if (this.phase !== PH.PICK) return;
        if (this.options.mode === 'meneur' && playerId === this.meneurId) {
          this.secret = charId && this.board.includes(charId) ? charId : this.board[Math.floor(Math.random() * this.board.length)];
          this.turnId = this._guessers()[0] || null;
          if (!this.turnId) return this._endMeneurRound(null);
          return this.setPhase(PH.PLAY);
        }
        if (this.options.mode === 'akinator' && playerId === this.aki?.thinker) {
          const pick = charId && this.pool.includes(charId) ? charId : this.pool[Math.floor(Math.random() * this.pool.length)];
          this.aki.secret = pick;
          this.aki.weights = new Map(this.pool.map((id) => [id, 1]));
          this._push({ t: 'aki_start', by: playerId, text: `${this._name(playerId)} pense à un personnage…` });
          return this._akiNext();
        }
        return;
      }
      case 'akiAnswer':
        if (this.phase === PH.AKI && playerId === this.aki?.thinker && AKI_ANSWERS.includes(payload?.answer)) this._akiAnswer(payload.answer);
        return;
      case 'akiConfirm': {
        if (this.phase !== PH.AKI_GUESS || playerId !== this.aki?.thinker) return;
        const a = this.aki;
        this._push({ t: 'aki_guess', char: a.guess, ok: !!payload?.yes, accent: true });
        if (payload?.yes) return this._akiEnd(true);
        a.wrong.add(a.guess);
        a.weights.set(a.guess, 0);
        a.guess = null;
        return this._akiNext();
      }
      case 'skip': // l'hôte passe le tour d'un joueur absent
        if (!isHost) return;
        if (this.phase === PH.WAIT_ANSWER) { this.pending = null; this.phase = PH.PLAY; }
        if (this.phase === PH.PLAY) return this._nextTurn();
        if (this.phase === PH.RESULT) { this.clearAllTimers(); return this.options.mode === 'akinator' ? this._startAkiRound() : this._startMeneurRound(); }
        if (this.phase === PH.PICK) return this.handleAction(this.options.mode === 'meneur' ? this.meneurId : this.aki?.thinker, 'pick', { random: true });
        return;
      case 'next':
        if (!isHost || this.phase !== PH.RESULT) return;
        this.clearAllTimers();
        if (this.options.mode === 'akinator') return this._startAkiRound();
        if (this.options.mode === 'meneur') {
          const last = this.options.meneur === 'players' ? this.round >= this.order.length : this.round >= this.options.rounds;
          return last ? this._gameOver() : this._startMeneurRound();
        }
        return;
      case 'restart':
        if (isHost && this.phase === PH.GAME_OVER) this.start();
        return;
      case 'endGame':
        if (!isHost) return;
        this.clearAllTimers();
        return this.room.endGame({ game: 'whoisit' });
      default:
    }
  }

  // ───────── États ─────────
  _ranking() {
    const m = this.options.mode;
    const rows = this.order.map((id) => ({ id, ...this.names.get(id), score: this.scores.get(id) || 0 }));
    if (m === 'postit') {
      return rows.map((r) => ({ ...r, found: this.found.get(r.id)?.rank ?? null, questions: this.found.get(r.id)?.questions ?? this.qcount.get(r.id) ?? 0 }))
        .sort((a, b) => (a.found ?? 99) - (b.found ?? 99) || a.questions - b.questions);
    }
    return rows.sort((a, b) => b.score - a.score);
  }

  getPublicState() {
    const m = this.options.mode;
    const over = this.phase === PH.GAME_OVER || this.phase === PH.RESULT;
    const questions = QUESTION_LIST.filter((q) => !q.universe || !this.options.universes.length || this.options.universes.includes(q.universe));
    return {
      phase: this.phase,
      mode: m,
      gameNo: this.gameNo,
      options: this.options,
      round: this.round,
      players: this.order.map((id) => ({ id, ...this.names.get(id), connected: !!this.room.players.get(id)?.connected, present: this.room.players.has(id), score: this.scores.get(id) || 0 })),
      board: this.board,
      pool: m === 'postit' || m === 'akinator' ? this.pool : null,
      questions,
      log: this.log.slice(-80),
      pending: this.pending,
      turnId: this.turnId,
      // duel
      sides: this.sides ? { A: { members: this.sides.A.members }, B: { members: this.sides.B.members } } : null,
      // meneur
      meneurId: this.meneurId,
      out: [...this.out],
      // postit : qui a trouvé
      found: Object.fromEntries(this.found),
      qcount: Object.fromEntries(this.qcount),
      // app devine (le perso choisi est visible de tous sauf… de l'app !)
      aki: this.aki ? { thinker: this.aki.thinker, secret: this.aki.secret, current: this.aki.current, guess: this.aki.guess, count: this.aki.count, wrong: [...this.aki.wrong] } : null,
      akiStats: this.akiStats,
      result: this.result,
      secretRevealed: over && m === 'meneur' ? this.secret : null,
      ranking: this.phase === PH.GAME_OVER ? this._ranking() : null,
    };
  }

  getPrivateStateFor(pid) {
    const m = this.options.mode;
    const out = { seated: this.order.includes(pid) };
    if (m === 'duel' && this.sides) {
      const side = this._sideOf(pid);
      out.side = side;
      out.mySecret = side ? this.sides[side].secret : null;
      out.flips = side ? [...(this.flips.get(side) || [])] : [];
      out.canAnswer = this._canAnswer(pid);
    } else if (m === 'meneur') {
      out.isMeneur = pid === this.meneurId;
      out.secret = pid === this.meneurId ? this.secret : null;
      out.flips = [...(this.flips.get(pid) || [])];
      out.canAnswer = this._canAnswer(pid);
    } else if (m === 'postit') {
      const others = {};
      for (const [id, c] of this.secrets) if (id !== pid || this.found.has(pid)) others[id] = c;
      out.secrets = others;
      out.canAnswer = this._canAnswer(pid);
    }
    out.canAsk = this._canAsk(pid);
    return out;
  }
}
