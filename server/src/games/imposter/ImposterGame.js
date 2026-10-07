import { BaseGame } from '../../core/BaseGame.js';
import { pickRandomPair, isValidTheme, listThemes } from './themes.js';
import { sameWord } from './wordRules.js';
import { logger } from '../../utils/logger.js';

/**
 * Phases :
 *   REVEAL         -> chacun voit son mot pendant N sec -> DESCRIBE
 *   DESCRIBE       -> tour par tour, un mot par joueur ; quand tous ont parlé -> ROUND_END
 *   ROUND_END      -> hôte choisit : "encore un tour de mots" ou "passer au vote"
 *   VOTE           -> tout le monde vote ; timeout configurable
 *   MR_WHITE_GUESS -> seulement si Mr White est éliminé : il tente de deviner le mot
 *   RESULTS        -> fin de la partie : rôles, mots et gagnant ; l'hôte relance ou revient au lobby
 *
 * Une partie = un seul vote. Après le vote on révèle toujours les rôles.
 *   - Sans Mr White : 1 vote par joueur ("qui est l'imposteur ?").
 *   - Avec Mr White : 2 votes par joueur (imposteur + Mr White), donc jusqu'à 2 éliminés.
 * Les civils gagnent si chaque vote élimine un méchant. Égalité ou civil éliminé
 * -> les imposteurs gagnent. Mr White éliminé peut gagner seul en devinant le mot.
 */
const PHASES = {
  REVEAL: 'REVEAL',
  DESCRIBE: 'DESCRIBE',
  ROUND_END: 'ROUND_END',
  VOTE: 'VOTE',
  MR_WHITE_GUESS: 'MR_WHITE_GUESS',
  RESULTS: 'RESULTS',
};

const REVEAL_DURATION_MS = 6000;
const MR_WHITE_GUESS_DURATION_MS = 45_000;
/** Mr White s'ajoute aux imposteurs : il faut 1 imposteur + Mr White + 2 civils. */
const MR_WHITE_MIN_PLAYERS = 4;
/** Marqueur affiché quand un joueur a été passé (timeout ou skip de l'hôte). */
const SKIPPED = '—';

const DEFAULT_OPTIONS = {
  theme: 'random',
  imposterCount: 1,
  imposterKnows: true,    // l'imposteur sait qu'il est imposteur ?
  voteDurationSec: 45,
  turnDurationSec: 0,     // 0 = pas de timer par tour
  mrWhiteEnabled: false,  // Si true : un joueur EN PLUS des imposteurs est "Mr White" (sans mot)
};

