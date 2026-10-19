/**
 * Accès à l'API publique Deezer (sans clé) pour retrouver les extraits de 30 s.
 *
 *  - resolveEntry(entry) : cherche le bon morceau → { trackId, preview, cover, dzArtist, dzTitle }
 *    Le n° de morceau est mis en cache pour toute la vie du serveur.
 *  - freshPreview(trackId) : les liens d'extraits expirent, on en redemande un juste avant la manche.
 *
 * Deezer limite à ~50 requêtes / 5 s : on espace un peu et on réessaie en cas de quota.
 */
const API = 'https://api.deezer.com';
const TIMEOUT_MS = 7000;

const cache = new Map(); // entry.id → { trackId, cover, dzArtist, dzTitle } | null (introuvable)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Remplaçable pour les tests. */
export const http = { fetch: (...a) => fetch(...a) };

async function dz(path) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await http.fetch(API + path, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.error) {
        if (json.error.code === 4) { await sleep(1200); continue; } // quota dépassé
        const err = new Error(json.error.message || 'Deezer error');
        err.code = json.error.code;
        throw err;
      }
      return json;
    } catch (e) {
      lastErr = e;
      if (e.code === 800) throw e; // « no data » : inutile de réessayer
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

export const norm = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const BAD = /\b(karaoke|karaoké|made famous|originally performed|tribute|in the style of|cover version|8 bit|8-bit|lullaby|berceuse|piano version|ringtone|sonnerie|remix)\b/i;

function tokens(s) {
  return norm(s).split(' ').filter((t) => t.length > 1);
}

function overlap(a, b) {
  const ta = tokens(a);
  const tb = new Set(tokens(b));
  if (!ta.length) return 0;
  return ta.filter((t) => tb.has(t)).length / ta.length;
}

function artistOk(entry, track) {
  const names = [entry.artist, ...(entry.aa || [])].map(norm).filter(Boolean);
  const got = norm(track?.artist?.name);
  if (!got) return false;
  return names.some((n) => got.includes(n) || n.includes(got) || overlap(n, got) >= 0.6);
}

function titleOk(entry, track) {
  const titles = [entry.song, ...(entry.as || [])];
  const got = `${track?.title || ''} ${track?.title_short || ''}`;
  return titles.some((t) => overlap(t, got) >= 0.6);
}

/** Note un résultat de recherche : plus c'est haut, plus on est sûr que c'est le bon morceau. */
function score(entry, track, rank) {
  if (!track?.preview) return -1;
  const label = `${track.title} ${track.album?.title || ''} ${track.artist?.name || ''}`;
  const wanted = `${entry.song} ${entry.artist}`;
  if (BAD.test(label) && !BAD.test(wanted)) return -1;
  const a = artistOk(entry, track);
  const t = titleOk(entry, track);
  // En « musique », l'artiste fait partie de la réponse : il doit être le bon.
  if (entry.universe === 'musique' && !(a && t)) return -1;
  if (!a && !t) return -1;
  if (!a && entry.universe !== 'musique') {
    // Titre seul : on accepte seulement si l'œuvre apparaît dans l'album (BO officielle)
    const work = [entry.answer, ...(entry.alt || [])];
    if (!work.some((w) => overlap(w, track.album?.title || '') >= 0.6)) return -1;
  }
  return (a ? 2 : 0) + (t ? 2 : 0) - rank * 0.05;
}

function pickBest(entry, list) {
  let best = null; let bestScore = -1;
  (list || []).forEach((tr, i) => {
    const s = score(entry, tr, i);
    if (s > bestScore) { best = tr; bestScore = s; }
  });
  return bestScore >= 0 ? best : null;
}

const toInfo = (t) => ({
  trackId: t.id,
  preview: t.preview,
  cover: t.album?.cover_medium || t.album?.cover || null,
  dzArtist: t.artist?.name || '',
  dzTitle: t.title || '',
});

/**
 * Trouve le morceau Deezer d'une entrée du catalogue.
 * Renvoie null si introuvable (l'entrée sera remplacée par une autre).
 */
export async function resolveEntry(entry) {
  if (cache.has(entry.id)) {
    const c = cache.get(entry.id);
    if (!c) return null;
    const preview = await freshPreview(c.trackId).catch(() => null);
    return preview ? { ...c, preview } : null;
  }
  let found = null;
  if (entry.dz) {
    const t = await dz(`/track/${entry.dz}`).catch(() => null);
    if (t?.preview) found = t;
  }
  if (!found) {
    const strict = `artist:"${entry.artist}" track:"${entry.song}"`;
    const r1 = await dz(`/search?limit=15&q=${encodeURIComponent(strict)}`);
    found = pickBest(entry, r1?.data);
  }
  if (!found) {
    const loose = entry.q || `${entry.artist} ${entry.song}`;
    const r2 = await dz(`/search?limit=25&q=${encodeURIComponent(loose)}`);
    found = pickBest(entry, r2?.data);
  }
  if (!found) {
    cache.set(entry.id, null);
    return null;
  }
  const info = toInfo(found);
  cache.set(entry.id, { ...info, preview: undefined });
  return info;
}

/** Nouveau lien d'extrait (les liens Deezer expirent au bout d'un moment). */
export async function freshPreview(trackId) {
  const t = await dz(`/track/${trackId}`);
  return t?.preview || null;
}

/**
 * Résout des candidats dans l'ordre jusqu'à en avoir `count`.
 * onProgress(done, count) est appelé à chaque morceau trouvé.
 */
export async function resolveMany(candidates, count, { concurrency = 4, onProgress, isCancelled } = {}) {
  const results = new Array(candidates.length).fill(undefined);
  let next = 0;
  let found = 0;
  let networkErrors = 0;

  async function worker() {
    while (next < candidates.length && found < count) {
      if (isCancelled?.()) return;
      if (networkErrors >= 4 && found === 0) return; // Deezer injoignable : inutile d'insister
      const idx = next++;
      try {
        const info = await resolveEntry(candidates[idx]);
        results[idx] = info;
        if (info) { found += 1; onProgress?.(Math.min(found, count), count); }
      } catch {
        networkErrors += 1;
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const rounds = [];
  candidates.forEach((e, i) => { if (results[i] && rounds.length < count) rounds.push({ entry: e, ...results[i] }); });
  return { rounds, networkErrors };
}

export function _resetCache() { cache.clear(); }
