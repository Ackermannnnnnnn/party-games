/**
 * Historique des parties (page admin → onglet « Historique »).
 *
 * Chaque partie terminée (podium, révélation, album…) devient un « récap » :
 *   { id, game, label, room, startedAt, endedAt, durationSec, host, players, winner, ranking, recap, options }
 *
 * Stockage : Render (offre gratuite) efface disque et mémoire à chaque mise en veille.
 * Les récaps sont donc enregistrés dans le dépôt GitHub, sur la branche « data »
 * (fichiers history/AAAA-MM.json), qui ne déclenche aucun déploiement.
 * Sans GITHUB_TOKEN (développement local) : fichier server/data/history.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
import { githubEnabled, readText, commitFiles } from '../utils/github.js';

const DATA_BRANCH = () => process.env.HISTORY_BRANCH || 'data';
const FLUSH_DELAY_MS = 8000;
const MAX_RECORD_BYTES = 60_000;
const LOCAL_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/history.json');

export const GAME_LABELS = {
  imposter: "Jeu de l'imposteur", quiz: 'Quiz culture G', petitbac: 'Petit Bac', werewolf: 'Loup-Garou',
  telephone: 'Gartic Phone', bombparty: 'BombParty', cemantix: 'Cémantix', codenames: 'Codenames', blindtest: 'Blind Test', liarsbar: "Liar's Bar",
};

/** Phase qui marque la fin d'une partie, par jeu. */
export const FINAL_PHASES = {
  quiz: 'PODIUM', blindtest: 'PODIUM', petitbac: 'PODIUM', bombparty: 'GAME_OVER', codenames: 'GAME_OVER',
  werewolf: 'GAME_OVER', imposter: 'RESULTS', telephone: 'ALBUM', cemantix: 'REVEAL', liarsbar: 'GAME_OVER',
};

// ───────────────────────── Construction du récap ─────────────────────────

const WEREWOLF_WINNER = { village: 'Le village', wolves: 'Les loups-garous', lovers: 'Les amoureux', white_wolf: 'Le loup blanc', nobody: 'Personne' };
const IMPOSTER_WINNER = { civils: 'Les civils', imposter: "L'imposteur", mr_white: 'Mr White' };
const TEAM = { red: 'Équipe rouge', blue: 'Équipe bleue' };

function safe(fn, fallback = null) {
  try { return fn(); } catch (e) { logger.warn({ err: e?.message }, 'history: extractor failed'); return fallback; }
}

/** Remplace partout les identifiants de joueurs par leur pseudo (clés et valeurs), retire les données lourdes. */
function humanize(value, names, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return '[image]';
    return names.get(value) ?? (value.length > 400 ? `${value.slice(0, 400)}…` : value);
  }
  if (Array.isArray(value)) return value.slice(0, 120).map((v) => humanize(v, names, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'strokes') continue; // dessins : trop lourds pour l'historique
      if (k === 'avatar' || k === 'cover' || k === 'image') { out[k] = typeof v === 'string' && !v.startsWith('data:') ? v : null; continue; }
      out[names.get(k) ?? k] = humanize(v, names, depth + 1);
    }
    return out;
  }
  return value;
}

