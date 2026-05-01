import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';

export default function PhaseHunter() {
  const { gameState, room, playerId } = useGameStore();
  const hunterId = gameState?.public?.hunterId;
  const isMe = hunterId === playerId;
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const hunter = room.players.find(p => p.id === hunterId);
  const [target, setTarget] = useState(null);

  const shoot = () => {
    if (!target) return;
    api.gameAction('hunterShoot', { targetId: target });
  };

  if (!isMe) {
    return (
      <div className="card text-center py-12 space-y-4">
        <div className="text-7xl">🏹</div>
        <h2 className="font-display text-2xl text-amber-300">{hunter?.pseudo || 'Le chasseur'} prépare son arme…</h2>
        <p className="text-slate-400 text-sm">Il va emporter quelqu'un avec lui.</p>
      </div>
    );
  }

  const candidates = room.players.filter(p => aliveIds.has(p.id) && p.id !== playerId);

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <div className="text-6xl mb-2">🏹</div>
        <h2 className="font-display text-2xl sm:text-3xl text-amber-300">Tu es mort, chasseur !</h2>
        <p className="text-slate-300 text-sm mt-2">Choisis qui tu veux emporter avec toi dans la mort.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {candidates.map(p => (
          <button
            key={p.id}
            onClick={() => setTarget(p.id)}
            className={`rounded-xl p-3 border-2 ${target === p.id ? 'bg-amber-500/30 border-amber-400 text-white' : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-amber-400'}`}
          >
            {target === p.id && '🎯 '}{p.pseudo}
          </button>
        ))}
      </div>
      <button onClick={shoot} disabled={!target} className="btn btn-primary w-full disabled:opacity-50">
        💥 Tirer !
      </button>
    </div>
  );
}
