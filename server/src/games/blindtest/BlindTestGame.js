import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { CATALOG, listUniverses, isValidUniverse, universeInfo, pickCandidates } from './catalog.js';
import { resolveMany, freshPreview } from './deezer.js';

/**
 * Blind Test : films, séries, anime et musique, extraits Deezer de 30 s.
 *
 *   LOADING (on retrouve les extraits sur Deezer) → COUNTDOWN → ROUND → REVEAL → … → PODIUM
 *
 * Modes :
 *   - playMode   'online' : chacun entend l'extrait sur son appareil, synchronisé par l'horloge du serveur
 *                'local'  : seul l'appareil de l'hôte diffuse ; les autres servent de buzzers
 *   - answerMode 'free'   : on tape ses propositions (plusieurs essais, fautes légères tolérées)
 *                'qcm'    : 4 choix, un seul essai
 *                'buzzer' : le premier qui buzze met l'extrait en pause et répond
 *   - gameMaster : l'hôte ne joue pas, voit la réponse et valide les buzz à l'oral
 *     (le mode local et le maître du jeu imposent le buzzer)
 *
 * Musique : le titre et l'artiste rapportent chacun des points. Films/séries/anime : on trouve l'œuvre.
 */
const PH = { LOADING: 'LOADING', COUNTDOWN: 'COUNTDOWN', ROUND: 'ROUND', REVEAL: 'REVEAL', PODIUM: 'PODIUM' };
const COUNTDOWN_MS = 3500;
const REVEAL_MS = 8000;
const AUDIO_LEAD_MS = 800;      // marge pour que tous les appareils démarrent en même temps
const RESUME_LEAD_MS = 500;
const BUZZ_ANSWER_MS = 12000;   // temps pour taper sa réponse après un buzz (sans maître du jeu)
const MAX_GUESSES = 40;
const POPULARITY = ['mix', 'mainstream', 'niche'];
const ROUND_COUNTS = [5, 10, 15, 20, 25, 30, 40];
const ROUND_SECS = [15, 20, 25, 30];

const DEFAULT_OPTIONS = {
  universes: [],
  formats: ['audio'],
  popularity: 'mix',
  playMode: 'online',
  answerMode: 'free',
  gameMaster: false,
  nbRounds: 15,
  roundSec: 25,
};

// ───────── Comparaison des réponses ─────────
const normalize = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .replace(/&/g, 'and')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/^(le|la|les|l|un|une|des|du|de|d|the)\b\s*'?\s*/i, '')
  .replace(/[^a-z0-9]/g, '');

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length; const n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Vrai si la proposition correspond à l'une des cibles (casse, accents, articles, petites fautes). */
export function matches(guess, targets) {
  const g = normalize(guess);
  if (!g) return false;
  for (const target of targets) {
    const t = normalize(target);
    if (!t) continue;
    if (g === t) return true;
    const tol = t.length >= 12 ? 3 : t.length >= 8 ? 2 : t.length >= 5 ? 1 : 0;
    if (tol && levenshtein(g, t) <= tol) return true;
    // « harry potter et la coupe de feu » commence par « harry potter » : accepté
    if (t.length >= 5 && g.startsWith(t) && g.length <= t.length + 25) return true;
  }
  return false;
}

/** Musique : « daft punk get lucky » trouve l'artiste ET le titre d'un coup. */
function musicHits(value, e) {
  const g = normalize(value);
  const contains = (targets) => targets.some((t) => { const n = normalize(t); return n.length >= 3 && g.includes(n); });
  const both = contains(titleTargets(e)) && contains(artistTargets(e));
  return { title: both || matches(value, titleTargets(e)), artist: both || matches(value, artistTargets(e)) };
}

