import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';

export default function PhaseVote() {
  const { gameState, room, playerId } = useGameStore();
  const descriptions = gameState?.public?.descriptions || {};
  const eliminated = new Set(gameState?.public?.eliminatedIds || []);
  const votedIds = new Set(gameState?.public?.votedIds || []);
  const iVoted = votedIds.has(playerId);
  const iAmAlive = !eliminated.has(playerId);

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-brand-light">🗳️ Vote</h2>
        {gameState?.public?.voteEndsAt && (
          <Timer endsAt={gameState.public.voteEndsAt} />
        )}
      </div>

      <p className="text-slate-300">Qui pensez-vous est l'imposteur ?</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {room.players.map((p) => {
          const isMe  = p.id === playerId;
          const isOut = eliminated.has(p.id);
          const words = descriptions[p.id] || [];
          const disabled = !iAmAlive || iVoted || isMe || isOut;
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => api.gameAction('castVote', { targetId: p.id })}
              className={`text-left rounded-xl p-4 border transition-all ${
                disabled
                  ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-700 hover:border-brand hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.pseudo}{isMe && ' (toi)'}</span>
                {votedIds.has(p.id) && <span className="text-xs text-slate-400">a voté</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {words.length === 0
                  ? <span className="text-sm italic text-slate-500">aucun mot</span>
                  : words.map((w, i) => (
                      <span key={i} className="text-xs bg-slate-800 px-2 py-0.5 rounded">
                        {w}
                      </span>
                    ))
                }
              </div>
            </button>
          );
        })}
      </div>

      {iVoted && <p className="text-center text-emerald-300">Vote enregistré ✓</p>}
      {!iAmAlive && <p className="text-center text-slate-400 italic">Tu observes.</p>}
    </div>
  );
}
