import { useGameStore } from '../../store/gameStore.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';
import { motion } from 'framer-motion';

export default function PhaseLovers() {
  const { gameState, room, playerId } = useGameStore();
  const partnerId = gameState?.private?.loverPartnerId;

  if (!partnerId) {
    return <NightWaitingScreen icon="💘" title="Les amoureux se découvrent…" subtitle="Le village dort." />;
  }
  const partner = room.players.find(p => p.id === partnerId);

  return (
    <div className="card text-center py-12 space-y-4">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.8 }}
        className="text-7xl"
      >
        💘
      </motion.div>
      <h2 className="font-display text-2xl text-pink-300">Tu es amoureux de…</h2>
      <p className="font-display text-3xl sm:text-4xl text-white">{partner?.pseudo || '?'}</p>
      <p className="text-slate-400 text-sm">Si l'un meurt, l'autre meurt aussi de chagrin.</p>
    </div>
  );
}
