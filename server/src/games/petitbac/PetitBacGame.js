import { BaseGame } from '../../core/BaseGame.js';
import {
  CATEGORIES, DEFAULT_CATEGORY_IDS,
  EASY_LETTERS, ALL_LETTERS,
  listCategories, getCategoryById,
} from './categories.js';
import { logger } from '../../utils/logger.js';

const PHASES = {
  ROUND_INTRO: 'ROUND_INTRO',
  WRITING:     'WRITING',
  VALIDATING:  'VALIDATING',
  SCORING:     'SCORING',
  PODIUM:      'PODIUM',
};

const ROUND_INTRO_DURATION_MS = 4000;
const STOP_GRACE_MS = 10_000;
const VALIDATION_TIMER_MS = 60_000;

const DEFAULT_OPTIONS = {
  categoryIds: DEFAULT_CATEGORY_IDS,
  customCategories: [],          // [{ id, label, icon }] (custom de l'hôte)
  nbRounds: 5,
  timePerRoundSec: 90,
  validationMode: 'collective',  // 'collective' | 'auto' | 'host'
  stopMode: 'anyFull',           // 'disabled' | 'anyFull' | 'host'
  hardLetters: false,
};

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export class PetitBacGame extends BaseGame {
  static id = 'petitbac';
  static label = 'Petit Bac';
  static minPlayers = 3;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return {
      categories: listCategories(),
      defaults: DEFAULT_OPTIONS,
      limits: {
        nbRounds: { min: 1, max: 15 },
        timePerRoundSec: { min: 30, max: 300 },
      },
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = this._sanitizeOptions(options);

    // Catégories actives : built-in + custom (toutes utilisées)
    this.activeCategories = this._buildActiveCategories();

    this.round = 0;
    this.usedLetters = new Set();
    this.currentLetter = null;
    this.writingEndsAt = null;
    this.validationEndsAt = null;

    this.answers = new Map();
    this.submittedIds = new Set();
    this.stopperId = null;

    this.challenges = {};
    // Mode 'host' : jugement de l'hôte par target/category
    this.hostJudgments = {}; // { targetId: { category: bool /* true = invalide */ } }

    this.scores = new Map();
    this.lastRoundResult = null;
    this.history = [];
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    const validIds = new Set(CATEGORIES.map(c => c.id));
    o.categoryIds = (Array.isArray(o.categoryIds) ? o.categoryIds : []).filter(id => validIds.has(id));
    if (!Array.isArray(o.customCategories)) o.customCategories = [];
    // Sanitize custom : { id, label, icon }
    o.customCategories = o.customCategories
      .filter(c => c && typeof c.label === 'string')
      .slice(0, 8) // max 8 custom
      .map((c, i) => ({
        id: `custom_${i}_${normalize(c.label).slice(0, 12) || 'cat'}`,
        label: String(c.label).trim().slice(0, 30),
        icon: typeof c.icon === 'string' && c.icon.length <= 4 ? c.icon : '✨',
      }));
    if (o.categoryIds.length + o.customCategories.length < 3) {
      o.categoryIds = [...DEFAULT_CATEGORY_IDS];
    }
    o.nbRounds = Math.max(1, Math.min(15, parseInt(o.nbRounds, 10) || 5));
    o.timePerRoundSec = Math.max(30, Math.min(300, parseInt(o.timePerRoundSec, 10) || 90));
    o.validationMode = ['collective', 'auto', 'host'].includes(o.validationMode) ? o.validationMode : 'collective';
    o.stopMode = ['disabled', 'anyFull', 'host'].includes(o.stopMode) ? o.stopMode : 'anyFull';
    o.hardLetters = !!o.hardLetters;
    return o;
  }

  _buildActiveCategories() {
    const builtIn = this.options.categoryIds
      .map(id => getCategoryById(id))
      .filter(Boolean);
    return [...builtIn, ...this.options.customCategories];
  }

  // ───────── Lifecycle ─────────
  start() {
    for (const id of this.playerIds) this.scores.set(id, 0);
    logger.info({ room: this.room.code, options: this.options }, 'PetitBac started');
    this._startRound();
  }

  onPlayerJoinedMidGame(playerId) {
    if (!this.scores.has(playerId)) this.scores.set(playerId, 0);
    this.room.emitGameState();
  }

  isSpectator(playerId) {
    return !this.scores.has(playerId);
  }

  _pickLetter() {
    const pool = (this.options.hardLetters ? ALL_LETTERS : EASY_LETTERS)
      .filter(l => !this.usedLetters.has(l));
    if (pool.length === 0) {
      this.usedLetters.clear();
      return this._pickLetter();
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  _startRound() {
    this.round += 1;
    this.answers.clear();
    this.submittedIds.clear();
    this.stopperId = null;
    this.challenges = {};
    this.hostJudgments = {};

    this.currentLetter = this._pickLetter();
    this.usedLetters.add(this.currentLetter);

    this.setPhase(PHASES.ROUND_INTRO);
    this.setTimer(ROUND_INTRO_DURATION_MS, () => {
      if (this.phase === PHASES.ROUND_INTRO) this._startWriting();
    });
  }

  _startWriting() {
    this.writingEndsAt = Date.now() + this.options.timePerRoundSec * 1000;
    this.setPhase(PHASES.WRITING);
    this.setTimer(this.options.timePerRoundSec * 1000, () => {
      if (this.phase === PHASES.WRITING) this._endWriting();
    });
  }

  _endWriting() {
    if (this.options.validationMode === 'auto') {
      this._computeScoring();
      return;
    }
    this.validationEndsAt = Date.now() + VALIDATION_TIMER_MS;
    this.setPhase(PHASES.VALIDATING);
    this.setTimer(VALIDATION_TIMER_MS, () => {
      if (this.phase === PHASES.VALIDATING) this._computeScoring();
    });
  }

  _computeScoring() {
    this.clearAllTimers();

    const cats = this.activeCategories;
    const playerIds = [...this.scores.keys()];
    const result = {};

    const otherCount = playerIds.length - 1;
    // Majorité STRICTE (anti-troll) : > 50% des autres → rejeté
    const challengeThreshold = Math.floor(otherCount / 2) + 1;
    const targetLetter = this.currentLetter.toLowerCase();

    const validityMap = new Map();
    for (const pid of playerIds) {
      for (const cat of cats) {
        const value = (this.answers.get(pid)?.[cat.id] || '').trim();
        let valid = false;
        let reason = '';
        if (!value) {
          reason = 'empty';
        } else if (value.length < 2) {
          reason = 'too-short';
        } else if (!normalize(value).startsWith(targetLetter)) {
          reason = 'wrong-letter';
        } else {
          valid = true;
        }
        if (valid) {
          if (this.options.validationMode === 'collective') {
            const ch = this.challenges[pid]?.[cat.id];
            if (ch && ch.size >= challengeThreshold) {
              valid = false;
              reason = 'challenged';
            }
          } else if (this.options.validationMode === 'host') {
            // Si l'hôte a marqué cette réponse comme invalide → rejetée
            if (this.hostJudgments[pid]?.[cat.id] === true) {
              valid = false;
              reason = 'host-rejected';
            }
          }
        }
        validityMap.set(`${pid}_${cat.id}`, { value, valid, reason });
      }
    }

    const duplicateMap = new Map();
    for (const cat of cats) {
      const groups = new Map();
      for (const pid of playerIds) {
        const v = validityMap.get(`${pid}_${cat.id}`);
        if (!v.valid) continue;
        const key = normalize(v.value);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(pid);
      }
      for (const [_, pids] of groups) {
        if (pids.length > 1) for (const pid of pids) duplicateMap.set(`${pid}_${cat.id}`, true);
      }
    }

    for (const pid of playerIds) {
      const perCategory = {};
      let total = 0;
      let validCount = 0;
      for (const cat of cats) {
        const v = validityMap.get(`${pid}_${cat.id}`);
        const dup = !!duplicateMap.get(`${pid}_${cat.id}`);
        let points = 0;
        if (v.valid) {
          points = dup ? 5 : 10;
          validCount += 1;
        }
        perCategory[cat.id] = {
          value: v.value, valid: v.valid, reason: v.reason,
          duplicate: dup, points,
        };
        total += points;
      }
      if (validCount === cats.length && cats.length > 0) total += 10;
      this.scores.set(pid, (this.scores.get(pid) || 0) + total);
      result[pid] = { perCategory, total, fullClear: validCount === cats.length };
    }

    this.lastRoundResult = {
      round: this.round,
      letter: this.currentLetter,
      result,
    };
    this.history.push(this.lastRoundResult);
    this.setPhase(PHASES.SCORING);
  }

  _endGameToPodium() {
    this.clearAllTimers();
    this.setPhase(PHASES.PODIUM);
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    if (this.isSpectator(playerId) && type !== 'endGame') {
      return this._error(playerId, 'SPECTATOR', 'Tu rejoindras la prochaine partie.');
    }

    switch (type) {
      case 'submitAnswer':       return this._onSubmitAnswer(playerId, payload);
      case 'submitAll':          return this._onSubmitAll(playerId);
      case 'stopRound':          return this._onStopRound(playerId);
      case 'toggleChallenge':    return this._onToggleChallenge(playerId, payload);
      case 'hostJudge':          return this._onHostJudge(playerId, payload);
      case 'forceScoring':       return this._onForceScoring(playerId);
      case 'nextRound':          return this._onNextRound(playerId);
      case 'endGame':            return this._onEndGame(playerId);
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  _onSubmitAnswer(playerId, payload) {
    if (this.phase !== PHASES.WRITING) return this._error(playerId, 'BAD_PHASE');
    if (this.submittedIds.has(playerId)) return this._error(playerId, 'ALREADY_SUBMITTED');
    const cat = String(payload?.category || '');
    if (!this.activeCategories.find(c => c.id === cat)) return this._error(playerId, 'BAD_CATEGORY');
    const value = String(payload?.value || '').trim().slice(0, 40);

    if (!this.answers.has(playerId)) this.answers.set(playerId, {});
    this.answers.get(playerId)[cat] = value;
    this.room.emitGameState();
  }

  _onSubmitAll(playerId) {
    if (this.phase !== PHASES.WRITING) return this._error(playerId, 'BAD_PHASE');
    this.submittedIds.add(playerId);
    this.room.emitGameState();
    const allSubmitted = this.playerIds
      .filter(id => !this.isSpectator(id))
      .every(id => this.submittedIds.has(id));
    if (allSubmitted) this._endWriting();
  }

  _onStopRound(playerId) {
    if (this.phase !== PHASES.WRITING) return this._error(playerId, 'BAD_PHASE');
    if (this.stopperId) return this._error(playerId, 'ALREADY_STOPPED');

    // Vérification selon stopMode
    if (this.options.stopMode === 'disabled') {
      return this._error(playerId, 'STOP_DISABLED', 'Le bouton STOP est désactivé.');
    }
    if (this.options.stopMode === 'host' && playerId !== this.room.hostId) {
      return this._error(playerId, 'NOT_HOST', 'Seul l\'hôte peut appuyer sur STOP.');
    }
    if (this.options.stopMode === 'anyFull') {
      // Le joueur doit avoir rempli toutes les catégories
      const myAns = this.answers.get(playerId) || {};
      const allFilled = this.activeCategories.every(cat => (myAns[cat.id] || '').trim().length >= 2);
      if (!allFilled) {
        return this._error(playerId, 'NOT_FULL', 'Tu dois remplir toutes les catégories.');
      }
    }

    this.stopperId = playerId;
    this.submittedIds.add(playerId);
    this.clearAllTimers();
    const remaining = Math.max(0, this.writingEndsAt - Date.now());
    const newRemaining = Math.min(remaining, STOP_GRACE_MS);
    this.writingEndsAt = Date.now() + newRemaining;
    this.setTimer(newRemaining, () => {
      if (this.phase === PHASES.WRITING) this._endWriting();
    });
    this.room.broadcast('game:event', { type: 'stopCalled', payload: { playerId } });
    this.room.emitGameState();
  }

  _onToggleChallenge(playerId, payload) {
    if (this.phase !== PHASES.VALIDATING) return this._error(playerId, 'BAD_PHASE');
    if (this.options.validationMode !== 'collective') {
      return this._error(playerId, 'NOT_COLLECTIVE', 'Mode pas collectif.');
    }
    const targetId = String(payload?.targetId || '');
    const cat = String(payload?.category || '');
    if (targetId === playerId) return this._error(playerId, 'CANNOT_CHALLENGE_SELF');
    if (!this.scores.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (!this.activeCategories.find(c => c.id === cat)) return this._error(playerId, 'BAD_CATEGORY');

    if (!this.challenges[targetId]) this.challenges[targetId] = {};
    if (!this.challenges[targetId][cat]) this.challenges[targetId][cat] = new Set();
    const set = this.challenges[targetId][cat];
    if (set.has(playerId)) set.delete(playerId);
    else set.add(playerId);
    this.room.emitGameState();
  }

  /** Mode 'host' : l'hôte marque une réponse comme invalide (toggle). */
  _onHostJudge(playerId, payload) {
    if (this.phase !== PHASES.VALIDATING) return this._error(playerId, 'BAD_PHASE');
    if (this.options.validationMode !== 'host') {
      return this._error(playerId, 'NOT_HOST_MODE', 'Mode pas hôte.');
    }
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    const targetId = String(payload?.targetId || '');
    const cat = String(payload?.category || '');
    if (!this.scores.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (!this.activeCategories.find(c => c.id === cat)) return this._error(playerId, 'BAD_CATEGORY');

    if (!this.hostJudgments[targetId]) this.hostJudgments[targetId] = {};
    // Toggle : si vrai (rejeté) → enlever, sinon → marquer rejeté
    this.hostJudgments[targetId][cat] = !this.hostJudgments[targetId][cat];
    this.room.emitGameState();
  }

  _onForceScoring(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.VALIDATING) return this._error(playerId, 'BAD_PHASE');
    this._computeScoring();
  }

  _onNextRound(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.SCORING) return this._error(playerId, 'BAD_PHASE');
    if (this.round >= this.options.nbRounds) return this._endGameToPodium();
    this._startRound();
  }

  _onEndGame(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase === PHASES.PODIUM) {
      this.cleanup();
      this.room.endGame({
        game: 'petitbac',
        finalScores: Object.fromEntries(this.scores),
        rounds: this.round,
      });
    } else {
      this._endGameToPodium();
    }
  }

  // ───────── States ─────────
  getPublicState() {
    const base = {
      phase: this.phase,
      round: this.round,
      totalRounds: this.options.nbRounds,
      currentLetter: this.currentLetter,
      categories: this.activeCategories,
      scores: Object.fromEntries(this.scores),
      options: this.options,
    };

    if (this.phase === PHASES.WRITING) {
      return {
        ...base,
        writingEndsAt: this.writingEndsAt,
        submittedIds: [...this.submittedIds],
        stopperId: this.stopperId,
      };
    }

    if (this.phase === PHASES.VALIDATING) {
      const allAnswers = {};
      for (const [pid, perCat] of this.answers) allAnswers[pid] = perCat;
      const challengesPublic = {};
      for (const tid of Object.keys(this.challenges)) {
        challengesPublic[tid] = {};
        for (const cat of Object.keys(this.challenges[tid])) {
          challengesPublic[tid][cat] = [...this.challenges[tid][cat]];
        }
      }
      const otherCount = this.scores.size - 1;
      return {
        ...base,
        validationEndsAt: this.validationEndsAt,
        allAnswers,
        challenges: challengesPublic,
        hostJudgments: this.hostJudgments, // visible par tous
        challengeThreshold: Math.floor(otherCount / 2) + 1,
      };
    }

    if (this.phase === PHASES.SCORING) {
      return {
        ...base,
        result: this.lastRoundResult,
        canContinue: this.round < this.options.nbRounds,
      };
    }

    if (this.phase === PHASES.PODIUM) {
      const ranked = [...this.scores.entries()]
        .map(([playerId, points]) => ({ playerId, points }))
        .sort((a, b) => b.points - a.points);
      return {
        ...base,
        ranking: ranked,
        history: this.history,
      };
    }

    return base;
  }

  getPrivateStateFor(playerId) {
    if (this.phase === PHASES.WRITING) {
      return {
        myAnswers: this.answers.get(playerId) || {},
        iSubmitted: this.submittedIds.has(playerId),
        spectator: this.isSpectator(playerId),
      };
    }
    if (this.isSpectator(playerId)) return { spectator: true };
    return {};
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
