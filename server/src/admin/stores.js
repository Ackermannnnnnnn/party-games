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

const QUIZ_FILE = 'quiz-questions.json';
const IMPOSTER_FILE = 'imposter-pairs.json';

// ───── Quiz Store ─────
let _quizQuestions = null; // Array of { id, category, question, answers[4], correct, difficulty, image? }

export const quizStore = {
  init: (defaultQuestions) => {
    if (_quizQuestions !== null) return;
    const fromFile = readJSON(QUIZ_FILE, null);
    if (fromFile && Array.isArray(fromFile)) {
      _quizQuestions = fromFile;
    } else {
      _quizQuestions = defaultQuestions.map(q => ({ ...q }));
      writeJSON(QUIZ_FILE, _quizQuestions);
    }
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
    writeJSON(QUIZ_FILE, _quizQuestions);
    return newQ;
  },
  update: (id, q) => {
    if (!_quizQuestions) return null;
    const idx = _quizQuestions.findIndex(x => x.id === id);
    if (idx < 0) return null;
    _quizQuestions[idx] = { ..._quizQuestions[idx], ...q, id };
    writeJSON(QUIZ_FILE, _quizQuestions);
    return _quizQuestions[idx];
  },
  delete: (id) => {
    if (!_quizQuestions) return false;
    const before = _quizQuestions.length;
    _quizQuestions = _quizQuestions.filter(x => x.id !== id);
    if (_quizQuestions.length === before) return false;
    writeJSON(QUIZ_FILE, _quizQuestions);
    return true;
  },
};

// ───── Imposter Store ─────
let _imposterPairs = null; // Array of { id, themeId, civil, imposter }

export const imposterStore = {
  init: (defaultPairs) => {
    if (_imposterPairs !== null) return;
    const fromFile = readJSON(IMPOSTER_FILE, null);
    if (fromFile && Array.isArray(fromFile)) {
      _imposterPairs = fromFile;
    } else {
      _imposterPairs = defaultPairs.map(p => ({ ...p }));
      writeJSON(IMPOSTER_FILE, _imposterPairs);
    }
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
    writeJSON(IMPOSTER_FILE, _imposterPairs);
    return newP;
  },
  update: (id, pair) => {
    if (!_imposterPairs) return null;
    const idx = _imposterPairs.findIndex(x => x.id === id);
    if (idx < 0) return null;
    _imposterPairs[idx] = { ..._imposterPairs[idx], ...pair, id };
    writeJSON(IMPOSTER_FILE, _imposterPairs);
    return _imposterPairs[idx];
  },
  delete: (id) => {
    if (!_imposterPairs) return false;
    const before = _imposterPairs.length;
    _imposterPairs = _imposterPairs.filter(x => x.id !== id);
    if (_imposterPairs.length === before) return false;
    writeJSON(IMPOSTER_FILE, _imposterPairs);
    return true;
  },
};
