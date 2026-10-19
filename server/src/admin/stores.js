/**
 * Stores en mémoire pour les questions Quiz et paires Imposter.
 * - Au boot : si JSON files existent, on charge. Sinon on prend les données par défaut
 *   passées à init() puis on save.
 * - Toute modif via l'admin UI met à jour la mémoire ET sauvegarde le JSON.
 *
 * IMPORTANT : ce module n'importe PAS questions.js / themes.js (pour éviter
 * un cycle ESM). C'est questions.js / themes.js qui appellent quizStore.init() /
 * imposterStore.init() au démarrage avec leurs données.
 */
import { readJSON, writeJSON } from './storage.js';


/**
 * Charge un fichier de données en le combinant avec la banque par défaut :
 * - fichier absent → banque par défaut ;
 * - banque par défaut mise à jour (nouvelle `version`) → on reprend la nouvelle banque
 *   et on garde seulement les ajouts faits à la main (ids `custom_…`).
 */
function loadWithDefaults(file, defaults, version) {
  const raw = readJSON(file, null);
  const saved = Array.isArray(raw) ? { version: null, items: raw } : raw;
  if (saved && Array.isArray(saved.items) && (!version || saved.version === version)) return saved.items;
  const customs = (saved?.items || []).filter((x) => String(x.id || '').startsWith('custom_'));
  const items = [...defaults.map((d) => ({ ...d })), ...customs];
  writeJSON(file, { version, items });
  return items;
}

const QUIZ_FILE = 'quiz-questions.json';
const IMPOSTER_FILE = 'imposter-pairs.json';

// ───── Quiz Store ─────
let _quizQuestions = null;
let _quizVersion = null;
const saveQuiz = () => writeJSON(QUIZ_FILE, { version: _quizVersion, items: _quizQuestions }); // Array of { id, category, question, answers[4], correct, difficulty, image? }

export const quizStore = {
  init: (defaultQuestions, version = null) => {
    if (_quizQuestions !== null) return;
    _quizVersion = version;
    _quizQuestions = loadWithDefaults(QUIZ_FILE, defaultQuestions, version);
  },
  getAll: () => [..._quizQuestions || []],
  getByCategory: (catId) => {
    if (!_quizQuestions) return [];
    if (catId === 'all') return [..._quizQuestions];
    return _quizQuestions.filter(q => q.category === catId);
  },
  add: (q) => {
    if (!_quizQuestions) _quizQuestions = [];
    const id = q.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newQ = { ...q, id };
    _quizQuestions.push(newQ);
    saveQuiz();
    return newQ;
  },
  update: (id, q) => {
    if (!_quizQuestions) return null;
    const idx = _quizQuestions.findIndex(x => x.id === id);
    if (idx < 0) return null;
    _quizQuestions[idx] = { ..._quizQuestions[idx], ...q, id };
    saveQuiz();
    return _quizQuestions[idx];
  },
  delete: (id) => {
    if (!_quizQuestions) return false;
    const before = _quizQuestions.length;
    _quizQuestions = _quizQuestions.filter(x => x.id !== id);
    if (_quizQuestions.length === before) return false;
    saveQuiz();
    return true;
  },
};

// ───── Imposter Store ─────
let _imposterPairs = null;
let _imposterVersion = null;
const saveImposter = () => writeJSON(IMPOSTER_FILE, { version: _imposterVersion, items: _imposterPairs }); // Array of { id, themeId, civil, imposter }

export const imposterStore = {
  init: (defaultPairs, version = null) => {
    if (_imposterPairs !== null) return;
    _imposterVersion = version;
    _imposterPairs = loadWithDefaults(IMPOSTER_FILE, defaultPairs, version);
  },
  getAll: () => [..._imposterPairs || []],
  getByTheme: (themeId) => {
    if (!_imposterPairs) return [];
    if (themeId === 'random') return [..._imposterPairs];
    return _imposterPairs.filter(p => p.themeId === themeId);
  },
  add: (pair) => {
    if (!_imposterPairs) _imposterPairs = [];
    const id = pair.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newP = { ...pair, id };
    _imposterPairs.push(newP);
    saveImposter();
    return newP;
  },
  update: (id, pair) => {
    if (!_imposterPairs) return null;
    const idx = _imposterPairs.findIndex(x => x.id === id);
    if (idx < 0) return null;
    _imposterPairs[idx] = { ..._imposterPairs[idx], ...pair, id };
    saveImposter();
    return _imposterPairs[idx];
  },
  delete: (id) => {
    if (!_imposterPairs) return false;
    const before = _imposterPairs.length;
    _imposterPairs = _imposterPairs.filter(x => x.id !== id);
    if (_imposterPairs.length === before) return false;
    saveImposter();
    return true;
  },
};
