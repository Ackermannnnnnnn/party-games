import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { motion } from 'framer-motion';

const ALPHABET = 'ABCDEFGHIJLMNOPRSTUV'.split('');

/**
 * Animation : la lettre tourne rapidement pendant 3s puis se fixe sur la bonne.
 */
export default function PhaseRoundIntro() {
  const { gameState } = useGameStore();
  const p = gameState?.public || {};
  const finalLetter = p.currentLetter;
  const [displayLetter, setDisplayLetter] = useState(ALPHABET[0]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    }, 80);
    // Stop apres 3s : fixe la vraie lettre
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setDisplayLetter(finalLetter);
    }, 3000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [finalLetter]);

  const isFixed = displayLetter === finalLetter;

  return (
    <div className="card text-center py-12 sm:py-16 space-y-4">
      <p className="text-slate-400 text-sm">
        Manche {p.round} / {p.totalRounds}
      </p>
      <h2 className="font-display text-2xl text-brand-light">La lettre est…</h2>

      <motion.div
        animate={isFixed ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.8 }}
        className={`mx-auto inline-flex items-center justify-center w-32 h-32 sm:w-48 sm:h-48 rounded-3xl shadow-2xl ${
          isFixed ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300'
        }`}
      >
        <span className="font-display text-7xl sm:text-9xl">{displayLetter}</span>
      </motion.div>

      <p className="text-slate-400 text-sm pt-4">
        {isFixed ? '🚀 Préparez-vous !' : 'Tirage en cours…'}
      </p>
    </div>
  );
}
