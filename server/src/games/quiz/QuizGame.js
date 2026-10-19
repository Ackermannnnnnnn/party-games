import { BaseGame } from '../../core/BaseGame.js';
import { pickQuestions, listCategories, isValidCategory, categoryLabel } from './questions.js';
import { logger } from '../../utils/logger.js';

/**
 * Quiz culture G.
 *   COUNTDOWN (3, 2, 1…) → QUESTION → REVEAL (bonne réponse, qui a répondu quoi, points) → … → PODIUM
 *
 * Points : base selon la difficulté, + jusqu'à 50 % pour la rapidité, + 10 % par bonne réponse
 * d'affilée (série, max +50 %), ×2 avec le joker « Double ».
 * Jokers (une fois par partie) : 50/50 (retire deux mauvaises réponses) et Double (points ×2).
 * Modes : réponse libre (on tape la réponse, fautes légères tolérées) et Battle Royale (une erreur = éliminé).
 */
const PHASES = { COUNTDOWN: 'COUNTDOWN', QUESTION: 'QUESTION', REVEAL: 'REVEAL', PODIUM: 'PODIUM' };
const DIFFICULTIES = ['random', 'progressive', 'easy', 'medium', 'hard', 'extreme'];
const DIFF_LABEL = { random: '🎲 Aléatoire', progressive: '📈 Progressive', easy: '🟢 Facile', medium: '🟡 Moyen', hard: '🟠 Difficile', extreme: '🔴 Extrême' };
const BASE_POINTS = { 1: 100, 2: 150, 3: 200, 4: 300 };
const COUNTDOWN_MS = 3500;
const REVEAL_MS = 7000;

const DEFAULT_OPTIONS = {
  categories: [],
  difficulty: 'random',
  nbQuestions: 15,
  timePerQuestionSec: 20,
  hardcoreMode: false,
  battleRoyaleMode: false,
  jokers: true,
};