/** Infos par jeu : vainqueur, classement, récap détaillé. */
const EXTRACTORS = {
  quiz(g) {
    const ranking = g._leaderboard().map((r) => ({ id: r.playerId, score: r.points, detail: `${g.correctCounts.get(r.playerId) || 0} bonne(s) réponse(s)` }));
    const recap = {
      questions: g.history.map((h) => ({
        question: h.question, answer: h.correctAnswer, category: h.category,
        found: Object.entries(h.perPlayer || {}).filter(([, p]) => p.correct).map(([id]) => id),
      })),
    };
    return { ranking, recap };
  },
  blindtest(g) {
    const ranking = g._leaderboard().map((r) => ({ id: r.playerId, score: r.points, detail: `${r.found} trouvé(s)` }));
    const recap = { rounds: g.history.map((h) => ({ universe: h.universe, answer: h.answer, artist: h.artist, song: h.song, found: h.finders })) };
    return { ranking, recap };
  },
  petitbac(g) {
    const ranking = [...g.scores.entries()].sort((a, b) => b[1] - a[1]).map(([id, points]) => ({ id, score: points }));
    return { ranking, recap: { rounds: g.history } };
  },
  bombparty(g, pub) {
    const ranking = (pub.ranking || []).map((r) => ({ id: r.id, score: null, detail: `${r.words || 0} mot(s)${r.longest ? ` · plus long : ${r.longest}` : ''}` }));
    return { ranking, winnerId: pub.winnerId || null, recap: { rounds: pub.round, wordsUsed: pub.usedCount } };
  },
  codenames(g, pub) {
    const teams = {};
    for (const p of pub.players || []) if (p.team) (teams[p.team] ||= []).push({ id: p.id, role: p.role });
    return {
      winnerText: pub.winner ? TEAM[pub.winner] || pub.winner : null,
      winnerIds: (pub.players || []).filter((p) => p.team === pub.winner).map((p) => p.id),
      ranking: (pub.players || []).map((p) => ({ id: p.id, score: null, detail: `${TEAM[p.team] || 'Sans équipe'}${p.role === 'spy' ? ' · espion' : ''}`, win: p.team === pub.winner })),
      recap: { reason: pub.reason, teams, board: (pub.board || []).map((c) => ({ word: c.word, color: c.color, revealed: c.revealed })), clues: (pub.history || []).map((h) => ({ team: h.team, spy: h.spyId, word: h.word, count: h.count })) },
    };
  },
  werewolf(g, pub) {
    const res = pub.result || {};
    const winners = new Set(res.winners || []);
    return {
      winnerText: WEREWOLF_WINNER[res.winner] || res.winner || null,
      winnerIds: [...winners],
      ranking: (pub.players || []).map((p) => ({ id: p.id, score: null, detail: `${p.role || '?'}${p.alive ? ' · survivant' : ` · mort (nuit ${p.deathNight ?? '?'})`}${p.mayor ? ' · maire' : ''}`, win: winners.has(p.id) })),
      recap: { nights: pub.night, deaths: pub.deaths, lovers: pub.lovers },
    };
  },
  imposter(g, pub) {
    const r = pub.result || {};
    const winRole = r.winner === 'civils' ? 'civil' : r.winner;
    return {
      winnerText: IMPOSTER_WINNER[r.winner] || r.winner || null,
      winnerIds: (r.roles || []).filter((x) => x.role === winRole).map((x) => x.id),
      ranking: (pub.scores || []).map((s) => {
        const role = (r.roles || []).find((x) => x.id === s.id)?.role;
        return { id: s.id, score: s.points, detail: role === 'imposter' ? 'Imposteur' : role === 'mr_white' ? 'Mr White' : 'Civil', win: role === winRole };
      }),
      recap: {
        civilWord: r.civilWord ?? g.civilWord, imposterWord: r.imposterWord ?? g.imposterWord, theme: r.themeLabel,
        reason: r.reason, mrWhiteGuess: r.mrWhiteGuess, votes: r.votesBy,
        clues: pub.descriptions,
      },
    };
  },
  telephone(g) {
    return {
      ranking: g.order.map((id) => ({ id, score: null })),
      recap: {
        albums: g.chains.map((c) => ({
          owner: c.ownerId,
          entries: c.entries.map((e) => ({ type: e.type, author: e.authorId, text: e.type === 'text' ? e.text : undefined, auto: e.auto || undefined })),
        })),
      },
    };
  },
  liarsbar(g, pub) {
    const RANK = { K: 'Roi', Q: 'Dame', A: 'As', J: 'Joker', D: 'Diable' };
    return {
      winnerIds: pub.winnerId ? [pub.winnerId] : [],
      ranking: (pub.ranking || []).map((r) => ({ id: r.id, score: null, detail: `${r.shots} tir(s) au revolver${r.id === pub.winnerId ? ' · survivant' : ''}`, win: r.id === pub.winnerId })),
      recap: {
        events: (g.log || []).map((e) => {
          if (e.t === 'round') return { round: e.round, text: `Manche ${e.round} : table de ${RANK[e.tableCard]}s (${e.players} joueurs)` };
          if (e.t === 'play') return { text: `${e.by} pose ${e.count} carte(s)${e.auto ? ' (temps écoulé)' : ''}` };
          if (e.t === 'accuse') return { text: `${e.by} crie « Menteur ! » à ${e.target}${e.forced ? ' (obligé)' : ''} → ${e.cards.map((c) => RANK[c]).join(', ')} : ${e.devil ? 'carte du Diable !' : e.lie ? 'mensonge' : 'vérité'}`, accent: true };
          if (e.t === 'shot') return { text: `${e.by} tire (${e.n}/6) : ${e.fired ? '💥 BANG, éliminé' : 'clic, survit'}`, danger: e.fired };
          if (e.t === 'left') return { text: `${e.by} a quitté la table` };
          if (e.t === 'timeout') return { text: `${e.by} : temps écoulé` };
          return null;
        }).filter(Boolean),
      },
    };
  },
  cemantix(g, pub) {
    const players = [...(pub.players || [])].sort((a, b) => (a.found === b.found ? (a.foundRank || 99) - (b.foundRank || 99) || b.bestTemp - a.bestTemp : a.found ? -1 : 1));
    return {
      winnerIds: players.filter((p) => p.foundRank === 1).map((p) => p.id),
      ranking: players.map((p) => ({ id: p.id, score: null, detail: p.found ? `trouvé en ${p.count} essai(s)${p.foundAfterSec != null ? `, ${p.foundAfterSec}s` : ''}` : `pas trouvé · ${p.count} essai(s)`, win: p.foundRank === 1 })),
      recap: { secret: pub.secret, reason: pub.reason, top: (pub.top || []).slice(0, 10) },
    };
  },
};