/** Joueur le plus voté d'un décompte. `id` vaut null s'il y a égalité ou aucun vote. */
function topOf(tally) {
  let best = 0;
  let ids = [];
  for (const [id, count] of tally) {
    if (count > best) { best = count; ids = [id]; }
    else if (count === best) ids.push(id);
  }
  return { id: ids.length === 1 ? ids[0] : null, tied: ids.length > 1 };
}

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
        mrWhiteMinPlayers: MR_WHITE_MIN_PLAYERS,
      },
    };
  }

  constructor(room, options = {}) {
    super(room, options);

    this.options = this._sanitizeOptions(options);

    this.round = 0;
    this.imposterIds = new Set();   // imposteurs "classiques" (ils ont un mot)
    this.imposterCount = 1;         // nombre effectif pour la partie en cours
    this.mrWhiteActive = false;     // Mr White réellement en jeu (option cochée + assez de joueurs)
    this.mrWhiteId = null;          // Mr White : un joueur EN PLUS des imposteurs, sans mot
    this.mrWhiteGuess = null;       // sa réponse à la phase MR_WHITE_GUESS
    this.guessEndsAt = null;
    this.civilWord = null;
    this.imposterWord = null;

    this.descriptions = new Map();  // playerId -> [mot1, mot2, ...]
    // Joueurs qui ont cliqué "je ne connais pas ce mot" pendant le REVEAL
    this.dontKnowIds = new Set();
    this.speakingOrder = [];        // les participants de la partie, dans l'ordre de parole
    this.snapshot = new Map();      // playerId -> { pseudo, avatar } (pour afficher ceux qui sont partis)
    this.currentSpeakerIdx = 0;
    this.speakingRound = 0;
    this.turnEndsAt = null;         // timestamp si timer de tour actif

    this.votes = new Map();         // voterId -> { imposter, mrWhite }
    this.voteEndsAt = null;
    this.voteOutcome = null;
    this.eliminatedIds = new Set(); // rempli à la résolution du vote

    this.lastResult = null;
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    if (!isValidTheme(o.theme)) o.theme = 'random';
    o.imposterCount   = Math.max(1, Math.min(3, parseInt(o.imposterCount, 10) || 1));
    o.imposterKnows   = !!o.imposterKnows;
    o.voteDurationSec = Math.max(15, Math.min(180, parseInt(o.voteDurationSec, 10) || 45));
    o.turnDurationSec = Math.max(0, Math.min(120, parseInt(o.turnDurationSec, 10) || 0));
    o.mrWhiteEnabled  = !!o.mrWhiteEnabled;
    return o;
  }

  // ───────── Helpers ─────────
  _inRoom(id) { return this.room.players.has(id); }
  _isBad(id) { return this.imposterIds.has(id) || id === this.mrWhiteId; }
  /** Participants de la partie qui sont encore dans la room. */
  _activeIds() { return this.speakingOrder.filter(id => this._inRoom(id)); }
  _roleOf(id) {
    if (id === this.mrWhiteId) return 'mr_white';
    return this.imposterIds.has(id) ? 'imposter' : 'civil';
  }
  /** Mot secret du joueur (null pour Mr White). */
  _wordOf(id) {
    if (id === this.mrWhiteId) return null;
    return this.imposterIds.has(id) ? this.imposterWord : this.civilWord;
  }

  // ───────── Lifecycle ─────────
  start() {
    if (!this._startNewMatch()) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Min ${ImposterGame.minPlayers} joueurs.` });
      this.room.endGame({ aborted: true });
    }
  }

  /** Lance une partie (nouveaux mots, nouveaux rôles). Renvoie false s'il n'y a pas assez de joueurs. */
  _startNewMatch() {
    // Participants = joueurs connectés. Ceux qui arrivent ensuite sont spectateurs jusqu'à la prochaine partie.
    const ids = this.playerIds.filter(id => this.room.players.get(id)?.connected);
    if (ids.length < ImposterGame.minPlayers) return false;

    this.clearAllTimers();
    this.round += 1;
    this.descriptions.clear();
    this.dontKnowIds.clear();
    this.votes.clear();
    this.voteEndsAt = null;
    this.voteOutcome = null;
    this.eliminatedIds = new Set();
    this.mrWhiteGuess = null;
    this.guessEndsAt = null;
    this.lastResult = null;
    this.speakingRound = 0;
    this.currentSpeakerIdx = 0;
    this.turnEndsAt = null;

    this.snapshot = new Map(ids.map(id => {
      const p = this.room.players.get(id);
      return [id, { pseudo: p.pseudo, avatar: p.avatar }];
    }));

    // Rôles : N imposteurs + (option) Mr White en plus, en gardant toujours au moins 2 civils.
    this.mrWhiteActive = this.options.mrWhiteEnabled && ids.length >= MR_WHITE_MIN_PLAYERS;
    const maxImposters = Math.max(1, ids.length - 2 - (this.mrWhiteActive ? 1 : 0));
    this.imposterCount = Math.min(this.options.imposterCount, maxImposters);
    const drawn = this.shuffle(ids);
    this.imposterIds = new Set(drawn.slice(0, this.imposterCount));
    this.mrWhiteId = this.mrWhiteActive ? drawn[this.imposterCount] : null;

    // Ordre de parole : Mr White ne commence jamais (il n'a aucun indice pour bluffer).
    const order = this.shuffle(ids);
    if (this.mrWhiteId && order[0] === this.mrWhiteId) {
      const j = 1 + Math.floor(Math.random() * (order.length - 1));
      [order[0], order[j]] = [order[j], order[0]];
    }
    this.speakingOrder = order;

    const [civilWord, imposterWord] = pickRandomPair(this.options.theme);
    this.civilWord = civilWord;
    this.imposterWord = imposterWord;

    logger.info({
      room: this.room.code,
      round: this.round,
      theme: this.options.theme,
      imposters: [...this.imposterIds],
      mrWhite: this.mrWhiteId,
    }, 'New match');

    this.setPhase(PHASES.REVEAL);
    this.setTimer(REVEAL_DURATION_MS, () => {
      if (this.phase === PHASES.REVEAL) this._startSpeakingRound();
    });
    return true;
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
        this._markSkipped(this.speakingOrder[this.currentSpeakerIdx]);
        this._advanceSpeaker();
      });
    }
  }

  _markSkipped(id) {
    if (!id) return;
    const list = this.descriptions.get(id) || [];
    list.push(SKIPPED);
    this.descriptions.set(id, list);
  }

  _isCurrentSpeakerActionable() {
    const id = this.speakingOrder[this.currentSpeakerIdx];
    if (!id) return false;
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

  /** Vrai si le joueur est spectateur (a rejoint en cours, pas dans la partie). */
  isSpectator(playerId) {
    return !this.speakingOrder.includes(playerId);
  }

  /** Hook appele par Room.addPlayer si une partie est en cours. */
  onPlayerJoinedMidGame(playerId) {
    // Le joueur est automatiquement spectateur (pas dans speakingOrder).
    // Au prochain _startNewMatch, il sera inclus.
    this.room.emitGameState();
  }

  /**
   * Hook appelé quand un joueur quitte définitivement la room (bouton quitter,
   * ou déconnexion non rétablie). La partie continue sans lui, sans rien bloquer.
   */
  onPlayerLeft(playerId) {
    if (this.isSpectator(playerId)) return;
    if (this.phase === PHASES.RESULTS) return;

    if (this.phase === PHASES.MR_WHITE_GUESS) {
      // Mr White est parti avant de deviner : on conclut sans réponse.
      if (playerId === this.mrWhiteId) this._finishMatch();
      return;
    }

    // Ses votes, et les votes qui le visaient, ne comptent plus (ces joueurs peuvent revoter).
    this.dontKnowIds.delete(playerId);
    this.votes.delete(playerId);
    for (const [voterId, v] of this.votes) {
      if (v.imposter === playerId || v.mrWhite === playerId) this.votes.delete(voterId);
    }

    // La partie n'a plus de sens s'il reste trop peu de monde ou plus aucun camp.
    const active = this._activeIds();
    const bad = active.filter(id => this._isBad(id)).length;
    if (active.length < ImposterGame.minPlayers || bad === 0 || bad === active.length) {
      this._finishMatch({ aborted: true });
      return;
    }

    if (this.phase === PHASES.DESCRIBE && this.speakingOrder[this.currentSpeakerIdx] === playerId) {
      this._advanceSpeaker();
      return;
    }
    this.room.emitGameState();
    if (this.phase === PHASES.VOTE) this._checkVoteComplete();
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    // Spectateurs (rejoint en cours) : aucune action en jeu, sauf actions host
    const hostOnly = ['skipSpeaker', 'nextSpeakingRound', 'startVote', 'nextMatch', 'endGame'];
    if (this.isSpectator(playerId) && !hostOnly.includes(type)) {
      return this._error(playerId, 'SPECTATOR', 'Tu es spectateur, attends la prochaine partie.');
    }

    switch (type) {
      case 'submitWord':         return this._onSubmitWord(playerId, payload);
      case 'dontKnowWord':       return this._onDontKnowWord(playerId);
      case 'skipSpeaker':        return this._onSkipSpeaker(playerId);
      case 'nextSpeakingRound':  return this._onNextSpeakingRound(playerId);
      case 'startVote':          return this._onStartVote(playerId);
      case 'castVote':           return this._onVote(playerId, payload);
      case 'mrWhiteGuess':       return this._onMrWhiteGuess(playerId, payload);
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

    // Interdit : donner son propre mot secret.
    const ownWord = this._wordOf(playerId);
    if (ownWord && sameWord(text, ownWord)) {
      return this._error(playerId, 'OWN_WORD', 'Tu ne peux pas donner ton propre mot.');
    }
    // Interdit : un mot déjà donné par quelqu'un (soi-même compris) dans cette partie.
    for (const words of this.descriptions.values()) {
      if (words.some(w => w !== SKIPPED && sameWord(w, text))) {
        return this._error(playerId, 'WORD_TAKEN', 'Ce mot a déjà été donné, trouves-en un autre.');
      }
    }

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
    this._markSkipped(this.speakingOrder[this.currentSpeakerIdx]);
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

  // ───────── Vote ─────────
  _startVotePhase() {
    this.clearAllTimers();
    this.votes.clear();
    this.voteEndsAt = Date.now() + this.options.voteDurationSec * 1000;
    this.setPhase(PHASES.VOTE);
    this.setTimer(this.options.voteDurationSec * 1000, () => {
      if (this.phase === PHASES.VOTE) this._resolveVote();
    });
  }

  /**
   * Joueurs dont on attend le vote : les participants encore présents ET connectés.
   * Les spectateurs et ceux qui sont partis ne bloquent donc jamais le vote.
   */
  _requiredVoterIds() {
    return this.speakingOrder.filter(id => this.room.players.get(id)?.connected);
  }

  _voteTargetError(voterId, targetId) {
    if (!this.speakingOrder.includes(targetId) || !this._inRoom(targetId)) return 'BAD_TARGET';
    if (targetId === voterId) return 'CANNOT_VOTE_SELF';
    return null;
  }

  _onVote(playerId, payload) {
    if (this.phase !== PHASES.VOTE) return this._error(playerId, 'BAD_PHASE');

    const imposter = String(payload?.targetId || '');
    let err = this._voteTargetError(playerId, imposter);
    if (err) return this._error(playerId, err, 'Vote invalide.');

    let mrWhite = null;
    if (this.mrWhiteActive) {
      // Double vote : un suspect "imposteur" ET un suspect "Mr White", forcément différents.
      mrWhite = String(payload?.mrWhiteTargetId || '');
      err = this._voteTargetError(playerId, mrWhite);
      if (err) return this._error(playerId, err, 'Choisis aussi qui est Mr White.');
      if (mrWhite === imposter) {
        return this._error(playerId, 'SAME_TARGET', 'Choisis deux joueurs différents.');
      }
    }

    this.votes.set(playerId, { imposter, mrWhite });
    this.room.broadcast('game:event', { type: 'voteCast', payload: { voterId: playerId } });
    this.room.emitGameState();
    this._checkVoteComplete();
  }

  _checkVoteComplete() {
    if (this.phase !== PHASES.VOTE) return;
    const required = this._requiredVoterIds();
    if (required.length > 0 && required.every(id => this.votes.has(id))) {
      this._resolveVote();
    }
  }

  _resolveVote() {
    this.clearAllTimers();
    this.voteEndsAt = null;

    const tallyImp = new Map();
    const tallyMW = new Map();
    for (const v of this.votes.values()) {
      if (v.imposter) tallyImp.set(v.imposter, (tallyImp.get(v.imposter) || 0) + 1);
      if (v.mrWhite)  tallyMW.set(v.mrWhite, (tallyMW.get(v.mrWhite) || 0) + 1);
    }
    const imp = topOf(tallyImp);
    const mw = this.mrWhiteActive ? topOf(tallyMW) : { id: null, tied: false };
    this.voteOutcome = { tallyImp, tallyMW, imp, mw };
    // Le plus voté de chaque décompte est éliminé (personne en cas d'égalité).
    this.eliminatedIds = new Set([imp.id, mw.id].filter(Boolean));

    // Si Mr White vient d'être éliminé → il a une chance de deviner le mot
    if (this.mrWhiteId && this.eliminatedIds.has(this.mrWhiteId) && this._inRoom(this.mrWhiteId)) {
      this.mrWhiteGuess = null;
      this.guessEndsAt = Date.now() + MR_WHITE_GUESS_DURATION_MS;
      this.setPhase(PHASES.MR_WHITE_GUESS);
      this.setTimer(MR_WHITE_GUESS_DURATION_MS, () => {
        if (this.phase === PHASES.MR_WHITE_GUESS) this._finishMatch();
      });
      return;
    }

    this._finishMatch();
  }

  /** Mr White soumet sa réponse pour deviner le mot des civils. */
  _onMrWhiteGuess(playerId, payload) {
    if (this.phase !== PHASES.MR_WHITE_GUESS) return this._error(playerId, 'BAD_PHASE');
    if (playerId !== this.mrWhiteId) return this._error(playerId, 'NOT_MR_WHITE');
    this.mrWhiteGuess = String(payload?.guess || '').trim().slice(0, 60);
    this._finishMatch();
  }

  /**
   * Termine la partie : calcule le gagnant et passe en RESULTS avec tous les rôles.
   * `aborted` = partie interrompue parce qu'un joueur indispensable est parti.
   */
  _finishMatch({ aborted = false } = {}) {
    this.clearAllTimers();
    this.voteEndsAt = null;
    this.guessEndsAt = null;
    if (aborted) this.eliminatedIds = new Set();

    const o = this.voteOutcome;
    const eliminated = [...this.eliminatedIds];
    const mrWhiteEliminated = !!this.mrWhiteId && this.eliminatedIds.has(this.mrWhiteId);
    const guessCorrect = mrWhiteEliminated && sameWord(this.mrWhiteGuess, this.civilWord);

    let winner = null;
    let reason = 'PLAYER_LEFT';
    if (!aborted) {
      // Il faut éliminer un méchant par vote (1 vote sans Mr White, 2 avec).
      const activeBad = this._activeIds().filter(id => this._isBad(id)).length;
      const expected = Math.max(1, Math.min(this.mrWhiteActive ? 2 : 1, activeBad));
      const badFound = eliminated.filter(id => this._isBad(id)).length;
      const civilHit = eliminated.some(id => !this._isBad(id));

      if (guessCorrect) {
        winner = 'mr_white';            // Mr White devine le mot : il gagne SEUL
        reason = 'MR_WHITE_GUESSED';
      } else if (!civilHit && badFound >= expected) {
        winner = 'civils';
        reason = 'ALL_FOUND';
      } else {
        winner = 'imposter';
        reason = civilHit ? 'CIVIL_ELIMINATED'
               : (o?.imp.tied || o?.mw.tied) ? 'TIE'
               : eliminated.length === 0 ? 'NO_VOTE'
               : 'PARTIAL';
      }
    }

    this.lastResult = {
      aborted,
      winner,
      reason,
      gameOver: true,
      // Tous les participants avec leur rôle (y compris ceux qui ont quitté)
      roles: this.speakingOrder.map(id => ({
        id,
        pseudo: this.snapshot.get(id)?.pseudo || '?',
        avatar: this.snapshot.get(id)?.avatar || null,
        role: this._roleOf(id),
        votesImposter: o?.tallyImp.get(id) || 0,
        votesMrWhite: o?.tallyMW.get(id) || 0,
        eliminated: this.eliminatedIds.has(id),
        left: !this._inRoom(id),
      })),
      eliminatedIds: eliminated,
      eliminatedAsImposter: o?.imp.id || null,
      eliminatedAsMrWhite: o?.mw.id || null,
      tiedImposter: !!o?.imp.tied,
      tiedMrWhite: !!o?.mw.tied,
      mrWhiteActive: this.mrWhiteActive,
      mrWhiteId: this.mrWhiteId,
      mrWhiteGuess: mrWhiteEliminated ? (this.mrWhiteGuess || '') : undefined,
      mrWhiteGuessCorrect: mrWhiteEliminated ? guessCorrect : undefined,
      imposterIds: [...this.imposterIds],
      imposterWord: this.imposterWord,
      civilWord: this.civilWord,
    };

    this.setPhase(PHASES.RESULTS);
  }

  /** Nouvelle partie directement depuis l'écran de résultats (nouveaux mots, nouveaux rôles). */
  _onNextMatch(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    if (this.phase !== PHASES.RESULTS) return this._error(playerId, 'BAD_PHASE');
    if (!this._startNewMatch()) {
      return this._error(playerId, 'NOT_ENOUGH_PLAYERS', `Il faut au moins ${ImposterGame.minPlayers} joueurs connectés.`);
    }
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
        imposterCount: this.imposterCount,
        imposterKnows: this.options.imposterKnows,
        turnDurationSec: this.options.turnDurationSec,
        voteDurationSec: this.options.voteDurationSec,
        mrWhiteEnabled: this.mrWhiteActive,               // Mr White réellement en jeu
        mrWhiteRequested: this.options.mrWhiteEnabled,    // option cochée dans le lobby
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
          voterIds: this._requiredVoterIds(),
          voteEndsAt: this.voteEndsAt,
        };

      case PHASES.MR_WHITE_GUESS:
        return { ...base, mrWhiteId: this.mrWhiteId, guessEndsAt: this.guessEndsAt };

      case PHASES.RESULTS:
        return { ...base, result: this.lastResult };

      default: return base;
    }
  }

  /**
   * État privé filtré.
   * - imposterKnows = true  -> on dit "tu es imposteur" et qui sont les autres imposteurs
   * - imposterKnows = false -> on dit juste le mot, sans révéler le rôle
   * - Mr White sait toujours qu'il est Mr White (il n'a pas de mot).
   */
  getPrivateStateFor(playerId) {
    // Spectateur : on lui dit qu'il observe, pas de mot, pas de role
    if (this.isSpectator(playerId)) {
      return { spectator: true };
    }

    const role = this._roleOf(playerId);
    const isMrWhite = role === 'mr_white';

    if ([PHASES.REVEAL, PHASES.DESCRIBE, PHASES.ROUND_END, PHASES.VOTE].includes(this.phase)) {
      const data = { word: this._wordOf(playerId) };
      if (isMrWhite || this.options.imposterKnows) {
        data.role = role;
        if (role === 'imposter' && this.imposterIds.size > 1) {
          data.fellowImposters = [...this.imposterIds].filter(id => id !== playerId);
        }
      } else {
        data.role = 'unknown';
      }
      if (this.phase === PHASES.VOTE) data.myVote = this.votes.get(playerId) || null;
      return data;
    }

    if (this.phase === PHASES.MR_WHITE_GUESS) {
      // Seul Mr White voit l'interface de devinette ; les autres voient un écran d'attente
      return { isMrWhite, role };
    }

    if (this.phase === PHASES.RESULTS) {
      return { role, wasImposter: role === 'imposter', wasMrWhite: isMrWhite };
    }
    return {};
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
