import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { getMap, MAP_LIST, MODELS, modelHp, disguisableModels, TAUNTS } from './shared.js';

/**
 * Prop Hunt — cache-cache en 3D.
 *
 *   HIDE (les chasseurs sont aveuglés, les cachés se transforment en objets et se cachent)
 *   → HUNT (les chasseurs tirent ; tirer sur un vrai objet leur coûte de la vie)
 *   → ROUND_END (les rôles tournent) → … → GAME_OVER
 *
 * Positions : chaque joueur envoie la sienne (~15 fois/s, action « pos »), le serveur renvoie
 * à tous un instantané ~12 fois/s (événement volatil « snap » : perdu sans gravité si le réseau traîne).
 * Le reste (vies, déguisements, leurres, chrono) passe par l'état de jeu habituel.
 */
const PH = { HIDE: 'HIDE', HUNT: 'HUNT', ROUND_END: 'ROUND_END', GAME_OVER: 'GAME_OVER' };
const SNAP_MS = 80;
const ROUND_END_MS = 9000;
const SHOT_DAMAGE = 25;
const MISS_PENALTY = 5;
const SHOT_COOLDOWN_MS = 180;
const TAUNT_COOLDOWN_MS = 2500;
const DISGUISE_COOLDOWN_MS = 1500;
const HUNTER_HP = 100;

const DEFAULT_OPTIONS = { map: 'rotate', rounds: 0, huntSec: 240, hideSec: 45, hunters: 'auto', tauntSec: 45, decoys: 2 };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const vec = (v) => (Array.isArray(v) && v.length === 3 && v.every((x) => num(x) !== null && Math.abs(x) < 500) ? v.map((x) => Math.round(x * 100) / 100) : null);

export class PropHuntGame extends BaseGame {
  static id = 'prophunt';
  static label = 'Prop Hunt';
  static minPlayers = 2;
  static maxPlayers = 16;

  static getOptionsManifest() {
    return { defaults: DEFAULT_OPTIONS, maps: MAP_LIST };
  }

  static sanitize(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    o.map = o.map === 'rotate' || o.map === 'random' || MAP_LIST.some((m) => m.id === o.map) ? o.map : 'rotate';
    const r = parseInt(o.rounds, 10); o.rounds = [0, 2, 4, 6, 8].includes(r) ? r : 0;
    const h = parseInt(o.huntSec, 10); o.huntSec = [120, 180, 240, 300, 420].includes(h) ? h : 240;
    const hi = parseInt(o.hideSec, 10); o.hideSec = [20, 30, 45, 60].includes(hi) ? hi : 45;
    o.hunters = ['auto', 1, 2, 3].includes(o.hunters) ? o.hunters : ['1', '2', '3'].includes(o.hunters) ? Number(o.hunters) : 'auto';
    const t = parseInt(o.tauntSec, 10); o.tauntSec = [0, 30, 45, 60, 90].includes(t) ? t : 45;
    const d = parseInt(o.decoys, 10); o.decoys = [0, 1, 2, 3].includes(d) ? d : 2;
    return o;
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = PropHuntGame.sanitize(options);
    this.gameNo = 0;
    this._snap = null;
    this._reset();
  }

  _reset() {
    this.order = [];
    this.names = new Map();
    this.scores = new Map();
    this.huntedTimes = new Map();
    this.stats = new Map(); // id → { kills, survived, deaths, taunts }
    this.round = 0;
    this.totalRounds = 0;
    this.mapId = null;
    this.roles = new Map();
    this.alive = new Set();
    this.hp = new Map();
    this.maxHp = new Map();
    this.disguise = new Map();
    this.tf = new Map(); // id → { p, ry, pi }
    this.spawns = {};
    this.decoys = [];
    this.feed = [];
    this.log = [];
    this.lastTaunt = new Map();
    this.lastShot = new Map();
    this.lastDisguise = new Map();
    this.endsAt = 0;
    this.result = null;
    this._allowed = new Set();
    this._seq = 0;
  }

