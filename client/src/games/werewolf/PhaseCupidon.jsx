import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';

export default function PhaseCupidon() {
  const { gameState, room, playerId } = useGameStore();
  const role = gameState?.private?.role;
  const isCupidon = role === 'cupidon';
  const chosen = gameState?.private?.cupidonChosen;
  const aliveIds = new Set(gameState?.public?.aliveIds || []);

  const [pick, setPick] = useState([]);
  const togglePick = (id) => {
    setPick(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };
  const submit = () => {
    if (pick.length !== 2) return;
    api.gameAction('cupidonChoose', { targetIds: pick });
  };

  if (!isCupidon) {
    return <NightWaitingScreen icon="💘" title="Cupidon désigne les amoureux…" subtitle="Le village dort." />;
  }
  if (chosen) {
    return <NightWaitingScreen icon="💘" title="Tes flèches sont parties." subtitle="Le village continue de dormir." />;
  }

  const candidates = room.players.filter(p => aliveIds.has(p.id));

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-pink-300">💘 Cupidon</h2>
        <p className="text-slate-300 text-sm mt-2">Choisis 2 joueurs qui deviendront amoureux. Si l'un meurt, l'autre meurt aussi.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {candidates.map(p => {
          const sel = pick.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => togglePick(p.id)}
              className={`rounded-xl p-3 border-2 transition ${
                sel ? 'bg-pink-500/30 border-pink-400 text-white' : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-pink-400'
              }`}
            >
              {sel && '💘 '}
              {p.pseudo}{p.id === playerId && ' (toi)'}
            </button>
          );
        })}
      </div>
      <button
        onClick={submit}
        disabled={pick.length !== 2}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        Tirer mes flèches ({pick.length}/2)
      </button>
    </div>
  );
}
