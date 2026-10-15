import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

/**
 * Proximité de sens entre mots français, pour Cémantix.
 *
 * Données (voir data/SOURCES.md) : 60 000 mots français courants avec leur vecteur de sens
 * (300 nombres, quantifiés sur 8 bits). Deux mots de sens proche ont des vecteurs proches :
 * la "température" est la similarité cosinus × 100.
 *
 * Chargé une seule fois, au premier besoin (≈ 0,3 s, ≈ 20 Mo de mémoire).
 */
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** Clé sans accents ni majuscules, pour accepter « ecole » comme « école ». */
export function looseKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z'-]/g, '');
}

let model = null;

function load() {
  const t0 = Date.now();
  const meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'vectors.json'), 'utf8'));
  const words = zlib.gunzipSync(fs.readFileSync(path.join(DATA_DIR, 'vocab.txt.gz'))).toString('utf8').split('\n');
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(DATA_DIR, 'vectors.i8.gz')));
  const vectors = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  const dims = meta.dims;
  if (words.length !== meta.count || vectors.length !== meta.count * dims) throw new Error('Cémantix : données de vecteurs incohérentes');

  // Normes, pour la similarité cosinus
  const norms = new Float32Array(words.length);
  for (let i = 0; i < words.length; i++) {
    let s = 0;
    const o = i * dims;
    for (let d = 0; d < dims; d++) s += vectors[o + d] * vectors[o + d];
    norms[i] = Math.sqrt(s) || 1;
  }

  const exact = new Map();
  const loose = new Map();     // le mot le plus fréquent l'emporte (les mots sont classés par fréquence)
  words.forEach((w, i) => {
    exact.set(w, i);
    const k = looseKey(w);
    if (!loose.has(k)) loose.set(k, i);
  });

  // Mots secrets : liste choisie à la main, limitée aux mots connus
  const secrets = [];
  for (const line of fs.readFileSync(path.join(DATA_DIR, 'secrets.txt'), 'utf8').split('\n')) {
    if (line.startsWith('#')) continue;
    for (const w of line.split(/\s+/)) {
      if (w && exact.has(w) && !secrets.includes(exact.get(w))) secrets.push(exact.get(w));
    }
  }

  logger.info({ words: words.length, dims, secrets: secrets.length, ms: Date.now() - t0 }, 'Cémantix: vectors loaded');
  return { words, vectors, dims, norms, exact, loose, secrets };
}

export function getModel() {
  if (!model) model = load();
  return model;
}

/** Index du mot proposé (accents et majuscules facultatifs), ou -1 s'il est inconnu. */
export function lookup(input) {
  const m = getModel();
  const w = String(input || '').trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ');
  if (m.exact.has(w)) return m.exact.get(w);
  return m.loose.get(looseKey(w)) ?? -1;
}

/** Similarité cosinus entre deux mots (de -1 à 1). */
export function similarity(i, j) {
  const { vectors, dims, norms } = getModel();
  let s = 0;
  const a = i * dims;
  const b = j * dims;
  for (let d = 0; d < dims; d++) s += vectors[a + d] * vectors[b + d];
  return s / (norms[i] * norms[j]);
}

/** Les `k` mots les plus proches du mot `i` (lui exclu), du plus proche au moins proche. */
export function nearest(i, k = 1000) {
  const { words } = getModel();
  const sims = new Float32Array(words.length);
  for (let j = 0; j < words.length; j++) sims[j] = similarity(i, j);
  sims[i] = -2;
  const order = Array.from(sims.keys()).sort((a, b) => sims[b] - sims[a]).slice(0, k);
  return order.map((j) => ({ index: j, sim: sims[j] }));
}

/** Tire un mot secret, en évitant les derniers déjà joués. */
export function randomSecret(recent = []) {
  const { secrets } = getModel();
  const pool = secrets.filter((i) => !recent.includes(i));
  return (pool.length ? pool : secrets)[Math.floor(Math.random() * (pool.length || secrets.length))];
}

export function wordAt(i) {
  return getModel().words[i];
}
