import { BaseGame } from '../../core/BaseGame.js';
import { ROLES, isWolf, listAssignableRoles } from './roles.js';
import { logger } from '../../utils/logger.js';

const P = {
  DEAL_ROLES:        'DEAL_ROLES',
  MAYOR_ELECTION:    'MAYOR_ELECTION',
  NIGHT_CUPIDON:     'NIGHT_CUPIDON',
  NIGHT_LOVERS:      'NIGHT_LOVERS',
  NIGHT_GUARD:       'NIGHT_GUARD',
  NIGHT_WEREWOLVES:  'NIGHT_WEREWOLVES',
  NIGHT_WHITE_WOLF:  'NIGHT_WHITE_WOLF',
  NIGHT_SEER:        'NIGHT_SEER',
  NIGHT_WITCH:       'NIGHT_WITCH',
  DAY_REVEAL:        'DAY_REVEAL',
  DAY_HUNTER:        'DAY_HUNTER',
  DAY_VOTE:          'DAY_VOTE',
  DAY_LYNCH:         'DAY_LYNCH',
  GAME_OVER:         'GAME_OVER',
};

const DURATIONS = {
  DEAL_ROLES:       9000,
  MAYOR_ELECTION:   30000,
  NIGHT_CUPIDON:    30000,
  NIGHT_LOVERS:     6000,
  NIGHT_GUARD:      20000,
  NIGHT_WEREWOLVES: 35000,
  NIGHT_WHITE_WOLF: 20000,
  NIGHT_SEER:       20000,
  NIGHT_WITCH:      25000,
  DAY_REVEAL:       8000,
  DAY_HUNTER:       20000,
  DAY_LYNCH:        6000,
};

const DEFAULT_OPTIONS = {
  werewolfCount: 1,
  enabledRoles: ['voyante', 'sorciere', 'chasseur', 'garde'],
  enableMayor: true,
  dayVoteDurationSec: 60,
};

export class WerewolfGame extends BaseGame {
  static id = 'werewolf';
  static label = 'Loup-Garou';
  static minPlayers = 5;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return {
      roles: listAssignableRoles(),
      defaults: DEFAULT_OPTIONS,
      limits: {
        werewolfCount: { min: 1, max: 3 },
        dayVoteDurationSec: { min: 30, max: 180 },
      },
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = this._sanitizeOptions(options);

    this.day = 0;
    this.firstNight = true;
    this.firstDay = true;
    this.assignments = new Map();
    this.aliveIds = new Set();
    this.deathLog = [];

    this.loverIds = [];
    this.witchHealUsed = false;
    this.witchKillUsed = false;
    this.seerHistory = [];

    // Maire
    this.mayorId = null;
    this.mayorVotes = new Map();

    // Garde
    this.guardLastTarget = null;
    this.guardCurrentTarget = null;

    // Loup blanc : alterne, kill possible nuits paires (2, 4, 6...)
    this.whiteWolfKilledThisNight = null;

    // États transitoires
    this.werewolfVotes = new Map();
    this.witchTarget = null;
    this.witchAction = null;
    this.witchKillTarget = null;
    this.dayVotes = new Map();
    this.dayVoteEndsAt = null;
    this.pendingHunterId = null;

    this.lastResult = null;
    this.lastNightDeaths = [];   // [{ playerId, roleId }]
    this.lastDayDeaths = [];
    // Contexte pour router après le tir du chasseur
    // 'night' = on revient vers DAY_VOTE  ;  'lynch' = on enchaîne sur la nuit
    this.hunterContext = null;
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    o.werewolfCount = Math.max(1, Math.min(3, parseInt(o.werewolfCount, 10) || 1));
    if (!Array.isArray(o.enabledRoles)) o.enabledRoles = [];
    const validSpecials = new Set(['voyante', 'sorciere', 'chasseur', 'cupidon', 'garde', 'loup_blanc']);
    o.enabledRoles = o.enabledRoles.filter(r => validSpecials.has(r));
    o.enableMayor = !!o.enableMayor;
    o.dayVoteDurationSec = Math.max(30, Math.min(180, parseInt(o.dayVoteDurationSec, 10) || 60));
    return o;
  }

