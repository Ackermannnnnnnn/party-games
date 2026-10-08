/**
 * Format d'un dessin (identique côté client, voir client/src/games/telephone/drawing.js) :
 *   strokes = [{ c: '#rrggbb', w: épaisseur, p: [x0, y0, x1, y1, ...] }, ...]
 * Les coordonnées sont des entiers dans un repère fixe 1000 × 750 (4:3),
 * donc le dessin se réaffiche à n'importe quelle taille d'écran.
 */
export const CANVAS_W = 1000;
export const CANVAS_H = 750;
export const MAX_STROKES = 600;
export const MAX_POINTS_PER_STROKE = 2500;
export const MAX_TOTAL_POINTS = 15000;
const MIN_WIDTH = 1;
const MAX_WIDTH = 80;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

/**
 * Nettoie un dessin reçu d'un client : on ne garde que ce qui est conforme,
 * et on reconstruit des objets propres (jamais de données arbitraires renvoyées aux autres joueurs).
 * Renvoie null si le format est inutilisable.
 */
export function sanitizeStrokes(raw) {
  if (!Array.isArray(raw)) return null;
  const strokes = [];
  let total = 0;
  for (const s of raw.slice(0, MAX_STROKES)) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.p)) continue;
    if (typeof s.c !== 'string' || !COLOR_RE.test(s.c)) continue;
    const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(Number(s.w)) || 0));
    const len = Math.min(s.p.length - (s.p.length % 2), MAX_POINTS_PER_STROKE * 2);
    if (len < 2) continue;
    const p = new Array(len);
    let ok = true;
    for (let i = 0; i < len; i++) {
      const v = Math.round(Number(s.p[i]));
      if (!Number.isFinite(v)) { ok = false; break; }
      const max = i % 2 === 0 ? CANVAS_W : CANVAS_H;
      p[i] = Math.max(0, Math.min(max, v));
    }
    if (!ok) continue;
    total += len / 2;
    if (total > MAX_TOTAL_POINTS) break;
    strokes.push({ c: s.c.toLowerCase(), w, p });
  }
  return strokes;
}
