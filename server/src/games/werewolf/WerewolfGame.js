import { BaseGame } from '../../core/BaseGame.js';
import { ROLES, SPECIAL_ROLES, isWolf, listRoles, suggestComposition } from './roles.js';
import { logger } from '../../utils/logger.js';

/**
 * Loup-Garou de Thiercelieux, pensé pour jouer ensemble (même pièce ou vocal) :
 * l'appli fait le meneur de jeu — distribution, nuit rôle par rôle, annonces, votes.
 *
 * Phases publiques :
 *   DEAL → NIGHT (étapes : DUSK, CUPIDON, LOVERS, GUARD, WOLVES, WHITE_WOLF, SEER, WITCH)
 *   → MORNING → [HUNTER] → [SUCCESSION] → [MAYOR_ELECTION → MAYOR_ELECTED] → DEBATE
 *   → [RUNOFF] → [TIEBREAK] → EXECUTION → [HUNTER] → [SUCCESSION] → NIGHT … → GAME_OVER
 *
 * Anti-triche : une étape de nuit est jouée dès que le rôle est dans la composition,
 * même si son détenteur est mort (durée simulée) — personne ne peut déduire qui est mort.
 */

const PACE = { rapide: 0.65, normal: 1, tranquille: 1.5 };
const STEP_MS = {
  DUSK: 6000,
  CUPIDON: 40000,
  LOVERS: 9000,
  GUARD: 30000,
  WOLVES: 60000,
  WHITE_WOLF: 30000,
  SEER: 30000,
  WITCH: 40000,
};
const MS = {
  DEAL: 60000,
  MORNING: 8000,
  MORNING_PER_DEATH: 3000,
  HUNTER: 35000,
  SUCCESSION: 30000,
  MAYOR_ELECTION: 60000,
  MAYOR_ELECTED: 6000,
  RUNOFF: 60000,
  TIEBREAK: 30000,
  EXECUTION: 9000,
  ALL_VOTED: 10000,
};
const DEBATE_CHOICES = [60, 120, 180, 240, 300, 420, 600];

const DEFAULT_OPTIONS = {
  wolves: 2,
  roles: ['voyante', 'sorciere', 'chasseur', 'garde'],
  mayor: true,
  debateSec: 180,
  pace: 'normal',
  revealRoles: true,
  deadSeeAll: true,
  publicVotes: true,
};

const STEP_ROLE = {
  CUPIDON: 'cupidon', GUARD: 'garde', WHITE_WOLF: 'loup_blanc', SEER: 'voyante', WITCH: 'sorciere',
};

export class WerewolfGame extends BaseGame {
  static id = 'werewolf';
  static label = 'Loup-Garou';
  static minPlayers = 5;
  static maxPlayers = 18;

