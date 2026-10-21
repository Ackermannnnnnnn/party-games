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
import { githubEnabled, fail, readText, listDir, commitFiles, http } from '../utils/github.js';
import { CHARACTERS_FILE, applySaved } from './liveAvatars.js';

export { githubEnabled, http };

const CADRAGE_FILE = 'client/avatars/cadrage.json';
const PHOTOS_DIR = 'client/avatar-photos';
const SOURCES_FILE = `${PHOTOS_DIR}/sources.json`;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
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

/** Catégories où l'on peut ajouter un personnage depuis l'admin. */
export const CHARACTER_CATS = ['anime', 'cinema', 'dc', 'disney', 'gaming', 'marvel', 'simpsons', 'starwars'];

/** Personnages ajoutés / supprimés : { add: [{ id, label, cat }], remove: [id] }. */
export function sanitizeCharacters(input) {
  const add = []; const remove = [];
  if (!input || typeof input !== 'object') return { add, remove };
  for (const c of Array.isArray(input.add) ? input.add.slice(0, 50) : []) {
    const label = typeof c?.label === 'string' ? c.label.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    if (!ID_RE.test(c?.id || '') || !label || !CHARACTER_CATS.includes(c?.cat)) continue;
    add.push({ id: c.id.toLowerCase(), label, cat: c.cat });
  }
  for (const id of Array.isArray(input.remove) ? input.remove.slice(0, 50) : []) if (ID_RE.test(id || '')) remove.push(id.toLowerCase());
  return { add, remove };
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
export async function saveAvatars({ cadrage = {}, photos = {}, characters = { add: [], remove: [] } }) {
  const files = [];
  const failed = {};
  const savedImages = {}; // id → { buf, type } enregistrées dans ce commit
  const removeIds = new Set(characters.remove);
  let sources = null; // sources.json (propositions de photos), lu si besoin
  // un personnage supprimé n'a plus besoin de photo ni de cadrage
  for (const id of removeIds) { delete photos[id]; cadrage[`@${id}`] = null; }
  let sortedCrops = null;
  const nPhotos = Object.keys(photos).length;
  const nCrops = Object.keys(cadrage).filter((k) => !removeIds.has(k.slice(1))).length;

  if (Object.keys(cadrage).length) {
    let current = {};
    try { current = JSON.parse((await readText(CADRAGE_FILE)) || '{}') || {}; } catch { current = {}; }
    for (const [k, c] of Object.entries(cadrage)) { if (c === null) delete current[k]; else current[k] = c; }
    const sorted = sortedCrops = Object.fromEntries(Object.keys(current).sort((a, b) => a.localeCompare(b, 'fr')).map((k) => [k, current[k]]));
    files.push({ path: CADRAGE_FILE, content: `${JSON.stringify(sorted, null, 2)}\n` });
  }

  if (nPhotos) {
    const existing = await listDir(PHOTOS_DIR);
    sources = {};
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
      savedImages[id] = { name, buf: img.buf, type: `image/${img.ext === 'jpg' ? 'jpeg' : img.ext}` };
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

  // ───── Personnages ajoutés / supprimés : characters.json (+ photos des supprimés) ─────
  let charList = null;
  const added = characters.add.filter((c) => {
    if (savedImages[c.id]) return true;
    if (!failed[c.id]) failed[c.id] = 'photo manquante';
    return false;
  });
  if (added.length || removeIds.size) {
    try { charList = JSON.parse((await readText(CHARACTERS_FILE)) || '[]'); } catch { charList = []; }
    if (!Array.isArray(charList)) charList = [];
    charList = charList.filter((c) => !removeIds.has(c.id) && !added.some((a) => a.id === c.id));
    charList.push(...added);
    charList.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    files.push({ path: CHARACTERS_FILE, content: `${JSON.stringify(charList, null, 1)}\n` });
    if (removeIds.size) {
      const existing = await listDir(PHOTOS_DIR);
      for (const f of existing) if (removeIds.has(f.replace(/\.[^.]+$/, ''))) files.push({ path: `${PHOTOS_DIR}/${f}`, remove: true });
      if (!sources) { try { sources = JSON.parse((await readText(SOURCES_FILE)) || '{}') || {}; } catch { sources = {}; } }
      if ([...removeIds].some((id) => sources[id])) {
        for (const id of removeIds) delete sources[id];
        const content = `${JSON.stringify(sources, null, 1)}\n`;
        const f = files.find((x) => x.path === SOURCES_FILE);
        if (f) f.content = content; else files.push({ path: SOURCES_FILE, content });
      }
    }
  }

  if (!files.length) {
    const err = fail(Object.keys(failed).length ? `Aucune photo n'a pu être récupérée : ${Object.entries(failed).map(([k, v]) => `${k} (${v})`).join(', ')}` : 'Rien à enregistrer.', 400);
    err.failed = failed;
    throw err;
  }
  const okPhotos = nPhotos - Object.keys(failed).length;
  const parts = [];
  if (added.length) parts.push(`${added.length} personnage${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''}`);
  if (removeIds.size) parts.push(`${removeIds.size} supprimé${removeIds.size > 1 ? 's' : ''}`);
  if (okPhotos) parts.push(`${okPhotos} photo${okPhotos > 1 ? 's' : ''}`);
  if (nCrops) parts.push(`cadrage de ${nCrops} image${nCrops > 1 ? 's' : ''}`);
  const commit = await commitFiles(files, `Avatars : ${parts.join(' + ')} (depuis l'admin)`);

  // Visible tout de suite pour les joueurs : le serveur leur envoie l'état du dépôt (voir liveAvatars.js)
  applySaved({ crops: sortedCrops, characters: charList, photos: savedImages, removed: [...removeIds] });
  return { commit, failed };
}

/** Ancienne route : cadrage seul. */
export async function saveCadrage(changes) {
  return saveAvatars({ cadrage: changes });
}
