/**
 * Avatars (page admin → onglet Avatars) : cadrage et photos des personnages.
 *
 * Les avatars sont générés au build du client à partir de :
 *   client/avatars/…                 avatars perso (onglet ⭐ Perso)
 *   client/avatar-photos/<id>.webp   photo d'un avatar intégré (Iron Man, Goku…), remplace l'emoji
 *   client/avatar-photos/sources.json  propositions de photos par personnage (pour l'admin)
 *   client/avatars/cadrage.json      cadrages manuels ("Thor.jpg" ou "@goku" pour une photo de personnage)
 *
 * Sur Render (offre gratuite) le disque est effacé à chaque redémarrage : on enregistre donc
 * directement dans le dépôt GitHub (un seul commit), ce qui relance le déploiement.
 *
 * Variables d'environnement (service serveur sur Render) :
 *   GITHUB_TOKEN   jeton GitHub « fine-grained » avec accès Contents: Read and write au dépôt
 *   GITHUB_REPO    propriétaire/dépôt (défaut : Ackermannnnnnnn/party-games)
 *   GITHUB_BRANCH  branche (défaut : main)
 */
const CADRAGE_FILE = 'client/avatars/cadrage.json';
const PHOTOS_DIR = 'client/avatar-photos';
const SOURCES_FILE = `${PHOTOS_DIR}/sources.json`;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const repo = () => process.env.GITHUB_REPO || 'Ackermannnnnnnn/party-games';
const branch = () => process.env.GITHUB_BRANCH || 'main';

/** Remplaçable pour les tests. */
export const http = { fetch: (...a) => fetch(...a) };

export function githubEnabled() {
  return !!process.env.GITHUB_TOKEN;
}

const fail = (message, status = 502) => Object.assign(new Error(message), { status });
const TOKEN_ERR = 'Jeton GitHub refusé (vérifie GITHUB_TOKEN et ses droits en écriture).';

/** Nettoie ce qu'envoie la page admin : { "Thor.jpg" | "@goku": { zoom, x, y } | null }. */
export function sanitizeCadrage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const [file, c] of Object.entries(input).slice(0, 500)) {
    if (typeof file !== 'string' || file.length > 200 || file.includes('..') || file.startsWith('/')) continue;
    if (c === null) { out[file] = null; continue; }
    const zoom = Number(c?.zoom); const x = Number(c?.x); const y = Number(c?.y);
    if (![zoom, x, y].every(Number.isFinite)) continue;
    const r = (v) => Math.round(v * 1000) / 1000;
    out[file] = { zoom: r(Math.max(1, Math.min(4, zoom))), x: r(Math.max(0, Math.min(1, x))), y: r(Math.max(0, Math.min(1, y))) };
  }
  return out;
}

const ID_RE = /^[a-z0-9_-]{1,40}$/i;
const isHttpUrl = (u) => typeof u === 'string' && u.length < 1000 && /^https:\/\/[^\s]+$/i.test(u);

/** Nettoie les photos choisies : { goku: { url, data? } }, data = data URL d'image (déjà réduite par le navigateur). */
export function sanitizePhotos(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [id, p] of Object.entries(input).slice(0, 200)) {
    if (!ID_RE.test(id) || !p || typeof p !== 'object') continue;
    const url = isHttpUrl(p.url) ? p.url : null;
    const data = typeof p.data === 'string' && /^data:image\/(webp|jpeg|png);base64,/.test(p.data) ? p.data : null;
    if (url || data) out[id] = { url, data };
  }
  return out;
}

async function gh(path, opts = {}) {
  const res = await http.fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'party-games-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) throw fail(TOKEN_ERR);
  return { status: res.status, ok: res.ok, body };
}

/** Lit un fichier texte du dépôt (null s'il n'existe pas). */
async function readText(path) {
  const r = await gh(`/contents/${path}?ref=${encodeURIComponent(branch())}`);
  if (r.status === 404) return null;
  if (!r.ok) throw fail(`GitHub a répondu ${r.status}.`);
  return Buffer.from(r.body.content || '', 'base64').toString('utf8');
}

async function listDir(path) {
  const r = await gh(`/contents/${path}?ref=${encodeURIComponent(branch())}`);
  if (r.status === 404) return [];
  if (!r.ok || !Array.isArray(r.body)) throw fail(`GitHub a répondu ${r.status}.`);
  return r.body.map((f) => f.name);
}

/**
 * Crée UN commit avec plusieurs fichiers (ajout, modification, suppression) via l'API Git.
 * files : [{ path, content: Buffer|string } | { path, remove: true }]
 */
