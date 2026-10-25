/**
 * Sons de moquerie de Prop Hunt, gérés depuis l'admin (onglet Sons) :
 * fichier audio d'origine + réglages (début, fin, volume, vitesse, nom, émoji, activé).
 *
 * Stockage : dépôt GitHub, branche « data » (aucun redéploiement du site) — dossier sounds/ :
 *   sounds/index.json        liste et réglages
 *   sounds/<id>.<ext>        fichiers audio
 * Sans GITHUB_TOKEN (en local) : dossier server/data/sounds.
 *
 * Le serveur sert la liste et les fichiers en direct (/sounds/live, /sounds/file/:id) :
 * un son ajouté est disponible dès la manche suivante, sans rien reconstruire.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { githubEnabled, readText, readBinary, commitFiles, fail } from '../utils/github.js';

const BRANCH = () => process.env.SOUNDS_BRANCH || process.env.HISTORY_BRANCH || 'data';
const DIR = 'sounds';
const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/sounds');
const TYPES = { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', m4a: 'audio/mp4', aac: 'audio/aac' };
const EXT_BY_TYPE = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac' };
export const MAX_SOUND_BYTES = 6 * 1024 * 1024;
const MAX_AGE = 60_000;
const ID_RE = /^[a-z0-9_-]{1,40}$/;

let list = null; // [{ id, name, emoji, file, start, end, volume, rate, enabled, sha }]
let loadedAt = 0;
let loading = null;
const files = new Map(); // id → { buf, type, sha }

const local = () => !githubEnabled();
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

async function load() {
  let text = null;
  if (local()) {
    const f = path.join(LOCAL_DIR, 'index.json');
    text = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  } else {
    text = await readText(`${DIR}/index.json`, BRANCH());
  }
  let parsed = [];
  try { parsed = JSON.parse(text || '[]'); } catch { /* fichier abîmé */ }
  list = Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [];
  loadedAt = Date.now();
}

async function ensure() {
  if (list && (local() || Date.now() - loadedAt < MAX_AGE)) return;
  if (!loading) loading = load().catch((e) => { if (!list) { list = []; throw e; } }).finally(() => { loading = null; });
  await loading;
}

const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n * 1000) / 1000)) : d; };

/** Nettoie un réglage de son (ce qu'envoie la page admin ou ce qui est lu dans le dépôt). */
function clean(s) {
  if (!s || typeof s !== 'object') return null;
  const id = String(s.id || '').toLowerCase();
  if (!ID_RE.test(id)) return null;
  const name = String(s.name || '').replace(/\s+/g, ' ').trim().slice(0, 30) || 'Son';
  const emoji = [...String(s.emoji || '🔊')].slice(0, 2).join('') || '🔊';
  const start = num(s.start, 0, 0, 600);
  const end = s.end == null ? null : num(s.end, null, start + 0.05, 600);
  return {
    id, name, emoji, start, end,
    volume: num(s.volume, 1, 0, 2), rate: num(s.rate, 1, 0.5, 2),
    enabled: s.enabled !== false,
    file: typeof s.file === 'string' && /^[a-z0-9_-]+\.(mp3|ogg|wav|webm|m4a|aac)$/.test(s.file) ? s.file : null,
    sha: typeof s.sha === 'string' ? s.sha.slice(0, 40) : null,
  };
}

/** Liste publique (pour les joueurs) : seulement les sons activés. */
export async function liveSounds() {
  try { await ensure(); } catch { /* dépôt injoignable : on renvoie ce qu'on a */ }
  return (list || []).filter((s) => s.enabled && s.file).map(({ id, name, emoji, start, end, volume, rate, sha }) => ({ id, name, emoji, start, end, volume, rate, sha }));
}

/** Liste complète (admin). */
export async function allSounds() {
  await ensure();
  return list || [];
}

/** Ids des sons utilisables tout de suite (sans attendre le réseau) — pour valider les moqueries en jeu. */
export function enabledSoundIds() {
  if (!list) ensure().catch(() => {});
  return (list || []).filter((s) => s.enabled && s.file).map((s) => s.id);
}