/** Construit le récap d'une partie qui vient de se terminer. */
export function buildRecord(room, game, startedAt) {
  const pub = safe(() => game.getPublicState(), {}) || {};
  // Tous les noms connus : joueurs présents + ceux mémorisés par le jeu
  const names = new Map();
  const avatars = new Map();
  for (const p of room.players.values()) { names.set(p.id, p.pseudo); avatars.set(p.id, p.avatar); }
  for (const src of [game.snapshot, game.stats, game.players]) {
    if (src instanceof Map) for (const [id, v] of src) if (v?.pseudo && !names.has(id)) { names.set(id, v.pseudo); avatars.set(id, v.avatar || null); }
  }
  for (const p of [...(pub.players || []), ...(pub.leaderboard || []), ...(pub.ranking || [])]) {
    const id = p.id || p.playerId;
    if (id && p.pseudo && !names.has(id)) { names.set(id, p.pseudo); avatars.set(id, p.avatar || null); }
  }

  const ex = safe(() => EXTRACTORS[game.id]?.(game, pub), null) || {};
  const ranking = (ex.ranking || []).filter((r) => names.has(r.id)).map((r, i) => ({
    rank: i + 1, pseudo: names.get(r.id), avatar: avatars.get(r.id) || null,
    score: r.score ?? null, detail: r.detail || null, win: r.win ?? undefined,
  }));
  let winnerIds = ex.winnerIds || (ex.winnerId ? [ex.winnerId] : null);
  if (!winnerIds && ranking.length && ranking[0].score != null && ranking[0].score > 0) {
    const top = ranking[0].score;
    winnerIds = (ex.ranking || []).filter((r) => r.score === top).map((r) => r.id);
  }
  const winnerNames = (winnerIds || []).map((id) => names.get(id)).filter(Boolean);
  const winner = ex.winnerText
    ? `${ex.winnerText}${winnerNames.length ? ` (${winnerNames.join(', ')})` : ''}`
    : winnerNames.join(', ') || null;

  const endedAt = Date.now();
  const players = room.players.size
    ? [...room.players.values()].map((p) => ({ pseudo: p.pseudo, avatar: p.avatar || null }))
    : ranking.map((r) => ({ pseudo: r.pseudo, avatar: r.avatar }));
  const record = {
    id: `${new Date(endedAt).toISOString().slice(0, 10)}-${crypto.randomBytes(4).toString('hex')}`,
    game: game.id,
    label: GAME_LABELS[game.id] || game.id,
    room: room.code,
    startedAt: startedAt || null,
    endedAt,
    durationSec: startedAt ? Math.round((endedAt - startedAt) / 1000) : null,
    host: names.get(room.hostId) || null,
    players,
    winner,
    ranking,
    recap: humanize(ex.recap || {}, names),
    options: humanize(game.options || {}, names),
  };
  // Garde-fou : un récap reste petit
  let json = JSON.stringify(record);
  if (json.length > MAX_RECORD_BYTES) { record.recap = { note: 'Récap trop volumineux, résumé seulement.' }; json = JSON.stringify(record); }
  return record;
}

// ───────────────────────── Stockage ─────────────────────────

const monthOf = (ts) => new Date(ts).toISOString().slice(0, 7); // AAAA-MM (UTC)
const fileOf = (month) => `history/${month}.json`;

