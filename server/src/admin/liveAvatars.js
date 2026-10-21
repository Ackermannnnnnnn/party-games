/**
 * Avatars « en direct » : les photos, cadrages et personnages enregistrés depuis l'admin
 * sont lus dans le dépôt GitHub par le serveur et envoyés aux joueurs au chargement de la page.
 * Le site n'a donc plus besoin d'être reconstruit par Render pour les afficher
 * (la reconstruction met plusieurs minutes et prend parfois du retard).
 *
 *   GET /avatars/live       → { enabled, crops, characters, photos: { id: sha } }
 *   GET /avatars/live/:id   → la photo du personnage telle qu'enregistrée dans le dépôt
 */
import crypto from 'node:crypto';
import { githubEnabled, readText, readBinary, gh, mainBranch, fail } from '../utils/github.js';

export const CHARACTERS_FILE = 'client/avatar-photos/characters.json';
const CADRAGE_FILE = 'client/avatars/cadrage.json';
const PHOTOS_DIR = 'client/avatar-photos';
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', avif: 'image/avif' };
const MAX_AGE = 60_000; // relecture du dépôt au plus une fois par minute (les enregistrements depuis l'admin sont pris en compte tout de suite)

let state = null; // { crops, characters, photos: { id: { name, sha } } }
let loadedAt = 0;
let loading = null;
const images = new Map(); // sha → { buf, type }

/** Empreinte Git d'un fichier (la même que celle calculée au build du site). */
export const gitSha = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

async function listPhotos() {
  const r = await gh(`/contents/${PHOTOS_DIR}?ref=${encodeURIComponent(mainBranch())}`);
  if (r.status === 404) return {};
  if (!r.ok || !Array.isArray(r.body)) throw fail(`GitHub a répondu ${r.status}.`);
  const photos = {};
  for (const f of r.body) {
    const m = /^([a-z0-9_-]+)\.(webp|jpe?g|png|gif|avif)$/i.exec(f.name);
    if (m && !photos[m[1]]) photos[m[1]] = { name: f.name, sha: f.sha };
  }
  return photos;
}

async function load() {
  const [cad, chars, photos] = await Promise.all([readText(CADRAGE_FILE), readText(CHARACTERS_FILE), listPhotos()]);
  let crops = {}; let characters = [];
  try { crops = JSON.parse(cad || '{}') || {}; } catch { /* fichier abîmé : on ignore */ }
  try { characters = JSON.parse(chars || '[]'); } catch { /* idem */ }
  state = { crops, characters: Array.isArray(characters) ? characters : [], photos };
  loadedAt = Date.now();
}

async function ensureFresh() {
  if (!githubEnabled()) return;
  if (state && Date.now() - loadedAt < MAX_AGE) return;
  if (!loading) loading = load().catch((e) => { if (!state) throw e; }).finally(() => { loading = null; });
  await loading;
}

/** Après un enregistrement depuis l'admin : on met à jour sans attendre une relecture du dépôt. */
export function applySaved({ crops, characters, photos, removed = [] }) {
  if (!state) return;
  if (crops) state.crops = crops;
  if (characters) state.characters = characters;
  for (const [id, { name, buf, type }] of Object.entries(photos || {})) {
    const sha = gitSha(buf);
    state.photos[id] = { name, sha };
    images.set(sha, { buf, type });
  }
  for (const id of removed) delete state.photos[id];
}

export async function liveState() {
  try { await ensureFresh(); } catch { /* GitHub injoignable : on renvoie ce qu'on a */ }
  if (!state) return { enabled: false, crops: {}, characters: [], photos: {} };
  return {
    enabled: true,
    crops: state.crops,
    characters: state.characters,
    photos: Object.fromEntries(Object.entries(state.photos).map(([id, p]) => [id, p.sha])),
  };
}

/** Photo d'un personnage (originale, le cadrage est appliqué par le navigateur). */
export async function liveImage(id) {
  await ensureFresh();
  const p = state?.photos[id];
  if (!p) return null;
  if (images.has(p.sha)) return images.get(p.sha);
  const buf = await readBinary(`${PHOTOS_DIR}/${p.name}`);
  if (!buf) return null;
  const im = { buf, type: TYPES[p.name.split('.').pop().toLowerCase()] || 'application/octet-stream' };
  if (images.size > 400) images.clear();
  images.set(p.sha, im);
  return im;
}
