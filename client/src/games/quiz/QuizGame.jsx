import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { AnimatePresence, motion } from 'framer-motion';
import PhaseQuestion from './PhaseQuestion.jsx';
import PhasePodium from './PhasePodium.jsx';

const phaseComponents = {
  QUESTION: PhaseQuestion,
  PODIUM:   PhasePodium,
};

export default function QuizGame() {
  const gameState = useGameStore((s) => s.gameState);
  const { play } = useSounds();
  const phase = gameState?.public?.phase;

  useEffect(() => {
    if (phase === 'PODIUM') play('victory');
  }, [phase]);

  if (!gameState) return null;
  const Component = phaseComponents[phase];
  if (!Component) return <div className="card">Phase inconnue: {phase}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase + (gameState.public?.currentIdx ?? '')}
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
