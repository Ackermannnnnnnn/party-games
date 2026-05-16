import express from 'express';
import { quizStore, imposterStore } from './stores.js';
import { listCategories } from '../games/quiz/questions.js';
import { listThemes } from '../games/imposter/themes.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

/**
 * Middleware d'authentification.
 * Le client envoie le mot de passe dans le header `X-Admin-Password`.
 */
function authMiddleware(req, res, next) {
  const sent = req.header('X-Admin-Password');
  if (!sent || sent !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function createAdminRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '500kb' }));

  // ─────── Endpoint LOGIN (vérifie le mot de passe) ───────
  router.post('/login', (req, res) => {
    const { password } = req.body || {};
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, error: 'Mauvais mot de passe' });
    }
    res.json({ ok: true });
  });

  // Toutes les routes /admin/* (sauf /login) demandent l'auth
  router.use(authMiddleware);

  // ─────── METADATA (read-only, pour les dropdowns) ───────
  router.get('/quiz/categories', (_req, res) => res.json(listCategories()));
  router.get('/imposter/themes', (_req, res) => res.json(listThemes()));

  // ─────── QUIZ — questions ───────
  router.get('/quiz/questions', (req, res) => {
    const { category } = req.query;
    if (category) return res.json(quizStore.getByCategory(category));
    res.json(quizStore.getAll());
  });
  router.post('/quiz/questions', (req, res) => {
    const q = sanitizeQuestion(req.body);
    if (!q) return res.status(400).json({ error: 'Invalid question payload' });
    res.json(quizStore.add(q));
  });
  router.put('/quiz/questions/:id', (req, res) => {
    const q = sanitizeQuestion(req.body);
    if (!q) return res.status(400).json({ error: 'Invalid question payload' });
    const updated = quizStore.update(req.params.id, q);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  });
  router.delete('/quiz/questions/:id', (req, res) => {
    const ok = quizStore.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  // ─────── IMPOSTER — paires ───────
  router.get('/imposter/pairs', (req, res) => {
    const { theme } = req.query;
    if (theme) return res.json(imposterStore.getByTheme(theme));
    res.json(imposterStore.getAll());
  });
  router.post('/imposter/pairs', (req, res) => {
    const p = sanitizePair(req.body);
    if (!p) return res.status(400).json({ error: 'Invalid pair payload' });
    res.json(imposterStore.add(p));
  });
  router.put('/imposter/pairs/:id', (req, res) => {
    const p = sanitizePair(req.body);
    if (!p) return res.status(400).json({ error: 'Invalid pair payload' });
    const updated = imposterStore.update(req.params.id, p);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  });
  router.delete('/imposter/pairs/:id', (req, res) => {
    const ok = imposterStore.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  return router;
}

function sanitizeQuestion(body) {
  if (!body || typeof body !== 'object') return null;
  const { category, question, answers, correct, difficulty, image } = body;
  if (typeof category !== 'string' || !category) return null;
  if (typeof question !== 'string' || question.trim().length < 3) return null;
  if (!Array.isArray(answers) || answers.length !== 4) return null;
  if (!answers.every(a => typeof a === 'string' && a.trim().length > 0)) return null;
  const c = parseInt(correct, 10);
  if (![0, 1, 2, 3].includes(c)) return null;
  const d = parseInt(difficulty, 10);
  return {
    category: category.trim(),
    question: question.trim().slice(0, 200),
    answers: answers.map(a => a.trim().slice(0, 80)),
    correct: c,
    difficulty: [1, 2, 3, 4].includes(d) ? d : 1,
    image: typeof image === 'string' && image.trim() ? image.trim() : null,
  };
}

function sanitizePair(body) {
  if (!body || typeof body !== 'object') return null;
  const { themeId, civil, imposter } = body;
  if (typeof themeId !== 'string' || !themeId) return null;
  if (typeof civil !== 'string' || civil.trim().length < 1) return null;
  if (typeof imposter !== 'string' || imposter.trim().length < 1) return null;
  return {
    themeId: themeId.trim(),
    civil: civil.trim().slice(0, 60),
    imposter: imposter.trim().slice(0, 60),
  };
}
