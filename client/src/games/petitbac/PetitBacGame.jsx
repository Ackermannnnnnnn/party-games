import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { AnimatePresence, motion } from 'framer-motion';
import PhaseRoundIntro from './PhaseRoundIntro.jsx';
import PhaseWriting from './PhaseWriting.jsx';
import PhaseValidating from './PhaseValidating.jsx';
import PhaseScoring from './PhaseScoring.jsx';
import PhasePodium from './PhasePodium.jsx';

const phaseComponents = {
  ROUND_INTRO: PhaseRoundIntro,
  WRITING:     PhaseWriting,
  VALIDATING:  PhaseValidating,
  SCORING:     PhaseScoring,
  PODIUM:      PhasePodium,
};

export default function PetitBacGame() {
  const gameState = useGameStore((s) => s.gameState);
  const { play } = useSounds();
  const phase = gameState?.public?.phase;
  const isSpectator = !!gameState?.private?.spectator;

  useEffect(() => {
    if (phase === 'ROUND_INTRO') play('reveal');
    if (phase === 'PODIUM') play('victory');
  }, [phase]);

  if (!gameState) return null;

  if (isSpectator) {
    return (
      <div className="card text-center py-10 space-y-4">
        <div className="text-5xl">👀</div>
        <h2 className="font-display text-2xl text-brand-light">Tu es spectateur</h2>
        <p className="text-slate-300">
          Une partie est en cours. Tu pourras jouer dès la prochaine partie complète.
        </p>
      </div>
    );
  }

  const Component = phaseComponents[phase];
  if (!Component) return <div className="card">Phase inconnue: {phase}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase + (gameState.public?.round ?? '')}
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
