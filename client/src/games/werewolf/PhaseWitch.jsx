import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';

export default function PhaseWitch() {
  const { gameState, room, playerId } = useGameStore();
  const role = gameState?.private?.role;
  const isWitch = role === 'sorciere';
  const target = gameState?.private?.witchTarget;
  const healAvailable = gameState?.private?.healAvailable;
  const killAvailable = gameState?.private?.killAvailable;
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const [killTarget, setKillTarget] = useState(null);
  const [mode, setMode] = useState(null); // 'heal' | 'kill' | null

  if (!isWitch) {
    return <NightWaitingScreen icon="🧙‍♀️" title="La Sorcière prépare ses potions…" subtitle="Le village dort." />;
  }

  const victim = target ? room.players.find(p => p.id === target) : null;
  const candidates = room.players.filter(p => aliveIds.has(p.id) && p.id !== playerId);

  const heal = () => api.gameAction('witchAction', { action: 'heal' });
  const pass = () => api.gameAction('witchAction', { action: 'pass' });
  const kill = () => {
    if (!killTarget) return;
    api.gameAction('witchAction', { action: 'kill', targetId: killTarget });
  };

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-fuchsia-300">🧙‍♀️ Sorcière</h2>
        {victim ? (
          <p className="text-slate-300 text-sm mt-2">
            Cette nuit, les loups ont attaqué <strong className="text-rose-300">{victim.pseudo}</strong>.
          </p>
        ) : (
          <p className="text-slate-300 text-sm mt-2">Aucune victime à sauver cette nuit.</p>
        )}
      </div>

      {!mode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {victim && healAvailable && (
            <button onClick={heal} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-4 font-semibold">
              💚 Sauver {victim.pseudo}<br/>
              <span className="text-xs opacity-80">(potion de soin)</span>
            </button>
          )}
          {killAvailable && (
            <button onClick={() => setMode('kill')} className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl p-4 font-semibold">
              🧪 Tuer un joueur<br/>
              <span className="text-xs opacity-80">(potion de mort)</span>
            </button>
          )}
          <button onClick={pass} className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl p-4 font-semibold">
            ⏭ Ne rien faire<br/>
            <span className="text-xs opacity-80">(garde tes potions)</span>
          </button>
        </div>
      )}

      {mode === 'kill' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300 text-center">Choisis qui tuer :</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {candidates.map(p => (
              <button
                key={p.id}
                onClick={() => setKillTarget(p.id)}
                className={`rounded-xl p-3 border-2 ${killTarget === p.id ? 'bg-rose-500/30 border-rose-400 text-white' : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-rose-400'}`}
              >
                {p.pseudo}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="btn btn-ghost flex-1">Annuler</button>
            <button onClick={kill} disabled={!killTarget} className="btn btn-primary flex-1 disabled:opacity-50">Confirmer</button>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-slate-500">
        Potions restantes : 💚 soin {healAvailable ? '✓' : '✗'} · 🧪 mort {killAvailable ? '✓' : '✗'}
      </div>
    </div>
  );
}