class HistoryStore {
  constructor() {
    this.pending = [];        // récaps pas encore écrits
    this.cache = new Map();   // mois → { records, at }
    this.flushTimer = null;
    this.flushing = null;
  }

  add(record) {
    this.pending.push(record);
    const c = this.cache.get(monthOf(record.endedAt));
    if (c) c.records.unshift(record);
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush().catch(() => {}), FLUSH_DELAY_MS);
    logger.info({ game: record.game, room: record.room, players: record.players.length }, 'history: match recorded');
  }

  async _readMonth(month) {
    if (!githubEnabled()) {
      try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')).filter((r) => monthOf(r.endedAt) === month); } catch { return []; }
    }
    const text = await readText(fileOf(month), DATA_BRANCH());
    try { return text ? JSON.parse(text) : []; } catch { return []; }
  }

  /** Écrit les récaps en attente (un commit par mois concerné). */
  async flush() {
    if (this.flushing) return this.flushing;
    if (!this.pending.length) return null;
    const batch = this.pending.splice(0);
    this.flushing = (async () => {
      try {
        if (!githubEnabled()) {
          let all = [];
          try { all = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); } catch {}
          fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
          fs.writeFileSync(LOCAL_FILE, JSON.stringify([...batch.slice().reverse(), ...all], null, 1));
          return;
        }
        const byMonth = new Map();
        for (const r of batch) { const m = monthOf(r.endedAt); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m).push(r); }
        const files = [];
        for (const [month, recs] of byMonth) {
          const existing = await this._readMonth(month);
          const ids = new Set(existing.map((r) => r.id));
          const merged = [...recs.filter((r) => !ids.has(r.id)).reverse(), ...existing];
          files.push({ path: fileOf(month), content: `${JSON.stringify(merged, null, 1)}\n` });
          this.cache.set(month, { records: merged, at: Date.now() });
        }
        await commitFiles(files, `Historique : ${batch.length} partie(s)`, { branch: DATA_BRANCH(), createIfMissing: true });
      } catch (e) {
        logger.error({ err: e?.message }, 'history: flush failed, will retry');
        this.pending.unshift(...batch);
        clearTimeout(this.flushTimer);
        this.flushTimer = setTimeout(() => this.flush().catch(() => {}), 60_000);
      } finally {
        this.flushing = null;
      }
      return null;
    })();
    return this.flushing;
  }

  /** Récaps d'un mois (les plus récents d'abord), y compris ceux pas encore écrits. */
  async list(month) {
    let c = this.cache.get(month);
    if (!c || Date.now() - c.at > 60_000) {
      c = { records: await this._readMonth(month), at: Date.now() };
      this.cache.set(month, c);
    }
    const ids = new Set(c.records.map((r) => r.id));
    const extra = this.pending.filter((r) => monthOf(r.endedAt) === month && !ids.has(r.id)).reverse();
    return [...extra, ...c.records];
  }

  /** Mois qui ont un historique (du plus récent au plus ancien). */
  async months() {
    const now = monthOf(Date.now());
    const set = new Set([now, ...this.pending.map((r) => monthOf(r.endedAt))]);
    if (githubEnabled()) {
      try {
        const { listDir } = await import('../utils/github.js');
        for (const f of await listDir('history', DATA_BRANCH())) { const m = /^(\d{4}-\d{2})\.json$/.exec(f); if (m) set.add(m[1]); }
      } catch {}
    } else {
      try { for (const r of JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'))) set.add(monthOf(r.endedAt)); } catch {}
    }
    return [...set].sort().reverse();
  }
}

export const historyStore = new HistoryStore();

/** Appelé par les jeux quand une phase change : enregistre la partie si elle vient de se terminer. */
export function onGamePhase(game, phase) {
  if (!game?.room || FINAL_PHASES[game.id] !== phase) return;
  if (game._historyRecordedAt && Date.now() - game._historyRecordedAt < 2000) return;
  game._historyRecordedAt = Date.now();
  const startedAt = game._matchStartedAt || null;
  game._matchStartedAt = null;
  try {
    historyStore.add(buildRecord(game.room, game, startedAt));
  } catch (e) {
    logger.error({ err: e?.stack || String(e), game: game.id }, 'history: record failed');
  }
}

// Avant l'arrêt du serveur (mise en veille Render), on écrit ce qui reste
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.once(sig, () => {
    historyStore.flush().catch(() => {}).finally(() => setTimeout(() => process.exit(0), 200));
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
