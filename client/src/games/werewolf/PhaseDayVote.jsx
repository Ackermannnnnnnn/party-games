import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';

export default function PhaseDayVote() {
  const { gameState, room, playerId } = useGameStore();
  const day = gameState?.public?.day;
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const votedIds = new Set(gameState?.public?.votedIds || []);
  const iAmAlive = aliveIds.has(playerId);
  const iVoted = votedIds.has(playerId);
  const voteEndsAt = gameState?.public?.voteEndsAt;
  const mayorId = gameState?.public?.mayorId;

  return (
    <div className="card space-y-4 py-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs sm:text-sm text-slate-400">Jour {day}</p>
          <h2 className="font-display text-2xl sm:text-3xl text-amber-200">⚖️ Vote du village</h2>
        </div>
        {voteEndsAt && <Timer endsAt={voteEndsAt} />}
      </div>
      <p className="text-slate-300 text-sm text-center">
        Qui le village veut-il lyncher aujourd'hui ?
        {mayorId && playerId === mayorId && (
          <span className="block text-xs text-amber-300 mt-1">👑 Tu es le maire — ton vote compte double.</span>
        )}
        {mayorId && playerId !== mayorId && (
          <span className="block text-xs text-amber-300/70 mt-1">
            👑 Le vote du maire ({room.players.find(p => p.id === mayorId)?.pseudo}) compte double.
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {room.players.map(p => {
          const isAlive = aliveIds.has(p.id);
          const isMe = p.id === playerId;
          const disabled = !iAmAlive || iVoted || isMe || !isAlive;
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => api.gameAction('dayVote', { targetId: p.id })}
              className={`rounded-xl p-3 border-2 transition ${
                !isAlive ? 'bg-slate-800/30 border-slate-800 text-slate-600 line-through' :
                disabled ? 'bg-slate-900/40 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed' :
                'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-amber-400'
              }`}
            >
              {!isAlive && '💀 '}
              {p.id === mayorId && '👑 '}
              {p.pseudo}{isMe && ' (toi)'}
              {votedIds.has(p.id) && <span className="block text-xs mt-1 text-emerald-300">a voté</span>}
            </button>
          );
        })}
      </div>

      {iVoted && <p className="text-center text-emerald-300 text-sm">✓ Vote enregistré.</p>}
      {!iAmAlive && <p className="text-center text-slate-400 italic text-sm">Tu observes (mort).</p>}
    </div>
  );
}
