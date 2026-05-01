import { BaseGame } from '../../core/BaseGame.js';
import { pickQuestions, listCategories, isValidCategory } from './questions.js';
import { logger } from '../../utils/logger.js';

const PHASES = {
  QUESTION: 'QUESTION',
  PODIUM: 'PODIUM',
};

const DIFFICULTIES = ['random', 'easy', 'medium', 'hard', 'extreme'];

const DEFAULT_OPTIONS = {
  category: 'all',
  difficulty: 'random',
  nbQuestions: 10,
  timePerQuestionSec: 20,
  hardcoreMode: false,
  battleRoyaleMode: false,
};

/** Points de base par difficulté (avant bonus de rapidité). */
const BASE_POINTS_BY_DIFFICULTY = { 1: 50, 2: 100, 3: 150, 4: 250 };

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export class QuizGame extends BaseGame {
  static id = 'quiz';
  static label = 'Quiz culture G';
  static minPlayers = 3;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return {
      categories: listCategories(),
      difficulties: DIFFICULTIES.map(id => ({
        id,
        label: { random: '🎲 Aléatoire', easy: '🟢 Facile', medium: '🟡 Moyen', hard: '🟠 Difficile', extreme: '🔴 Extrême' }[id],
      })),
      defaults: DEFAULT_OPTIONS,
      limits: {
        nbQuestions: { min: 3, max: 30 },
        timePerQuestionSec: { min: 5, max: 60 },
      },
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = this._sanitizeOptions(options);
    this.questions = [];
    this.currentIdx = -1;
    this.questionEndsAt = null;
    this.answers = new Map();
    this.scores = new Map();
    this.history = [];
    // Battle Royale
    this.eliminatedIds = new Set();
    this.eliminationOrder = []; // playerIds dans l'ordre où ils ont été éliminés
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    if (!isValidCategory(o.category)) o.category = 'all';
    if (!DIFFICULTIES.includes(o.difficulty)) o.difficulty = 'random';
    o.nbQuestions = Math.max(3, Math.min(30, parseInt(o.nbQuestions, 10) || 10));
    o.timePerQuestionSec = Math.max(5, Math.min(60, parseInt(o.timePerQuestionSec, 10) || 20));
    o.hardcoreMode = !!o.hardcoreMode;
    o.battleRoyaleMode = !!o.battleRoyaleMode;
    return o;
  }

  start() {
    // Anti-répétition : exclure les questions vues lors des 5 dernières parties
    const excluded = this.room.getExcludedQuizQuestionIds?.() || new Set();
    this.questions = pickQuestions(
      this.options.category,
      this.options.nbQuestions,
      this.options.difficulty,
      excluded,
    );
    if (this.questions.length === 0) {
      this.room.broadcast('error', { code: 'NO_QUESTIONS' });
      this.room.endGame({ aborted: true });
      return;
    }
    for (const id of this.playerIds) this.scores.set(id, 0);
    logger.info({
      room: this.room.code, nb: this.questions.length,
      cat: this.options.category, diff: this.options.difficulty,
      hardcore: this.options.hardcoreMode, br: this.options.battleRoyaleMode,
    }, 'Quiz started');
    this._nextQuestion();
  }

  onPlayerJoinedMidGame(playerId) {
    if (!this.scores.has(playerId)) this.scores.set(playerId, 0);
    this.room.emitGameState();
  }

  _nextQuestion() {
    this.clearAllTimers();
    if (this.currentIdx >= 0) this._archiveCurrentQuestion();

    this.currentIdx += 1;
    this.answers.clear();

    if (this.currentIdx >= this.questions.length) return this._endQuiz();

    // Battle Royale : si <= 1 joueur restant, fin
    if (this.options.battleRoyaleMode) {
      const aliveCount = this.playerIds.filter(id => !this.eliminatedIds.has(id)).length;
      if (aliveCount <= 1) return this._endQuiz();
    }

    this.questionEndsAt = Date.now() + this.options.timePerQuestionSec * 1000;
    this.setPhase(PHASES.QUESTION);
    this.setTimer(this.options.timePerQuestionSec * 1000, () => {
      if (this.phase === PHASES.QUESTION) this._nextQuestion();
    });
  }

  _archiveCurrentQuestion() {
    const q = this.questions[this.currentIdx];
    if (!q) return;
    const totalMs = this.options.timePerQuestionSec * 1000;
    const basePoints = BASE_POINTS_BY_DIFFICULTY[q.difficulty] || 50;
    const perPlayer = {};

    for (const id of this.playerIds) {
      // En Battle Royale, les éliminés ne participent pas
      if (this.options.battleRoyaleMode && this.eliminatedIds.has(id)) {
        perPlayer[id] = { answered: false, correct: false, points: 0, eliminated: true };
        continue;
      }

      const a = this.answers.get(id);
      if (!a) {
        perPlayer[id] = { answered: false, correct: false, points: 0 };
        // En Battle Royale : pas répondu = éliminé
        if (this.options.battleRoyaleMode && !this.eliminatedIds.has(id)) {
          this.eliminatedIds.add(id);
          this.eliminationOrder.push(id);
          perPlayer[id].justEliminated = true;
        }
        continue;
      }

      const correct = this._isAnswerCorrect(a, q);
      let points = 0;
      if (correct) {
        const remaining = Math.max(0, this.questionEndsAt - a.ts);
        const speedRatio = totalMs > 0 ? remaining / totalMs : 0;
        // base + jusqu'à 100% de bonus rapidité
        points = basePoints + Math.round(basePoints * speedRatio);
      }
      this.scores.set(id, (this.scores.get(id) || 0) + points);

      const entry = { answered: true, value: a.value, correct, points };
      // Battle Royale : mauvaise réponse = éliminé
      if (this.options.battleRoyaleMode && !correct && !this.eliminatedIds.has(id)) {
        this.eliminatedIds.add(id);
        this.eliminationOrder.push(id);
        entry.justEliminated = true;
      }
      perPlayer[id] = entry;
    }

    this.history.push({
      question: q.question,
      answers: q.answers,
      correct: q.correct,
      correctAnswer: q.answers[q.correct],
      category: q.category,
      difficulty: q.difficulty,
      image: q.image,
      perPlayer,
    });
  }

  _isAnswerCorrect(answerObj, question) {
    if (this.options.hardcoreMode) {
      return normalize(answerObj.value) === normalize(question.answers[question.correct]);
    }
    return parseInt(answerObj.value, 10) === question.correct;
  }

  _endQuiz() {
    this.clearAllTimers();
    // Enregistre les IDs des questions vues pour anti-répétition future
    const ids = this.questions.map(q => q.id).filter(Boolean);
    this.room.recordQuizGame?.(ids);
    this.setPhase(PHASES.PODIUM);
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    switch (type) {
      case 'answer':       return this._onAnswer(playerId, payload);
      case 'endGame':      return this._onEndGame(playerId);
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  _onAnswer(playerId, payload) {
    if (this.phase !== PHASES.QUESTION) return this._error(playerId, 'BAD_PHASE');
    if (this.options.battleRoyaleMode && this.eliminatedIds.has(playerId)) {
      return this._error(playerId, 'ELIMINATED', 'Tu es éliminé.');
    }
    if (this.answers.has(playerId)) return this._error(playerId, 'ALREADY_ANSWERED');

    let value;
    if (this.options.hardcoreMode) {
      value = String(payload?.value || '').trim().slice(0, 50);
      if (!value) return this._error(playerId, 'EMPTY_ANSWER', 'Réponse vide.');
    } else {
      const idx = parseInt(payload?.idx, 10);
      if (![0, 1, 2, 3].includes(idx)) return this._error(playerId, 'BAD_ANSWER_IDX');
      value = idx;
    }

    this.answers.set(playerId, { value, ts: Date.now() });
    this.room.broadcast('game:event', { type: 'answered', payload: { playerId } });
    this.room.emitGameState();

    // Si tous les joueurs ENCORE EN VIE ont répondu, on enchaîne
    const aliveIds = this.playerIds.filter(id => !this.eliminatedIds.has(id));
    if (aliveIds.every(id => this.answers.has(id))) {
      this._nextQuestion();
    }
  }

  _onEndGame(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    this.cleanup();
    this.room.endGame({
      game: 'quiz',
      finalScores: Object.fromEntries(this.scores),
      questionCount: this.questions.length,
    });
  }

  // ───────── States ─────────
  getPublicState() {
    const base = {
      phase: this.phase,
      currentIdx: this.currentIdx,
      total: this.questions.length,
      options: this.options,
      eliminatedIds: [...this.eliminatedIds],
    };

    if (this.phase === PHASES.QUESTION) {
      const q = this.questions[this.currentIdx];
      return {
        ...base,
        question: q.question,
        answers: this.options.hardcoreMode ? null : q.answers,
        category: q.category,
        difficulty: q.difficulty,
        image: q.image || null,
        questionEndsAt: this.questionEndsAt,
        answeredIds: [...this.answers.keys()],
      };
    }

    if (this.phase === PHASES.PODIUM) {
      // Classement final :
      // - alive d'abord (par score desc)
      // - puis éliminés en ordre INVERSE d'élimination (le dernier éliminé = mieux classé parmi les éliminés)
      const alive = [...this.scores.entries()]
        .filter(([id]) => !this.eliminatedIds.has(id))
        .map(([playerId, points]) => ({ playerId, points, eliminated: false }))
        .sort((a, b) => b.points - a.points);

      const eliminatedReversed = [...this.eliminationOrder].reverse()
        .map(id => ({ playerId: id, points: this.scores.get(id) || 0, eliminated: true }));

      const ranking = [...alive, ...eliminatedReversed];

      return {
        ...base,
        ranking,
        history: this.history,
        scores: Object.fromEntries(this.scores),
      };
    }
    return base;
  }

  getPrivateStateFor(playerId) {
    if (this.phase === PHASES.QUESTION) {
      return {
        hasAnswered: this.answers.has(playerId),
        eliminated: this.options.battleRoyaleMode && this.eliminatedIds.has(playerId),
      };
    }
    return {};
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
