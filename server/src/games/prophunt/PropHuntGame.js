import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { getMap, MAP_LIST, MODELS, modelHp, disguisableModels, TAUNTS, WEAPONS, ABILITIES } from './shared.js';
import { enabledSoundIds } from '../../admin/sounds.js';
import { awardGame } from '../../profiles/profiles.js';

/**
 * Prop Hunt — cache-cache en 3D.
 *
 *   HIDE (les chasseurs sont aveuglés, les cachés se transforment en objets et se cachent)
 *   → HUNT (les chasseurs tirent ; tirer sur un vrai objet leur coûte de la vie)
 *   → ROUND_END (les rôles tournent) → … → GAME_OVER (XP et succès pour chaque profil)
 *
 * Modes : « classique » ou « infection » (un caché trouvé devient chasseur).
 * Armes : mitraillette, fusil à pompe, grenades, couteau. Capacités des cachés : moqueries,
 * leurres, ventriloque. Radar des chasseurs pendant la dernière minute.
 *
 * Positions : chaque joueur envoie la sienne (~20 fois/s, action « pos »), le serveur renvoie
 * à tous un instantané ~12 fois/s (événement volatil « snap »).
 */
const PH = { HIDE: 'HIDE', HUNT: 'HUNT', ROUND_END: 'ROUND_END', GAME_OVER: 'GAME_OVER' };
const SNAP_MS = 80;
const ROUND_END_MS = 9000;
const TAUNT_POINT_MS = 10000;
const TAUNT_COOLDOWN_MS = 2500;
const DISGUISE_COOLDOWN_MS = 1500;
const HUNTER_HP = 100;
const RESPAWN_MS = 3000;
const W_CODES = ['smg', 'shotgun', 'grenade', 'knife'];

