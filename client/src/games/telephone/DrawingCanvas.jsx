import { useEffect, useRef, useState } from 'react';
import {
  CANVAS_W, CANVAS_H, COLORS, SIZES, PAPER,
  MAX_STROKES, MAX_FILLS, MAX_POINTS_PER_STROKE, MAX_TOTAL_POINTS, MIN_POINT_DISTANCE,
  countFills, countPoints, createCanvas, drawOp, drawStroke, renderAll,
} from './drawing.js';

const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
const sameStart = (a, b, n) => {
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
  return true;
};

const TOOLS = [
  { id: 'pen',    icon: '✏️', label: 'Crayon' },
  { id: 'fill',   icon: '🪣', label: 'Pot de peinture' },
  { id: 'eraser', icon: '🧽', label: 'Gomme' },
];

/**
 * Zone de dessin (souris, doigt ou stylet) avec crayon, pot de peinture et gomme.
 * Le parent possède la liste des opérations (`strokes`) ; on la met à jour à chaque trait
 * terminé ou remplissage. Les opérations déjà faites sont gardées dans un canvas en mémoire :
 * un nouveau trait ne redessine pas tout le dessin (les remplissages coûtent cher).
 */
export default function DrawingCanvas({ strokes, onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const baseRef = useRef(null);       // canvas en mémoire : toutes les opérations validées
  const baseOps = useRef(null);       // opérations actuellement peintes dans baseRef
  const strokesRef = useRef(strokes);
  const current = useRef(null);       // trait en cours de tracé
  const pointerId = useRef(null);
  const clearedBackup = useRef(null); // pour annuler un "tout effacer"
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(SIZES[1].value);
  const [tool, setTool] = useState('pen');

  const full = strokes.length >= MAX_STROKES || countPoints(strokes) >= MAX_TOTAL_POINTS;
  const fillsLeft = MAX_FILLS - countFills(strokes);

  /** Copie le dessin validé sur l'écran, avec le trait en cours par-dessus. */
  const blit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseRef.current) return;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(baseRef.current, 0, 0);
    if (current.current) drawStroke(ctx, current.current);
  };

  // Met le canvas en mémoire à jour : ajout d'une seule opération = dessin incrémental,
  // sinon (annuler, tout effacer, brouillon restauré) on repart d'une feuille blanche.
  useEffect(() => {
    strokesRef.current = strokes;
    if (!baseRef.current) baseRef.current = createCanvas();
    const bctx = baseRef.current.getContext('2d', { willReadFrequently: true });
    const prev = baseOps.current;
    if (prev && strokes.length === prev.length + 1 && sameStart(prev, strokes, prev.length)) {
      drawOp(bctx, strokes[strokes.length - 1]);
    } else if (!(prev && strokes.length === prev.length && sameStart(prev, strokes, prev.length))) {
      renderAll(bctx, strokes);
    }
    baseOps.current = strokes;
    blit();
  }, [strokes]);

  /** Position du pointeur dans le repère fixe du dessin. */
  const toPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [
      clamp(((e.clientX - rect.left) / rect.width) * CANVAS_W, CANVAS_W),
      clamp(((e.clientY - rect.top) / rect.height) * CANVAS_H, CANVAS_H),
    ];
  };

  const push = (op) => {
    clearedBackup.current = null;
    onChange([...strokesRef.current, op]);
  };

  const commit = () => {
    const stroke = current.current;
    current.current = null;
    pointerId.current = null;
    if (stroke) push(stroke);
  };

  const onPointerDown = (e) => {
    if (disabled || full || current.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (tool === 'fill') {
      if (fillsLeft > 0) push({ c: color, f: toPoint(e) });
      return;
    }
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch {}
    pointerId.current = e.pointerId;
    current.current = { c: tool === 'eraser' ? PAPER : color, w: size, p: toPoint(e) };
    blit();
  };

  const onPointerMove = (e) => {
    const stroke = current.current;
    if (!stroke || e.pointerId !== pointerId.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    // Les navigateurs regroupent les mouvements rapides : on récupère tous les points intermédiaires
    const events = e.nativeEvent.getCoalescedEvents?.() || [];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const [x, y] = toPoint(ev);
      const n = stroke.p.length;
      const dx = x - stroke.p[n - 2];
      const dy = y - stroke.p[n - 1];
      if (dx * dx + dy * dy < MIN_POINT_DISTANCE * MIN_POINT_DISTANCE) continue;
      if (n / 2 >= MAX_POINTS_PER_STROKE) { commit(); return; }
      // Tracé immédiat du nouveau segment (le lissage se fait au relâchement)
      ctx.strokeStyle = stroke.c;
      ctx.lineWidth = stroke.w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.p[n - 2], stroke.p[n - 1]);
      ctx.lineTo(x, y);
      ctx.stroke();
      stroke.p.push(x, y);
    }
  };

  const onPointerUp = (e) => {
    if (e.pointerId !== pointerId.current) return;
    commit();
  };

  const undo = () => {
    if (strokes.length === 0 && clearedBackup.current) {
      onChange(clearedBackup.current);   // annule le "tout effacer"
      clearedBackup.current = null;
      return;
    }
    onChange(strokes.slice(0, -1));
  };

  const clearAll = () => {
    if (strokes.length === 0) return;
    clearedBackup.current = strokes;
    onChange([]);
  };

  const canUndo = strokes.length > 0 || !!clearedBackup.current;
  const cursor = disabled ? 'not-allowed' : tool === 'fill' ? 'cell' : 'crosshair';

  const palette = (
    <div
      className="flex flex-wrap justify-center gap-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:content-start"
      role="group"
      aria-label="Couleur"
    >
      {COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => { setColor(c.value); if (tool === 'eraser') setTool('pen'); }}
          aria-label={c.label}
          aria-pressed={tool !== 'eraser' && color === c.value}
          title={c.label}
          className="gp-swatch"
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className={`flex flex-col gap-3 lg:flex-row lg:items-start ${disabled ? '' : ''}`}>
        {!disabled && <div className="order-2 lg:order-1 lg:pt-1">{palette}</div>}
        <div className="order-1 lg:order-2 flex-1 min-w-0">
          <div className={`gp-canvas-frame ${disabled ? 'opacity-60' : ''}`}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label="Zone de dessin"
              className="block w-full h-auto select-none"
              style={{ aspectRatio: '4 / 3', touchAction: 'none', cursor }}
            />
          </div>
        </div>
      </div>

      {!disabled && (
        <div className="gp-dock">
          <div className="flex gap-1.5" role="group" aria-label="Outil">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                aria-pressed={tool === t.id}
                aria-label={t.label}
                title={t.label}
                className="gp-tool"
              >
                <span aria-hidden="true">{t.icon}</span>
                <span className="hidden sm:inline">{t.label === 'Pot de peinture' ? 'Remplir' : t.label}</span>
              </button>
            ))}
          </div>

          <span className="hidden sm:block w-px h-8 bg-white/10" aria-hidden="true" />

          <div className="flex gap-1.5" role="group" aria-label="Épaisseur">
            {SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setSize(s.value); if (tool === 'fill') setTool('pen'); }}
                aria-label={s.label}
                aria-pressed={tool !== 'fill' && size === s.value}
                title={s.label}
                className="gp-tool px-0 w-11"
              >
                <span
                  className="rounded-full"
                  style={{
                    width: 4 + s.value / 2.4,
                    height: 4 + s.value / 2.4,
                    background: tool === 'eraser' ? '#e2e8f0' : color,
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
                  }}
                />
              </button>
            ))}
          </div>

          <span className="hidden sm:block w-px h-8 bg-white/10" aria-hidden="true" />

          <div className="flex gap-1.5">
            <button type="button" onClick={undo} disabled={!canUndo} className="gp-tool" title="Annuler" aria-label="Annuler">
              ↩️ <span className="hidden sm:inline">Annuler</span>
            </button>
            <button type="button" onClick={clearAll} disabled={strokes.length === 0} className="gp-tool" title="Tout effacer" aria-label="Tout effacer">
              🗑️ <span className="hidden sm:inline">Tout effacer</span>
            </button>
          </div>
        </div>
      )}

      {!disabled && full && (
        <p className="text-center text-amber-300 text-sm" role="alert">
          Ton dessin est plein : annule des traits pour continuer.
        </p>
      )}
      {!disabled && tool === 'fill' && fillsLeft <= 0 && (
        <p className="text-center text-amber-300 text-sm" role="alert">
          Plus de remplissage possible sur ce dessin ({MAX_FILLS} maximum).
        </p>
      )}
    </div>
  );
}
