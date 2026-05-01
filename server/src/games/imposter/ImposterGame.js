import { BaseGame } from '../../core/BaseGame.js';
import { pickRandomPair, isValidTheme, listThemes } from './themes.js';
import { logger } from '../../utils/logger.js';

/**
 * Phases :
 *   REVEAL    -> chacun voit son mot pendant N sec -> DESCRIBE
 *   DESCRIBE  -> tour par tour, un mot par joueur ; quand tous ont parlé -> ROUND_END
 *   ROUND_END -> hôte choisit : "encore un tour de mots" ou "passer au vote"
 *   VOTE      -> tout le monde vote ; timeout configurable -> RESULTS
 *   RESULTS   -> annonce ; host peut relancer ou stop
 */
const PHASES = {
  REVEAL: 'REVEAL',
  DESCRIBE: 'DESCRIBE',
  ROUND_END: 'ROUND_END',
  VOTE: 'VOTE',
  RESULTS: 'RESULTS',
};

const REVEAL_DURATION_MS = 6000;

const DEFAULT_OPTIONS = {
  theme: 'random',
  imposterCount: 1,
  imposterKnows: true,    // l'imposteur sait qu'il est imposteur ?
  voteDurationSec: 45,
  turnDurationSec: 0,     // 0 = pas de timer par tour
};

export class ImposterGame extends BaseGame {
  static id = 'imposter';
  static label = "Jeu de l'imposteur";
  static minPlayers = 3;
  static maxPlayers = 12;

  /** Pour exposer la conf au client (lobby). */
  static getOptionsManifest() {
    return {
      themes: listThemes(),
      defaults: DEFAULT_OPTIONS,
      limits: {
        imposterCount: { min: 1, max: 3 },
        voteDurationSec: { min: 15, max: 180 },
        turnDurationSec: { min: 0, max: 120 },
      },
    };
  }

  constructor(room, options = {}) {
    super(room, options);

    this.options = this._sanitizeOptions(options);

    this.round = 0;
    this.imposterIds = new Set();   // ⚠️ Set : peut contenir plusieurs imposteurs
    this.civilWord = null;
    this.imposterWord = null;

    this.descriptions = new Map();  // playerId -> [mot1, mot2, ...]
    // Joueurs qui ont cliqué "je ne connais pas ce mot" pendant le REVEAL
    this.dontKnowIds = new Set();
    this.speakingOrder = [];
    this.currentSpeakerIdx = 0;
    this.speakingRound = 0;
    this.turnEndsAt = null;         // timestamp si timer de tour actif

    this.votes = new Map();
    this.eliminatedIds = new Set();

    this.lastResult = null;
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    if (!isValidTheme(o.theme)) o.theme = 'random';
    o.imposterCount   = Math.max(1, Math.min(3, parseInt(o.imposterCount, 10) || 1));
    o.imposterKnows   = !!o.imposterKnows;
    o.voteDurationSec = Math.max(15, Math.min(180, parseInt(o.voteDurationSec, 10) || 45));
    o.turnDurationSec = Math.max(0, Math.min(120, parseInt(o.turnDurationSec, 10) || 0));
    return o;
  }

