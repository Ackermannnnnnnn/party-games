import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';

const ROLE_INFO = {
  villageois:  { icon: '🧑‍🌾', label: 'Villageois' },
  loup_garou:  { icon: '🐺',   label: 'Loup-Garou' },
  loup_blanc:  { icon: '🐺‍❄️', label: 'Loup Blanc' },
  voyante:     { icon: '🔮',   label: 'Voyante' },
  sorciere:    { icon: '🧙‍♀️', label: 'Sorcière' },
  chasseur:    { icon: '🏹',   label: 'Chasseur' },
  cupidon:     { icon: '💘',   label: 'Cupidon' },
  garde:       { icon: '🛡️',   label: 'Garde' },
};

export default function PhaseGameOver() {
  const { gameState, room, playerId } = useGameStore();
  const isHost = playerId === room.hostId;
  const result = gameState?.public?.result;
  const reveal = gameState?.public?.reveal || {};
  const winners = new Set(result?.winners || []);
  const winner = result?.winner;
  const mayorId = gameState?.public?.mayorId;

  return (
    <div className="card text-center py-8 sm:py-12 space-y-6">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.8 }}
        className="text-6xl sm:text-7xl"
      >
        {winner === 'village' ? '🎉' : winner === 'white_wolf' ? '🐺‍❄️' : '🐺'}
      </motion.div>
      <h2 className="font-display text-3xl sm:text-4xl">
        {winner === 'village'    && <span className="text-emerald-300">Le village a gagné !</span>}
        {winner === 'wolves'     && <span className="text-rose-300">Les loups ont gagné !</span>}
        {winner === 'white_wolf' && <span className="text-slate-100">Le Loup Blanc gagne SEUL !</span>}
      </h2>

      {/* Reveal de tous les rôles */}
      <div className="border-t border-slate-700 pt-4 max-w-md mx-auto">
        <h3 className="font-semibold text-slate-300 mb-3 text-sm">Rôles révélés</h3>
        <ul className="space-y-1">
          {room.players.map(p => {
            const role = reveal[p.id];
            const info = ROLE_INFO[role];
            const won = winners.has(p.id);
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  won ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-slate-900/40'
                }`}
              >
                <span className={`font-medium ${p.id === playerId ? 'text-brand-light' : ''}`}>
                  {p.id === mayorId && '👑 '}
                  {p.pseudo}{p.id === playerId && ' (toi)'}
                  {won && <span className="ml-2 text-xs text-emerald-300">🏆 vainqueur</span>}
                </span>
                <span>
                  {info?.icon} {info?.label || role}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {isHost ? (
        <button onClick={() => api.gameAction('endGame', {})} className="btn btn-primary">
          🔄 Retour au lobby (mêmes joueurs)
        </button>
      ) : (
        <p className="text-slate-400 italic text-sm">En attente de l'hôte…</p>
      )}
    </div>
  );
}