  static getOptionsManifest() {
    const suggestions = {};
    for (let n = 5; n <= 18; n++) suggestions[n] = suggestComposition(n);
    return {
      defaults: DEFAULT_OPTIONS,
      roles: listRoles(),
      specialRoles: SPECIAL_ROLES,
      suggestions,
      debateChoices: DEBATE_CHOICES,
      paces: [
        { id: 'rapide', label: '⚡ Rapide' },
        { id: 'normal', label: '🌙 Normal' },
        { id: 'tranquille', label: '🕯️ Tranquille' },
      ],
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = WerewolfGame.sanitize(options);
    this.gameNo = 0;
    this._reset();
  }

  static sanitize(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    const wolves = Math.max(1, Math.min(5, parseInt(o.wolves, 10) || 1));
    const roles = [...new Set(Array.isArray(o.roles) ? o.roles : [])].filter((r) => SPECIAL_ROLES.includes(r));
    const debateSec = DEBATE_CHOICES.includes(Number(o.debateSec)) ? Number(o.debateSec) : 180;
    return {
      wolves,
      roles,
      mayor: o.mayor !== false,
      debateSec,
      pace: PACE[o.pace] ? o.pace : 'normal',
      revealRoles: o.revealRoles !== false,
      deadSeeAll: o.deadSeeAll !== false,
      publicVotes: o.publicVotes !== false,
    };
  }

  _reset() {
    this.seats = [];                 // ordre autour de la table
    this.names = new Map();          // id -> { pseudo, avatar } (garde le nom des partis)
    this.assignments = new Map();
    this.alive = new Set();
    this.left = new Set();
    this.ready = new Set();
    this.night = 0;
    this.step = null;
    this.stepEndsAt = null;
    this.stepHardEnd = null;
    this.queue = [];
    this.lovers = [];
    this.guardLast = null;
    this.guardTarget = null;
    this.guardDone = false;
    this.wolfVotes = new Map();
    this.wolfTarget = null;
    this.wolfChat = [];
    this.spying = false;
    this.spiedTonight = false;
    this.wwTarget = null;
    this.wwDone = false;
    this.seerHistory = [];
    this.potions = { heal: true, kill: true };
    this.witchHeal = false;
    this.witchKill = null;
    this.witchDone = false;
    this.cupidDone = false;
    this.mayorId = null;
    this.mayorElectionDone = false;
    this.mayorVotes = new Map();
    this.votes = new Map();
    this.voteRound = 'main';
    this.candidates = null;
    this.allVotedAt = null;
    this.tally = null;
    this.execution = null;
    this.morning = null;
    this.deathLog = [];
    this.pendingHunters = [];
    this.pendingSuccession = null;
    this.hunterId = null;
    this.successionFrom = null;
    this.log = [];
    this.secret = [];
    this.result = null;
  }

  // ───────── Mise en place ─────────
  start() {
    this.clearAllTimers();
    this._reset();
    this.gameNo += 1;
    const players = this.playerIds;
    const { wolves, roles } = this.options;
    const wolfCards = wolves + (roles.includes('loup_blanc') ? 1 : 0);
    const others = roles.filter((r) => r !== 'loup_blanc').length;
    if (players.length < WerewolfGame.minPlayers || wolfCards + others > players.length || wolfCards >= players.length - wolfCards) {
      this.room.broadcast('error', { code: 'BAD_COMPOSITION', message: 'Composition impossible pour ce nombre de joueurs.' });
      this.room.endGame({ aborted: true });
      return;
    }
    const deck = [...Array(wolves).fill('loup_garou'), ...roles];
    while (deck.length < players.length) deck.push('villageois');
    const shuffled = this.shuffle(deck);
    this.seats = this.shuffle(players);
    this.seats.forEach((id, i) => {
      this.assignments.set(id, shuffled[i]);
      this.alive.add(id);
      const p = this.room.players.get(id);
      this.names.set(id, { pseudo: p?.pseudo || '?', avatar: p?.avatar });
    });
    logger.info({ room: this.room.code, options: this.options }, 'Werewolf started');
    this._setTimed('DEAL', MS.DEAL, () => this._beginNight());
  }

  _composition() {
    const counts = {};
    for (const r of this.assignments.values()) counts[r] = (counts[r] || 0) + 1;
    return counts;
  }
  _hasRole(role) { return [...this.assignments.values()].includes(role); }
  _holders(role) { return [...this.alive].filter((id) => this.assignments.get(id) === role); }
  _aliveWolves() { return [...this.alive].filter((id) => isWolf(this.assignments.get(id))); }
  _pace(ms) { return Math.round(ms * PACE[this.options.pace]); }

  _setTimed(phase, ms, fn) {
    this.clearAllTimers();
    this._stepFn = fn;
    this.stepEndsAt = Date.now() + ms;
    this.stepHardEnd = this.stepEndsAt;
    this.setTimer(ms, fn);
    this.setPhase(phase);
  }

  /** Raccourcit l'étape en cours (action terminée) sans jamais la rallonger. */
  _endSoon(ms, fn = this._stepFn) {
    const at = Date.now() + ms;
    if (this.stepEndsAt && at >= this.stepEndsAt) return;
    this.clearAllTimers();
    this.stepEndsAt = at;
    this.setTimer(ms, fn);
  }

  /** Revient à l'échéance d'origine (ex. : les loups ne sont plus d'accord). */
  _restoreEnd(fn = this._stepFn) {
    if (!this.stepHardEnd || this.stepEndsAt === this.stepHardEnd) return;
    this.clearAllTimers();
    this.stepEndsAt = this.stepHardEnd;
    this.setTimer(Math.max(500, this.stepHardEnd - Date.now()), fn);
  }

  // ───────── Nuit ─────────
  _beginNight() {
    this.night += 1;
    this.wolfVotes.clear();
    this.wolfTarget = null;
    this.wolfChat = [];
    this.spying = false;
    this.spiedTonight = false;
    this.wwTarget = null;
    this.wwDone = false;
    this.guardTarget = null;
    this.guardDone = false;
    this.witchHeal = false;
    this.witchKill = null;
    this.witchDone = false;
    this.execution = null;
    this.tally = null;
    this.morning = null;

    const q = ['DUSK'];
    if (this.night === 1 && this._hasRole('cupidon')) q.push('CUPIDON', 'LOVERS');
    if (this._hasRole('garde')) q.push('GUARD');
    q.push('WOLVES');
    if (this._hasRole('loup_blanc') && this.night % 2 === 0) q.push('WHITE_WOLF');
    if (this._hasRole('voyante')) q.push('SEER');
    if (this._hasRole('sorciere')) q.push('WITCH');
    this.queue = q;
    this.log.push({ k: 'night', n: this.night });
    this._nextStep();
  }

  _nextStep() {
    const step = this.queue.shift();
    if (!step) return this._dawn();
    if (step === 'LOVERS' && this.lovers.length !== 2) return this._nextStep();
    this.step = step;
    let ms = this._pace(STEP_MS[step]);
    if (step === 'DUSK' || step === 'LOVERS') ms = STEP_MS[step];
    const role = STEP_ROLE[step];
    if (role && this._holders(role).length === 0) {
      // Rôle mort : on fait semblant (durée crédible) pour ne rien trahir
      ms = this._pace(7000 + Math.floor(Math.random() * 8000));
    }
    this._setTimed('NIGHT', ms, () => this._endStep());
  }

  _endStep() {
    this.clearAllTimers();
    if (this.step === 'WOLVES') this._resolveWolves();
    if (this.step === 'WITCH') this.witchDone = true;
    this._nextStep();
  }

  _resolveWolves() {
    const tally = new Map();
    for (const t of this.wolfVotes.values()) if (t) tally.set(t, (tally.get(t) || 0) + 1);
    const tops = this._tops(tally);
    this.wolfTarget = tops.length ? this.pickRandom(tops) : null;
    this.spying = false;
    this.secret.push({ n: this.night, k: 'wolves', id: this.wolfTarget });
  }

  _tops(tally) {
    let max = 0; let tops = [];
    for (const [id, c] of tally) {
      if (c > max) { max = c; tops = [id]; } else if (c === max) tops.push(id);
    }
    return tops;
  }

  _dawn() {
    this.step = null;
    this.guardLast = this.guardTarget;
    const victims = [];
    const t = this.wolfTarget;
    if (t && this.alive.has(t)) {
      if (this.guardTarget === t) this.secret.push({ n: this.night, k: 'guarded', id: t });
      else if (this.witchHeal) { /* sauvé par la sorcière (déjà noté) */ }
      else victims.push({ id: t, cause: 'wolves' });
    }
    if (this.wwTarget) victims.push({ id: this.wwTarget, cause: 'white_wolf' });
    if (this.witchKill) victims.push({ id: this.witchKill, cause: 'witch' });
    const deaths = this._kill(victims);
    this.morning = { night: this.night, deaths: deaths.map((d) => this._publicDeath(d)) };
    this.log.push({ k: 'dawn', n: this.night, deaths: this.morning.deaths });
    this._setTimed('MORNING', MS.MORNING + MS.MORNING_PER_DEATH * deaths.length, () => this._aftermath(() => this._afterMorning()));
  }

  _publicDeath(d) {
    return {
      id: d.id,
      role: this.options.revealRoles ? d.role : null,
      cause: d.cause === 'love' || d.cause === 'hunter' || d.cause === 'vote' || d.cause === 'left' ? d.cause : null,
    };
  }

  _afterMorning() {
    if (this.options.mayor && !this.mayorElectionDone) {
      this.mayorVotes.clear();
      return this._setTimed('MAYOR_ELECTION', MS.MAYOR_ELECTION, () => this._resolveMayor());
    }
    this._startDebate();
  }

  // ───────── Morts ─────────
  /** Tue une liste de joueurs (et l'amoureux en cascade). Renvoie les morts effectives. */
  _kill(list) {
    const out = [];
    const queue = [...list];
    while (queue.length) {
      const { id, cause } = queue.shift();
      if (!this.alive.has(id)) continue;
      this.alive.delete(id);
      const role = this.assignments.get(id);
      const d = { id, role, cause, n: this.night, day: this.phase !== 'NIGHT' && this.phase !== 'MORNING' };
      this.deathLog.push(d);
      out.push(d);
      if (this.lovers.includes(id)) {
        const other = this.lovers.find((x) => x !== id);
        if (other && this.alive.has(other)) queue.push({ id: other, cause: 'love' });
      }
      if (role === 'chasseur' && cause !== 'left') this.pendingHunters.push(id);
      if (id === this.mayorId) {
        this.mayorId = null;
        if (cause !== 'left') this.pendingSuccession = id;
      }
    }
    return out;
  }

  /** Après des morts : tir du chasseur, succession du maire, puis victoire ou suite. */
  _aftermath(next) {
    if (this._checkWin()) return this._gameOver();
    if (this.pendingHunters.length) {
      this.hunterId = this.pendingHunters.shift();
      return this._setTimed('HUNTER', MS.HUNTER, () => {
        this.log.push({ k: 'hunter', by: this.hunterId, id: null });
        this.hunterId = null;
        this._aftermath(next);
      });
    }
    if (this.pendingSuccession) {
      this.successionFrom = this.pendingSuccession;
      this.pendingSuccession = null;
      if (this.alive.size === 0) return next();
      return this._setTimed('SUCCESSION', MS.SUCCESSION, () => {
        this._setMayor(this.pickRandom([...this.alive]), 'succession');
        this.successionFrom = null;
        this._aftermath(next);
      });
    }
    next();
  }

  _setMayor(id, how) {
    this.mayorId = id;
    this.log.push({ k: 'mayor', id, how, from: how === 'succession' ? this.successionFrom : null });
  }

  // ───────── Victoire ─────────
  _checkWin() {
    const alive = [...this.alive];
    if (alive.length === 0) { this.result = { winner: 'nobody', winners: [] }; return true; }
    const [a, b] = this.lovers;
    const mixed = this.lovers.length === 2 && isWolf(this.assignments.get(a)) !== isWolf(this.assignments.get(b));
    if (mixed && alive.length === 2 && alive.includes(a) && alive.includes(b)) {
      this.result = { winner: 'lovers', winners: [a, b] };
      return true;
    }
    if (alive.length === 1 && this.assignments.get(alive[0]) === 'loup_blanc') {
      this.result = { winner: 'white_wolf', winners: alive };
      return true;
    }
    const wolves = alive.filter((id) => isWolf(this.assignments.get(id)));
    if (wolves.length === 0) {
      this.result = { winner: 'village', winners: this.seats.filter((id) => !isWolf(this.assignments.get(id))) };
      return true;
    }
    const others = alive.length - wolves.length;
    // Le loup blanc doit encore éliminer la meute : pas de victoire des loups tant qu'il vit
    if (wolves.some((id) => this.assignments.get(id) === 'loup_blanc')) return false;
    if (others === 0 || (wolves.length >= others && !this._villageCanComeBack(wolves.length, others))) {
      this.result = { winner: 'wolves', winners: this.seats.filter((id) => this.assignments.get(id) === 'loup_garou') };
      return true;
    }
    return false;
  }

  /**
   * Les loups sont aussi nombreux que les autres : la partie est jouée d'avance…
   * sauf si le village a encore un moyen de renverser la situation.
   */
  _villageCanComeBack(wolves, others) {
    const has = (role) => this._holders(role).length > 0;
    if (has('chasseur')) return true;
    if (has('sorciere') && this.potions.kill) return true;
    if (this.mayorId && this.alive.has(this.mayorId) && !isWolf(this.assignments.get(this.mayorId)) && wolves === others) return true;
    if (this.lovers.length === 2 && this.lovers.every((id) => this.alive.has(id))) return true;
    return false;
  }

  _gameOver() {
    this.clearAllTimers();
    this.step = null;
    this.stepEndsAt = null;
    this.hunterId = null;
    this.successionFrom = null;
    logger.info({ room: this.room.code, result: this.result?.winner, nights: this.night }, 'Werewolf over');
    this.setPhase('GAME_OVER');
  }

  // ───────── Jour ─────────
  _resolveMayor() {
    this.clearAllTimers();
    const tally = new Map();
    for (const t of this.mayorVotes.values()) tally.set(t, (tally.get(t) || 0) + 1);
    let tops = this._tops(tally).filter((id) => this.alive.has(id));
    if (!tops.length) tops = [...this.alive];
    this.mayorElectionDone = true;
    this._setMayor(this.pickRandom(tops), tops.length > 1 && tally.size ? 'draw' : 'vote');
    this.tally = Object.fromEntries(tally);
    this._setTimed('MAYOR_ELECTED', MS.MAYOR_ELECTED, () => this._startDebate());
  }

  _startDebate() {
    this.votes.clear();
    this.voteRound = 'main';
    this.candidates = null;
    this.allVotedAt = null;
    this.tally = null;
    this._setTimed('DEBATE', this.options.debateSec * 1000, () => this._closeVote());
  }

  _weightedTally() {
    const tally = new Map();
    for (const [voter, target] of this.votes) {
      if (!target || target === 'none' || !this.alive.has(voter)) continue;
      tally.set(target, (tally.get(target) || 0) + (voter === this.mayorId ? 2 : 1));
    }
    return tally;
  }

  _closeVote() {
    this.clearAllTimers();
    const tally = this._weightedTally();
    this.tally = Object.fromEntries(tally);
    const tops = this._tops(tally);
    if (tops.length === 1) return this._execute(tops[0], false);
    if (tops.length === 0) return this._execute(null, false);
    if (this.voteRound === 'main') {
      this.voteRound = 'runoff';
      this.candidates = tops;
      this.votes.clear();
      this.allVotedAt = null;
      return this._setTimed('RUNOFF', this._pace(MS.RUNOFF), () => this._closeVote());
    }
    this.candidates = tops;
    if (this.mayorId && this.alive.has(this.mayorId)) {
      return this._setTimed('TIEBREAK', MS.TIEBREAK, () => this._execute(null, true));
    }
    this._execute(null, true);
  }

  _execute(id, tie) {
    this.clearAllTimers();
    let deaths = [];
    if (id) deaths = this._kill([{ id, cause: 'vote' }]);
    this.execution = {
      id,
      role: id && this.options.revealRoles ? this.assignments.get(id) : null,
      tie,
      tally: this.tally,
      also: deaths.filter((d) => d.id !== id).map((d) => this._publicDeath(d)),
    };
    this.log.push({ k: 'vote', n: this.night, id, role: this.execution.role, tie, also: this.execution.also });
    this._setTimed('EXECUTION', MS.EXECUTION, () => this._aftermath(() => this._beginNight()));
  }

  _checkAllVoted() {
    const voters = [...this.alive].filter((id) => this.room.players.get(id)?.connected !== false);
    const all = voters.length > 0 && voters.every((id) => this.votes.has(id));
    if (all && !this.allVotedAt) {
      this.allVotedAt = Date.now();
      this._endSoon(MS.ALL_VOTED, () => this._closeVote());
    } else if (!all && this.allVotedAt) {
      this.allVotedAt = null;
      this._restoreEnd(() => this._closeVote());
    }
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame() { this.room.emitGameState(); }

  onPlayerLeft(playerId) {
    if (!this.assignments.has(playerId) || this.phase === 'GAME_OVER') return this.room.emitGameState();
    this.left.add(playerId);
    this.ready.delete(playerId);
    if (this.alive.has(playerId)) {
      const deaths = this._kill([{ id: playerId, cause: 'left' }]);
      this.log.push({ k: 'left', id: playerId, role: this.assignments.get(playerId), also: deaths.filter((d) => d.id !== playerId).map((d) => this._publicDeath(d)) });
      if (this._checkWin()) return this._gameOver();
    }
    if (this.phase === 'HUNTER' && this.hunterId === playerId) {
      this.hunterId = null;
      return this._aftermath(this._nextAfterDeaths());
    }
    if (this.phase === 'DEAL') return this._checkAllReady();
    if (this.phase === 'DEBATE' || this.phase === 'RUNOFF') this._checkAllVoted();
    if (this.phase === 'NIGHT' && this.step === 'WOLVES') this._checkWolvesDone();
    this.room.emitGameState();
  }

  isMuted(playerId) {
    if (this.phase === 'GAME_OVER' || this.phase === 'DEAL') return false;
    if (!this.alive.has(playerId)) return true;
    return this.phase === 'NIGHT';
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload = {}) {
    const isHost = playerId === this.room.hostId;
    switch (type) {
      case 'ready':       return this._onReady(playerId);
      case 'cupid':       return this._onCupid(playerId, payload);
      case 'guard':       return this._onGuard(playerId, payload);
      case 'wolfVote':    return this._onWolfVote(playerId, payload);
      case 'wolfChat':    return this._onWolfChat(playerId, payload);
      case 'spy':         return this._onSpy(playerId, payload);
      case 'whiteWolf':   return this._onWhiteWolf(playerId, payload);
      case 'seer':        return this._onSeer(playerId, payload);
      case 'witch':       return this._onWitch(playerId, payload);
      case 'hunter':      return this._onHunter(playerId, payload);
      case 'succession':  return this._onSuccession(playerId, payload);
      case 'mayorVote':   return this._onMayorVote(playerId, payload);
      case 'vote':        return this._onVote(playerId, payload);
      case 'tiebreak':    return this._onTiebreak(playerId, payload);
      case 'skip':        return isHost ? this._onSkip() : this._notHost(playerId);
      case 'restart':     return isHost ? (this.phase === 'GAME_OVER' && this.start()) : this._notHost(playerId);
      case 'endGame':
        if (!isHost) return this._notHost(playerId);
        this.cleanup();
        return this.room.endGame({ game: 'werewolf', winner: this.result?.winner, nights: this.night });
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue : ${type}`);
    }
  }

  _actor(playerId, step, role) {
    if (this.phase !== 'NIGHT' || this.step !== step) return false;
    return this.alive.has(playerId) && this.assignments.get(playerId) === role;
  }
  _target(payload) {
    const id = payload?.targetId == null ? null : String(payload.targetId);
    return id && this.alive.has(id) ? id : null;
  }

  _onReady(playerId) {
    if (this.phase !== 'DEAL' || !this.assignments.has(playerId)) return;
    this.ready.add(playerId);
    this._checkAllReady();
    this.room.emitGameState();
  }

  _checkAllReady() {
    const needed = this.seats.filter((id) => this.room.players.get(id)?.connected !== false && !this.left.has(id));
    if (needed.every((id) => this.ready.has(id))) this._endSoon(1500, () => this._beginNight());
  }

  _onCupid(playerId, payload) {
    if (!this._actor(playerId, 'CUPIDON', 'cupidon') || this.cupidDone) return;
    const ids = Array.isArray(payload?.targetIds) ? [...new Set(payload.targetIds.map(String))] : [];
    if (ids.length !== 2 || !ids.every((id) => this.alive.has(id))) return this._error(playerId, 'BAD_TARGETS', 'Choisis deux joueurs différents.');
    this.lovers = ids;
    this.cupidDone = true;
    this.secret.push({ n: this.night, k: 'cupid', ids });
    this._endSoon(2500, () => this._endStep());
    this.room.emitGameState();
  }

  _onGuard(playerId, payload) {
    if (!this._actor(playerId, 'GUARD', 'garde') || this.guardDone) return;
    const id = this._target(payload);
    if (!id) return this._error(playerId, 'BAD_TARGET', 'Joueur invalide.');
    if (id === this.guardLast) return this._error(playerId, 'SAME_TARGET', 'Tu as déjà protégé ce joueur la nuit dernière.');
    this.guardTarget = id;
    this.guardDone = true;
    this.secret.push({ n: this.night, k: 'guard', id });
    this._endSoon(2500, () => this._endStep());
    this.room.emitGameState();
  }

  _onWolfVote(playerId, payload) {
    if (this.phase !== 'NIGHT' || this.step !== 'WOLVES') return;
    if (!this.alive.has(playerId) || !isWolf(this.assignments.get(playerId))) return;
    const id = payload?.targetId == null ? null : this._target(payload);
    if (payload?.targetId != null && !id) return this._error(playerId, 'BAD_TARGET', 'Joueur invalide.');
    if (id && isWolf(this.assignments.get(id))) return this._error(playerId, 'CANNOT_TARGET_WOLF', 'Pas un membre de la meute !');
    if (id) this.wolfVotes.set(playerId, id); else this.wolfVotes.delete(playerId);
    this._checkWolvesDone();
    this.room.emitGameState();
  }

  _checkWolvesDone() {
    const wolves = this._aliveWolves();
    const targets = wolves.map((id) => this.wolfVotes.get(id));
    const unanimous = wolves.length > 0 && targets.every((t) => t && t === targets[0]);
    if (unanimous) this._endSoon(4000, () => this._endStep());
    else this._restoreEnd(() => this._endStep());
  }

  _onWolfChat(playerId, payload) {
    if (this.phase !== 'NIGHT' || this.step !== 'WOLVES') return;
    if (!this.alive.has(playerId) || !isWolf(this.assignments.get(playerId))) return;
    const text = String(payload?.text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
    if (!text) return;
    this.wolfChat.push({ from: playerId, text, at: Date.now() });
    if (this.wolfChat.length > 60) this.wolfChat.shift();
    this.room.emitGameState();
  }

  _onSpy(playerId, payload) {
    if (!this._actor(playerId, 'WOLVES', 'petite_fille')) return;
    this.spying = !!payload?.on;
    if (this.spying && !this.spiedTonight) {
      this.spiedTonight = true;
      this.secret.push({ n: this.night, k: 'spy', by: playerId });
    }
    this.room.emitGameState();
  }

  _onWhiteWolf(playerId, payload) {
    if (!this._actor(playerId, 'WHITE_WOLF', 'loup_blanc') || this.wwDone) return;
    const id = payload?.targetId == null ? null : this._target(payload);
    if (payload?.targetId != null) {
      if (!id || this.assignments.get(id) !== 'loup_garou') return this._error(playerId, 'MUST_TARGET_WOLF', 'Tu ne peux dévorer qu\'un loup-garou.');
      this.wwTarget = id;
      this.secret.push({ n: this.night, k: 'ww', id });
    }
    this.wwDone = true;
    this._endSoon(2500, () => this._endStep());
    this.room.emitGameState();
  }

  _onSeer(playerId, payload) {
    if (!this._actor(playerId, 'SEER', 'voyante')) return;
    if (this.seerHistory.some((h) => h.n === this.night)) return;
    const id = this._target(payload);
    if (!id || id === playerId) return this._error(playerId, 'BAD_TARGET', 'Choisis un autre joueur.');
    const role = this.assignments.get(id);
    this.seerHistory.push({ n: this.night, id, role });
    this.secret.push({ n: this.night, k: 'seer', id, role });
    this._endSoon(6000, () => this._endStep());
    this.room.emitGameState();
  }

  _onWitch(playerId, payload) {
    if (!this._actor(playerId, 'WITCH', 'sorciere') || this.witchDone) return;
    const heal = !!payload?.heal;
    const kill = payload?.killId == null ? null : String(payload.killId);
    if (heal && (!this.potions.heal || !this.wolfTarget)) return this._error(playerId, 'NO_POTION', 'Potion de vie indisponible.');
    if (kill && (!this.potions.kill || !this.alive.has(kill) || kill === playerId)) return this._error(playerId, 'NO_POTION', 'Potion de mort impossible sur ce joueur.');
    if (heal) {
      this.potions.heal = false;
      this.witchHeal = true;
      this.secret.push({ n: this.night, k: 'heal', id: this.wolfTarget });
    }
    if (kill) {
      this.potions.kill = false;
      this.witchKill = kill;
      this.secret.push({ n: this.night, k: 'poison', id: kill });
    }
    this.witchDone = true;
    this._endSoon(2500, () => this._endStep());
    this.room.emitGameState();
  }

  _onHunter(playerId, payload) {
    if (this.phase !== 'HUNTER' || this.hunterId !== playerId) return;
    const id = this._target(payload);
    if (!id) return this._error(playerId, 'BAD_TARGET', 'Joueur invalide.');
    this.clearAllTimers();
    const deaths = this._kill([{ id, cause: 'hunter' }]);
    this.log.push({ k: 'hunter', by: playerId, id, role: this.options.revealRoles ? this.assignments.get(id) : null, also: deaths.filter((d) => d.id !== id).map((d) => this._publicDeath(d)) });
    this.room.broadcast('game:event', { type: 'hunterShot', payload: { hunterId: playerId, targetId: id } });
    this.hunterId = null;
    const next = this._nextAfterDeaths();
    this._aftermath(next);
  }

  /** Après une mort le jour (exécution) on va à la nuit ; après le matin on va au débat. */
  _nextAfterDeaths() {
    const fromMorning = this.execution === null && this.morning !== null;
    return fromMorning ? () => this._afterMorning() : () => this._beginNight();
  }

  _onSuccession(playerId, payload) {
    if (this.phase !== 'SUCCESSION' || this.successionFrom !== playerId) return;
    const id = this._target(payload);
    if (!id) return this._error(playerId, 'BAD_TARGET', 'Joueur invalide.');
    this._setMayor(id, 'succession');
    this.successionFrom = null;
    this._aftermath(this._nextAfterDeaths());
  }

  _onMayorVote(playerId, payload) {
    if (this.phase !== 'MAYOR_ELECTION' || !this.alive.has(playerId)) return;
    const id = this._target(payload);
    if (!id) return;
    this.mayorVotes.set(playerId, id);
    const voters = [...this.alive].filter((x) => this.room.players.get(x)?.connected !== false);
    if (voters.every((x) => this.mayorVotes.has(x))) this._endSoon(3000, () => this._resolveMayor());
    this.room.emitGameState();
  }

  _onVote(playerId, payload) {
    if ((this.phase !== 'DEBATE' && this.phase !== 'RUNOFF') || !this.alive.has(playerId)) return;
    const raw = payload?.targetId;
    if (raw === null || raw === undefined) {
      this.votes.delete(playerId);
    } else if (raw === 'none') {
      this.votes.set(playerId, 'none');
    } else {
      const id = this._target(payload);
      if (!id || id === playerId) return this._error(playerId, 'BAD_TARGET', 'Vote invalide.');
      if (this.candidates && !this.candidates.includes(id)) return this._error(playerId, 'BAD_TARGET', 'Vote seulement pour un des ex-æquo.');
      this.votes.set(playerId, id);
    }
    this._checkAllVoted();
    this.room.emitGameState();
  }

  _onTiebreak(playerId, payload) {
    if (this.phase !== 'TIEBREAK' || playerId !== this.mayorId) return;
    const id = this._target(payload);
    if (!id || !this.candidates.includes(id)) return;
    this._execute(id, true);
  }

  /** L'hôte accélère : clôt le débat, ou passe une annonce / la distribution. */
  _onSkip() {
    if (this.phase === 'DEBATE' || this.phase === 'RUNOFF') return this._closeVote();
    if (['DEAL', 'MORNING', 'EXECUTION', 'MAYOR_ELECTED'].includes(this.phase)) {
      this._endSoon(800);
      this.room.emitGameState();
    }
  }

  // ───────── États ─────────
  _name(id) { return this.room.players.get(id) || this.names.get(id) || {}; }

  getPublicState() {
    const over = this.phase === 'GAME_OVER';
    const players = this.seats.map((id) => {
      const p = this._name(id);
      const alive = this.alive.has(id);
      const death = this.deathLog.find((d) => d.id === id);
      return {
        id,
        pseudo: p.pseudo,
        avatar: p.avatar,
        alive,
        connected: this.room.players.get(id)?.connected ?? false,
        left: this.left.has(id),
        role: over || (!alive && this.options.revealRoles) ? this.assignments.get(id) : null,
        deathNight: death ? death.n : null,
        mayor: id === this.mayorId,
      };
    });
    const s = {
      phase: this.phase,
      gameNo: this.gameNo,
      night: this.night,
      step: this.phase === 'NIGHT' ? this.step : null,
      stepEndsAt: this.stepEndsAt,
      players,
      composition: this._composition(),
      options: this.options,
      mayorId: this.mayorId,
      log: this.log,
    };
    switch (this.phase) {
      case 'DEAL':
        s.readyIds = [...this.ready];
        break;
      case 'MORNING':
        s.morning = this.morning;
        break;
      case 'HUNTER':
        s.hunterId = this.hunterId;
        break;
      case 'SUCCESSION':
        s.successionFrom = this.successionFrom;
        break;
      case 'MAYOR_ELECTION':
        s.mayorVotes = Object.fromEntries(this.mayorVotes);
        break;
      case 'MAYOR_ELECTED':
        s.tally = this.tally;
        break;
      case 'DEBATE':
      case 'RUNOFF':
        s.votedIds = [...this.votes.keys()];
        if (this.options.publicVotes) s.votes = Object.fromEntries(this.votes);
        s.candidates = this.candidates;
        s.allVotedAt = this.allVotedAt;
        s.lastTally = this.phase === 'RUNOFF' ? this.tally : null;
        break;
      case 'TIEBREAK':
        s.candidates = this.candidates;
        s.lastTally = this.tally;
        break;
      case 'EXECUTION':
        s.execution = this.execution;
        break;
      case 'GAME_OVER':
        s.result = this.result;
        s.lovers = this.lovers;
        s.secret = this.secret;
        s.deaths = this.deathLog.map((d) => ({ id: d.id, cause: d.cause, n: d.n, day: d.day }));
        break;
      default:
    }
    return s;
  }

  getPrivateStateFor(playerId) {
    const role = this.assignments.get(playerId);
    if (!role) return { spectator: true };
    const alive = this.alive.has(playerId);
    const d = { role, alive };
    const step = this.phase === 'NIGHT' ? this.step : null;

    if (isWolf(role)) {
      d.pack = this.seats.filter((id) => isWolf(this.assignments.get(id)) && id !== playerId);
      if (step === 'WOLVES') {
        d.wolfVotes = Object.fromEntries(this.wolfVotes);
        d.wolfChat = this.wolfChat;
        d.spied = this.spying;
      }
    }
    if (this.lovers.includes(playerId)) d.lover = this.lovers.find((x) => x !== playerId);
    if (role === 'cupidon') { d.cupidDone = this.cupidDone; d.lovers = this.lovers; }
    if (role === 'voyante') d.seerHistory = this.seerHistory;
    if (role === 'garde') { d.guardLast = this.guardLast; d.guardDone = this.guardDone; d.guardTarget = this.guardTarget; }
    if (role === 'sorciere') {
      d.potions = this.potions;
      if (step === 'WITCH') { d.victim = this.wolfTarget && this.alive.has(this.wolfTarget) ? this.wolfTarget : null; d.witchDone = this.witchDone; }
    }
    if (role === 'loup_blanc' && step === 'WHITE_WOLF') d.wwDone = this.wwDone;
    if (role === 'petite_fille' && step === 'WOLVES' && alive) {
      d.spying = this.spying;
      if (this.spying) {
        // Messages anonymes : « Loup A », « Loup B »… (ordre d'arrivée dans la nuit)
        const letters = new Map();
        const tag = (id) => { if (!letters.has(id)) letters.set(id, String.fromCharCode(65 + letters.size)); return letters.get(id); };
        d.spyChat = this.wolfChat.map((m) => ({ who: tag(m.from), text: m.text, at: m.at }));
        const tally = {};
        for (const t of this.wolfVotes.values()) tally[t] = (tally[t] || 0) + 1;
        d.spyTargets = tally;
      }
    }
    if (this.phase === 'DEBATE' || this.phase === 'RUNOFF') d.myVote = this.votes.get(playerId) ?? null;
    if (this.phase === 'MAYOR_ELECTION') d.myVote = this.mayorVotes.get(playerId) ?? null;
    if (!alive && this.options.deadSeeAll) {
      d.ghost = {
        roles: Object.fromEntries(this.assignments),
        lovers: this.lovers,
        secret: this.secret,
        wolfVotes: step === 'WOLVES' ? Object.fromEntries(this.wolfVotes) : null,
      };
    }
    return d;
  }

  _notHost(playerId) { return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut faire ça."); }
  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
