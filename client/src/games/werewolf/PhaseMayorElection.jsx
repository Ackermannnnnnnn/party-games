import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';

export default function PhaseMayorElection() {
  const { gameState, room, playerId } = useGameStore();
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const votedIds = new Set(gameState?.public?.mayorVotedIds || []);
  const iVoted = votedIds.has(playerId);

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} className="text-6xl mb-2">👑</motion.div>
        <h2 className="font-display text-2xl sm:text-3xl text-amber-300">Élection du Maire</h2>
        <p className="text-slate-300 text-sm mt-2">Vote pour celui qui devra mener le village. Son vote comptera double pour les lynchages.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {room.players.filter(p => aliveIds.has(p.id)).map(p => {
          const isMe = p.id === playerId;
          const disabled = iVoted;
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => api.gameAction('mayorVote', { targetId: p.id })}
              className={`rounded-xl p-3 border-2 transition ${
                disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/40 border-slate-700' :
                'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-amber-400'
              }`}
            >
              {p.pseudo}{isMe && ' (toi)'}
            </button>
          );
        })}
      </div>
      {iVoted && <p className="text-center text-emerald-300 text-sm">✓ Ton vote est enregistré.</p>}
      <div className="text-center text-xs text-slate-400">
        {votedIds.size}/{aliveIds.size} ont voté
      </div>
    </div>
  );
}
