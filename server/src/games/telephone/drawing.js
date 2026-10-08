/**
 * Format d'un dessin (identique côté client, voir client/src/games/telephone/drawing.js) :
 *   une liste d'opérations, dans l'ordre où elles ont été faites :
 *     - trait       : { c: '#rrggbb', w: épaisseur, p: [x0, y0, x1, y1, ...] }
 *     - remplissage : { c: '#rrggbb', f: [x, y] }   (pot de peinture cliqué en x, y)
 * Les coordonnées sont des entiers dans un repère fixe 1000 × 750 (4:3).
 */
export const CANVAS_W = 1000;
export const CANVAS_H = 750;
export const MAX_STROKES = 600;          // opérations au total (traits + remplissages)
export const MAX_FILLS = 100;            // un remplissage coûte cher à redessiner chez chaque joueur
export const MAX_POINTS_PER_STROKE = 2500;
export const MAX_TOTAL_POINTS = 15000;
const MIN_WIDTH = 1;
const MAX_WIDTH = 80;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

const toInt = (v, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : null;
};

/**
 * Nettoie un dessin reçu d'un client : on ne garde que ce qui est conforme,
 * et on reconstruit des objets propres (jamais de données arbitraires renvoyées aux autres joueurs).
 * Renvoie null si le format est inutilisable.
 */
export function sanitizeStrokes(raw) {
  if (!Array.isArray(raw)) return null;
  const ops = [];
  let total = 0;
  let fills = 0;
  for (const s of raw.slice(0, MAX_STROKES)) {
    if (!s || typeof s !== 'object') continue;
    if (typeof s.c !== 'string' || !COLOR_RE.test(s.c)) continue;
    const c = s.c.toLowerCase();

    // Remplissage
    if (Array.isArray(s.f)) {
      if (fills >= MAX_FILLS) continue;
      const x = toInt(s.f[0], CANVAS_W);
      const y = toInt(s.f[1], CANVAS_H);
      if (x === null || y === null) continue;
      ops.push({ c, f: [x, y] });
      fills += 1;
      continue;
    }

    // Trait
    if (!Array.isArray(s.p)) continue;
    const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(Number(s.w)) || 0));
    const len = Math.min(s.p.length - (s.p.length % 2), MAX_POINTS_PER_STROKE * 2);
    if (len < 2) continue;
    const p = new Array(len);
    let ok = true;
    for (let i = 0; i < len; i++) {
      const v = toInt(s.p[i], i % 2 === 0 ? CANVAS_W : CANVAS_H);
      if (v === null) { ok = false; break; }
      p[i] = v;
    }
    if (!ok) continue;
    total += len / 2;
    if (total > MAX_TOTAL_POINTS) break;
    ops.push({ c, w, p });
  }
  return ops;
}