const normalize = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/^(le|la|les|l|un|une|des|du|de|d)\b\s*'?\s*/i, '')
  .replace(/[^a-z0-9]/g, '');

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length; const n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Réponse libre : accepte casse/accents/articles, et une ou deux fautes de frappe selon la longueur. */
export function freeAnswerMatches(given, expected, alt = []) {
  const g = normalize(given);
  if (!g) return false;
  for (const target of [expected, ...(alt || [])]) {
    const t = normalize(target);
    if (!t) continue;
    if (g === t) return true;
    if (/^\d+$/.test(t)) continue; // les nombres doivent être exacts
    const tolerance = t.length >= 9 ? 2 : t.length >= 5 ? 1 : 0;
    if (tolerance && levenshtein(g, t) <= tolerance) return true;
  }
  return false;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class QuizGame extends BaseGame {
  static id = 'quiz';
  static label = 'Quiz culture G';
  static minPlayers = 1;
  static maxPlayers = 20;

  static getOptionsManifest() {
    return {
      categories: listCategories().filter((c) => c.id !== 'all'),
      difficulties: DIFFICULTIES.map((id) => ({ id, label: DIFF_LABEL[id] })),
      defaults: DEFAULT_OPTIONS,
      limits: { nbQuestions: { min: 5, max: 40 }, timePerQuestionSec: { min: 8, max: 60 } },
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = this._sanitizeOptions(options);
    this.gameNo = 0;
    this._reset();
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    let cats = Array.isArray(o.categories) ? o.categories : [];
    if (!cats.length && typeof raw?.category === 'string' && raw.category !== 'all') cats = [raw.category]; // ancien format
    o.categories = [...new Set(cats.filter((c) => c !== 'all' && isValidCategory(c)))];
    delete o.category;
    if (!DIFFICULTIES.includes(o.difficulty)) o.difficulty = 'random';
    o.nbQuestions = Math.max(5, Math.min(40, parseInt(o.nbQuestions, 10) || 15));
    o.timePerQuestionSec = Math.max(8, Math.min(60, parseInt(o.timePerQuestionSec, 10) || 20));
    o.hardcoreMode = !!o.hardcoreMode;
    o.battleRoyaleMode = !!o.battleRoyaleMode;
    o.jokers = o.jokers !== false;
    return o;
  }

  _reset() {
    this.questions = [];
    this.currentIdx = -1;
    this.questionEndsAt = null;
    this.phaseEndsAt = null;
    this.answers = new Map();       // id -> { value, ts }
    this.scores = new Map();
    this.streaks = new Map();
    this.bestStreaks = new Map();
    this.correctCounts = new Map();
    this.jokers = new Map();        // id -> { fifty, double }
    this.fiftyRemoved = new Map();  // id -> [index, index] pour la question en cours
    this.doubled = new Set();       // joker « Double » joué sur la question en cours
    this.history = [];
    this.lastReveal = null;
    this.eliminatedIds = new Set();
    this.eliminationOrder = [];
  }

  _addPlayer(id) {
    if (!this.scores.has(id)) this.scores.set(id, 0);
    if (!this.streaks.has(id)) this.streaks.set(id, 0);
    if (!this.jokers.has(id)) this.jokers.set(id, { fifty: this.options.jokers, double: this.options.jokers });
  }

  // ───────── Déroulement ─────────
  start() {
    this._reset();
    this.gameNo += 1;
    const excluded = this.room.getExcludedQuizQuestionIds?.() || new Set();
    const picked = pickQuestions(this.options.categories, this.options.nbQuestions, this.options.difficulty, excluded);
    if (picked.length === 0) {
      this.room.broadcast('error', { code: 'NO_QUESTIONS', message: 'Aucune question pour ces réglages.' });
      this.room.endGame({ aborted: true });
      return;
    }
    // On mélange l'ordre des réponses : la bonne n'est jamais toujours au même endroit
    this.questions = picked.map((q) => {
      const order = shuffle([0, 1, 2, 3].slice(0, q.answers.length));
      return { ...q, answers: order.map((i) => q.answers[i]), correct: order.indexOf(q.correct) };
    });
    for (const id of this.playerIds) this._addPlayer(id);
    logger.info({ room: this.room.code, nb: this.questions.length, cats: this.options.categories, diff: this.options.difficulty }, 'Quiz started');
    this.phaseEndsAt = Date.now() + COUNTDOWN_MS;
    this.setPhase(PHASES.COUNTDOWN);
    this.setTimer(COUNTDOWN_MS, () => this._ask(0));
  }

  _ask(idx) {
    this.clearAllTimers();
    this.currentIdx = idx;
    this.answers.clear();
    this.fiftyRemoved.clear();
    this.doubled.clear();
    this.lastReveal = null;
    this.questionEndsAt = Date.now() + this.options.timePerQuestionSec * 1000;
    this.phaseEndsAt = this.questionEndsAt;
    this.setPhase(PHASES.QUESTION);
    this.setTimer(this.options.timePerQuestionSec * 1000, () => this._reveal());
  }

  _alive(id) { return !(this.options.battleRoyaleMode && this.eliminatedIds.has(id)); }

  /** Joueurs dont on attend la réponse : présents, connectés, pas éliminés. */
  _expected() {
    return this.playerIds.filter((id) => this.room.players.get(id)?.connected && this._alive(id));
  }

  _checkAllAnswered() {
    const expected = this._expected();
    if (this.phase === PHASES.QUESTION && expected.length > 0 && expected.every((id) => this.answers.has(id))) {
      this.clearAllTimers();
      this.setTimer(700, () => this._reveal());
    }
  }

  _isCorrect(answer, q) {
    if (this.options.hardcoreMode) return freeAnswerMatches(answer.value, q.answers[q.correct], q.alt);
    return answer.value === q.correct;
  }

  _reveal() {
    if (this.phase !== PHASES.QUESTION) return;
    this.clearAllTimers();
    const q = this.questions[this.currentIdx];
    const totalMs = this.options.timePerQuestionSec * 1000;
    const base = BASE_POINTS[q.difficulty] || 100;
    const perPlayer = {};
    const counts = [0, 0, 0, 0];
    const typed = [];

    for (const id of this.scores.keys()) {
      if (!this.room.players.has(id)) continue;
      if (!this._alive(id)) { perPlayer[id] = { eliminated: true }; continue; }
      const a = this.answers.get(id);
      const prevStreak = this.streaks.get(id) || 0;
      if (!a) {
        this.streaks.set(id, 0);
        perPlayer[id] = { answered: false, correct: false, points: 0, streak: 0 };
      } else {
        const correct = this._isCorrect(a, q);
        if (this.options.hardcoreMode) typed.push({ id, value: a.value, correct });
        else if (counts[a.value] !== undefined) counts[a.value] += 1;
        let points = 0;
        const streak = correct ? prevStreak + 1 : 0;
        if (correct) {
          const speed = totalMs > 0 ? Math.max(0, this.questionEndsAt - a.ts) / totalMs : 0;
          points = base * (1 + 0.5 * speed) * (1 + 0.1 * Math.min(prevStreak, 5));
          if (this.doubled.has(id)) points *= 2;
          points = Math.round(points / 5) * 5;
          this.correctCounts.set(id, (this.correctCounts.get(id) || 0) + 1);
        }
        this.streaks.set(id, streak);
        this.bestStreaks.set(id, Math.max(this.bestStreaks.get(id) || 0, streak));
        this.scores.set(id, (this.scores.get(id) || 0) + points);
        perPlayer[id] = { answered: true, value: a.value, correct, points, streak, doubled: this.doubled.has(id), fast: correct && (a.ts - (this.questionEndsAt - totalMs)) < 3000 };
      }
      // Battle Royale : une erreur ou pas de réponse = éliminé
      if (this.options.battleRoyaleMode && !perPlayer[id].correct && !this.eliminatedIds.has(id)) {
        this.eliminatedIds.add(id);
        this.eliminationOrder.push(id);
        perPlayer[id].justEliminated = true;
      }
    }
    // Battle Royale : si tout le monde se trompe en même temps, personne n'est éliminé
    if (this.options.battleRoyaleMode) {
      const newly = Object.entries(perPlayer).filter(([, p]) => p.justEliminated).map(([id]) => id);
      const stillAlive = [...this.scores.keys()].filter((id) => this.room.players.has(id) && !this.eliminatedIds.has(id));
      if (newly.length && stillAlive.length === 0) {
        for (const id of newly) { this.eliminatedIds.delete(id); perPlayer[id].justEliminated = false; perPlayer[id].saved = true; }
        this.eliminationOrder = this.eliminationOrder.filter((id) => !newly.includes(id));
      }
    }

    this.lastReveal = {
      index: this.currentIdx,
      correct: q.correct,
      correctAnswer: q.answers[q.correct],
      counts,
      typed,
      perPlayer,
    };
    this.history.push({
      question: q.question, answers: q.answers, correct: q.correct, correctAnswer: q.answers[q.correct],
      category: q.category, difficulty: q.difficulty, image: q.image, perPlayer,
    });
    this.phaseEndsAt = Date.now() + REVEAL_MS;
    this.setPhase(PHASES.REVEAL);
    this.setTimer(REVEAL_MS, () => this._next());
  }

  _next() {
    this.clearAllTimers();
    const aliveCount = [...this.scores.keys()].filter((id) => this.room.players.has(id) && this._alive(id)).length;
    const brOver = this.options.battleRoyaleMode && aliveCount <= 1 && this.scores.size > 1;
    if (this.currentIdx + 1 >= this.questions.length || brOver) return this._end();
    this._ask(this.currentIdx + 1);
  }

  _end() {
    this.clearAllTimers();
    this.phaseEndsAt = null;
    this.room.recordQuizGame?.(this.questions.map((q) => q.id).filter(Boolean));
    this.setPhase(PHASES.PODIUM);
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame(playerId) {
    this._addPlayer(playerId);
    this.room.emitGameState();
  }

  onPlayerLeft() {
    this._checkAllAnswered();
    this.room.emitGameState();
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload) {
    const isHost = playerId === this.room.hostId;
    switch (type) {
      case 'answer': return this._onAnswer(playerId, payload);
      case 'joker': return this._onJoker(playerId, payload);
      case 'next':
        if (!isHost) return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut passer.");
        if (this.phase === PHASES.REVEAL) return this._next();
        if (this.phase === PHASES.QUESTION) return this._reveal();
        return undefined;
      case 'restart':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        if (this.phase === PHASES.PODIUM) this.start();
        return undefined;
      case 'endGame':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        this.cleanup();
        return this.room.endGame({ game: 'quiz', finalScores: Object.fromEntries(this.scores), questionCount: this.questions.length });
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue : ${type}`);
    }
  }

  _onAnswer(playerId, payload) {
    if (this.phase !== PHASES.QUESTION) return;
    this._addPlayer(playerId);
    if (!this._alive(playerId)) return this._error(playerId, 'ELIMINATED', 'Tu es éliminé.');
    if (this.answers.has(playerId)) return;
    let value;
    if (this.options.hardcoreMode) {
      value = String(payload?.value ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
      if (!value) return this._error(playerId, 'EMPTY_ANSWER', 'Réponse vide.');
    } else {
      value = parseInt(payload?.idx, 10);
      const q = this.questions[this.currentIdx];
      if (!Number.isInteger(value) || value < 0 || value >= q.answers.length) return this._error(playerId, 'BAD_ANSWER_IDX');
      if ((this.fiftyRemoved.get(playerId) || []).includes(value)) return;
    }
    this.answers.set(playerId, { value, ts: Date.now() });
    this.room.broadcast('game:event', { type: 'answered', payload: { playerId } });
    this.room.emitGameState();
    this._checkAllAnswered();
  }

  _onJoker(playerId, payload) {
    if (this.phase !== PHASES.QUESTION || !this.options.jokers || this.answers.has(playerId) || !this._alive(playerId)) return;
    this._addPlayer(playerId);
    const j = this.jokers.get(playerId);
    const kind = payload?.type;
    if (kind === 'fifty' && j.fifty && !this.options.hardcoreMode) {
      const q = this.questions[this.currentIdx];
      const wrong = shuffle(q.answers.map((_, i) => i).filter((i) => i !== q.correct)).slice(0, 2);
      this.fiftyRemoved.set(playerId, wrong);
      j.fifty = false;
    } else if (kind === 'double' && j.double) {
      this.doubled.add(playerId);
      j.double = false;
    } else return;
    this.room.emitToPlayer(playerId, 'game:state', { public: this.getPublicState(), private: this.getPrivateStateFor(playerId) });
  }

  // ───────── États ─────────
  _leaderboard() {
    const alive = [];
    for (const [id, points] of this.scores) {
      const p = this.room.players.get(id);
      if (!p && !points) continue;
      alive.push({
        playerId: id, pseudo: p?.pseudo || '?', avatar: p?.avatar || null, points,
        eliminated: this.eliminatedIds.has(id), streak: this.streaks.get(id) || 0, left: !p,
      });
    }
    // En Battle Royale, les survivants d'abord, puis les éliminés du dernier au premier
    const order = new Map([...this.eliminationOrder].reverse().map((id, i) => [id, i]));
    return alive.sort((a, b) => {
      if (this.options.battleRoyaleMode && a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (this.options.battleRoyaleMode && a.eliminated && b.eliminated) return order.get(a.playerId) - order.get(b.playerId);
      return b.points - a.points;
    });
  }

  getPublicState() {
    const base = {
      phase: this.phase,
      gameNo: this.gameNo,
      currentIdx: this.currentIdx,
      total: this.questions.length,
      options: this.options,
      phaseEndsAt: this.phaseEndsAt,
      eliminatedIds: [...this.eliminatedIds],
      leaderboard: this._leaderboard(),
    };
    const q = this.questions[this.currentIdx];
    if ((this.phase === PHASES.QUESTION || this.phase === PHASES.REVEAL) && q) {
      Object.assign(base, {
        question: q.question,
        answers: this.options.hardcoreMode && this.phase === PHASES.QUESTION ? null : q.answers,
        category: q.category,
        categoryLabel: categoryLabel(q.category),
        difficulty: q.difficulty,
        image: q.image || null,
        questionEndsAt: this.questionEndsAt,
        answeredIds: [...this.answers.keys()],
        expectedIds: this._expected(),
      });
    }
    if (this.phase === PHASES.REVEAL) base.reveal = this.lastReveal;
    if (this.phase === PHASES.PODIUM) {
      base.ranking = this._leaderboard().map((r) => ({
        ...r,
        correct: this.correctCounts.get(r.playerId) || 0,
        bestStreak: this.bestStreaks.get(r.playerId) || 0,
      }));
      base.history = this.history;
      base.scores = Object.fromEntries(this.scores);
    }
    return base;
  }

  getPrivateStateFor(playerId) {
    const j = this.jokers.get(playerId) || { fifty: false, double: false };
    const a = this.answers.get(playerId);
    return {
      hasAnswered: !!a,
      myAnswer: a ? a.value : null,
      eliminated: this.options.battleRoyaleMode && this.eliminatedIds.has(playerId),
      jokers: { fifty: j.fifty && !this.options.hardcoreMode, double: j.double },
      removed: this.fiftyRemoved.get(playerId) || [],
      doubled: this.doubled.has(playerId),
      streak: this.streaks.get(playerId) || 0,
    };
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
