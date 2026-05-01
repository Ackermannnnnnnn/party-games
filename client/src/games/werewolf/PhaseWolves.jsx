import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';

export default function PhaseWolves() {
  const { gameState, room, playerId } = useGameStore();
  const role = gameState?.private?.role;
  // ⚠️ Le loup blanc participe AUSSI au vote nocturne des loups
  const isWolf = role === 'loup_garou' || role === 'loup_blanc';
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const allies = gameState?.private?.wolfAllies || [];
  const wolfTeam = new Set([playerId, ...allies]);
  const myVote = gameState?.private?.myWolfVote;
  const wolfVotedIds = gameState?.public?.wolfVotedIds || [];

  if (!isWolf) {
    return <NightWaitingScreen icon="🐺" title="Les loups-garous se réveillent…" subtitle="Le village dort. Silence." />;
  }

  const candidates = room.players.filter(p => aliveIds.has(p.id) && !wolfTeam.has(p.id));

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-rose-300">🐺 Choisissez votre victime</h2>
        <p className="text-slate-300 text-sm mt-2">
          Votez ensemble. {wolfVotedIds.length}/{wolfTeam.size} loup{wolfTeam.size>1?'s ont':' a'} déjà voté.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {candidates.map(p => (
          <button
            key={p.id}
            onClick={() => api.gameAction('wolfVote', { targetId: p.id })}
            className={`rounded-xl p-3 border-2 transition ${
              myVote === p.id
                ? 'bg-rose-500/30 border-rose-400 text-white'
                : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-rose-400'
            }`}
          >
            {myVote === p.id && '🎯 '}{p.pseudo}
          </button>
        ))}
      </div>
      {/* Liste des autres loups */}
      {allies.length > 0 && (
        <div className="text-center text-sm text-rose-300/80">
          Tes complices : {allies.map(id => room.players.find(p => p.id === id)?.pseudo).filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  );
}