export async function soundFile(id) {
  await ensure();
  const s = (list || []).find((x) => x.id === id);
  if (!s?.file) return null;
  const cached = files.get(id);
  if (cached && cached.sha === s.sha) return cached;
  let buf = null;
  if (local()) {
    const f = path.join(LOCAL_DIR, s.file);
    buf = fs.existsSync(f) ? fs.readFileSync(f) : null;
  } else {
    buf = await readBinary(`${DIR}/${s.file}`, BRANCH());
  }
  if (!buf) return null;
  const out = { buf, type: TYPES[s.file.split('.').pop()] || 'application/octet-stream', sha: s.sha };
  if (files.size > 80) files.clear();
  files.set(id, out);
  return out;
}

async function persist(next, writes = [], removes = [], message = 'Sons') {
  if (local()) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    for (const w of writes) fs.writeFileSync(path.join(LOCAL_DIR, w.name), w.buf);
    for (const r of removes) { try { fs.unlinkSync(path.join(LOCAL_DIR, r)); } catch { /* déjà supprimé */ } }
    fs.writeFileSync(path.join(LOCAL_DIR, 'index.json'), JSON.stringify(next, null, 2));
  } else {
    await commitFiles([
      ...writes.map((w) => ({ path: `${DIR}/${w.name}`, content: w.buf })),
      ...removes.map((r) => ({ path: `${DIR}/${r}`, remove: true })),
      { path: `${DIR}/index.json`, content: JSON.stringify(next, null, 2) },
    ], `${message} (depuis l'admin) [skip render]`, { branch: BRANCH(), createIfMissing: true });
  }
  list = next;
  loadedAt = Date.now();
}

/**
 * Ajoute ou modifie un son. body = { id?, name, emoji, start, end, volume, rate, enabled, data? }
 * data : data URL du fichier audio (obligatoire pour un nouveau son).
 */
export async function saveSound(body) {
  await ensure();
  const isNew = !body?.id || !(list || []).some((s) => s.id === body.id);
  let id = String(body?.id || '').toLowerCase();
  if (isNew) {
    const base = String(body?.name || 'son').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'son';
    id = base; let i = 2;
    while ((list || []).some((s) => s.id === id)) id = `${base}-${i++}`;
  }
  const prev = (list || []).find((s) => s.id === id);
  const entry = clean({ ...prev, ...body, id });
  if (!entry) throw fail('Réglages invalides.', 400);
  const writes = []; const removes = [];
  if (typeof body?.data === 'string' && body.data) {
    const m = /^data:([a-z0-9/+.-]+)(;[^,]*)?;base64,(.+)$/i.exec(body.data);
    const type = m?.[1]?.toLowerCase();
    const ext = EXT_BY_TYPE[type];
    if (!m || !ext) throw fail('Format audio non pris en charge (mp3, ogg, wav, webm, m4a).', 400);
    const buf = Buffer.from(m[3], 'base64');
    if (buf.length > MAX_SOUND_BYTES) throw fail('Fichier trop lourd (6 Mo maximum).', 400);
    if (buf.length < 100) throw fail('Fichier vide.', 400);
    entry.file = `${id}.${ext}`;
    entry.sha = sha1(buf);
    if (prev?.file && prev.file !== entry.file) removes.push(prev.file);
    writes.push({ name: entry.file, buf });
    files.set(id, { buf, type: TYPES[ext], sha: entry.sha });
  } else if (isNew) {
    throw fail('Ajoute un fichier audio.', 400);
  }
  const next = isNew ? [...(list || []), entry] : list.map((s) => (s.id === id ? entry : s));
  await persist(next, writes, removes, isNew ? `Son ajouté : ${entry.name}` : `Son modifié : ${entry.name}`);
  return entry;
}

export async function deleteSound(id) {
  await ensure();
  const s = (list || []).find((x) => x.id === id);
  if (!s) throw fail('Son introuvable.', 404);
  await persist(list.filter((x) => x.id !== id), [], s.file ? [s.file] : [], `Son supprimé : ${s.name}`);
  files.delete(id);
}

/** Ordre d'affichage (glisser-déposer dans l'admin). */
export async function reorderSounds(ids) {
  await ensure();
  const pos = new Map(ids.map((id, i) => [id, i]));
  const next = [...list].sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999));
  await persist(next, [], [], 'Sons réordonnés');
}