const workTargets = (e) => [e.answer, ...(e.alt || [])];
const titleTargets = (e) => [e.song, ...(e.as || [])];
const artistTargets = (e) => [e.artist, ...(e.aa || [])];
const isMusic = (e) => e.universe === 'musique';
const choiceLabel = (e) => (isMusic(e) ? `${e.artist} — ${e.song}` : e.answer);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class BlindTestGame extends BaseGame {
  static id = 'blindtest';
  static label = 'Blind Test';
  static minPlayers = 1;
  static maxPlayers = 20;

  static getOptionsManifest() {
    return {
      universes: listUniverses(),
      total: CATALOG.length,
      defaults: DEFAULT_OPTIONS,
      roundCounts: ROUND_COUNTS,
      roundSecs: ROUND_SECS,
    };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = BlindTestGame.sanitize(options);
    this.gameNo = 0;
    this._token = 0;
    this._dead = false;
    this._reset();
  }

  static sanitize(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    o.universes = [...new Set((Array.isArray(o.universes) ? o.universes : []).filter(isValidUniverse))];
    o.formats = ['audio']; // l'image arrivera ensuite
    if (!POPULARITY.includes(o.popularity)) o.popularity = 'mix';
    o.playMode = o.playMode === 'local' ? 'local' : 'online';
    o.gameMaster = !!o.gameMaster;
    if (!['free', 'qcm', 'buzzer'].includes(o.answerMode)) o.answerMode = 'free';
    if (o.playMode === 'local' || o.gameMaster) o.answerMode = 'buzzer';
    const n = parseInt(o.nbRounds, 10);
    o.nbRounds = Math.max(5, Math.min(40, Number.isFinite(n) ? n : 15));
    const s = parseInt(o.roundSec, 10);
    o.roundSec = Math.max(10, Math.min(30, Number.isFinite(s) ? s : 25));
    return o;
  }

  _reset() {
    this.rounds = [];
    this.idx = -1;
    this.scores = new Map();
    this.foundCounts = new Map();
    this.history = [];
    this.loading = null;
    this.phaseEndsAt = null;
    this.lastReveal = null;
    this._resetRound();
  }

  _resetRound() {
    this.found = new Map();       // id → { work, title, artist } (timestamps)
    this.guesses = new Map();     // id → [{ v, ok }]
    this.qcm = new Map();         // id → { idx, ts }
    this.roundPoints = new Map(); // id → points gagnés sur la manche
    this.finders = [];            // [{ id, what, ms }] dans l'ordre
    this.choices = null;
    this.correctChoice = -1;
    this.buzz = null;             // { playerId, endsAt }
    this.lockedOut = new Set();
    this.buzzWinner = null;
    this.audio = null;            // { url, playing, posMs, at }
    this.roundEndsAt = null;
    this.roundRemaining = null;   // ms restants quand la manche est en pause (buzz)
    this._roundTimer = null;
    this._buzzTimer = null;
  }

  get gmId() { return this.options.gameMaster ? this.room.hostId : null; }

  _isPlayer(id) { return id && id !== this.gmId && this.room.players.has(id); }

  _addPlayer(id) {
    if (id === this.gmId) return;
    if (!this.scores.has(id)) this.scores.set(id, 0);
  }

  _expected() {
    return this.playerIds.filter((id) => id !== this.gmId && this.room.players.get(id)?.connected);
  }

  _award(id, pts) {
    this.scores.set(id, (this.scores.get(id) || 0) + pts);
    this.roundPoints.set(id, (this.roundPoints.get(id) || 0) + pts);
  }

  _speedFrac() {
    if (!this.roundEndsAt) return 0;
    return Math.max(0, Math.min(1, (this.roundEndsAt - Date.now()) / (this.options.roundSec * 1000)));
  }

  // ───────── Déroulement ─────────
  start() {
    if (this.options.gameMaster && this.playerIds.length < 2) {
      this.room.broadcast('error', { code: 'NEED_PLAYERS', message: 'Avec un maître du jeu, il faut au moins un autre joueur.' });
      this.room.endGame({ aborted: true });
      return;
    }
    this._reset();
    this.gameNo += 1;
    for (const id of this.playerIds) this._addPlayer(id);
    this.loading = { done: 0, total: this.options.nbRounds };
    this.phase = PH.LOADING;
    this._prepare();
  }

  async _prepare() {
    const token = ++this._token;
    const cancelled = () => this._dead || token !== this._token;
    const recent = new Set((this.room._blindRecent || []).flat());
    const candidates = pickCandidates(this.options.universes, this.options.nbRounds, this.options.popularity, recent);
    let result;
    try {
      result = await resolveMany(candidates, this.options.nbRounds, {
        isCancelled: cancelled,
        onProgress: (done) => {
          if (cancelled()) return;
          this.loading = { done, total: this.options.nbRounds };
          this.room.emitGameState();
        },
      });
    } catch (e) {
      result = { rounds: [], networkErrors: 1 };
      logger.error({ room: this.room.code, err: e?.stack || String(e) }, 'Blind test: resolve failed');
    }
    if (cancelled()) return;
    const { rounds, networkErrors } = result;
    if (!rounds.length) {
      logger.warn({ room: this.room.code, networkErrors }, 'Blind test: no tracks');
      this.room.broadcast('error', {
        code: 'NO_TRACKS',
        message: networkErrors ? 'Impossible de joindre Deezer pour le moment. Réessaie dans un instant.' : 'Aucun extrait trouvé pour ces réglages.',
      });
      this.cleanup();
      this.room.endGame({ aborted: true });
      return;
    }
    if (rounds.length < this.options.nbRounds) {
      this.room.broadcast('room:notice', { code: 'FEWER_ROUNDS', message: `🎧 ${rounds.length} extraits trouvés : la partie aura ${rounds.length} manches.` });
    }
    this.rounds = rounds;
    this.loading = null;
    logger.info({ room: this.room.code, nb: rounds.length, opts: this.options }, 'Blind test started');
    this.phaseEndsAt = Date.now() + COUNTDOWN_MS;
    this.setPhase(PH.COUNTDOWN);
    this.setTimer(COUNTDOWN_MS, () => this._ask(0));
  }

  _ask(i) {
    this.clearAllTimers();
    this._resetRound();
    this.idx = i;
    const r = this.rounds[i];
    if (this.options.answerMode === 'qcm') this._buildChoices(r.entry);
    const now = Date.now();
    this.audio = { url: r.preview, playing: true, posMs: 0, at: now + AUDIO_LEAD_MS };
    this.roundEndsAt = this.audio.at + this.options.roundSec * 1000;
    this.phaseEndsAt = this.roundEndsAt;
    this._armRoundTimer();
    this.setPhase(PH.ROUND);
    this._prefetch(i + 1);
  }

  /** Les liens d'extraits expirent : on rafraîchit celui de la manche suivante pendant qu'on joue. */
  _prefetch(i) {
    const next = this.rounds[i];
    if (!next) return;
    const token = this._token;
    freshPreview(next.trackId)
      .then((url) => {
        if (!url || this._dead || token !== this._token) return;
        next.preview = url;
        if (this.idx === i - 1) this.room.emitGameState();
      })
      .catch(() => {});
  }

  _armRoundTimer() {
    if (this._roundTimer) { clearTimeout(this._roundTimer); this._timers.delete(this._roundTimer); }
    const ms = Math.max(0, this.roundEndsAt - Date.now());
    this._roundTimer = this.setTimer(ms, () => this._reveal());
  }

  _buildChoices(entry) {
    const label = choiceLabel(entry);
    const pool = shuffle(CATALOG.filter((e) => e.universe === entry.universe && choiceLabel(e) !== label && e.answer !== entry.answer));
    const picked = [];
    for (const e of pool) {
      const l = choiceLabel(e);
      if (!picked.includes(l)) picked.push(l);
      if (picked.length === 3) break;
    }
    const all = shuffle([label, ...picked]);
    this.choices = all;
    this.correctChoice = all.indexOf(label);
  }

  _pause() {
    if (!this.audio?.playing) return;
    const now = Date.now();
    this.audio = { ...this.audio, playing: false, posMs: this.audio.posMs + Math.max(0, now - this.audio.at) };
    this.roundRemaining = Math.max(1000, (this.roundEndsAt || now) - now);
    this.roundEndsAt = null;
    this.phaseEndsAt = null;
    if (this._roundTimer) { clearTimeout(this._roundTimer); this._timers.delete(this._roundTimer); this._roundTimer = null; }
  }

  _resume() {
    if (!this.audio || this.audio.playing) return;
    const at = Date.now() + RESUME_LEAD_MS;
    this.audio = { ...this.audio, playing: true, at };
    this.roundEndsAt = at + (this.roundRemaining || 5000);
    this.phaseEndsAt = this.roundEndsAt;
    this.roundRemaining = null;
    this._armRoundTimer();
  }

  _isComplete(id) {
    const f = this.found.get(id) || {};
    return isMusic(this.rounds[this.idx].entry) ? !!(f.title && f.artist) : !!f.work;
  }

  _checkEarlyEnd() {
    if (this.phase !== PH.ROUND) return;
    const expected = this._expected();
    if (!expected.length) return;
    const mode = this.options.answerMode;
    let done = false;
    if (mode === 'free') done = expected.every((id) => this._isComplete(id));
    else if (mode === 'qcm') done = expected.every((id) => this.qcm.has(id));
    else if (mode === 'buzzer') done = !this.buzz && expected.every((id) => this.lockedOut.has(id));
    if (done) {
      this.clearAllTimers();
      this._roundTimer = null;
      this.setTimer(800, () => this._reveal());
    }
  }

  _reveal() {
    if (this.phase !== PH.ROUND) return;
    this.clearAllTimers();
    this._roundTimer = null;
    const r = this.rounds[this.idx];
    const e = r.entry;
    // QCM : on compte les points à la révélation
    if (this.options.answerMode === 'qcm') {
      const total = this.options.roundSec * 1000;
      for (const [id, a] of this.qcm) {
        if (!this._isPlayer(id)) continue;
        if (a.idx === this.correctChoice) {
          const frac = Math.max(0, Math.min(1, (a.endsAt - a.ts) / total));
          this._award(id, 100 + Math.round(100 * frac));
          this.foundCounts.set(id, (this.foundCounts.get(id) || 0) + 1);
        }
      }
    }
    // L'extrait continue pendant la révélation, sauf s'il était en pause
    if (this.audio && !this.audio.playing) this.audio = { ...this.audio, playing: true, at: Date.now() + RESUME_LEAD_MS };
    this.buzz = null;

    const perPlayer = {};
    for (const id of this.scores.keys()) {
      if (!this.room.players.has(id)) continue;
      const f = this.found.get(id) || {};
      const q = this.qcm.get(id);
      perPlayer[id] = {
        points: this.roundPoints.get(id) || 0,
        work: !!f.work, title: !!f.title, artist: !!f.artist,
        choice: q ? q.idx : null,
        correct: this.options.answerMode === 'qcm' ? q?.idx === this.correctChoice : (this.roundPoints.get(id) || 0) > 0,
        guesses: (this.guesses.get(id) || []).slice(-4).map((g) => g.v),
      };
    }
    this.lastReveal = {
      index: this.idx,
      universe: e.universe,
      answer: e.answer,
      artist: e.artist,
      song: e.song,
      dzArtist: r.dzArtist,
      dzTitle: r.dzTitle,
      cover: r.cover,
      choices: this.choices,
      correctChoice: this.correctChoice,
      perPlayer,
      finders: this.finders,
      buzzWinner: this.buzzWinner,
    };
    this.history.push({
      universe: e.universe, answer: e.answer, artist: e.artist, song: e.song, cover: r.cover,
      finders: this.finders.map((f) => f.id).filter((v, i, a) => a.indexOf(v) === i),
    });
    this.phaseEndsAt = Date.now() + REVEAL_MS;
    this.setPhase(PH.REVEAL);
    this.setTimer(REVEAL_MS, () => this._next());
  }

  _next() {
    this.clearAllTimers();
    if (this.idx + 1 >= this.rounds.length) return this._end();
    this._ask(this.idx + 1);
  }

  _end() {
    this.clearAllTimers();
    this.audio = null;
    this.phaseEndsAt = null;
    const ids = this.rounds.map((r) => r.entry.id);
    this.room._blindRecent = [ids, ...(this.room._blindRecent || [])].slice(0, 5);
    this.setPhase(PH.PODIUM);
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame(playerId) {
    this._addPlayer(playerId);
    this.room.emitGameState();
  }

  onPlayerLeft(playerId) {
    if (this.buzz && (!playerId || this.buzz.playerId === playerId || !this.room.players.get(this.buzz.playerId)?.connected)) {
      this._buzzFailed(this.buzz.playerId);
      return;
    }
    this._checkEarlyEnd();
    this.room.emitGameState();
  }

  cleanup() {
    this._dead = true;
    super.cleanup();
  }

  // ───────── Actions ─────────
  handleAction(playerId, type, payload) {
    const isHost = playerId === this.room.hostId;
    switch (type) {
      case 'guess': return this._onGuess(playerId, payload);
      case 'choose': return this._onChoose(playerId, payload);
      case 'buzz': return this._onBuzz(playerId);
      case 'buzzAnswer': return this._onBuzzAnswer(playerId, payload);
      case 'judge':
        if (playerId !== this.gmId) return this._error(playerId, 'NOT_GM', 'Seul le maître du jeu peut valider.');
        return this._onJudge(!!payload?.ok);
      case 'replay':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        if (this.phase !== PH.ROUND || this.buzz || !this.audio) return undefined;
        this.audio = { ...this.audio, playing: true, posMs: 0, at: Date.now() + RESUME_LEAD_MS };
        return this.room.emitGameState();
      case 'next':
        if (!isHost) return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut passer.");
        if (this.phase === PH.ROUND) return this._reveal();
        if (this.phase === PH.REVEAL) return this._next();
        return undefined;
      case 'restart':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        if (this.phase === PH.PODIUM) { this._dead = false; this.start(); this.room.emitGameState(); }
        return undefined;
      case 'endGame':
        if (!isHost) return this._error(playerId, 'NOT_HOST');
        this.cleanup();
        return this.room.endGame({ game: 'blindtest', finalScores: Object.fromEntries(this.scores), rounds: this.rounds.length });
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue : ${type}`);
    }
  }

  _cleanText(v) {
    return String(v ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
  }

  _onGuess(playerId, payload) {
    if (this.phase !== PH.ROUND || this.options.answerMode !== 'free' || playerId === this.gmId) return;
    this._addPlayer(playerId);
    if (this._isComplete(playerId)) return;
    const value = this._cleanText(payload?.value);
    if (!value) return;
    const list = this.guesses.get(playerId) || [];
    if (list.length >= MAX_GUESSES) return this._error(playerId, 'TOO_MANY', 'Trop de propositions pour cet extrait.');
    const e = this.rounds[this.idx].entry;
    const f = { ...(this.found.get(playerId) || {}) };
    const now = Date.now();
    const elapsed = Math.max(0, now - (this.audio?.at || now));
    const frac = this._speedFrac();
    const hits = [];
    if (isMusic(e)) {
      const h = musicHits(value, e);
      if (!f.title && h.title) { f.title = now; hits.push('title'); }
      if (!f.artist && h.artist) { f.artist = now; hits.push('artist'); }
      for (const _ of hits) this._award(playerId, 60 + Math.round(60 * frac));
    } else if (!f.work && matches(value, workTargets(e))) {
      f.work = now; hits.push('work');
      this._award(playerId, 100 + Math.round(100 * frac));
    }
    list.push({ v: value, ok: hits.length > 0 });
    this.guesses.set(playerId, list);
    this.found.set(playerId, f);
    if (hits.length) {
      for (const what of hits) this.finders.push({ id: playerId, what, ms: elapsed });
      if (this._isComplete(playerId)) this.foundCounts.set(playerId, (this.foundCounts.get(playerId) || 0) + 1);
      this.room.broadcast('game:event', { type: 'found', payload: { playerId, what: hits } });
    }
    this.room.emitGameState();
    this._checkEarlyEnd();
  }

  _onChoose(playerId, payload) {
    if (this.phase !== PH.ROUND || this.options.answerMode !== 'qcm' || playerId === this.gmId) return;
    this._addPlayer(playerId);
    if (this.qcm.has(playerId)) return;
    const idx = parseInt(payload?.idx, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx >= (this.choices || []).length) return this._error(playerId, 'BAD_CHOICE');
    this.qcm.set(playerId, { idx, ts: Date.now(), endsAt: this.roundEndsAt || Date.now() });
    this.room.emitGameState();
    this._checkEarlyEnd();
  }

  _onBuzz(playerId) {
    if (this.phase !== PH.ROUND || this.options.answerMode !== 'buzzer' || playerId === this.gmId) return;
    if (this.buzz || this.lockedOut.has(playerId)) return;
    this._addPlayer(playerId);
    this._pause();
    this.buzz = { playerId, endsAt: this.options.gameMaster ? null : Date.now() + BUZZ_ANSWER_MS };
    if (!this.options.gameMaster) {
      this._buzzTimer = this.setTimer(BUZZ_ANSWER_MS, () => this._buzzFailed(playerId));
    }
    this.room.broadcast('game:event', { type: 'buzz', payload: { playerId } });
    this.room.emitGameState();
  }

  _onBuzzAnswer(playerId, payload) {
    if (this.phase !== PH.ROUND || !this.buzz || this.buzz.playerId !== playerId || this.options.gameMaster) return;
    const value = this._cleanText(payload?.value);
    if (!value) return;
    const e = this.rounds[this.idx].entry;
    const list = this.guesses.get(playerId) || [];
    let ok = false;
    const f = {};
    if (isMusic(e)) {
      const h = musicHits(value, e);
      if (h.title) f.title = Date.now();
      if (h.artist) f.artist = Date.now();
      ok = !!(f.title || f.artist);
    } else if (matches(value, workTargets(e))) { f.work = Date.now(); ok = true; }
    list.push({ v: value, ok });
    this.guesses.set(playerId, list);
    if (!ok) return this._buzzFailed(playerId);
    this.found.set(playerId, f);
    const bonus = isMusic(e) && f.title && f.artist ? 50 : 0;
    return this._buzzWon(playerId, 150 + bonus);
  }

  _onJudge(ok) {
    if (this.phase !== PH.ROUND || !this.buzz) return;
    const id = this.buzz.playerId;
    if (ok) {
      const e = this.rounds[this.idx].entry;
      this.found.set(id, isMusic(e) ? { title: Date.now(), artist: Date.now() } : { work: Date.now() });
      return this._buzzWon(id, 150);
    }
    return this._buzzFailed(id);
  }

  _buzzWon(id, pts) {
    if (this._buzzTimer) { clearTimeout(this._buzzTimer); this._timers.delete(this._buzzTimer); this._buzzTimer = null; }
    this._award(id, pts);
    this.foundCounts.set(id, (this.foundCounts.get(id) || 0) + 1);
    this.finders.push({ id, what: 'buzz', ms: this.audio?.posMs || 0 });
    this.buzzWinner = id;
    this.buzz = null;
    this.room.broadcast('game:event', { type: 'buzzResult', payload: { playerId: id, ok: true } });
    this._reveal();
  }

  _buzzFailed(id) {
    if (this.phase !== PH.ROUND || !this.buzz || this.buzz.playerId !== id) return;
    if (this._buzzTimer) { clearTimeout(this._buzzTimer); this._timers.delete(this._buzzTimer); this._buzzTimer = null; }
    this.lockedOut.add(id);
    this.buzz = null;
    this.room.broadcast('game:event', { type: 'buzzResult', payload: { playerId: id, ok: false } });
    const everyoneOut = this._expected().every((p) => this.lockedOut.has(p));
    if (everyoneOut) return this._reveal();
    this._resume();
    this.room.emitGameState();
  }

  // ───────── États ─────────
  _leaderboard() {
    const rows = [];
    for (const [id, points] of this.scores) {
      const p = this.room.players.get(id);
      if (!p && !points) continue;
      rows.push({ playerId: id, pseudo: p?.pseudo || '?', avatar: p?.avatar || null, points, found: this.foundCounts.get(id) || 0, left: !p });
    }
    return rows.sort((a, b) => b.points - a.points);
  }

  getPublicState() {
    const o = this.options;
    const base = {
      phase: this.phase,
      gameNo: this.gameNo,
      options: o,
      serverNow: Date.now(),
      roundIdx: this.idx,
      total: this.rounds.length || o.nbRounds,
      loading: this.loading,
      phaseEndsAt: this.phaseEndsAt,
      roundMs: o.roundSec * 1000,
      gmId: this.gmId,
      diffuserId: o.playMode === 'local' ? this.room.hostId : null,
      leaderboard: this._leaderboard(),
    };
    if (this.phase === PH.COUNTDOWN) base.nextUrl = this.rounds[0]?.preview || null;
    const r = this.rounds[this.idx];
    if ((this.phase === PH.ROUND || this.phase === PH.REVEAL) && r) {
      const u = universeInfo(r.entry.universe);
      const progress = {};
      for (const [id, f] of this.found) progress[id] = { work: !!f.work, title: !!f.title, artist: !!f.artist };
      Object.assign(base, {
        universe: u.id,
        universeLabel: u.label,
        find: o.answerMode === 'buzzer' && isMusic(r.entry) ? "Trouve le titre ou l'artiste" : u.find,
        audio: this.audio,
        nextUrl: this.rounds[this.idx + 1]?.preview || null,
        roundEndsAt: this.roundEndsAt,
        roundRemaining: this.roundRemaining,
        buzz: this.buzz,
        lockedOut: [...this.lockedOut],
        progress,
        answeredIds: [...this.qcm.keys()],
        expectedIds: this._expected(),
        choices: this.choices,
      });
    }
    if (this.phase === PH.REVEAL) base.reveal = this.lastReveal;
    if (this.phase === PH.PODIUM) {
      base.ranking = this._leaderboard();
      base.history = this.history;
    }
    return base;
  }

  getPrivateStateFor(playerId) {
    const isGm = playerId === this.gmId;
    const out = {
      isGm,
      found: this.found.get(playerId) ? { ...this.found.get(playerId) } : {},
      guesses: (this.guesses.get(playerId) || []).slice(-6),
      myChoice: this.qcm.get(playerId)?.idx ?? null,
      lockedOut: this.lockedOut.has(playerId),
    };
    const r = this.rounds[this.idx];
    if (isGm && r && this.phase === PH.ROUND) {
      out.gmCard = { answer: r.entry.answer, alt: r.entry.alt, artist: r.entry.artist, song: r.entry.song, cover: r.cover, universe: r.entry.universe };
    }
    return out;
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
