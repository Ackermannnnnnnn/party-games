/**
 * Format d'un dessin (identique côté serveur, voir server/src/games/telephone/drawing.js) :
 *   strokes = [{ c: '#rrggbb', w: épaisseur, p: [x0, y0, x1, y1, ...] }, ...]
 * Les coordonnées sont des entiers dans un repère fixe 1000 × 750 (4:3),
 * donc le même dessin s'affiche net sur un téléphone comme sur un grand écran.
 */
export const CANVAS_W = 1000;
export const CANVAS_H = 750;
export const MAX_STROKES = 600;
export const MAX_POINTS_PER_STROKE = 2500;
export const MAX_TOTAL_POINTS = 15000;
/** Distance minimale (en unités du repère) entre deux points enregistrés. */
export const MIN_POINT_DISTANCE = 3;

export const PAPER = '#ffffff';
export const COLORS = [
  { value: '#000000', label: 'Noir' },
  { value: '#6b7280', label: 'Gris' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#f97316', label: 'Orange' },
  { value: '#facc15', label: 'Jaune' },
  { value: '#22c55e', label: 'Vert' },
  { value: '#14b8a6', label: 'Turquoise' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#92400e', label: 'Marron' },
  { value: '#fcd9b6', label: 'Beige' },
];
export const SIZES = [
  { value: 5,  label: 'Fin' },
  { value: 12, label: 'Moyen' },
  { value: 24, label: 'Épais' },
  { value: 48, label: 'Très épais' },
];

export const countPoints = (strokes) => strokes.reduce((n, s) => n + s.p.length / 2, 0);

/** Signature légère d'un dessin : change dès que le dessin change, sans tout comparer. */
export function signature(strokes) {
  if (!strokes || strokes.length === 0) return 'vide';
  const last = strokes[strokes.length - 1];
  return `${strokes.length}:${countPoints(strokes)}:${last.c}:${last.p[0]},${last.p[last.p.length - 1]}`;
}

/** Trace un trait (courbe lissée). `upto` limite le nombre de points, pour l'animation. */
export function drawStroke(ctx, stroke, scale, upto = Infinity) {
  const n = Math.min(upto, stroke.p.length / 2);
  if (n < 1) return;
  const x = (i) => stroke.p[2 * i] * scale;
  const y = (i) => stroke.p[2 * i + 1] * scale;
  const width = Math.max(1, stroke.w * scale);
  ctx.strokeStyle = stroke.c;
  ctx.fillStyle = stroke.c;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (n === 1) {
    ctx.beginPath();
    ctx.arc(x(0), y(0), width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x(0), y(0));
  for (let i = 1; i < n - 1; i++) {
    ctx.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2);
  }
  ctx.lineTo(x(n - 1), y(n - 1));
  ctx.stroke();
}

/** Redessine tout le dessin sur fond blanc. `maxPoints` sert à rejouer le dessin progressivement. */
export function renderStrokes(ctx, strokes, width, height, maxPoints = Infinity) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  const scale = width / CANVAS_W;
  let budget = maxPoints;
  for (const stroke of strokes) {
    if (budget <= 0) break;
    drawStroke(ctx, stroke, scale, budget);
    budget -= stroke.p.length / 2;
  }
}

/** Ajuste la résolution interne du canvas à sa taille affichée (net sur écrans haute densité). */
export function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round((width * CANVAS_H) / CANVAS_W));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, scale: width / CANVAS_W };
}
