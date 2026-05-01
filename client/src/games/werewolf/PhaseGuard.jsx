import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';

export default function PhaseGuard() {
  const { gameState, room, playerId } = useGameStore();
  const role = gameState?.private?.role;
  const isGuard = role === 'garde';
  const lastTarget = gameState?.private?.guardLastTarget;
  const aliveIds = new Set(gameState?.public?.aliveIds || []);

  if (!isGuard) {
    return <NightWaitingScreen icon="🛡️" title="Le Garde monte la garde…" subtitle="Le village dort." />;
  }

  const candidates = room.players.filter(p => aliveIds.has(p.id));

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-sky-300">🛡️ Garde</h2>
        <p className="text-slate-300 text-sm mt-2">Choisis qui tu protèges des loups cette nuit.</p>
        {lastTarget && (
          <p className="text-amber-300 text-xs mt-1">
            (Tu ne peux pas re-protéger {room.players.find(p => p.id === lastTarget)?.pseudo} cette nuit.)
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {candidates.map(p => {
          const isLast = p.id === lastTarget;
          return (
            <button
              key={p.id}
              disabled={isLast}
              onClick={() => api.gameAction('guardProtect', { targetId: p.id })}
              className={`rounded-xl p-3 border-2 transition ${
                isLast ? 'bg-slate-800/40 border-slate-700 text-slate-500 line-through cursor-not-allowed'
                       : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-sky-400'
              }`}
            >
              {p.pseudo}{p.id === playerId && ' (toi)'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
