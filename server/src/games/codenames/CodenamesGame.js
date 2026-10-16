import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { WORDS } from './words.js';

/**
 * Codenames : deux équipes (rouge et bleue). Dans chaque équipe, un maître-espion voit la
 * couleur secrète des 25 cartes et donne des indices d'UN mot + un nombre ; ses agents
 * touchent les cartes qu'ils pensent être les leurs.
 *
 *   - carte de son équipe : on peut continuer (jusqu'à nombre + 1 essais)
 *   - carte neutre ou adverse : fin du tour
 *   - l'assassin : l'équipe perd immédiatement
 * La première équipe qui découvre toutes ses cartes gagne.
 *
 * Phases : TEAMS (choix des équipes et des rôles) -> PLAYING -> GAME_OVER
 */
const PHASES = { TEAMS: 'TEAMS', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
const TEAMS = ['red', 'blue'];
const other = (team) => (team === 'red' ? 'blue' : 'red');
const TIMERS = [0, 60, 90, 120, 180];
const MAX_CLUE = 30;

/** Comparaison sans accents ni majuscules. */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

export class CodenamesGame extends BaseGame {
  static id = 'codenames';
  static label = 'Codenames';
  static minPlayers = 4;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return {
      defaults: { turnSec: 0 },
      timers: TIMERS.map((s) => ({ id: s, label: s === 0 ? 'Sans limite' : `${s} secondes par étape` })),
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    const t = Number(options?.turnSec);
    this.options = { turnSec: TIMERS.includes(t) ? t : 0 };
    this.members = new Map();   // playerId -> { team: 'red'|'blue'|null, role: 'spy'|'agent' }
    this.round = 0;
    this.recentWords = [];
    this._resetBoard();
  }

  _resetBoard() {
    this.board = [];
    this.startingTeam = null;
    this.turn = null;           // { team, stage: 'CLUE'|'GUESS', clue, guessesLeft, endsAt }
    this.history = [];
    this.winner = null;
    this.reason = null;
  }

  // ───────── Helpers ─────────
  _member(id) { return this.members.get(id); }
  _present(id) { return !!this.room.players.get(id)?.connected; }
  _spyOf(team) {
    for (const [id, m] of this.members) if (m.team === team && m.role === 'spy' && this.room.players.has(id)) return id;
    return null;
  }
  _agentsOf(team) {
    return [...this.members].filter(([id, m]) => m.team === team && m.role === 'agent' && this.room.players.has(id)).map(([id]) => id);
  }
  _remaining(team) { return this.board.filter((c) => c.color === team && !c.revealed).length; }

  /** Les deux équipes ont un maître-espion et au moins un agent. */
  _teamsReady() {
    return TEAMS.every((t) => this._spyOf(t) && this._agentsOf(t).length > 0);
  }

  _ensureMember(id) {
    if (!this.members.has(id) && this.room.players.has(id)) this.members.set(id, { team: null, role: 'agent' });
  }

  // ───────── Lifecycle ─────────
  start() {
    for (const id of this.playerIds) this._ensureMember(id);
    this.setPhase(PHASES.TEAMS);
  }

  onPlayerJoinedMidGame(playerId) {
    this._ensureMember(playerId);   // il choisira son équipe (en partie : comme agent)
    this.room.emitGameState();
  }

  onPlayerLeft(playerId) {
    // Les rôles restent : si un maître-espion part, un coéquipier peut reprendre sa place
    if (this.phase === PHASES.PLAYING && this.turn) {
      const team = this.turn.team;
      const noAgentLeft = this.turn.stage === 'GUESS' && this._agentsOf(team).length === 0;
      if (noAgentLeft) this._endTurn();
    }
    this.room.emitGameState();
  }

  _newBoard() {
    this.clearAllTimers();
    this._resetBoard();
    this.round += 1;
    const pool = WORDS.filter((w) => !this.recentWords.includes(w));
    const words = this.shuffle(pool.length >= 25 ? pool : WORDS).slice(0, 25);
    this.recentWords = [...words, ...this.recentWords].slice(0, 150);
    this.startingTeam = Math.random() < 0.5 ? 'red' : 'blue';
    const colors = this.shuffle([
      ...Array(9).fill(this.startingTeam),
      ...Array(8).fill(other(this.startingTeam)),
      ...Array(7).fill('neutral'),
      'assassin',
    ]);
    this.board = words.map((word, i) => ({ word, color: colors[i], revealed: false, revealedBy: null }));
    this._startTurn(this.startingTeam);
    logger.info({ room: this.room.code, round: this.round, starting: this.startingTeam }, 'Codenames: new board');
  }

  _armTimer() {
    this.clearAllTimers();
    this.turn.endsAt = null;
    if (!this.options.turnSec) return;
    this.turn.endsAt = Date.now() + this.options.turnSec * 1000;
    this.setTimer(this.options.turnSec * 1000, () => {
      if (this.phase === PHASES.PLAYING) this._endTurn();
    });
  }

  _startTurn(team) {
    this.turn = { team, stage: 'CLUE', clue: null, guessesLeft: 0, endsAt: null };
    this._armTimer();
    this.setPhase(PHASES.PLAYING);
  }

  _endTurn() {
    this._startTurn(other(this.turn.team));
  }

  _finish(winner, reason) {
    this.clearAllTimers();
    this.winner = winner;
    this.reason = reason;
    if (this.turn) this.turn.endsAt = null;
    this.setPhase(PHASES.GAME_OVER);
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload) {
    this._ensureMember(playerId);
    const isHost = playerId === this.room.hostId;
    switch (type) {
      case 'joinTeam':        return this._onJoinTeam(playerId, payload);
      case 'randomTeams':     return isHost ? this._onRandomTeams() : this._notHost(playerId);
      case 'startRound':      return isHost ? this._onStartRound(playerId) : this._notHost(playerId);
      case 'giveClue':        return this._onGiveClue(playerId, payload);
      case 'reveal':          return this._onReveal(playerId, payload);
      case 'endTurn':         return this._onEndTurnAction(playerId);
      case 'claimSpymaster':  return this._onClaimSpymaster(playerId);
      case 'newBoard':        return isHost ? this._onNewBoard(playerId) : this._notHost(playerId);
      case 'changeTeams':     return isHost ? this._onChangeTeams() : this._notHost(playerId);
      case 'endGame':
        if (!isHost) return this._notHost(playerId);
        this.cleanup();
        return this.room.endGame({ game: 'codenames', rounds: this.round });
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  _onJoinTeam(playerId, payload) {
    const team = payload?.team;
    if (!TEAMS.includes(team)) return this._error(playerId, 'BAD_TEAM');
    const me = this._member(playerId);
    if (this.phase === PHASES.TEAMS) {
      const role = payload?.role === 'spy' ? 'spy' : 'agent';
      const spy = this._spyOf(team);
      if (role === 'spy' && spy && spy !== playerId) {
        return this._error(playerId, 'SPY_TAKEN', 'Cette équipe a déjà un maître-espion.');
      }
      me.team = team;
      me.role = role;
    } else {
      // En cours de partie : on peut rejoindre une équipe comme agent seulement
      if (me.team) return this._error(playerId, 'ALREADY_IN_TEAM', 'Tu es déjà dans une équipe.');
      me.team = team;
      me.role = 'agent';
    }
    this.room.emitGameState();
  }

  _onRandomTeams() {
    if (this.phase !== PHASES.TEAMS) return;
    const ids = this.shuffle(this.playerIds.filter((id) => this._present(id)));
    ids.forEach((id, i) => {
      this._ensureMember(id);
      const m = this._member(id);
      m.team = TEAMS[i % 2];
      m.role = i < 2 ? 'spy' : 'agent';
    });
    this.room.emitGameState();
  }

  _onStartRound(playerId) {
    if (this.phase !== PHASES.TEAMS) return;
    if (!this._teamsReady()) {
      return this._error(playerId, 'TEAMS_NOT_READY', 'Chaque équipe a besoin d\'un maître-espion et d\'au moins un agent.');
    }
    this._newBoard();
  }

  _onGiveClue(playerId, payload) {
    if (this.phase !== PHASES.PLAYING || this.turn.stage !== 'CLUE') return;
    if (this._spyOf(this.turn.team) !== playerId) return this._error(playerId, 'NOT_SPY', "Ce n'est pas à toi de donner l'indice.");
    const word = String(payload?.word ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_CLUE);
    if (!word) return this._error(playerId, 'EMPTY_CLUE', 'Donne un mot.');
    if (/\s/.test(word)) return this._error(playerId, 'ONE_WORD', "L'indice doit être un seul mot.");
    const n = norm(word);
    const clash = this.board.find((c) => !c.revealed && (norm(c.word) === n || (n.length >= 3 && norm(c.word).includes(n)) || (norm(c.word).length >= 3 && n.includes(norm(c.word)))));
    if (clash) return this._error(playerId, 'BOARD_WORD', `Interdit : l'indice ressemble à une carte (« ${clash.word} »).`);
    const raw = payload?.count;
    const unlimited = raw === 'inf' || raw === -1;
    const count = unlimited ? -1 : Math.max(0, Math.min(9, parseInt(raw, 10) || 0));
    this.turn.clue = { word, count };
    this.turn.stage = 'GUESS';
    // nombre + 1 essais ; 0 ou ∞ : sans limite (jusqu'à une erreur)
    this.turn.guessesLeft = count > 0 ? count + 1 : null;
    this.history.push({ team: this.turn.team, spyId: playerId, word, count, guesses: [] });
    this._armTimer();
    this.room.emitGameState();
  }

  _onReveal(playerId, payload) {
    if (this.phase !== PHASES.PLAYING || this.turn.stage !== 'GUESS') return;
    const me = this._member(playerId);
    if (!me || me.team !== this.turn.team || me.role !== 'agent') {
      return this._error(playerId, 'NOT_YOUR_TURN', "Ce n'est pas à toi de jouer.");
    }
    const index = parseInt(payload?.index, 10);
    const card = this.board[index];
    if (!card || card.revealed) return;

    card.revealed = true;
    card.revealedBy = playerId;
    const team = this.turn.team;
    this.history[this.history.length - 1]?.guesses.push({ word: card.word, color: card.color, by: playerId });

    if (card.color === 'assassin') return this._finish(other(team), 'ASSASSIN');
    if (this._remaining('red') === 0) return this._finish('red', 'ALL_FOUND');
    if (this._remaining('blue') === 0) return this._finish('blue', 'ALL_FOUND');

    if (card.color !== team) return this._endTurn();
    if (this.turn.guessesLeft !== null) {
      this.turn.guessesLeft -= 1;
      if (this.turn.guessesLeft <= 0) return this._endTurn();
    }
    this.room.emitGameState();
  }

  _onEndTurnAction(playerId) {
    if (this.phase !== PHASES.PLAYING || this.turn.stage !== 'GUESS') return;
    const me = this._member(playerId);
    if (!me || me.team !== this.turn.team || me.role !== 'agent') return this._error(playerId, 'NOT_YOUR_TURN');
    this._endTurn();
  }

  /** Le maître-espion est parti : un coéquipier prend sa place. */
  _onClaimSpymaster(playerId) {
    const me = this._member(playerId);
    if (!me?.team) return this._error(playerId, 'NO_TEAM', "Rejoins d'abord une équipe.");
    if (this._spyOf(me.team)) return this._error(playerId, 'SPY_TAKEN', 'Ton équipe a déjà un maître-espion.');
    me.role = 'spy';
    this.room.emitGameState();
  }

  _onNewBoard() {
    if (this.phase === PHASES.TEAMS) return;
    if (!this._teamsReady()) {
      this.clearAllTimers();
      this._resetBoard();
      return this.setPhase(PHASES.TEAMS);
    }
    this._newBoard();
  }

  _onChangeTeams() {
    this.clearAllTimers();
    this._resetBoard();
    this.setPhase(PHASES.TEAMS);
  }

  // ───────── States ─────────
  getPublicState() {
    const players = this.playerIds.map((id) => {
      const p = this.room.players.get(id);
      const m = this._member(id) || { team: null, role: 'agent' };
      return { id, pseudo: p.pseudo, avatar: p.avatar, connected: p.connected, team: m.team, role: m.role };
    });
    const over = this.phase === PHASES.GAME_OVER;
    return {
      phase: this.phase,
      round: this.round,
      options: this.options,
      players,
      spies: { red: this._spyOf('red'), blue: this._spyOf('blue') },
      teamsReady: this._teamsReady(),
      startingTeam: this.startingTeam,
      // Couleur visible seulement une fois la carte retournée (ou en fin de partie)
      board: this.board.map((c) => ({
        word: c.word,
        revealed: c.revealed,
        revealedBy: c.revealedBy,
        color: c.revealed || over ? c.color : null,
      })),
      remaining: this.board.length ? { red: this._remaining('red'), blue: this._remaining('blue') } : null,
      totals: this.board.length ? { red: this.startingTeam === 'red' ? 9 : 8, blue: this.startingTeam === 'blue' ? 9 : 8 } : null,
      turn: this.turn,
      history: this.history,
      winner: this.winner,
      reason: this.reason,
    };
  }

  getPrivateStateFor(playerId) {
    const m = this._member(playerId);
    const data = { team: m?.team || null, role: m?.role || 'agent' };
    // Le maître-espion voit la grille secrète
    if (m?.role === 'spy' && m.team && this.board.length && this._spyOf(m.team) === playerId) {
      data.key = this.board.map((c) => c.color);
    }
    return data;
  }

  _notHost(playerId) { return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut faire ça."); }
  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
