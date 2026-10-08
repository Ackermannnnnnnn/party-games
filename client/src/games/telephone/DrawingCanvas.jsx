import { useEffect, useRef, useState } from 'react';
import {
  CANVAS_W, CANVAS_H, COLORS, SIZES, PAPER,
  MAX_STROKES, MAX_POINTS_PER_STROKE, MAX_TOTAL_POINTS, MIN_POINT_DISTANCE,
  countPoints, drawStroke, fitCanvas, renderStrokes,
} from './drawing.js';

const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));

/**
 * Zone de dessin (souris, doigt ou stylet).
 * Le parent possède la liste des traits (`strokes`) ; on la met à jour à chaque trait terminé.
 */
export default function DrawingCanvas({ strokes, onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef(strokes);
  const current = useRef(null);       // trait en cours de tracé
  const pointerId = useRef(null);
  const clearedBackup = useRef(null); // pour annuler un "tout effacer"
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(SIZES[1].value);
  const [eraser, setEraser] = useState(false);

  const full = strokes.length >= MAX_STROKES || countPoints(strokes) >= MAX_TOTAL_POINTS;

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height, scale } = fitCanvas(canvas);
    const ctx = canvas.getContext('2d');
    renderStrokes(ctx, strokesRef.current, width, height);
    if (current.current) drawStroke(ctx, current.current, scale);
  };

  useEffect(() => {
    strokesRef.current = strokes;
    redraw();
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  /** Position du pointeur dans le repère fixe du dessin. */
  const toPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [
      clamp(((e.clientX - rect.left) / rect.width) * CANVAS_W, CANVAS_W),
      clamp(((e.clientY - rect.top) / rect.height) * CANVAS_H, CANVAS_H),
    ];
  };

  const commit = () => {
    const stroke = current.current;
    current.current = null;
    pointerId.current = null;
    if (!stroke) return;
    clearedBackup.current = null;
    onChange([...strokesRef.current, stroke]);
  };

  const onPointerDown = (e) => {
    if (disabled || full || current.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch {}
    pointerId.current = e.pointerId;
    current.current = { c: eraser ? PAPER : color, w: size, p: toPoint(e) };
    const { scale } = fitCanvas(canvasRef.current);
    drawStroke(canvasRef.current.getContext('2d'), current.current, scale);
  };

  const onPointerMove = (e) => {
    const stroke = current.current;
    if (!stroke || e.pointerId !== pointerId.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / CANVAS_W;
    // Les navigateurs regroupent les mouvements rapides : on récupère tous les points intermédiaires
    const events = e.nativeEvent.getCoalescedEvents?.() || [];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const [x, y] = toPoint(ev);
      const n = stroke.p.length;
      const dx = x - stroke.p[n - 2];
      const dy = y - stroke.p[n - 1];
      if (dx * dx + dy * dy < MIN_POINT_DISTANCE * MIN_POINT_DISTANCE) continue;
      if (n / 2 >= MAX_POINTS_PER_STROKE) { commit(); return; }
      // Tracé immédiat du nouveau segment (le lissage complet se fait au relâchement)
      ctx.strokeStyle = stroke.c;
      ctx.lineWidth = Math.max(1, stroke.w * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.p[n - 2] * scale, stroke.p[n - 1] * scale);
      ctx.lineTo(x * scale, y * scale);
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

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Zone de dessin"
        className={`block w-full rounded-xl bg-white select-none ${
          disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-crosshair'
        }`}
        style={{ aspectRatio: '4 / 3', touchAction: 'none' }}
      />

      {!disabled && (
        <div className="space-y-2">
          {/* Couleurs */}
          <div className="flex flex-wrap gap-1.5 justify-center" role="group" aria-label="Couleur">
            {COLORS.map((c) => {
              const active = !eraser && color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setColor(c.value); setEraser(false); }}
                  aria-label={c.label}
                  aria-pressed={active}
                  title={c.label}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${
                    active ? 'border-white scale-110 ring-2 ring-brand' : 'border-slate-600'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
          </div>

          {/* Tailles + outils */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <div className="flex gap-1.5" role="group" aria-label="Épaisseur">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value)}
                  aria-label={s.label}
                  aria-pressed={size === s.value}
                  title={s.label}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                    size === s.value ? 'bg-brand border-brand-light' : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <span className="rounded-full bg-white" style={{ width: 4 + s.value / 2.2, height: 4 + s.value / 2.2 }} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEraser((v) => !v)}
              aria-pressed={eraser}
              className={`px-3 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                eraser ? 'bg-brand border-brand-light text-white' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              🧽 Gomme
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="px-3 h-10 rounded-lg text-sm font-semibold bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40"
            >
              ↩️ Annuler
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={strokes.length === 0}
              className="px-3 h-10 rounded-lg text-sm font-semibold bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40"
            >
              🗑️ Tout effacer
            </button>
          </div>

          {full && (
            <p className="text-center text-amber-300 text-sm" role="alert">
              Ton dessin est plein : annule des traits pour continuer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
