import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';

/**
 * Liar's Bar — mode cartes (Liar's Deck) + roulette russe.
 *
 *   DEAL (distribution animée) → TURN (on pose 1 à 3 cartes face cachée en annonçant la carte de table)
 *   → « Menteur ! » → REVEAL (cartes retournées) → ROULETTE (un ou plusieurs tirs) → DEAL … → GAME_OVER
 *
 * Paquet : Rois (K), Dames (Q), As (A) + Jokers (J, valent n'importe quelle carte),
 *          + la carte du Diable (D) en option : elle compte comme vraie, mais si elle est retournée
 *          après une accusation, TOUS les autres joueurs tirent.
 * Chaque joueur a son revolver : 6 chambres, 1 balle. Chaque tir avance d'une chambre.
 * Dernier en vie gagne.
 *
 * Options : accuseMode 'next' (seul le suivant accuse) | 'anyone' (tout le monde peut accuser),
 *           devilCard, turnSec (0 = pas de chrono).
 */
const PH = { DEAL: 'DEAL', TURN: 'TURN', REVEAL: 'REVEAL', ROULETTE: 'ROULETTE', GAME_OVER: 'GAME_OVER' };
const RANKS = ['K', 'Q', 'A'];
const HAND_SIZE = 5;
const DEAL_MS = 2600;
const REVEAL_MS = 3800;
const SHOT_SUSPENSE_MS = 3600;   // barillet qui tourne avant le résultat
const SHOT_AFTER_MS = 2200;      // temps pour voir le résultat
const DISCONNECTED_TURN_MS = 20000;
const TURN_SECS = [0, 15, 20, 30, 45, 60];