  // ───────── Lifecycle ─────────
  start() {
    if (this.playerCount < ImposterGame.minPlayers) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Min ${ImposterGame.minPlayers} joueurs.` });
      this.room.endGame({ aborted: true });
      return;
    }
    // Vérif : nombre d'imposteurs cohérent (toujours laisser ≥ 2 civils)
    const maxImp = Math.max(1, this.playerCount - 2);
    if (this.options.imposterCount > maxImp) {
      this.options.imposterCount = maxImp;
    }
    this._startNewMatch();
  }

  _startNewMatch() {
    this.round += 1;
    this.descriptions.clear();
    this.dontKnowIds.clear();
    this.votes.clear();
    this.speakingRound = 0;
    this.currentSpeakerIdx = 0;
    this.turnEndsAt = null;

    const alive = this.playerIds.filter(id => !this.eliminatedIds.has(id));
    this.speakingOrder = this.shuffle(alive);

    // Tirer N imposteurs parmi les vivants
    const shuffled = this.shuffle(alive);
    this.imposterIds = new Set(shuffled.slice(0, this.options.imposterCount));

    const [civilWord, imposterWord] = pickRandomPair(this.options.theme);
    this.civilWord = civilWord;
    this.imposterWord = imposterWord;

    logger.info({
      room: this.room.code,
      round: this.round,
      theme: this.options.theme,
      imposters: [...this.imposterIds],
    }, 'New match');

    this.setPhase(PHASES.REVEAL);

    this.setTimer(REVEAL_DURATION_MS, () => {
      if (this.phase === PHASES.REVEAL) this._startSpeakingRound();
    });
  }

  _startSpeakingRound() {
    this.speakingRound += 1;
    this.currentSpeakerIdx = 0;
    if (!this._isCurrentSpeakerActionable()) {
      this._advanceSpeaker(false);
    }
    if (this.currentSpeakerIdx >= this.speakingOrder.length) {
      this.setPhase(PHASES.ROUND_END);
      return;
    }
    this._armTurnTimer();
    this.setPhase(PHASES.DESCRIBE);
  }

  _armTurnTimer() {
    this.turnEndsAt = null;
    if (this.options.turnDurationSec > 0) {
      this.turnEndsAt = Date.now() + this.options.turnDurationSec * 1000;
      this.setTimer(this.options.turnDurationSec * 1000, () => {
        // Timeout : auto-skip
        if (this.phase !== PHASES.DESCRIBE) return;
        const id = this.speakingOrder[this.currentSpeakerIdx];
        if (id) {
          const list = this.descriptions.get(id) || [];
          list.push('—');
          this.descriptions.set(id, list);
        }
        this._advanceSpeaker();
      });
    }
  }

  _isCurrentSpeakerActionable() {
    const id = this.speakingOrder[this.currentSpeakerIdx];
    if (!id) return false;
    if (this.eliminatedIds.has(id)) return false;
    const p = this.room.players.get(id);
    return !!(p && p.connected);
  }

  _advanceSpeaker(emitState = true) {
    this.clearAllTimers();
    while (true) {
      this.currentSpeakerIdx += 1;
      if (this.currentSpeakerIdx >= this.speakingOrder.length) {
        this.turnEndsAt = null;
        this.setPhase(PHASES.ROUND_END);
        return;
      }
      if (this._isCurrentSpeakerActionable()) {
        this._armTurnTimer();
        if (emitState) this.room.emitGameState();
        return;
      }
    }
  }

  /** Vrai si le joueur est spectateur (a rejoint en cours, pas dans la manche). */
  isSpectator(playerId) {
    return !this.speakingOrder.includes(playerId);
  }

  /** Hook appele par Room.addPlayer si une partie est en cours. */
  onPlayerJoinedMidGame(playerId) {
    // Le joueur est automatiquement spectateur (pas dans speakingOrder).
    // Au prochain _startNewMatch, il sera inclus.
    this.room.emitGameState();
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    // Spectateurs (rejoint en cours) : aucune action en jeu, sauf actions host
    const hostOnly = ['skipSpeaker', 'nextSpeakingRound', 'startVote', 'nextMatch', 'endGame'];
    if (this.isSpectator(playerId) && !hostOnly.includes(type)) {
      return this._error(playerId, 'SPECTATOR', 'Tu es spectateur, attends la prochaine manche.');
    }
    if (this.eliminatedIds.has(playerId)) {
      return this._error(playerId, 'ELIMINATED', 'Vous êtes éliminé.');
    }

    switch (type) {
      case 'submitWord':         return this._onSubmitWord(playerId, payload);
      case 'dontKnowWord':       return this._onDontKnowWord(playerId);
      case 'skipSpeaker':        return this._onSkipSpeaker(playerId);
      case 'nextSpeakingRound':  return this._onNextSpeakingRound(playerId);
      case 'startVote':          return this._onStartVote(playerId);
      case 'castVote':           return this._onVote(playerId, payload);
      case 'nextMatch':          return this._onNextMatch(playerId);
      case 'endGame':            return this._onEndGame(playerId);
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  _onSubmitWord(playerId, payload) {
    if (this.phase !== PHASES.DESCRIBE) return this._error(playerId, 'BAD_PHASE');
    const currentSpeakerId = this.speakingOrder[this.currentSpeakerIdx];
    if (playerId !== currentSpeakerId) return this._error(playerId, 'NOT_YOUR_TURN', "Ce n'est pas ton tour.");

    const text = String(payload?.text || '').trim().slice(0, 30);
    if (!text) return this._error(playerId, 'EMPTY_WORD', 'Donne un mot.');

    const list = this.descriptions.get(playerId) || [];
    list.push(text);
    this.descriptions.set(playerId, list);

    this._advanceSpeaker();
  }

  /**
   * Pendant le REVEAL, un joueur peut dire "je ne connais pas ce mot".
   * Si >= 2 joueurs cliquent, on tire un nouveau mot et on reset le timer.
   */
  _onDontKnowWord(playerId) {
    if (this.phase !== PHASES.REVEAL) return this._error(playerId, 'BAD_PHASE', 'Tu peux le dire seulement pendant la révélation.');
    if (this.dontKnowIds.has(playerId)) return; // déjà voté, no-op
    this.dontKnowIds.add(playerId);

    if (this.dontKnowIds.size >= 2) {
      // Reroll : nouveau mot, on reset le timer du REVEAL
      const [civilWord, imposterWord] = pickRandomPair(this.options.theme);
      this.civilWord = civilWord;
      this.imposterWord = imposterWord;
      this.dontKnowIds.clear();
      this.clearAllTimers();
      this.room.broadcast('game:event', { type: 'wordRerolled' });
      this.setPhase(PHASES.REVEAL); // ré-emit le state avec le nouveau mot
      this.setTimer(REVEAL_DURATION_MS, () => {
        if (this.phase === PHASES.REVEAL) this._startSpeakingRound();
      });
    } else {
      this.room.emitGameState();
    }
  }

  _onSkipSpeaker(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.DESCRIBE) return this._error(playerId, 'BAD_PHASE');
    const skippedId = this.speakingOrder[this.currentSpeakerIdx];
    if (skippedId) {
      const list = this.descriptions.get(skippedId) || [];
      list.push('—');
      this.descriptions.set(skippedId, list);
    }
    this._advanceSpeaker();
  }

  _onNextSpeakingRound(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.ROUND_END) return this._error(playerId, 'BAD_PHASE');
    this._startSpeakingRound();
  }

  _onStartVote(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.ROUND_END) return this._error(playerId, 'BAD_PHASE');
    this._startVotePhase();
  }

  _startVotePhase() {
    this.clearAllTimers();
    this.setPhase(PHASES.VOTE);
    this.setTimer(this.options.voteDurationSec * 1000, () => {
      if (this.phase === PHASES.VOTE) this._resolveVote();
    });
  }

  _onVote(playerId, payload) {
    if (this.phase !== PHASES.VOTE) return this._error(playerId, 'BAD_PHASE');
    const targetId = String(payload?.targetId || '');
    if (!this.room.players.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (this.eliminatedIds.has(targetId))  return this._error(playerId, 'TARGET_ELIMINATED');
    if (targetId === playerId)             return this._error(playerId, 'CANNOT_VOTE_SELF');

    this.votes.set(playerId, targetId);
    this.room.broadcast('game:event', { type: 'voteCast', payload: { voterId: playerId } });
    this.room.emitGameState();

    const aliveIds = this.playerIds.filter(id => !this.eliminatedIds.has(id));
    if (aliveIds.every(id => this.votes.has(id))) {
      this._resolveVote();
    }
  }

  _resolveVote() {
    this.clearAllTimers();

    const tally = new Map();
    for (const target of this.votes.values()) {
      tally.set(target, (tally.get(target) || 0) + 1);
    }

    let topCount = 0;
    let topIds = [];
    for (const [id, count] of tally) {
      if (count > topCount) { topCount = count; topIds = [id]; }
      else if (count === topCount) topIds.push(id);
    }

    const eliminatedId = topIds.length === 1 ? topIds[0] : null;
    if (eliminatedId) this.eliminatedIds.add(eliminatedId);

    // Conditions de victoire (multi-imposteurs)
    const aliveImposters = [...this.imposterIds].filter(id => !this.eliminatedIds.has(id)).length;
    const aliveCivils    = this.playerIds.filter(id => !this.eliminatedIds.has(id) && !this.imposterIds.has(id)).length;

    // Civils gagnent quand TOUS les imposteurs sont éliminés
    const civilsWin = aliveImposters === 0;
    // Imposteurs gagnent quand ils égalent ou dépassent les civils restants
    const imposterWins = !civilsWin && aliveImposters >= aliveCivils;
    const gameOver = imposterWins || civilsWin;

    this.lastResult = {
      eliminatedId,
      eliminatedWasImposter: eliminatedId ? this.imposterIds.has(eliminatedId) : null,
      tally: Object.fromEntries(tally),
      imposterIds: [...this.imposterIds],
      imposterWord: this.imposterWord,
      civilWord: this.civilWord,
      winner: imposterWins ? 'imposter' : civilsWin ? 'civils' : null,
      gameOver,
    };

    this.setPhase(PHASES.RESULTS);
  }

  _onNextMatch(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.RESULTS) return this._error(playerId, 'BAD_PHASE');
    if (this.lastResult?.gameOver) return this._error(playerId, 'GAME_OVER', 'Partie terminée.');
    this._startNewMatch();
  }

  _onEndGame(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    this.cleanup();
    this.room.endGame({
      game: 'imposter',
      finalResult: this.lastResult,
      rounds: this.round,
    });
  }

  // ───────── States ─────────
  getPublicState() {
    const base = {
      phase: this.phase,
      round: this.round,
      eliminatedIds: [...this.eliminatedIds],
      speakingOrder: this.speakingOrder,
      speakingRound: this.speakingRound,
      descriptions: Object.fromEntries(this.descriptions),
      options: {
        theme: this.options.theme,
        imposterCount: this.options.imposterCount,
        imposterKnows: this.options.imposterKnows,
        turnDurationSec: this.options.turnDurationSec,
        voteDurationSec: this.options.voteDurationSec,
      },
    };

    switch (this.phase) {
      case PHASES.REVEAL:
        return {
          ...base,
          revealMs: REVEAL_DURATION_MS,
          dontKnowIds: [...this.dontKnowIds],
        };

      case PHASES.DESCRIBE:
        return {
          ...base,
          currentSpeakerId: this.speakingOrder[this.currentSpeakerIdx] || null,
          turnEndsAt: this.turnEndsAt,
        };

      case PHASES.ROUND_END:
        return base;

      case PHASES.VOTE:
        return {
          ...base,
          votedIds: [...this.votes.keys()],
          voteEndsAt: Date.now() + this.options.voteDurationSec * 1000,
        };

      case PHASES.RESULTS:
        return { ...base, result: this.lastResult };

      default: return base;
    }
  }

  /**
   * État privé filtré.
   * - imposterKnows = true  -> on dit "tu es imposteur" et qui sont les autres imposteurs
   * - imposterKnows = false -> on dit juste le mot, sans révéler le rôle
   */
  getPrivateStateFor(playerId) {
    // Spectateur : on lui dit qu'il observe, pas de mot, pas de role
    if (this.isSpectator(playerId)) {
      return { spectator: true };
    }

    const isImposter = this.imposterIds.has(playerId);

    if ([PHASES.REVEAL, PHASES.DESCRIBE, PHASES.ROUND_END, PHASES.VOTE].includes(this.phase)) {
      const data = {
        word: isImposter ? this.imposterWord : this.civilWord,
      };
      if (this.options.imposterKnows) {
        data.role = isImposter ? 'imposter' : 'civil';
        if (isImposter && this.imposterIds.size > 1) {
          data.fellowImposters = [...this.imposterIds].filter(id => id !== playerId);
        }
      } else {
        data.role = 'unknown';
      }
      return data;
    }

    if (this.phase === PHASES.RESULTS) {
      return {
        wasImposter: isImposter,
        role: isImposter ? 'imposter' : 'civil',
      };
    }
    return {};
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
