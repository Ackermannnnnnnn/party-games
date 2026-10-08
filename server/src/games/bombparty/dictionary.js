import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

/**
 * Dictionnaire français de BombParty (~550 000 formes : conjugaisons, pluriels, féminins,
 * mots composés, argot courant). Sources et licences : voir data/SOURCES.md.
 *
 * Chargé une seule fois, au premier besoin (≈ 1 s, ≈ 80 Mo de mémoire).
 */
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** Clé de comparaison : minuscules, sans accents, sans tiret ni apostrophe. "Porte-Monnaie" -> "portemonnaie" */
export function wordKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

let cache = null;

function load() {
  const t0 = Date.now();
  const words = zlib.gunzipSync(fs.readFileSync(path.join(DATA_DIR, 'mots.txt.gz'))).toString('utf8').split('\n');
  const keyList = words.map(wordKey);     // même index que `words`
  const keys = new Set(keyList);
  const syllables = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'syllabes.json'), 'utf8'));
  // Mots courants, du plus fréquent au moins fréquent : pour montrer des exemples connus
  const frequent = zlib.gunzipSync(fs.readFileSync(path.join(DATA_DIR, 'frequents.txt.gz'))).toString('utf8').split('\n');
  const frequentKeys = frequent.map(wordKey);
  logger.info({ words: words.length, keys: keys.size, syllables: syllables.length, ms: Date.now() - t0 }, 'BombParty: dictionary loaded');
  return { words, keyList, keys, syllables, syllableCount: new Map(syllables), frequent, frequentKeys };
}

export function getDictionary() {
  if (!cache) cache = load();
  return cache;
}

/** Niveaux : combien de mots du dictionnaire doivent contenir la syllabe. */
export const DIFFICULTIES = {
  facile:    { label: 'Facile',    min: 3000, max: Infinity },
  normal:    { label: 'Normal',    min: 800,  max: Infinity },
  difficile: { label: 'Difficile', min: 150,  max: 1500 },
};

/** Tire une syllabe du niveau demandé, en évitant les dernières déjà tombées. */
export function pickSyllable(difficulty, recent = []) {
  const { syllables } = getDictionary();
  const level = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const pool = syllables.filter(([s, n]) => n >= level.min && n <= level.max && !recent.includes(s));
  const [syllable, count] = pool[Math.floor(Math.random() * pool.length)];
  return { syllable, count };
}

export function isValidWord(key) {
  return getDictionary().keys.has(key);
}

/**
 * Quelques mots (orthographe complète) contenant la syllabe, pour les montrer après une explosion.
 * On prend d'abord des mots courants ; sinon des mots du grand dictionnaire.
 */
export function examplesFor(syllable, n = 3, exclude = new Set()) {
  const { words, keyList, frequent, frequentKeys } = getDictionary();
  const common = [];
  for (let i = 0; i < frequent.length && common.length < n; i++) {
    const k = frequentKeys[i];
    if (k.includes(syllable) && !exclude.has(k) && !frequent[i].includes('-')) common.push(frequent[i]);
  }
  if (common.length >= n) return common;
  const skip = new Set([...exclude, ...common.map(wordKey)]);
  const found = [...common];
  const start = Math.floor(Math.random() * words.length);
  for (let i = 0; i < words.length && found.length < n * 6; i++) {
    const j = (start + i) % words.length;
    const k = keyList[j];
    if (k.length >= 4 && k.length <= 11 && k.includes(syllable) && !skip.has(k) && !words[j].includes('-')) {
      skip.add(k);
      found.push(words[j]);
    }
  }
  // Les mots les plus courts sont en général les plus connus
  return [...common, ...found.slice(common.length).sort((a, b) => a.length - b.length)].slice(0, n);
}
