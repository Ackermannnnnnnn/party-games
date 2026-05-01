import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';

export default function PhaseRoundEnd() {
  const { gameState, room, playerId } = useGameStore();
  const isHost = playerId === room.hostId;

  const speakingRound = gameState?.public?.speakingRound || 1;
  const descriptions  = gameState?.public?.descriptions || {};
  const speakingOrder = gameState?.public?.speakingOrder || [];
  const eliminated    = new Set(gameState?.public?.eliminatedIds || []);
  const word          = gameState?.private?.word;

  return (
    <div className="card space-y-5">
      <div className="text-center">
        <h2 className="font-display text-2xl text-brand-light">
          Fin du tour de parole #{speakingRound}
        </h2>
        <p className="text-slate-400 text-sm mt-1">Ton mot : <span className="font-mono text-brand-light">{word}</span></p>
      </div>

      {/* Récap complet */}
      <div>
        <h3 className="font-semibold mb-2">Tout ce qui a été dit</h3>
        <ul className="space-y-1.5">
          {speakingOrder.map((pid) => {
            const p = room.players.find(x => x.id === pid);
            if (!p) return null;
            const words = descriptions[pid] || [];
            const out = eliminated.has(pid);
            return (
              <li
                key={pid}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 bg-slate-900/40 ${out ? 'opacity-40 line-through' : ''}`}
              >
                <span className="w-32 truncate font-medium">{p.pseudo}</span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {words.map((w, i) => (
                    <span key={i} className="bg-slate-800 px-2 py-0.5 rounded text-sm">
                      {i + 1}. {w}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Actions hôte */}
      {isHost ? (
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <p className="text-center text-slate-300">Que fait-on maintenant ?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              className="btn btn-ghost"
              onClick={() => api.gameAction('nextSpeakingRound', {})}
            >
              🔁 Encore un tour de mots
            </button>
            <button
              className="btn btn-primary"
              onClick={() => api.gameAction('startVote', {})}
            >
              🗳️ Passer au vote
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-slate-400 italic border-t border-slate-700 pt-4">
          En attente que l'hôte choisisse…
        </p>
      )}
    </div>
  );
}
