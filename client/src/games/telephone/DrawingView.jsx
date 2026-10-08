import { useEffect, useRef } from 'react';
import { countPoints, fitCanvas, renderStrokes, signature } from './drawing.js';

/**
 * Affiche un dessin (lecture seule).
 * `animate` : rejoue le dessin trait par trait à son apparition (une seule fois).
 */
export default function DrawingView({ strokes = [], animate = false, className = '' }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef(strokes);
  const animatedSig = useRef(null);
  strokesRef.current = strokes;
  // L'état du jeu est renvoyé à chaque action : on ne redessine que si le dessin a vraiment changé
  const sig = signature(strokes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let raf = 0;
    let animating = false;

    const draw = (maxPoints = Infinity) => {
      const { width, height } = fitCanvas(canvas);
      renderStrokes(canvas.getContext('2d'), strokesRef.current, width, height, maxPoints);
    };

    const total = countPoints(strokesRef.current);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (animate && total > 1 && !reduceMotion && animatedSig.current !== sig) {
      animatedSig.current = sig;
      animating = true;
      const duration = Math.min(2500, 700 + total * 2);
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        draw(Math.ceil(total * progress));
        if (progress < 1) raf = requestAnimationFrame(tick);
        else animating = false;
      };
      draw(0);
      raf = requestAnimationFrame(tick);
    } else {
      draw();
    }

    const observer = new ResizeObserver(() => { if (!animating) draw(); });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      // Animation interrompue (ex. double montage de React en dev) : elle pourra être rejouée
      if (animating) animatedSig.current = null;
    };
  }, [sig, animate]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Dessin"
      className={`block w-full rounded-xl bg-white ${className}`}
      style={{ aspectRatio: '4 / 3' }}
    />
  );
}