const DEFAULT_OPTIONS = { map: 'rotate', mode: 'classic', rounds: 0, huntSec: 240, hideSec: 45, hunters: 'auto', tauntSec: 45, decoys: 2 };

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
const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity);

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
    o.mode = o.mode === 'infection' ? 'infection' : 'classic';
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
    this.stats = new Map();
    this.round = 0;
    this.totalRounds = 0;
    this.mapId = null;
    this.roles = new Map();
    this.alive = new Set();
    this.hp = new Map();
    this.maxHp = new Map();
    this.disguise = new Map();
    this.tf = new Map(); // id → { p, ry, pi, w }
    this.spawns = {};
    this.respawnN = new Map();
    this.decoys = [];
    this.feed = [];
    this.log = [];
    this.lastTaunt = new Map();
    this.lastVentri = new Map();
    this.shotTimes = new Map(); // `${id}:${arme}` → [t]
    this.ammo = new Map(); // id → { smg, shotgun, grenade }
    this.reloadUntil = new Map(); // `${id}:${arme}` → t
    this.grenades = new Map(); // id de grenade → { by, p, at }
    this.lastTauntPoint = new Map();
    this.lastDisguise = new Map();
    this.roundKills = new Map();
    this.endsAt = 0;
    this.result = null;
    this.progress = null;
    this._allowed = new Set();
    this._seq = 0;
    this._radarAt = 0;
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
    this.mapOffset = Math.floor(Math.random() * MAP_LIST.length);
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
    if (!this.stats.has(id)) this.stats.set(id, { kills: 0, survived: 0, deaths: 0, taunts: 0, grenadeKills: 0, knifeKills: 0, hunterRounds: 0, propRounds: 0, rounds: 0, bestRoundKills: 0, lastAlive: false });
    if (!this.order.includes(id)) this.order.push(id);
  }

  _armHunter(id) {
    this.hp.set(id, HUNTER_HP); this.maxHp.set(id, HUNTER_HP);
    this.ammo.set(id, { smg: WEAPONS.smg.mag, shotgun: WEAPONS.shotgun.mag, grenade: WEAPONS.grenade.mag });
    for (const w of W_CODES) this.reloadUntil.delete(`${id}:${w}`);
  }

  _startRound() {
    this.round += 1;
    const ids = MAP_LIST.map((m) => m.id);
    this.mapId = this.options.map === 'rotate' ? ids[(this.round - 1 + this.mapOffset) % ids.length]
      : this.options.map === 'random' ? ids[Math.floor(Math.random() * ids.length)] : this.options.map;
    const map = getMap(this.mapId);
    this._allowed = new Set(disguisableModels(map));
    for (const [id, p] of this.room.players) if (p.connected) this._ensurePlayer(id);
    const present = this.order.filter((id) => this.room.players.get(id)?.connected);
    const n = present.length;
    const auto = this.options.mode === 'infection' ? 1 : Math.max(1, Math.round(n / 3));
    const want = this.options.hunters === 'auto' ? auto : Math.min(this.options.hunters, n - 1);
    const hunters = shuffle(present).sort((a, b) => this.huntedTimes.get(a) - this.huntedTimes.get(b)).slice(0, Math.max(1, Math.min(want, n - 1)));
    this.roles = new Map(present.map((id) => [id, hunters.includes(id) ? 'hunter' : 'prop']));
    this.alive = new Set(present);
    this.hp = new Map(); this.maxHp = new Map(); this.disguise = new Map(); this.decoys = []; this.feed = [];
    this.lastTaunt = new Map(); this.lastVentri = new Map(); this.tf = new Map(); this.spawns = {}; this.result = null;
    this.ammo = new Map(); this.reloadUntil = new Map(); this.shotTimes = new Map(); this.grenades = new Map(); this.roundKills = new Map();
    this.respawnN = new Map(); this._radarAt = 0;
    this._hs = shuffle(map.spawns.hunters); const ps = shuffle(map.spawns.props);
    let hi = 0; let pi = 0;
    for (const id of present) {
      const st = this.stats.get(id); st.rounds += 1;
      if (this.roles.get(id) === 'hunter') {
        st.hunterRounds += 1;
        this.huntedTimes.set(id, this.huntedTimes.get(id) + 1);
        this._armHunter(id);
        const s = this._hs[hi++ % this._hs.length]; this.spawns[id] = [s[0] + (Math.random() - 0.5) * 0.6, s[1], s[2] + (Math.random() - 0.5) * 0.6];
      } else {
        st.propRounds += 1;
        const small = [...this._allowed].filter((k) => modelHp(k.split('@')[0], Number(k.split('@')[1])) <= 80);
        const pick = (small.length ? small : [...this._allowed])[Math.floor(Math.random() * (small.length || this._allowed.size))];
        const [m0, s0] = pick.split('@');
        this.disguise.set(id, { m: m0, s: Number(s0) });
        this.hp.set(id, modelHp(m0, Number(s0))); this.maxHp.set(id, modelHp(m0, Number(s0)));
        const s = ps[pi++ % ps.length]; this.spawns[id] = [s[0] + (Math.random() - 0.5) * 1.5, s[1], s[2] + (Math.random() - 0.5) * 1.5];
        this.lastTaunt.set(id, Date.now() + this.options.hideSec * 1000);
      }
      this.tf.set(id, { p: this.spawns[id], ry: 0, pi: 0, w: 0 });
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
    if (survivors.length === 1 && this._props(false).length >= 2) this.stats.get(survivors[0]).lastAlive = true;
    if (winner === 'hunters') for (const id of this._hunters(false)) this._add(id, 2);
    for (const [id, k] of this.roundKills) { const st = this.stats.get(id); if (st) st.bestRoundKills = Math.max(st.bestRoundKills, k); }
    this.result = { winner, survivors, round: this.round };
    this._push({ t: 'end', round: this.round, winner, survivors: survivors.map((id) => this._name(id)) });
    this.endsAt = Date.now() + ROUND_END_MS;
    this.setPhase(PH.ROUND_END);
    this.setTimer(ROUND_END_MS, () => (this.round >= this.totalRounds ? this._gameOver() : this._startRound()));
  }

  _gameOver() {
    this.clearAllTimers();
    this.setPhase(PH.GAME_OVER);
    this._awardProfiles();
  }

  /** XP et succès des joueurs qui ont un profil (clé envoyée par leur navigateur). */
  _awardProfiles() {
    const ranking = [...this.scores].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const entries = [];
    for (const id of ranking) {
      const pl = this.room.players.get(id);
      if (!pl?.profileKey) continue;
      entries.push({ id, key: pl.profileKey, name: this._name(id), score: this.scores.get(id) || 0, rank: 1 + ranking.filter((o) => (this.scores.get(o) || 0) > (this.scores.get(id) || 0)).length, stats: this.stats.get(id) });
    }
    if (!entries.length) return;
    const gameNo = this.gameNo;
    awardGame(entries).then((res) => {
      if (this.gameNo !== gameNo) return;
      this.progress = {};
      for (const e of entries) if (res[e.key]) this.progress[e.id] = res[e.key];
      for (const e of entries) { const pl = this.room.players.get(e.id); if (pl && res[e.key]) pl.level = res[e.key].level; }
      this.room.emitGameState();
    }).catch((e) => logger.error({ err: e?.message }, 'prophunt: award failed'));
  }

  _add(id, pts) { this.scores.set(id, (this.scores.get(id) || 0) + pts); }
  _name(id) { return this.names.get(id)?.pseudo || '?'; }
  _push(e) { this.log.push({ ...e, at: Date.now() }); if (this.log.length > 400) this.log.shift(); }
  _feed(e) { this.feed.push({ ...e, id: ++this._seq, at: Date.now() }); if (this.feed.length > 8) this.feed.shift(); }

  // ───────── Temps réel ─────────
  _tick() {
    const now = Date.now();
    if (this.phase === PH.HUNT && this.options.tauntSec) {
      for (const id of this._props()) {
        if (now - (this.lastTaunt.get(id) || now) > this.options.tauntSec * 1000) this._taunt(id, null, true);
      }
    }
    // radar : pendant la dernière minute, les chasseurs voient la direction des cachés
    if (this.phase === PH.HUNT && this.endsAt - now <= ABILITIES.radarFromMs && now - this._radarAt >= ABILITIES.radarEveryMs) {
      this._radarAt = now;
      const pts = this._props().map((id) => this.tf.get(id)?.p).filter(Boolean);
      if (pts.length) this.room.broadcast('game:event', { type: 'radar', pts });
    }
    if (this.phase === PH.GAME_OVER) return;
    const s = [];
    for (const [id, t] of this.tf) {
      if (!this.roles.has(id)) continue;
      s.push([id, t.p[0], t.p[1], t.p[2], Math.round(t.ry * 100) / 100, Math.round((t.pi || 0) * 100) / 100, this.alive.has(id) ? 1 : 0, t.w || 0]);
    }
    try { this.room.io.to(this.room.code).volatile.emit('game:event', { type: 'snap', t: now, s }); } catch { /* io absent (tests) */ }
  }

  _soundPick(sound, forced) {
    const custom = enabledSoundIds().map((c) => `c:${c}`);
    const pool = [...TAUNTS.map((t) => t.id), ...custom];
    if (TAUNTS.some((t) => t.id === sound) || custom.includes(sound)) return sound;
    const list = forced && custom.length && Math.random() < 0.7 ? custom : pool;
    return list[Math.floor(Math.random() * list.length)] || 'boing';
  }

  _taunt(id, sound, forced = false) {
    const now = Date.now();
    const snd = this._soundPick(sound, forced);
    this.lastTaunt.set(id, now);
    this.stats.get(id).taunts += 1;
    if (!forced && now - (this.lastTauntPoint.get(id) || 0) > TAUNT_POINT_MS) { this._add(id, 1); this.lastTauntPoint.set(id, now); }
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
  _canFire(id, w) {
    const now = Date.now();
    const def = WEAPONS[w];
    const key = `${id}:${w}`;
    const times = (this.shotTimes.get(key) || []).filter((t) => now - t < 2000);
    if (times.length >= Math.floor(2000 / def.fireMs) + 2) return false;
    if (def.mag) {
      if (this.reloadUntil.get(key) > now) return false;
      const ammo = this.ammo.get(id);
      if (this.reloadUntil.has(key)) { this.reloadUntil.delete(key); ammo[w] = def.mag; }
      if ((ammo?.[w] ?? 0) <= 0) return false;
      ammo[w] -= 1;
    }
    times.push(now); this.shotTimes.set(key, times);
    return true;
  }

  handleAction(id, type, payload = {}) {
    const isHost = id === this.room.hostId;
    const role = this.roles.get(id);
    const alive = this.alive.has(id);
    const playing = this.phase === PH.HIDE || this.phase === PH.HUNT;
    const hunting = role === 'hunter' && alive && this.phase === PH.HUNT;
    switch (type) {
      case 'pos': {
        if (!role) return;
        const p = vec(payload?.p);
        if (!p) return;
        if (role === 'hunter' && this.phase === PH.HIDE) return;
        const a = getMap(this.mapId).area;
        if (a) { p[0] = Math.max(a[0], Math.min(a[1], p[0])); p[2] = Math.max(a[2], Math.min(a[3], p[2])); }
        p[1] = Math.max(-3, Math.min(30, p[1]));
        const w = Math.max(0, Math.min(3, Math.round(num(payload.w) ?? 0)));
        this.tf.set(id, { p, ry: num(payload.ry) ?? 0, pi: num(payload.pi) ?? 0, w });
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
        // mitraillette ou fusil à pompe : hits = cible de chaque balle / plomb
        if (!hunting) return;
        const w = payload?.w === 'shotgun' ? 'shotgun' : 'smg';
        if (!this._canFire(id, w)) return;
        const def = WEAPONS[w];
        const from = vec(payload?.from);
        const tos = (Array.isArray(payload?.to) && Array.isArray(payload.to[0]) ? payload.to : [payload?.to]).slice(0, def.pellets).map(vec).filter(Boolean);
        this.room.broadcast('game:event', { type: 'shot', by: id, w, from, to: tos });
        const hits = (Array.isArray(payload?.hits) ? payload.hits : [payload?.hit]).slice(0, def.pellets).filter(Boolean);
        const dmg = new Map(); let pen = 0;
        for (const h of hits) {
          if (h?.kind === 'player' && typeof h.id === 'string') dmg.set(h.id, (dmg.get(h.id) || 0) + def.damage);
          else if (h?.kind === 'object' || h?.kind === 'decoy') pen += def.penalty;
        }
        for (const [target, d] of dmg) this._hitPlayer(id, target, d, tos[0], w, def.range + 10);
        if (pen) this._miss(id, pen);
        else if (dmg.size) this._emitLater();
        return;
      }
      case 'melee': {
        if (!hunting || !this._canFire(id, 'knife')) return;
        this.room.broadcast('game:event', { type: 'melee', by: id });
        const h = payload?.hit || {};
        if (h.kind === 'player' && typeof h.id === 'string') this._hitPlayer(id, h.id, WEAPONS.knife.damage, this.tf.get(h.id)?.p, 'knife', WEAPONS.knife.range + 1.5);
        else if (h.kind === 'object' || h.kind === 'decoy') this._miss(id, WEAPONS.knife.penalty);
        return;
      }
      case 'throw': {
        if (!hunting || !this._canFire(id, 'grenade')) return;
        const p = vec(payload?.p); const v = vec(payload?.v);
        if (!p || !v || dist(p, this.tf.get(id)?.p) > 4) return;
        const gid = ++this._seq;
        this.grenades.set(gid, { by: id, p, at: Date.now() });
        this.room.broadcast('game:event', { type: 'throw', by: id, gid, p, v });
        return this.room.emitGameState();
      }
      case 'boom': {
        // le lanceur annonce où sa grenade a explosé (même trajectoire calculée par tous)
        const g = this.grenades.get(payload?.gid);
        const p = vec(payload?.p);
        if (!g || g.by !== id || !p) return;
        const age = Date.now() - g.at;
        if (age < WEAPONS.grenade.fuseMs - 400 || age > WEAPONS.grenade.fuseMs + 3000 || dist(p, g.p) > 40) return;
        this.grenades.delete(payload.gid);
        this.room.broadcast('game:event', { type: 'boom', by: id, p });
        if (this.phase !== PH.HUNT) return;
        let any = false;
        for (const target of this._props()) {
          const tp = this.tf.get(target)?.p;
          const d = dist(tp, p);
          if (d < WEAPONS.grenade.radius) { any = true; this._hitPlayer(id, target, Math.round(WEAPONS.grenade.damage * (1 - d / WEAPONS.grenade.radius) + 10), tp, 'grenade', Infinity); }
        }
        if (any) this._emitLater();
        return;
      }
      case 'reload': {
        if (role !== 'hunter' || !alive) return;
        const w = payload?.w === 'shotgun' ? 'shotgun' : 'smg';
        const now = Date.now(); const key = `${id}:${w}`;
        const ammo = this.ammo.get(id);
        if (!ammo || this.reloadUntil.get(key) > now || ammo[w] >= WEAPONS[w].mag) return;
        this.reloadUntil.set(key, now + WEAPONS[w].reloadMs - 150);
        this.room.broadcast('game:event', { type: 'reload', by: id, w, p: this.tf.get(id)?.p });
        return;
      }
      case 'taunt': {
        if (role !== 'prop' || !alive || !playing) return;
        if (Date.now() - (this.lastTaunt.get(id) || 0) < TAUNT_COOLDOWN_MS && this.phase === PH.HUNT) return;
        return this._taunt(id, typeof payload?.sound === 'string' ? payload.sound.slice(0, 50) : null);
      }
      case 'ventriloquist': {
        // le caché fait entendre une moquerie… ailleurs
        if (role !== 'prop' || !alive || this.phase !== PH.HUNT) return;
        const now = Date.now();
        if (now - (this.lastVentri.get(id) || 0) < ABILITIES.ventriloquistMs) return;
        const p = vec(payload?.p);
        if (!p || dist(p, this.tf.get(id)?.p) > ABILITIES.ventriloquistRange + 1) return;
        this.lastVentri.set(id, now);
        this.lastTaunt.set(id, now);
        this.stats.get(id).taunts += 1;
        this.room.broadcast('game:event', { type: 'taunt', by: id, sound: this._soundPick(typeof payload?.sound === 'string' ? payload.sound : null, false), p, ventri: true });
        return;
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
        if (isHost && playing) this._endRound('props');
        return;
      case 'endGame':
        if (!isHost) return;
        this.clearAllTimers();
        return this.room.endGame({ game: 'prophunt' });
      default:
    }
  }

  /** Regroupe les envois d'état (rafales de balles). */
  _emitLater() {
    if (this._emitT) return;
    this._emitT = setTimeout(() => { this._emitT = null; if (!this._checkEnd()) this.room.emitGameState(); }, 60);
  }

  _hitPlayer(hunter, target, damage, at, weapon, maxRange) {
    if (this.roles.get(target) !== 'prop' || !this.alive.has(target)) return;
    if (dist(this.tf.get(hunter)?.p, this.tf.get(target)?.p) > maxRange) return;
    const hp = Math.max(0, this.hp.get(target) - damage);
    this.hp.set(target, hp);
    this.room.broadcast('game:event', { type: 'hit', by: hunter, target, hp, at, w: weapon });
    if (hp > 0) return this._emitLater();
    // trouvé !
    this.alive.delete(target);
    this.decoys = this.decoys.filter((d) => d.owner !== target);
    this._add(hunter, 3);
    const st = this.stats.get(hunter);
    st.kills += 1;
    if (weapon === 'grenade') st.grenadeKills += 1;
    if (weapon === 'knife') st.knifeKills += 1;
    this.roundKills.set(hunter, (this.roundKills.get(hunter) || 0) + 1);
    this.stats.get(target).deaths += 1;
    this.hp.set(hunter, Math.min(HUNTER_HP, this.hp.get(hunter) + 20));
    const d = this.disguise.get(target);
    this._feed({ kind: 'kill', by: hunter, target, model: d?.m || null, w: weapon });
    this._push({ t: 'kill', by: this._name(hunter), target: this._name(target), model: d ? MODELS[d.m]?.name : null });
    this.room.broadcast('game:event', { type: 'kill', by: hunter, target, w: weapon });
    // mode infection : le caché trouvé rejoint les chasseurs
    if (this.options.mode === 'infection' && this._props().length > 0) {
      const n = (this.respawnN.get(target) || 0) + 1; this.respawnN.set(target, n);
      this.setTimer(RESPAWN_MS, () => {
        if (this.phase !== PH.HUNT || !this.room.players.get(target)) return;
        this.roles.set(target, 'hunter');
        this.alive.add(target);
        this.disguise.delete(target);
        this._armHunter(target);
        const s = this._hs[Math.floor(Math.random() * this._hs.length)];
        this.spawns = { ...this.spawns, [target]: [s[0], s[1], s[2], n] };
        this.tf.set(target, { p: [s[0], s[1], s[2]], ry: 0, pi: 0, w: 0 });
        this._feed({ kind: 'infected', target });
        this.room.broadcast('game:event', { type: 'infected', target });
        this.room.emitGameState();
      });
    }
    this._emitLater();
  }

  _miss(hunter, penalty) {
    const hp = Math.max(0, this.hp.get(hunter) - penalty);
    this.hp.set(hunter, hp);
    if (hp <= 0) {
      this.alive.delete(hunter);
      this.stats.get(hunter).deaths += 1;
      this._feed({ kind: 'exhausted', target: hunter });
      this._push({ t: 'exhausted', target: this._name(hunter) });
      this.room.broadcast('game:event', { type: 'kill', by: null, target: hunter });
    }
    this._emitLater();
  }

  // ───────── États ─────────
  getPublicState() {
    const players = this.order.filter((id) => this.names.has(id)).map((id) => {
      const pl = this.room.players.get(id);
      return {
        id, ...this.names.get(id),
        role: this.roles.get(id) || null,
        alive: this.alive.has(id),
        hp: this.hp.get(id) ?? null,
        maxHp: this.maxHp.get(id) ?? null,
        disguise: this.disguise.get(id) || null,
        score: this.scores.get(id) || 0,
        connected: !!pl?.connected,
        skin: pl?.skin || null,
        level: pl?.level || null,
      };
    });
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
      progress: this.progress,
      ranking: this.phase === PH.GAME_OVER
        ? players.map((p) => ({ id: p.id, pseudo: p.pseudo, avatar: p.avatar, score: p.score, ...this.stats.get(p.id) })).sort((a, b) => b.score - a.score)
        : null,
    };
  }

  getPrivateStateFor() { return {}; }
}
