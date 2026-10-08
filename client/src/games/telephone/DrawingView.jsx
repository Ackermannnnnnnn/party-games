import { useEffect, useRef } from 'react';
import { CANVAS_W, CANVAS_H, animateOps, renderAll, signature } from './drawing.js';

/**
 * Affiche un dessin (lecture seule).
 * `animate` : rejoue le dessin trait par trait à son apparition (une seule fois).
 */
export default function DrawingView({ strokes = [], animate = false, className = '' }) {
  const canvasRef = useRef(null);
  const opsRef = useRef(strokes);
  const animatedSig = useRef(null);
  opsRef.current = strokes;
  // L'état du jeu est renvoyé à chaque action : on ne redessine que si le dessin a vraiment changé
  const sig = signature(strokes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (animate && !reduceMotion && opsRef.current.length > 0 && animatedSig.current !== sig) {
      animatedSig.current = sig;
      let finished = false;
      const cancel = animateOps(ctx, opsRef.current, { onDone: () => { finished = true; } });
      return () => {
        cancel();
        // Animation interrompue (ex. double montage de React en dev) : elle pourra être rejouée
        if (!finished) animatedSig.current = null;
      };
    }
    renderAll(ctx, opsRef.current);
    return undefined;
  }, [sig, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      role="img"
      aria-label="Dessin"
      className={`block w-full h-auto bg-white ${className}`}
      style={{ aspectRatio: '4 / 3' }}
    />
  );
}
