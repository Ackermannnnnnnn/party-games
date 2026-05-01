import { useState, useEffect } from 'react';
import { Howler } from 'howler';
import { setGlobalVolume, useSounds } from '../hooks/useSounds.js';

/**
 * Bouton 🔊/🔇 dans le header. Mémorise le choix dans localStorage.
 * Au 1er clic, force le déblocage de l'AudioContext (Chrome/Safari).
 */
export default function VolumeToggle() {
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('soundMuted') === '1'; } catch { return false; }
  });
  const { play } = useSounds();

  useEffect(() => {
    Howler.mute(muted);
    try { localStorage.setItem('soundMuted', muted ? '1' : '0'); } catch {}
  }, [muted]);

  const toggle = () => {
    // Déblocage AudioContext + ping son pour test
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume?.();
    if (muted) {
      // On démute : test rapide
      setMuted(false);
      setTimeout(() => play('tick'), 80);
    } else {
      setMuted(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className="text-base sm:text-lg px-2 py-1 rounded hover:bg-slate-800 transition"
      title={muted ? 'Sons coupés (clique pour activer)' : 'Sons activés (clique pour couper)'}
      aria-label="Volume"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