const DEFAULT_OPTIONS = { accuseMode: 'next', devilCard: false, turnSec: 30, view: '2d' };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class LiarsBarGame extends BaseGame {
  static id = 'liarsbar';
  static label = "Liar's Bar";
  static minPlayers = 2;
  static maxPlayers = 6;

  static getOptionsManifest() {
    return { defaults: DEFAULT_OPTIONS, turnSecs: TURN_SECS, maxPlayers: 6 };
  }

  static sanitize(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    o.accuseMode = o.accuseMode === 'anyone' ? 'anyone' : 'next';
    o.devilCard = !!o.devilCard;
    o.view = o.view === '3d' ? '3d' : '2d'; // vue par défaut (chacun peut changer de son côté)
    const t = parseInt(o.turnSec, 10);
    o.turnSec = TURN_SECS.includes(t) ? t : 30;
    return o;
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = LiarsBarGame.sanitize(options);
    this.gameNo = 0;
    this._reset();
  }

  _reset() {
    this.seats = [];              // ordre autour de la table
    this.names = new Map();       // id → { pseudo, avatar } (même après départ)
    this.alive = new Set();
    this.hands = new Map();       // id → [{ id, rank }]
    this.revolvers = new Map();   // id → { bullet: 0-5, shots }
    this.round = 0;
    this.tableCard = null;
    this.currentId = null;
    this.lastPlay = null;         // { by, cards: [...], at }
    this.pile = 0;                // cartes posées sur la table pendant la manche
    this.reveal = null;           // { by, accuser, cards, lie, devil, shooters }
    this.shotQueue = [];
    this.shot = null;             // { playerId, startedAt, revealAt, chamber, fired (secret jusqu'à revealAt) }
    this.turnEndsAt = null;
    this.phaseEndsAt = null;
    this.eliminationOrder = [];
    this.log = [];                // événements lisibles (récap)
    this.winnerId = null;
    this._cardSeq = 0;
  }

  // ───────── Déroulement ─────────
  start() {
    this.clearAllTimers();
    this._reset();
    this.gameNo += 1;
    const ids = this.playerIds.filter((id) => this.room.players.get(id)?.connected).slice(0, LiarsBarGame.maxPlayers);
    if (ids.length < LiarsBarGame.minPlayers) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: 'Il faut au moins 2 joueurs connectés.' });
      this.room.endGame({ aborted: true });
      return;
    }
    this.seats = shuffle(ids);
    for (const id of this.seats) {
      const p = this.room.players.get(id);
      this.names.set(id, { pseudo: p.pseudo, avatar: p.avatar || null });
      this.alive.add(id);
      this.revolvers.set(id, { bullet: Math.floor(Math.random() * 6), shots: 0 });
    }
    logger.info({ room: this.room.code, players: this.seats.length, opts: this.options }, "Liar's Bar started");
    this._deal(this.seats[0]);
  }

  /** Nouveau paquet pour les joueurs en vie : 5 cartes chacun, nouvelle carte de table. */
  _buildDeck(n) {
    const total = HAND_SIZE * n;
    const jokers = n <= 4 ? 2 : 3;
    const devil = this.options.devilCard ? 1 : 0;
    const rest = total - jokers - devil;
    const cards = [];
    for (let i = 0; i < rest; i++) cards.push(RANKS[i % 3]);
    for (let i = 0; i < jokers; i++) cards.push('J');
    if (devil) cards.push('D');
    return shuffle(cards).map((rank) => ({ id: `c${++this._cardSeq}`, rank }));
  }

  _deal(firstId) {
    this.clearAllTimers();
    this.round += 1;
    const players = this.seats.filter((id) => this.alive.has(id));
    const deck = this._buildDeck(players.length);
    this.hands = new Map();
    players.forEach((id, i) => this.hands.set(id, deck.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE)));
    this.tableCard = RANKS[Math.floor(Math.random() * 3)];
    this.lastPlay = null;
    this.pile = 0;
    this.reveal = null;
    this.shot = null;
    this.shotQueue = [];
    this.currentId = this.alive.has(firstId) ? firstId : this._nextAlive(firstId);
    this.log.push({ t: 'round', round: this.round, tableCard: this.tableCard, players: players.length });
    this.phaseEndsAt = Date.now() + DEAL_MS;
    this.setPhase(PH.DEAL);
    this.setTimer(DEAL_MS, () => this._beginTurn(this.currentId));
  }

  _nextAlive(fromId) {
    const n = this.seats.length;
    const start = this.seats.indexOf(fromId);
    for (let k = 1; k <= n; k++) {
      const id = this.seats[(start + k + n) % n];
      if (this.alive.has(id)) return id;
    }
    return null;
  }

  /** Prochain joueur en vie (autre que fromId) qui a encore des cartes. */
  _nextWithCards(fromId) {
    const n = this.seats.length;
    const start = this.seats.indexOf(fromId);
    for (let k = 1; k < n; k++) {
      const id = this.seats[(start + k + n) % n];
      if (this.alive.has(id) && (this.hands.get(id)?.length || 0) > 0) return id;
    }
    return null;
  }

  /** Le joueur doit-il obligatoirement accuser ? (il n'a plus de cartes mais doit juger la dernière pose) */
  _mustAccuse(id) {
    return !!this.lastPlay && this.lastPlay.by !== id && (this.hands.get(id)?.length || 0) === 0;
  }

  _beginTurn(id) {
    this.clearAllTimers();
    // Plus personne à faire jouer (ne devrait pas arriver) : on redistribue
    if (!id) return this._deal(this._nextAlive(this.currentId) || this.seats.find((s) => this.alive.has(s)));
    // Sans cartes et rien à juger : on passe au suivant qui a des cartes
    if ((this.hands.get(id)?.length || 0) === 0 && !this._mustAccuse(id)) {
      const next = this._nextWithCards(id);
      if (!next) return this._deal(this._nextAlive(id));
      return this._beginTurn(next);
    }
    this.currentId = id;
    const connected = this.room.players.get(id)?.connected;
    const ms = this.options.turnSec ? this.options.turnSec * 1000 : connected ? 0 : DISCONNECTED_TURN_MS;
    this.turnEndsAt = ms ? Date.now() + ms : null;
    this.phaseEndsAt = this.turnEndsAt;
    this.setPhase(PH.TURN);
    if (ms) this.setTimer(ms, () => this._onTimeout(id));
  }

  _onTimeout(id) {
    if (this.phase !== PH.TURN || this.currentId !== id) return;
    if (this._mustAccuse(id)) return this._accuse(id, true);
    const hand = this.hands.get(id) || [];
    const card = hand[Math.floor(Math.random() * hand.length)];
    this.log.push({ t: 'timeout', by: id });
    this._play(id, [card.id], true);
  }

  _play(id, cardIds, auto = false) {
    const hand = this.hands.get(id) || [];
    const cards = cardIds.map((cid) => hand.find((c) => c.id === cid)).filter(Boolean);
    if (!cards.length || cards.length > 3 || new Set(cardIds).size !== cardIds.length) return this._error(id, 'BAD_PLAY', 'Choisis 1 à 3 cartes.');
    this.clearAllTimers();
    this.hands.set(id, hand.filter((c) => !cardIds.includes(c.id)));
    this.lastPlay = { by: id, cards, at: Date.now(), auto };
    this.pile += cards.length;
    this.log.push({ t: 'play', by: id, count: cards.length, auto: auto || undefined });
    this.room.broadcast('game:event', { type: 'play', payload: { by: id, count: cards.length } });
    // Le prochain joueur qui a des cartes répond (accuser ou poser). Si plus personne n'en a,
    // le joueur suivant doit obligatoirement juger cette pose.
    this._beginTurn(this._nextWithCards(id) || this._nextAlive(id));
  }

  _accuse(accuserId, forced = false) {
    const play = this.lastPlay;
    if (!play || play.by === accuserId) return;
    this.clearAllTimers();
    const ok = (c) => c.rank === this.tableCard || c.rank === 'J' || c.rank === 'D';
    const lie = play.cards.some((c) => !ok(c));
    const devil = play.cards.some((c) => c.rank === 'D');
    let shooters;
    if (devil) shooters = this.seats.filter((id) => this.alive.has(id) && id !== play.by);
    else shooters = [lie ? play.by : accuserId];
    this.reveal = { by: play.by, accuser: accuserId, cards: play.cards, lie, devil, forced, shooters };
    this.log.push({ t: 'accuse', by: accuserId, target: play.by, cards: play.cards.map((c) => c.rank), lie, devil, forced: forced || undefined });
    this.room.broadcast('game:event', { type: 'liar', payload: { accuser: accuserId, target: play.by } });
    this.turnEndsAt = null;
    this.phaseEndsAt = Date.now() + REVEAL_MS;
    this.setPhase(PH.REVEAL);
    this.setTimer(REVEAL_MS, () => this._startRoulette(shooters));
  }

  _startRoulette(shooters) {
    this.shotQueue = shooters.filter((id) => this.alive.has(id));
    this._nextShot();
  }

  _nextShot() {
    this.clearAllTimers();
    const id = this.shotQueue.shift();
    if (!id) return this._afterRoulette();
    const rev = this.revolvers.get(id);
    const chamber = rev.shots; // chambre qui va être percutée (0..5)
    const fired = chamber === rev.bullet;
    rev.shots += 1;
    const now = Date.now();
    this.shot = { playerId: id, startedAt: now, revealAt: now + SHOT_SUSPENSE_MS, chamber, fired, shotsBefore: chamber };
    this.phaseEndsAt = this.shot.revealAt + SHOT_AFTER_MS;
    this.setPhase(PH.ROULETTE);
    this.setTimer(SHOT_SUSPENSE_MS, () => {
      this.shot = { ...this.shot, revealed: true };
      this.log.push({ t: 'shot', by: id, n: chamber + 1, fired });
      if (fired) {
        this.alive.delete(id);
        this.eliminationOrder.push(id);
        this.hands.set(id, []);
      }
      this.room.broadcast('game:event', { type: fired ? 'bang' : 'click', payload: { playerId: id } });
      this.room.emitGameState();
      this.setTimer(SHOT_AFTER_MS, () => this._nextShot());
    });
  }

  _afterRoulette() {
    this.shot = null;
    const alive = this.seats.filter((id) => this.alive.has(id));
    if (alive.length <= 1) return this._end(alive[0] || null);
    // La manche suivante commence par le dernier tireur s'il est en vie, sinon le suivant
    const r = this.reveal;
    const lastShooter = r?.shooters?.[r.shooters.length - 1];
    const first = lastShooter && this.alive.has(lastShooter) ? lastShooter : this._nextAlive(lastShooter || this.currentId);
    this._deal(first);
  }

  _end(winnerId) {
    this.clearAllTimers();
    this.winnerId = winnerId;
    this.currentId = null;
    this.turnEndsAt = null;
    this.phaseEndsAt = null;
    this.log.push({ t: 'end', winner: winnerId });
    this.setPhase(PH.GAME_OVER);
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame() { this.room.emitGameState(); }

  onPlayerReconnected() { this.room.emitGameState(); }

  /** Un joueur qui quitte la table est éliminé. */
  onPlayerLeft(playerId) {
    if (!this.alive.has(playerId) || this.phase === PH.GAME_OVER) return this.room.emitGameState();
    this.alive.delete(playerId);
    this.eliminationOrder.push(playerId);
    this.log.push({ t: 'left', by: playerId });
    this.shotQueue = this.shotQueue.filter((id) => id !== playerId);
    const alive = this.seats.filter((id) => this.alive.has(id));
    if (alive.length <= 1) return this._end(alive[0] || null);
    if (this.lastPlay?.by === playerId) this.lastPlay = null;
    if (this.phase === PH.TURN && this.currentId === playerId) return this._beginTurn(this._nextWithCards(playerId) || this._nextAlive(playerId));
    this.room.emitGameState();
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload) {
    const isHost = playerId === this.room.hostId;
    switch (type) {
      case 'play': {
        if (this.phase !== PH.TURN || this.currentId !== playerId) return this._error(playerId, 'NOT_YOUR_TURN', "Ce n'est pas ton tour.");
        if (this._mustAccuse(playerId)) return this._error(playerId, 'MUST_ACCUSE', 'Plus personne n\'a de cartes : tu dois juger la dernière pose.');
        const ids = Array.isArray(payload?.cardIds) ? payload.cardIds.map(String).slice(0, 3) : [];
        return this._play(playerId, ids);
      }
      case 'liar': {
        if (this.phase !== PH.TURN || !this.lastPlay || !this.alive.has(playerId)) return undefined;
        if (this.lastPlay.by === playerId) return undefined;
        const allowed = this.options.accuseMode === 'anyone' || this.currentId === playerId;
        if (!allowed) return this._error(playerId, 'NOT_YOUR_TURN', 'Seul le joueur suivant peut accuser.');
        return this._accuse(playerId);
      }
      case 'restart':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        if (this.phase === PH.GAME_OVER) this.start();
        return undefined;
      case 'endGame':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        this.cleanup();
        return this.room.endGame({ game: 'liarsbar', winner: this.winnerId });
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue : ${type}`);
    }
  }

  // ───────── États ─────────
  _person(id) {
    const n = this.names.get(id) || {};
    const p = this.room.players.get(id);
    return { id, pseudo: p?.pseudo || n.pseudo || '?', avatar: p?.avatar ?? n.avatar ?? null };
  }

  getPublicState() {
    const shot = this.shot && (this.shot.revealed ? this.shot : { ...this.shot, fired: undefined });
    const base = {
      phase: this.phase,
      gameNo: this.gameNo,
      round: this.round,
      options: this.options,
      tableCard: this.tableCard,
      currentId: this.currentId,
      turnEndsAt: this.turnEndsAt,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      pile: this.pile,
      lastPlay: this.lastPlay ? { by: this.lastPlay.by, count: this.lastPlay.cards.length, at: this.lastPlay.at, auto: this.lastPlay.auto } : null,
      seats: this.seats.map((id) => ({
        ...this._person(id),
        alive: this.alive.has(id),
        connected: !!this.room.players.get(id)?.connected,
        cards: this.hands.get(id)?.length || 0,
        shots: this.revolvers.get(id)?.shots || 0,
      })),
      mustAccuse: this.phase === PH.TURN && this._mustAccuse(this.currentId),
      reveal: this.phase === PH.REVEAL || this.phase === PH.ROULETTE ? this.reveal : null,
      shot,
      shotQueue: this.shotQueue,
      winnerId: this.winnerId,
      eliminationOrder: this.eliminationOrder,
    };
    if (this.phase === PH.GAME_OVER) {
      base.ranking = [this.winnerId, ...[...this.eliminationOrder].reverse()].filter(Boolean).map((id, i) => ({ ...this._person(id), rank: i + 1, shots: this.revolvers.get(id)?.shots || 0 }));
      base.log = this.log;
    }
    return base;
  }

  getPrivateStateFor(playerId) {
    return {
      hand: this.hands.get(playerId) || [],
      seated: this.seats.includes(playerId),
      alive: this.alive.has(playerId),
    };
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
