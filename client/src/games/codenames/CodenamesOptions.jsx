import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = { turnSec: 0 };

/** Options de Codenames, synchronisées en temps réel entre l'hôte et les joueurs. */
export default function CodenamesOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('codenames', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => { if (gameId === 'codenames' && m) setManifest(m); };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'codenames' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;
  const label = manifest.timers.find((t) => t.id === opts.turnSec)?.label;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 max-w-xs">
        <label className="text-xs uppercase text-slate-400 tracking-wide">Temps pour chaque étape</label>
        {isHost ? (
          <select value={opts.turnSec} onChange={(e) => setOpts((o) => ({ ...o, turnSec: parseInt(e.target.value, 10) }))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand">
            {manifest.timers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        ) : <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{label}</span>}
      </div>
      <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
        Deux équipes, 25 cartes. Le maître-espion de chaque équipe voit quelles cartes sont les siennes et fait deviner
        ses agents avec un seul mot et un nombre. Les équipes se forment juste après le lancement. Il faut au moins 4 joueurs.
      </p>
      {isHost && (
        <button onClick={() => onStart(opts)} disabled={playerCount < 4} className="btn btn-token w-full text-lg disabled:opacity-40">
          🕵️ Lancer la partie
        </button>
      )}
    </div>
  );
}