  // ───────── Setup ─────────
  start() {
    const players = this.playerIds;
    if (players.length < WerewolfGame.minPlayers) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS' });
      this.room.endGame({ aborted: true });
      return;
    }
    // Compter le total : loups réguliers + loup blanc (compte aussi comme loup)
    const wolfCount = this.options.werewolfCount + (this.options.enabledRoles.includes('loup_blanc') ? 1 : 0);
    const otherSpecials = this.options.enabledRoles.filter(r => r !== 'loup_blanc').length;
    if (wolfCount + otherSpecials >= players.length) {
      this.room.broadcast('error', { code: 'TOO_MANY_ROLES', message: 'Trop de rôles pour le nombre de joueurs.' });
      this.room.endGame({ aborted: true });
      return;
    }

    const shuffled = this.shuffle(players);
    let i = 0;
    for (let w = 0; w < this.options.werewolfCount; w++) {
      this.assignments.set(shuffled[i++], 'loup_garou');
    }
    if (this.options.enabledRoles.includes('loup_blanc')) {
      this.assignments.set(shuffled[i++], 'loup_blanc');
    }
    for (const role of this.options.enabledRoles) {
      if (role === 'loup_blanc') continue;
      this.assignments.set(shuffled[i++], role);
    }
    while (i < shuffled.length) {
      this.assignments.set(shuffled[i++], 'villageois');
    }
    for (const id of players) this.aliveIds.add(id);

    logger.info({ room: this.room.code, options: this.options, assignments: [...this.assignments] }, 'Werewolf started');

