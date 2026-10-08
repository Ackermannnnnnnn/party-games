import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { playTurnChime } from '../../hooks/useSounds.js';
import PhaseText from './PhaseText.jsx';
import PhaseDraw from './PhaseDraw.jsx';
import PhaseAlbum from './PhaseAlbum.jsx';

const phaseComponents = {
  WRITE: PhaseText,
  DRAW:  PhaseDraw,
  GUESS: PhaseText,
  ALBUM: PhaseAlbum,
};

export default function TelephoneGame() {
  const gameState = useGameStore((s) => s.gameState);
  const phase = gameState?.public?.phase;
  const step = gameState?.public?.step;
  const gameKey = gameState?.public?.gameKey;
  const isSpectator = !!gameState?.private?.spectator;

  // Petit signal sonore à chaque nouvelle étape (on attend souvent les autres sans regarder l'écran)
  useEffect(() => {
    if (!phase || isSpectator) return;
    playTurnChime();
    try { navigator.vibrate?.(120); } catch {}
  }, [phase, step]);

  // Nouvelle partie : on oublie les brouillons des parties précédentes
  useEffect(() => {
    if (!gameKey) return;
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('tel:') && !k.startsWith(`tel:${gameKey}:`))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }, [gameKey]);

  if (!gameState) return null;

  // Arrivé en cours de partie : on ne joue pas les étapes, mais on regarde l'album avec les autres
  if (isSpectator && phase !== 'ALBUM') {
    return (
      <div className="card text-center py-10 space-y-4">
        <div className="text-5xl">👀</div>
        <h2 className="font-display text-2xl text-brand-light">Tu es spectateur</h2>
        <p className="text-slate-300">
          Une partie est en cours (étape {step + 1} / {gameState.public.totalSteps}).
          Tu verras l'album à la fin et tu joueras à la <strong>prochaine partie</strong>.
        </p>
      </div>
    );
  }

  const Component = phaseComponents[phase];
  if (!Component) return <div className="card">Phase inconnue: {phase}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        // Une clé par étape : chaque étape repart d'un écran neuf (champ vide, toile blanche)
        key={phase === 'ALBUM' ? 'ALBUM' : `${gameKey}-${step}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.25 }}
      >
        <Component />
      </motion.div>
    </AnimatePresence>
  );
}