  clearAllTimers() {
    super.clearAllTimers();
    if (this._snap) { clearInterval(this._snap); this._snap = null; }
  }

  // ───────── Partie ─────────
  start() {
    this.clearAllTimers();
    this._reset();
    this.gameNo += 1;
    const ids = this.playerIds.filter((id) => this.room.players.get(id)?.connected);
    if (ids.length < 2) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: 'Il faut au moins 2 joueurs.' });
      this.room.endGame({ aborted: true });
      return;
    }
    this.order = shuffle(ids);
    for (const id of ids) this._ensurePlayer(id);
    this.totalRounds = this.options.rounds || Math.min(8, Math.max(2, ids.length));
    logger.info({ room: this.room.code, players: ids.length, opts: this.options }, 'Prop Hunt started');
    this._snap = setInterval(() => this._tick(), SNAP_MS);
    this._startRound();
  }

  _ensurePlayer(id) {
    const p = this.room.players.get(id);
    if (!p) return;
    this.names.set(id, { pseudo: p.pseudo, avatar: p.avatar || null });
    if (!this.scores.has(id)) this.scores.set(id, 0);
    if (!this.huntedTimes.has(id)) this.huntedTimes.set(id, 0);
    if (!this.stats.has(id)) this.stats.set(id, { kills: 0, survived: 0, deaths: 0, taunts: 0 });
    if (!this.order.includes(id)) this.order.push(id);
  }

  _startRound() {
    this.round += 1;
    // map : fixe, au hasard, ou chacune son tour
    const ids = MAP_LIST.map((m) => m.id);
    this.mapId = this.options.map === 'rotate' ? ids[(this.round - 1) % ids.length]
      : this.options.map === 'random' ? ids[Math.floor(Math.random() * ids.length)] : this.options.map;
    const map = getMap(this.mapId);
    this._allowed = new Set(disguisableModels(map));
    // joueurs présents (y compris ceux arrivés en cours de partie)
    for (const [id, p] of this.room.players) if (p.connected) this._ensurePlayer(id);
    const present = this.order.filter((id) => this.room.players.get(id)?.connected);
    // chasseurs : ceux qui ont le moins chassé
    const n = present.length;
    const want = this.options.hunters === 'auto' ? Math.max(1, Math.round(n / 3)) : Math.min(this.options.hunters, n - 1);
    const hunters = shuffle(present).sort((a, b) => this.huntedTimes.get(a) - this.huntedTimes.get(b)).slice(0, Math.max(1, Math.min(want, n - 1)));
    this.roles = new Map(present.map((id) => [id, hunters.includes(id) ? 'hunter' : 'prop']));
    this.alive = new Set(present);
    this.hp = new Map(); this.maxHp = new Map(); this.disguise = new Map(); this.decoys = []; this.feed = [];
    this.lastTaunt = new Map(); this.tf = new Map(); this.spawns = {}; this.result = null;
    const hs = shuffle(map.spawns.hunters); const ps = shuffle(map.spawns.props);
    let hi = 0; let pi = 0;
    for (const id of present) {
      if (this.roles.get(id) === 'hunter') {
        this.huntedTimes.set(id, this.huntedTimes.get(id) + 1);
        this.hp.set(id, HUNTER_HP); this.maxHp.set(id, HUNTER_HP);
        const s = hs[hi++ % hs.length]; this.spawns[id] = [s[0] + (Math.random() - 0.5) * 0.6, s[1], s[2] + (Math.random() - 0.5) * 0.6];
      } else {
        // déguisement de départ : un petit objet de la map, au hasard
        const small = [...this._allowed].filter((k) => modelHp(k.split('@')[0], Number(k.split('@')[1])) <= 80);
        const pick = (small.length ? small : [...this._allowed])[Math.floor(Math.random() * (small.length || this._allowed.size))];
        const [m0, s0] = pick.split('@');
        this.disguise.set(id, { m: m0, s: Number(s0) });
        this.hp.set(id, modelHp(m0, Number(s0))); this.maxHp.set(id, modelHp(m0, Number(s0)));
        const s = ps[pi++ % ps.length]; this.spawns[id] = [s[0] + (Math.random() - 0.5) * 1.5, s[1], s[2] + (Math.random() - 0.5) * 1.5];
        this.lastTaunt.set(id, Date.now() + this.options.hideSec * 1000);
      }
      this.tf.set(id, { p: this.spawns[id], ry: 0, pi: 0 });
    }
    this._push({ t: 'round', round: this.round, map: map.name, hunters: hunters.map((id) => this._name(id)) });
    this.endsAt = Date.now() + this.options.hideSec * 1000;
    this.setPhase(PH.HIDE);
    this.setTimer(this.options.hideSec * 1000, () => this._startHunt());
  }

  _startHunt() {
    this.endsAt = Date.now() + this.options.huntSec * 1000;
    const now = Date.now();
    for (const id of this._props()) this.lastTaunt.set(id, now);
    this.setPhase(PH.HUNT);
    this.room.broadcast('game:event', { type: 'release' });
    this.setTimer(this.options.huntSec * 1000, () => this._endRound('props'));
  }

  _props(aliveOnly = true) { return [...this.roles].filter(([id, r]) => r === 'prop' && (!aliveOnly || this.alive.has(id))).map(([id]) => id); }
  _hunters(aliveOnly = true) { return [...this.roles].filter(([id, r]) => r === 'hunter' && (!aliveOnly || this.alive.has(id))).map(([id]) => id); }

  _checkEnd() {
    if (this.phase !== PH.HUNT && this.phase !== PH.HIDE) return false;
    if (!this._props().length) { this._endRound('hunters'); return true; }
    if (!this._hunters().length) { this._endRound('props'); return true; }
    return false;
  }

  _endRound(winner) {
    if (this.phase === PH.ROUND_END || this.phase === PH.GAME_OVER) return;
    this.clearAllTimers();
    this._snap = setInterval(() => this._tick(), SNAP_MS);
    const survivors = this._props();
    for (const id of survivors) { this._add(id, 4); this.stats.get(id).survived += 1; }
    if (winner === 'hunters') for (const id of this._hunters(false)) this._add(id, 2);
    this.result = { winner, survivors, round: this.round };
    this._push({ t: 'end', round: this.round, winner, survivors: survivors.map((id) => this._name(id)) });
    this.endsAt = Date.now() + ROUND_END_MS;
    this.setPhase(PH.ROUND_END);
    this.setTimer(ROUND_END_MS, () => (this.round >= this.totalRounds ? this._gameOver() : this._startRound()));
  }

  _gameOver() {
    this.clearAllTimers();
    this.setPhase(PH.GAME_OVER);
  }

  _add(id, pts) { this.scores.set(id, (this.scores.get(id) || 0) + pts); }
  _name(id) { return this.names.get(id)?.pseudo || '?'; }
  _push(e) { this.log.push({ ...e, at: Date.now() }); if (this.log.length > 400) this.log.shift(); }
  _feed(e) { this.feed.push({ ...e, id: ++this._seq, at: Date.now() }); if (this.feed.length > 8) this.feed.shift(); }

  // ───────── Temps réel ─────────
  _tick() {
    const now = Date.now();
    // moqueries forcées : un caché trop silencieux fait du bruit malgré lui
    if (this.phase === PH.HUNT && this.options.tauntSec) {
      for (const id of this._props()) {
        if (now - (this.lastTaunt.get(id) || now) > this.options.tauntSec * 1000) this._taunt(id, null, true);
      }
    }
    if (this.phase === PH.GAME_OVER) return;
    const s = [];
    for (const [id, t] of this.tf) {
      if (!this.roles.has(id)) continue;
      s.push([id, t.p[0], t.p[1], t.p[2], Math.round(t.ry * 100) / 100, Math.round((t.pi || 0) * 100) / 100, this.alive.has(id) ? 1 : 0]);
    }
    try { this.room.io.to(this.room.code).volatile.emit('game:event', { type: 'snap', t: now, s }); } catch { /* io absent (tests) */ }
  }

  _taunt(id, sound, forced = false) {
    const now = Date.now();
    const snd = TAUNTS.some((t) => t.id === sound) ? sound : TAUNTS[Math.floor(Math.random() * TAUNTS.length)].id;
    this.lastTaunt.set(id, now);
    this.stats.get(id).taunts += 1;
    if (!forced) this._add(id, 1);
    this.room.broadcast('game:event', { type: 'taunt', by: id, sound: snd, p: this.tf.get(id)?.p, forced });
  }

  // ───────── Arrivées / départs ─────────
  onPlayerJoinedMidGame(id) {
    this._ensurePlayer(id);
    this.room.emitGameState();
  }

  onPlayerReconnected() { this.room.emitGameState(); }

  onPlayerLeft(playerId) {
    this.roles.delete(playerId);
    this.alive.delete(playerId);
    this.tf.delete(playerId);
    this.decoys = this.decoys.filter((d) => d.owner !== playerId);
    if (this.phase === PH.GAME_OVER || this.phase === PH.ROUND_END) return this.room.emitGameState();
    if (this.roles.size < 2) return this._gameOver();
    if (!this._checkEnd()) this.room.emitGameState();
  }

  // ───────── Actions ─────────
  handleAction(id, type, payload = {}) {
    const isHost = id === this.room.hostId;
    const role = this.roles.get(id);
    const alive = this.alive.has(id);
    const playing = this.phase === PH.HIDE || this.phase === PH.HUNT;
    switch (type) {
      case 'pos': {
        if (!role) return;
        const p = vec(payload?.p);
        if (!p) return;
        // un chasseur ne bouge pas pendant que les autres se cachent
        if (role === 'hunter' && this.phase === PH.HIDE) return;
        this.tf.set(id, { p, ry: num(payload.ry) ?? 0, pi: num(payload.pi) ?? 0 });
        return;
      }
      case 'disguise': {
        if (role !== 'prop' || !alive || !playing) return;
        const m = String(payload?.m || ''); const s = num(payload?.s) ?? 1;
        if (!this._allowed.has(`${m}@${s}`) || !MODELS[m]) return;
        const now = Date.now();
        if (now - (this.lastDisguise.get(id) || 0) < DISGUISE_COOLDOWN_MS) return;
        this.lastDisguise.set(id, now);
        const ratio = this.hp.get(id) / this.maxHp.get(id);
        const max = modelHp(m, s);
        this.maxHp.set(id, max);
        this.hp.set(id, Math.max(1, Math.round(max * ratio)));
        this.disguise.set(id, { m, s });
        this.room.broadcast('game:event', { type: 'disguise', by: id, m, s });
        return this.room.emitGameState();
      }
      case 'shoot': {
        if (role !== 'hunter' || !alive || this.phase !== PH.HUNT) return;
        const now = Date.now();
        if (now - (this.lastShot.get(id) || 0) < SHOT_COOLDOWN_MS) return;
        this.lastShot.set(id, now);
        const from = vec(payload?.from); const to = vec(payload?.to);
        this.room.broadcast('game:event', { type: 'shot', by: id, from, to });
        const hit = payload?.hit || {};
        if (hit.kind === 'player') return this._hitPlayer(id, hit.id, to);
        if (hit.kind === 'object' || hit.kind === 'decoy') return this._miss(id, hit.kind);
        return;
      }
      case 'taunt': {
        if (role !== 'prop' || !alive || !playing) return;
        if (Date.now() - (this.lastTaunt.get(id) || 0) < TAUNT_COOLDOWN_MS && this.phase === PH.HUNT) return;
        return this._taunt(id, payload?.sound);
      }
      case 'decoy': {
        if (role !== 'prop' || !alive || !playing) return;
        const mine = this.decoys.filter((d) => d.owner === id).length;
        const dis = this.disguise.get(id);
        const t = this.tf.get(id);
        if (!dis || !t || mine >= this.options.decoys) return;
        this.decoys.push({ id: ++this._seq, owner: id, m: dis.m, s: dis.s, p: t.p, ry: t.ry });
        return this.room.emitGameState();
      }
      case 'restart':
        if (isHost && this.phase === PH.GAME_OVER) this.start();
        return;
      case 'skipRound':
        if (isHost && playing) this._endRound(this.phase === PH.HUNT ? 'props' : 'props');
        return;
      case 'endGame':
        if (!isHost) return;
        this.clearAllTimers();
        return this.room.endGame({ game: 'prophunt' });
      default:
    }
  }

  _hitPlayer(hunter, target, at) {
    if (this.roles.get(target) !== 'prop' || !this.alive.has(target)) return;
    // contrôle grossier : la cible doit être à portée du tireur
    const a = this.tf.get(hunter)?.p; const b = this.tf.get(target)?.p;
    if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 80) return;
    const hp = Math.max(0, this.hp.get(target) - SHOT_DAMAGE);
    this.hp.set(target, hp);
    this.room.broadcast('game:event', { type: 'hit', by: hunter, target, hp, at });
    if (hp <= 0) {
      this.alive.delete(target);
      this.decoys = this.decoys.filter((d) => d.owner !== target);
      this._add(hunter, 3);
      this.stats.get(hunter).kills += 1;
      this.stats.get(target).deaths += 1;
      // un chasseur qui trouve quelqu'un reprend un peu de vie
      this.hp.set(hunter, Math.min(HUNTER_HP, this.hp.get(hunter) + 20));
      const d = this.disguise.get(target);
      this._feed({ kind: 'kill', by: hunter, target, model: d?.m || null });
      this._push({ t: 'kill', by: this._name(hunter), target: this._name(target), model: d ? MODELS[d.m]?.name : null });
      this.room.broadcast('game:event', { type: 'kill', by: hunter, target });
    }
    if (!this._checkEnd()) this.room.emitGameState();
  }

  _miss(hunter, kind) {
    const hp = Math.max(0, this.hp.get(hunter) - MISS_PENALTY);
    this.hp.set(hunter, hp);
    if (hp <= 0) {
      this.alive.delete(hunter);
      this.stats.get(hunter).deaths += 1;
      this._feed({ kind: 'exhausted', target: hunter, decoy: kind === 'decoy' });
      this._push({ t: 'exhausted', target: this._name(hunter) });
      this.room.broadcast('game:event', { type: 'kill', by: null, target: hunter });
    }
    if (!this._checkEnd()) this.room.emitGameState();
  }

  // ───────── États ─────────
  getPublicState() {
    const players = this.order.filter((id) => this.names.has(id)).map((id) => ({
      id, ...this.names.get(id),
      role: this.roles.get(id) || null,
      alive: this.alive.has(id),
      hp: this.hp.get(id) ?? null,
      maxHp: this.maxHp.get(id) ?? null,
      disguise: this.disguise.get(id) || null,
      score: this.scores.get(id) || 0,
      connected: !!this.room.players.get(id)?.connected,
    }));
    return {
      phase: this.phase,
      gameNo: this.gameNo,
      round: this.round,
      totalRounds: this.totalRounds,
      mapId: this.mapId,
      options: this.options,
      endsAt: this.endsAt,
      serverNow: Date.now(),
      players,
      spawns: this.spawns,
      decoys: this.decoys,
      feed: this.feed,
      result: this.result,
      ranking: this.phase === PH.GAME_OVER
        ? players.map((p) => ({ id: p.id, pseudo: p.pseudo, avatar: p.avatar, score: p.score, ...this.stats.get(p.id) })).sort((a, b) => b.score - a.score)
        : null,
    };
  }

  getPrivateStateFor() { return {}; }
}