    this.setPhase(P.DEAL_ROLES);
    this.setTimer(DURATIONS.DEAL_ROLES, () => this._afterDeal());
  }

  _afterDeal() {
    if (this.options.enableMayor) {
      this.mayorVotes.clear();
      this.setPhase(P.MAYOR_ELECTION);
      this.setTimer(DURATIONS.MAYOR_ELECTION, () => this._resolveMayorElection());
    } else {
      this._beginNight();
    }
  }

  _resolveMayorElection() {
    this.clearAllTimers();
    if (this.mayorVotes.size > 0) {
      const tally = new Map();
      for (const t of this.mayorVotes.values()) tally.set(t, (tally.get(t) || 0) + 1);
      let max = 0; const tops = [];
      for (const [id, c] of tally) {
        if (c > max) { max = c; tops.length = 0; tops.push(id); }
        else if (c === max) tops.push(id);
      }
      this.mayorId = tops.length === 1 ? tops[0] : null;
    } else {
      this.mayorId = null;
    }
    this._beginNight();
  }

  // ───────── Cycle nuit/jour ─────────
  _beginNight() {
    this.day += 1;
    this.werewolfVotes.clear();
    this.witchTarget = null;
    this.witchAction = null;
    this.witchKillTarget = null;
    this.lastNightDeaths = [];
    this.guardCurrentTarget = null;
    this.whiteWolfKilledThisNight = null;

    if (this.firstNight && this._isAlive('cupidon')) {
      this.setPhase(P.NIGHT_CUPIDON);
      this.setTimer(DURATIONS.NIGHT_CUPIDON, () => this._afterCupidon());
    } else {
      this._afterCupidon();
    }
  }

  _afterCupidon() {
    if (this.firstNight && this.loverIds.length === 2) {
      this.setPhase(P.NIGHT_LOVERS);
      this.setTimer(DURATIONS.NIGHT_LOVERS, () => this._goGuard());
    } else {
      this._goGuard();
    }
  }

  _goGuard() {
    this.firstNight = false;
    if (this._isAlive('garde')) {
      this.setPhase(P.NIGHT_GUARD);
      this.setTimer(DURATIONS.NIGHT_GUARD, () => this._goWolves());
    } else {
      this._goWolves();
    }
  }

  _goWolves() {
    if (this._aliveWolvesCount() === 0) return this._checkWinAndAdvance();
    this.setPhase(P.NIGHT_WEREWOLVES);
    this.setTimer(DURATIONS.NIGHT_WEREWOLVES, () => this._afterWolves());
  }

  _afterWolves() {
    // Détermine la victime des loups
    if (this.werewolfVotes.size > 0) {
      const tally = new Map();
      for (const targetId of this.werewolfVotes.values()) tally.set(targetId, (tally.get(targetId) || 0) + 1);
      let max = 0; const tops = [];
      for (const [id, c] of tally) {
        if (c > max) { max = c; tops.length = 0; tops.push(id); }
        else if (c === max) tops.push(id);
      }
      this.witchTarget = this.pickRandom(tops);
    } else {
      this.witchTarget = null;
    }
    this._goWhiteWolf();
  }

  _goWhiteWolf() {
    // Loup blanc agit nuits paires (2, 4, 6...) si vivant
    if (this._isAlive('loup_blanc') && this.day % 2 === 0) {
      this.setPhase(P.NIGHT_WHITE_WOLF);
      this.setTimer(DURATIONS.NIGHT_WHITE_WOLF, () => this._goSeer());
    } else {
      this._goSeer();
    }
  }

  _goSeer() {
    if (this._isAlive('voyante')) {
      this.setPhase(P.NIGHT_SEER);
      this.setTimer(DURATIONS.NIGHT_SEER, () => this._goWitch());
    } else {
      this._goWitch();
    }
  }

  _goWitch() {
    if (this._isAlive('sorciere')) {
      this.setPhase(P.NIGHT_WITCH);
      this.setTimer(DURATIONS.NIGHT_WITCH, () => this._beginDay());
    } else {
      this._beginDay();
    }
  }

  _beginDay() {
    // Calcul des morts de la nuit
    const deaths = [];
    // 1. Victime des loups (sauf si garde a protégé)
    if (this.witchTarget && this.witchAction !== 'heal' && this.guardCurrentTarget !== this.witchTarget) {
      deaths.push({ id: this.witchTarget });
    }
    // 2. Victime de la sorcière
    if (this.witchAction === 'kill' && this.witchKillTarget) {
      deaths.push({ id: this.witchKillTarget });
    }
    // 3. Loup blanc tue un loup
    if (this.whiteWolfKilledThisNight) {
      deaths.push({ id: this.whiteWolfKilledThisNight });
    }
    // Update guard rule
    this.guardLastTarget = this.guardCurrentTarget;

    this._applyDeaths(deaths);
    this.lastNightDeaths = deaths
      .filter(d => !this.aliveIds.has(d.id) || true) // tous les morts de cette nuit
      .map(d => ({ playerId: d.id, roleId: this.assignments.get(d.id) }));
    // Inclure aussi les morts par cascade (lover broken_heart) ce tour-ci
    const justDied = this.deathLog.filter(d => d.day === this.day);
    this.lastNightDeaths = justDied.map(d => ({ playerId: d.playerId, roleId: this.assignments.get(d.playerId) }));

    if (this._checkWin()) {
      this.setPhase(P.GAME_OVER);
      return;
    }
    // Le village se RÉVEILLE D'ABORD : on annonce les morts (et leur rôle)
    // AVANT que le chasseur agisse. Le chasseur "découvre" qu'il est mort
    // en même temps que tout le monde.
    this.setPhase(P.DAY_REVEAL);
    this.setTimer(DURATIONS.DAY_REVEAL, () => this._afterDayReveal());
  }

  _afterDayReveal() {
    if (this.pendingHunterId) {
      this.hunterContext = 'night';
      this.setPhase(P.DAY_HUNTER);
      this.setTimer(DURATIONS.DAY_HUNTER, () => {
        this.pendingHunterId = null;
        this._afterHunter();
      });
      return;
    }
    this._beginVote();
  }

  _beginVote() {
    if (this._checkWin()) return this.setPhase(P.GAME_OVER);
    this.dayVotes.clear();
    this.dayVoteEndsAt = Date.now() + this.options.dayVoteDurationSec * 1000;
    this.setPhase(P.DAY_VOTE);
    this.setTimer(this.options.dayVoteDurationSec * 1000, () => this._resolveLynch());
  }

  _resolveLynch() {
    this.clearAllTimers();
    const tally = new Map();
    for (const [voterId, targetId] of this.dayVotes) {
      const weight = (voterId === this.mayorId) ? 2 : 1; // vote du maire = double
      tally.set(targetId, (tally.get(targetId) || 0) + weight);
    }
    let max = 0; const tops = [];
    for (const [id, c] of tally) {
      if (c > max) { max = c; tops.length = 0; tops.push(id); }
      else if (c === max) tops.push(id);
    }
    const lynchedId = tops.length === 1 ? tops[0] : null;
    this.lastResult = {
      lynchedId,
      lynchedRoleId: lynchedId ? this.assignments.get(lynchedId) : null,
      tally: Object.fromEntries(tally),
      tied: tops.length > 1,
    };

    if (lynchedId) this._applyDeaths([{ id: lynchedId }]);
    if (this._checkWin()) return this.setPhase(P.GAME_OVER);

    // Toujours afficher le lynchage AVANT que le chasseur agisse
    this.setPhase(P.DAY_LYNCH);
    this.setTimer(DURATIONS.DAY_LYNCH, () => this._afterDayLynch());
  }

  _afterDayLynch() {
    if (this.pendingHunterId) {
      this.hunterContext = 'lynch';
      this.setPhase(P.DAY_HUNTER);
      this.setTimer(DURATIONS.DAY_HUNTER, () => {
        this.pendingHunterId = null;
        this._afterHunter();
      });
      return;
    }
    this._afterLynch();
  }

  _afterHunter() {
    if (this._checkWin()) return this.setPhase(P.GAME_OVER);
    // Cascade : un autre chasseur peut être déclenché (ex : amoureux)
    if (this.pendingHunterId) {
      this.setPhase(P.DAY_HUNTER);
      this.setTimer(DURATIONS.DAY_HUNTER, () => {
        this.pendingHunterId = null;
        this._afterHunter();
      });
      return;
    }
    // Reprendre le flow normal selon le contexte
    if (this.hunterContext === 'lynch') {
      this.hunterContext = null;
      this._afterLynch();
    } else {
      this.hunterContext = null;
      this._beginVote();
    }
  }

  _afterLynch() {
    if (this._checkWin()) return this.setPhase(P.GAME_OVER);
    this._beginNight();
  }

  // ───────── Application des morts ─────────
  _applyDeaths(deaths) {
    const queue = [...deaths];
    while (queue.length > 0) {
      const { id } = queue.shift();
      if (!this.aliveIds.has(id)) continue;
      this.aliveIds.delete(id);
      this.deathLog.push({ day: this.day, playerId: id });
      // Amoureux : l'autre meurt aussi
      if (this.loverIds.includes(id)) {
        const other = this.loverIds.find(x => x !== id);
        if (other && this.aliveIds.has(other)) queue.push({ id: other });
      }
      // Chasseur : déclenche son tir
      if (this.assignments.get(id) === 'chasseur') {
        this.pendingHunterId = id;
      }
      // Maire : titre perdu
      if (id === this.mayorId) {
        this.mayorId = null;
      }
    }
  }

  // ───────── Win conditions ─────────
  _checkWin() {
    const aliveAll = [...this.aliveIds];
    const aliveWolves = aliveAll.filter(id => isWolf(this.assignments.get(id)));
    const aliveOthers = aliveAll.filter(id => !isWolf(this.assignments.get(id)));

    // Loup blanc seul vivant -> victoire solo
    if (aliveAll.length === 1 && this.assignments.get(aliveAll[0]) === 'loup_blanc') {
      this.lastResult = { ...this.lastResult, winner: 'white_wolf', winners: [aliveAll[0]] };
      return true;
    }
    if (aliveWolves.length === 0) {
      this.lastResult = { ...this.lastResult, winner: 'village', winners: aliveOthers };
      return true;
    }
    if (aliveWolves.length >= aliveOthers.length) {
      this.lastResult = { ...this.lastResult, winner: 'wolves', winners: aliveWolves };
      return true;
    }
    return false;
  }

  _checkWinAndAdvance() {
    if (this._checkWin()) this.setPhase(P.GAME_OVER);
    else this._beginNight();
  }

  // ───────── Helpers ─────────
  _isAlive(roleId) {
    return [...this.aliveIds].some(id => this.assignments.get(id) === roleId);
  }
  _aliveWolvesCount() {
    return [...this.aliveIds].filter(id => isWolf(this.assignments.get(id))).length;
  }

  isMuted(playerId) {
    if (this.phase === P.GAME_OVER) return false;
    if (!this.aliveIds.has(playerId)) return true;
    return this.phase.startsWith('NIGHT_');
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    switch (type) {
      case 'mayorVote':       return this._onMayorVote(playerId, payload);
      case 'cupidonChoose':   return this._onCupidon(playerId, payload);
      case 'guardProtect':    return this._onGuard(playerId, payload);
      case 'wolfVote':        return this._onWolfVote(playerId, payload);
      case 'whiteWolfKill':   return this._onWhiteWolf(playerId, payload);
      case 'seerInspect':     return this._onSeer(playerId, payload);
      case 'witchAction':     return this._onWitch(playerId, payload);
      case 'dayVote':         return this._onDayVote(playerId, payload);
      case 'hunterShoot':     return this._onHunter(playerId, payload);
      case 'endGame':         return this._onEndGame(playerId);
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  _onMayorVote(playerId, payload) {
    if (this.phase !== P.MAYOR_ELECTION) return this._error(playerId, 'BAD_PHASE');
    if (!this.aliveIds.has(playerId)) return this._error(playerId, 'DEAD');
    const targetId = String(payload?.targetId || '');
    if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    this.mayorVotes.set(playerId, targetId);
    this.room.emitGameState();
    if ([...this.aliveIds].every(id => this.mayorVotes.has(id))) this._resolveMayorElection();
  }

  _onCupidon(playerId, payload) {
    if (this.phase !== P.NIGHT_CUPIDON) return this._error(playerId, 'BAD_PHASE');
    if (this.assignments.get(playerId) !== 'cupidon') return this._error(playerId, 'NOT_CUPIDON');
    const ids = Array.isArray(payload?.targetIds) ? payload.targetIds.map(String) : [];
    if (ids.length !== 2 || ids[0] === ids[1]) return this._error(playerId, 'BAD_TARGETS');
    if (!ids.every(id => this.aliveIds.has(id))) return this._error(playerId, 'BAD_TARGETS');
    this.loverIds = ids;
    this.clearAllTimers();
    this._afterCupidon();
  }

  _onGuard(playerId, payload) {
    if (this.phase !== P.NIGHT_GUARD) return this._error(playerId, 'BAD_PHASE');
    if (this.assignments.get(playerId) !== 'garde' || !this.aliveIds.has(playerId)) return this._error(playerId, 'NOT_GUARD');
    const targetId = String(payload?.targetId || '');
    if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (targetId === this.guardLastTarget) return this._error(playerId, 'SAME_TARGET', 'Tu as déjà protégé ce joueur la nuit dernière.');
    this.guardCurrentTarget = targetId;
    this.clearAllTimers();
    this._goWolves();
  }

  _onWolfVote(playerId, payload) {
    if (this.phase !== P.NIGHT_WEREWOLVES) return this._error(playerId, 'BAD_PHASE');
    if (!isWolf(this.assignments.get(playerId)) || !this.aliveIds.has(playerId)) return this._error(playerId, 'NOT_WOLF');
    const targetId = String(payload?.targetId || '');
    if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (isWolf(this.assignments.get(targetId))) return this._error(playerId, 'CANNOT_TARGET_WOLF');
    this.werewolfVotes.set(playerId, targetId);
    this.room.emitGameState();
    const wolves = [...this.aliveIds].filter(id => isWolf(this.assignments.get(id)));
    if (wolves.every(id => this.werewolfVotes.has(id))) {
      this.clearAllTimers();
      this._afterWolves();
    }
  }

  _onWhiteWolf(playerId, payload) {
    if (this.phase !== P.NIGHT_WHITE_WOLF) return this._error(playerId, 'BAD_PHASE');
    if (this.assignments.get(playerId) !== 'loup_blanc' || !this.aliveIds.has(playerId)) return this._error(playerId, 'NOT_WHITE_WOLF');
    const targetId = payload?.targetId ? String(payload.targetId) : null;
    if (targetId) {
      if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
      if (this.assignments.get(targetId) !== 'loup_garou') return this._error(playerId, 'MUST_TARGET_WOLF', 'Tu ne peux tuer qu\'un loup-garou (pas toi-même).');
      this.whiteWolfKilledThisNight = targetId;
    }
    this.clearAllTimers();
    this._goSeer();
  }

  _onSeer(playerId, payload) {
    if (this.phase !== P.NIGHT_SEER) return this._error(playerId, 'BAD_PHASE');
    if (this.assignments.get(playerId) !== 'voyante' || !this.aliveIds.has(playerId)) return this._error(playerId, 'NOT_SEER');
    const targetId = String(payload?.targetId || '');
    if (targetId === playerId) return this._error(playerId, 'CANNOT_INSPECT_SELF');
    if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    const targetRole = this.assignments.get(targetId);
    this.seerHistory.push({ day: this.day, playerId: targetId, roleId: targetRole });
    this.room.emitGameState();
  }

  _onWitch(playerId, payload) {
    if (this.phase !== P.NIGHT_WITCH) return this._error(playerId, 'BAD_PHASE');
    if (this.assignments.get(playerId) !== 'sorciere' || !this.aliveIds.has(playerId)) return this._error(playerId, 'NOT_WITCH');
    const action = payload?.action;
    if (action === 'heal') {
      if (this.witchHealUsed) return this._error(playerId, 'NO_POTION');
      if (!this.witchTarget) return this._error(playerId, 'NO_VICTIM');
      this.witchAction = 'heal'; this.witchHealUsed = true;
    } else if (action === 'kill') {
      if (this.witchKillUsed) return this._error(playerId, 'NO_POTION');
      const targetId = String(payload?.targetId || '');
      if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
      if (targetId === playerId) return this._error(playerId, 'CANNOT_KILL_SELF');
      this.witchAction = 'kill'; this.witchKillTarget = targetId; this.witchKillUsed = true;
    } else {
      this.witchAction = 'pass';
    }
    this.clearAllTimers();
    this._beginDay();
  }

  _onDayVote(playerId, payload) {
    if (this.phase !== P.DAY_VOTE) return this._error(playerId, 'BAD_PHASE');
    if (!this.aliveIds.has(playerId)) return this._error(playerId, 'DEAD');
    const targetId = String(payload?.targetId || '');
    if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (targetId === playerId) return this._error(playerId, 'CANNOT_VOTE_SELF');
    this.dayVotes.set(playerId, targetId);
    this.room.broadcast('game:event', { type: 'voteCast', payload: { voterId: playerId } });
    this.room.emitGameState();
    if ([...this.aliveIds].every(id => this.dayVotes.has(id))) this._resolveLynch();
  }

  _onHunter(playerId, payload) {
    if (this.phase !== P.DAY_HUNTER) return this._error(playerId, 'BAD_PHASE');
    if (this.pendingHunterId !== playerId) return this._error(playerId, 'NOT_YOUR_TURN');
    const targetId = String(payload?.targetId || '');
    if (!this.aliveIds.has(targetId)) return this._error(playerId, 'BAD_TARGET');
    if (targetId === playerId) return this._error(playerId, 'CANNOT_SHOOT_SELF');
    this._applyDeaths([{ id: targetId }]);
    this.pendingHunterId = null;
    // Le tir résonne pour tout le monde — son joué côté client sur cet event
    this.room.broadcast('game:event', { type: 'hunterShot', payload: { hunterId: playerId, targetId } });
    this.clearAllTimers();
    this._afterHunter();
  }

  _onEndGame(playerId) {
    if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST');
    this.cleanup();
    this.room.endGame({ game: 'werewolf', winner: this.lastResult?.winner, days: this.day });
  }

  // ───────── States ─────────
  getPublicState() {
    const players = this.playerIds.map(id => ({ id, alive: this.aliveIds.has(id) }));
    const base = {
      phase: this.phase,
      day: this.day,
      players,
      aliveIds: [...this.aliveIds],
      mayorId: this.mayorId,
      // Death log : on ne révèle que les morts du jour passé ; on inclut leur rôle
      deathLog: this.deathLog.map(d => ({ ...d, roleId: this.assignments.get(d.playerId) })),
      loverIds: [...this.loverIds],
      options: this.options,
    };

    if (this.phase === P.MAYOR_ELECTION) {
      return { ...base, mayorVotedIds: [...this.mayorVotes.keys()] };
    }
    if (this.phase === P.NIGHT_WEREWOLVES) {
      return { ...base, wolfVotedIds: [...this.werewolfVotes.keys()] };
    }
    if (this.phase === P.DAY_VOTE) {
      return { ...base, votedIds: [...this.dayVotes.keys()], voteEndsAt: this.dayVoteEndsAt };
    }
    if (this.phase === P.DAY_REVEAL) {
      return { ...base, nightDeaths: this.lastNightDeaths };
    }
    if (this.phase === P.DAY_LYNCH) {
      return { ...base, lastLynch: this.lastResult };
    }
    if (this.phase === P.DAY_HUNTER) {
      return { ...base, hunterId: this.pendingHunterId };
    }
    if (this.phase === P.GAME_OVER) {
      const reveal = {};
      for (const [pid, role] of this.assignments) reveal[pid] = role;
      return { ...base, reveal, result: this.lastResult };
    }
    return base;
  }

  getPrivateStateFor(playerId) {
    const myRole = this.assignments.get(playerId);
    if (!myRole) return { spectator: true };

    const data = { role: myRole, alive: this.aliveIds.has(playerId) };

    if (isWolf(myRole)) {
      data.wolfAllies = [...this.assignments.entries()]
        .filter(([id, r]) => isWolf(r) && id !== playerId)
        .map(([id]) => id);
    }
    if (this.loverIds.includes(playerId)) {
      data.loverPartnerId = this.loverIds.find(x => x !== playerId);
    }
    if (myRole === 'voyante') {
      data.seerHistory = this.seerHistory;
      data.iSawThisTurn = this.seerHistory.some(h => h.day === this.day);
    }
    if (myRole === 'sorciere' && this.phase === P.NIGHT_WITCH) {
      data.witchTarget = this.witchTarget;
      data.healAvailable = !this.witchHealUsed;
      data.killAvailable = !this.witchKillUsed;
    }
    if (myRole === 'garde' && this.phase === P.NIGHT_GUARD) {
      data.guardLastTarget = this.guardLastTarget;
    }
    if (isWolf(myRole) && this.phase === P.NIGHT_WEREWOLVES) {
      data.myWolfVote = this.werewolfVotes.get(playerId) || null;
    }
    if (myRole === 'cupidon' && this.phase === P.NIGHT_CUPIDON) {
      data.cupidonChosen = this.loverIds.length === 2;
    }
    return data;
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
