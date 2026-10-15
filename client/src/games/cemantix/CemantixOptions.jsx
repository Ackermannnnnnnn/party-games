import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = { mode: 'course', durationMin: 0 };
const selectCls = 'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand';

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-slate-400 tracking-wide">{label}</label>
      {children}
    </div>
  );
}

/** Options de Cémantix, synchronisées en temps réel entre l'hôte et les joueurs. */
export default function CemantixOptions({ onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('cemantix', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => { if (gameId === 'cemantix' && m) setManifest(m); };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'cemantix' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;
  const update = (key, value) => setOpts((o) => ({ ...o, [key]: value }));
  const label = (list, id) => list.find((x) => x.id === id)?.label || id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Mode">
          {isHost ? (
            <select value={opts.mode} onChange={(e) => update('mode', e.target.value)} className={selectCls}>
              {manifest.modes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          ) : <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{label(manifest.modes, opts.mode)}</span>}
        </Field>
        <Field label="Durée">
          {isHost ? (
            <select value={opts.durationMin} onChange={(e) => update('durationMin', parseInt(e.target.value, 10))} className={selectCls}>
              {manifest.durations.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          ) : <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{label(manifest.durations, opts.durationMin)}</span>}
        </Field>
      </div>
      <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
        Trouve le mot secret en proposant des mots. Chaque mot reçoit une température : plus son sens est proche
        du mot secret, plus il fait chaud 🔥. Dans les 1000 mots les plus proches, une jauge en ‰ indique si tu brûles.
        Jouable seul ou à plusieurs.
      </p>
      {isHost && (
        <button onClick={() => onStart(opts)} className="btn btn-primary w-full text-lg">🌡️ Lancer la partie</button>
      )}
    </div>
  );
}
