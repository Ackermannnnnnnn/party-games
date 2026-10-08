/**
 * Moteur de dessin de Gartic Phone.
 *
 * Format (identique côté serveur, voir server/src/games/telephone/drawing.js) : une liste
 * d'opérations dans l'ordre où elles ont été faites :
 *   - trait       : { c: '#rrggbb', w: épaisseur, p: [x0, y0, x1, y1, ...] }
 *   - remplissage : { c: '#rrggbb', f: [x, y] }   (pot de peinture)
 *
 * Tous les canvas travaillent dans la même résolution fixe 1000 × 750 (affichée à la taille de
 * l'écran par le CSS) : un remplissage donne ainsi exactement le même résultat chez tout le monde.
 */
export const CANVAS_W = 1000;
export const CANVAS_H = 750;
export const MAX_STROKES = 600;
export const MAX_FILLS = 100;
export const MAX_POINTS_PER_STROKE = 2500;
export const MAX_TOTAL_POINTS = 15000;
/** Distance minimale (en unités du repère) entre deux points enregistrés. */
export const MIN_POINT_DISTANCE = 3;
/** "Coût" d'un remplissage dans l'animation de l'album (en équivalent points de trait). */
const FILL_ANIMATION_COST = 40;

export const PAPER = '#ffffff';
export const COLORS = [
  { value: '#000000', label: 'Noir' },
  { value: '#6b7280', label: 'Gris' },
  { value: '#ffffff', label: 'Blanc' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#f97316', label: 'Orange' },
  { value: '#facc15', label: 'Jaune' },
  { value: '#84cc16', label: 'Vert clair' },
  { value: '#16a34a', label: 'Vert' },
  { value: '#14b8a6', label: 'Turquoise' },
  { value: '#38bdf8', label: 'Bleu ciel' },
  { value: '#2563eb', label: 'Bleu' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#fda4af', label: 'Rose pâle' },
  { value: '#92400e', label: 'Marron' },
  { value: '#fcd9b6', label: 'Beige' },
];
export const SIZES = [
  { value: 5,  label: 'Fin' },
  { value: 12, label: 'Moyen' },
  { value: 24, label: 'Épais' },
  { value: 48, label: 'Très épais' },
];

export const isFill = (op) => Array.isArray(op.f);
export const countPoints = (ops) => ops.reduce((n, op) => n + (isFill(op) ? 0 : op.p.length / 2), 0);
export const countFills = (ops) => ops.reduce((n, op) => n + (isFill(op) ? 1 : 0), 0);
const animationCost = (op) => (isFill(op) ? FILL_ANIMATION_COST : op.p.length / 2);

/** Signature légère d'un dessin : change dès que le dessin change, sans tout comparer. */
export function signature(ops) {
  if (!ops || ops.length === 0) return 'vide';
  const last = ops[ops.length - 1];
  const tail = isFill(last) ? `f${last.f[0]},${last.f[1]}` : `${last.p[0]},${last.p[last.p.length - 1]}`;
  return `${ops.length}:${countPoints(ops)}:${last.c}:${tail}`;
}

/** Trace un trait (courbe lissée). `upto` limite le nombre de points, pour l'animation. */
export function drawStroke(ctx, stroke, upto = Infinity) {
  const n = Math.min(upto, stroke.p.length / 2);
  if (n < 1) return;
  const x = (i) => stroke.p[2 * i];
  const y = (i) => stroke.p[2 * i + 1];
  ctx.strokeStyle = stroke.c;
  ctx.fillStyle = stroke.c;
  ctx.lineWidth = stroke.w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (n === 1) {
    ctx.beginPath();
    ctx.arc(x(0), y(0), stroke.w / 2, 0, Math.PI * 2);
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

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * Pot de peinture : remplit la zone de couleur proche autour de (x, y).
 * Une tolérance absorbe l'anticrénelage des traits, puis on déborde d'un pixel
 * pour ne pas laisser de liseré clair le long des contours.
 */
export function floodFill(ctx, x, y, hex, tolerance = 48) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const sx = Math.max(0, Math.min(W - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(H - 1, Math.round(y)));
  const image = ctx.getImageData(0, 0, W, H);
  const d = image.data;
  const start = (sy * W + sx) * 4;
  const tr = d[start], tg = d[start + 1], tb = d[start + 2];
  const [fr, fg, fb] = hexToRgb(hex);
  if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 6) return; // déjà de cette couleur

  const matches = (p) => {
    const i = p * 4;
    return Math.abs(d[i] - tr) <= tolerance && Math.abs(d[i + 1] - tg) <= tolerance && Math.abs(d[i + 2] - tb) <= tolerance;
  };
  const mask = new Uint8Array(W * H);
  const stack = [sx, sy];
  // Remplissage par lignes horizontales (rapide, sans récursion)
  while (stack.length) {
    const py = stack.pop();
    let px = stack.pop();
    let p = py * W + px;
    while (px >= 0 && !mask[p] && matches(p)) { px--; p--; }
    px++; p++;
    let up = false;
    let down = false;
    while (px < W && !mask[p] && matches(p)) {
      mask[p] = 1;
      if (py > 0) {
        const q = p - W;
        if (!mask[q] && matches(q)) { if (!up) { stack.push(px, py - 1); up = true; } } else up = false;
      }
      if (py < H - 1) {
        const q = p + W;
        if (!mask[q] && matches(q)) { if (!down) { stack.push(px, py + 1); down = true; } } else down = false;
      }
      px++; p++;
    }
  }
  // Peinture de la zone + 1 pixel de débordement sur le contour
  for (let p = 0; p < W * H; p++) {
    const px = p % W;
    const inZone = mask[p]
      || (px > 0 && mask[p - 1]) || (px < W - 1 && mask[p + 1])
      || (p >= W && mask[p - W]) || (p < W * (H - 1) && mask[p + W]);
    if (!inZone) continue;
    const i = p * 4;
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/** Applique une opération (trait ou remplissage) sur un canvas déjà peint. */
export function drawOp(ctx, op) {
  if (isFill(op)) floodFill(ctx, op.f[0], op.f[1], op.c);
  else drawStroke(ctx, op);
}

/** Repart d'une feuille blanche et redessine toutes les opérations. */
export function renderAll(ctx, ops) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const op of ops) drawOp(ctx, op);
}

export function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  return canvas;
}

/**
 * Rejoue un dessin progressivement (album). Les opérations terminées sont gardées dans un
 * canvas en mémoire : chaque image ne redessine que le trait en cours.
 * Renvoie une fonction d'annulation.
 */
export function animateOps(ctx, ops, { duration, onDone } = {}) {
  const total = ops.reduce((n, op) => n + animationCost(op), 0);
  const cache = createCanvas();
  const cctx = cache.getContext('2d', { willReadFrequently: true });
  cctx.fillStyle = PAPER;
  cctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const ms = duration ?? Math.min(2600, 700 + total * 2);
  let index = 0;
  let done = 0;
  let raf = 0;
  const startAt = performance.now();
  const frame = (now) => {
    const target = total * Math.min(1, (now - startAt) / ms);
    while (index < ops.length && done + animationCost(ops[index]) <= target) {
      drawOp(cctx, ops[index]);
      done += animationCost(ops[index]);
      index += 1;
    }
    ctx.drawImage(cache, 0, 0);
    const current = ops[index];
    if (current && !isFill(current)) drawStroke(ctx, current, Math.floor(target - done));
    if (index < ops.length) raf = requestAnimationFrame(frame);
    else onDone?.();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
