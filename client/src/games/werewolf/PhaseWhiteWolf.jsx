import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';

export default function PhaseWhiteWolf() {
  const { gameState, room, playerId } = useGameStore();
  const role = gameState?.private?.role;
  const isWhiteWolf = role === 'loup_blanc';
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const allies = gameState?.private?.wolfAllies || [];

  if (!isWhiteWolf) {
    return <NightWaitingScreen icon="🐺‍❄️" title="Le Loup Blanc rôde…" subtitle="Le village dort." />;
  }

  // Cibles possibles : les autres loups vivants
  const candidates = room.players.filter(p => aliveIds.has(p.id) && allies.includes(p.id));

  const kill = (id) => api.gameAction('whiteWolfKill', { targetId: id });
  const pass = () => api.gameAction('whiteWolfKill', { targetId: null });

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <div className="text-6xl mb-2">🐺‍❄️</div>
        <h2 className="font-display text-2xl sm:text-3xl text-slate-100">Loup Blanc</h2>
        <p className="text-slate-300 text-sm mt-2">
          Cette nuit (paire), tu peux dévorer un loup-garou. Souviens-toi : tu gagnes seul si tu es le dernier.
        </p>
      </div>
      {candidates.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {candidates.map(p => (
            <button
              key={p.id}
              onClick={() => kill(p.id)}
              className="rounded-xl p-3 border-2 bg-slate-900/40 border-rose-700 text-rose-200 hover:bg-rose-900/30 hover:border-rose-400 transition"
            >
              🩸 {p.pseudo}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-center text-sm italic">Aucun loup à dévorer cette nuit.</p>
      )}
      <button onClick={pass} className="btn btn-ghost w-full">
        ⏭ Ne tuer personne cette nuit
      </button>
    </div>
  );
}
