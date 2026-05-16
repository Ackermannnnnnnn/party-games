import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { AnimatePresence, motion } from 'framer-motion';
import PhaseReveal from './PhaseReveal.jsx';
import PhaseDescribe from './PhaseDescribe.jsx';
import PhaseRoundEnd from './PhaseRoundEnd.jsx';
import PhaseVote from './PhaseVote.jsx';
import PhaseMrWhiteGuess from './PhaseMrWhiteGuess.jsx';
import PhaseResults from './PhaseResults.jsx';

const phaseComponents = {
  REVEAL:           PhaseReveal,
  DESCRIBE:         PhaseDescribe,
  ROUND_END:        PhaseRoundEnd,
  VOTE:             PhaseVote,
  MR_WHITE_GUESS:   PhaseMrWhiteGuess,
  RESULTS:          PhaseResults,
};

export default function ImposterGame() {
  const gameState = useGameStore((s) => s.gameState);
  const { play } = useSounds();
  const phase = gameState?.public?.phase;
  const isSpectator = !!gameState?.private?.spectator;

  useEffect(() => {
    if (phase === 'REVEAL') play('reveal');
    if (phase === 'VOTE') play('vote');
    if (phase === 'RESULTS') {
      const winner = gameState?.public?.result?.winner;
      const wasImp = gameState?.private?.wasImposter;
      const youWon = (winner === 'imposter') === !!wasImp;
      play(youWon ? 'victory' : 'defeat');
    }
  }, [phase]);

  if (!gameState) return null;

  // Vue spectateur (joueur ayant rejoint en cours)
  if (isSpectator) {
    return (
      <div className="card text-center py-10 space-y-4">
        <div className="text-5xl">👀</div>
        <h2 className="font-display text-2xl text-brand-light">Tu es spectateur</h2>
        <p className="text-slate-300">
          Une partie est déjà en cours. Tu rejoindras le jeu à la <strong>prochaine manche</strong>.
        </p>
        <p className="text-slate-400 text-sm">
          Phase actuelle : <span className="font-mono">{phase}</span>
        </p>
      </div>
    );
  }

  const Component = phaseComponents[phase];
  if (!Component) return <div className="card">Phase inconnue: {phase}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
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