export async function commitFiles(files, message) {
  const ref = await gh(`/git/ref/heads/${encodeURIComponent(branch())}`);
  if (!ref.ok) throw fail(ref.status === 404 ? 'Branche introuvable sur GitHub.' : `GitHub a répondu ${ref.status}.`);
  const parentSha = ref.body.object.sha;
  const parent = await gh(`/git/commits/${parentSha}`);
  if (!parent.ok) throw fail(`GitHub a répondu ${parent.status}.`);

  const tree = [];
  for (const f of files) {
    if (f.remove) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
    const buf = Buffer.isBuffer(f.content) ? f.content : Buffer.from(String(f.content), 'utf8');
    const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' }) });
    if (!blob.ok) throw fail(`Envoi du fichier ${f.path} refusé (${blob.status}).`);
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.body.sha });
  }
  const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: parent.body.tree.sha, tree }) });
  if (!t.ok) throw fail(`GitHub a répondu ${t.status} (arbre).`);
  const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: t.body.sha, parents: [parentSha] }) });
  if (!c.ok) throw fail(`GitHub a répondu ${c.status} (commit).`);
  const upd = await gh(`/git/refs/heads/${encodeURIComponent(branch())}`, { method: 'PATCH', body: JSON.stringify({ sha: c.body.sha }) });
  if (!upd.ok) throw fail(upd.status === 422 ? 'Le dépôt a changé entre-temps, réessaie.' : `GitHub a répondu ${upd.status}.`);
  return c.body.sha.slice(0, 7);
}

const EXT_BY_TYPE = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/avif': 'avif' };

/** Télécharge une image côté serveur (quand le navigateur n'a pas pu la lire). */
async function downloadImage(url) {
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await http.fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'party-games-avatars/1.0 (+https://github.com/Ackermannnnnnnn/party-games)', Accept: 'image/*' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = String(res.headers.get('content-type') || '').split(';')[0].trim();
      if (!EXT_BY_TYPE[type]) throw new Error(`pas une image (${type || 'type inconnu'})`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_PHOTO_BYTES) throw new Error('image trop lourde (max 4 Mo)');
      return { buf, ext: EXT_BY_TYPE[type] };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function decodeDataUrl(data) {
  const m = /^data:(image\/(webp|jpeg|png));base64,(.+)$/.exec(data);
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > MAX_PHOTO_BYTES) throw new Error('image trop lourde (max 4 Mo)');
  return { buf, ext: EXT_BY_TYPE[m[1]] };
}

/**
 * Enregistre cadrages et photos en un seul commit.
 * cadrage : { clé: crop | null } fusionné dans cadrage.json
 * photos  : { id: { url, data } } → client/avatar-photos/<id>.<ext> (+ sources.json mis à jour)
 * Renvoie { commit, failed: { id: raison } }.
 */
export async function saveAvatars({ cadrage = {}, photos = {} }) {
  const files = [];
  const failed = {};
  const nPhotos = Object.keys(photos).length;
  const nCrops = Object.keys(cadrage).length;

  if (nCrops) {
    let current = {};
    try { current = JSON.parse((await readText(CADRAGE_FILE)) || '{}') || {}; } catch { current = {}; }
    for (const [k, c] of Object.entries(cadrage)) { if (c === null) delete current[k]; else current[k] = c; }
    const sorted = Object.fromEntries(Object.keys(current).sort((a, b) => a.localeCompare(b, 'fr')).map((k) => [k, current[k]]));
    files.push({ path: CADRAGE_FILE, content: `${JSON.stringify(sorted, null, 2)}\n` });
  }

  if (nPhotos) {
    const existing = await listDir(PHOTOS_DIR);
    let sources = {};
    try { sources = JSON.parse((await readText(SOURCES_FILE)) || '{}') || {}; } catch { sources = {}; }
    for (const [id, p] of Object.entries(photos)) {
      let img;
      try {
        img = p.data ? decodeDataUrl(p.data) : await downloadImage(p.url);
      } catch (e) {
        failed[id] = e.message || 'téléchargement impossible';
        continue;
      }
      const name = `${id}.${img.ext}`;
      for (const f of existing) {
        if (f !== name && f.replace(/\.[^.]+$/, '') === id) files.push({ path: `${PHOTOS_DIR}/${f}`, remove: true });
      }
      files.push({ path: `${PHOTOS_DIR}/${name}`, content: img.buf });
      const entry = sources[id] || { pick: 0, candidates: [] };
      if (p.url) {
        if (!entry.candidates.includes(p.url)) entry.candidates.push(p.url);
        entry.pick = entry.candidates.indexOf(p.url);
      } else {
        entry.pick = -1; // image importée à la main
      }
      sources[id] = entry;
    }
    if (Object.keys(photos).length > Object.keys(failed).length) {
      files.push({ path: SOURCES_FILE, content: `${JSON.stringify(sources, null, 1)}\n` });
    }
  }

  if (!files.length) {
    const err = fail(Object.keys(failed).length ? `Aucune photo n'a pu être récupérée : ${Object.entries(failed).map(([k, v]) => `${k} (${v})`).join(', ')}` : 'Rien à enregistrer.', 400);
    err.failed = failed;
    throw err;
  }
  const okPhotos = nPhotos - Object.keys(failed).length;
  const parts = [];
  if (okPhotos) parts.push(`${okPhotos} photo${okPhotos > 1 ? 's' : ''}`);
  if (nCrops) parts.push(`cadrage de ${nCrops} image${nCrops > 1 ? 's' : ''}`);
  const commit = await commitFiles(files, `Avatars : ${parts.join(' + ')} (depuis l'admin)`);
  return { commit, failed };
}

/** Ancienne route : cadrage seul. */
export async function saveCadrage(changes) {
  return saveAvatars({ cadrage: changes });
}
