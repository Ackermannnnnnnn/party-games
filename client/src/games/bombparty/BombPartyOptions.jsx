import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = { lives: 2, difficulty: 'normal', fuse: 'normal' };

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-slate-400 tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ReadOnly({ value }) {
  return <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{value}</span>;
}

const selectCls = 'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand';

/** Options de BombParty, synchronisées en temps réel entre l'hôte et les joueurs. */
export default function BombPartyOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('bombparty', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => {
      if (gameId === 'bombparty' && m) setManifest(m);
    };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'bombparty' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;
  const update = (key, value) => setOpts((o) => ({ ...o, [key]: value }));
  const label = (list, id) => list.find((x) => x.id === id)?.label || id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Field label={`Vies au départ : ${opts.lives}`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.lives.min}
              max={manifest.limits.lives.max}
              value={opts.lives}
              onChange={(e) => update('lives', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={'❤️'.repeat(opts.lives)} />}
        </Field>
        <Field label="Difficulté des syllabes">
          {isHost ? (
            <select value={opts.difficulty} onChange={(e) => update('difficulty', e.target.value)} className={selectCls}>
              {manifest.difficulties.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          ) : <ReadOnly value={label(manifest.difficulties, opts.difficulty)} />}
        </Field>
        <Field label="Mèche de la bombe">
          {isHost ? (
            <select value={opts.fuse} onChange={(e) => update('fuse', e.target.value)} className={selectCls}>
              {manifest.fuses.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          ) : <ReadOnly value={label(manifest.fuses, opts.fuse)} />}
        </Field>
      </div>

      <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
        La bombe passe de joueur en joueur : tape vite un mot qui contient la syllabe affichée
        (ex. <strong>AIL</strong> → travail). Si elle explose entre tes mains, tu perds une vie.
        Utilise toutes les lettres de A à V pour regagner une vie. Dictionnaire de plus de 500 000 mots,
        accents et tirets facultatifs.
      </p>

      {isHost && (
        <button
          onClick={() => onStart(opts)}
          disabled={playerCount < 2}
          className="btn btn-primary w-full text-lg disabled:opacity-50"
        >
          💣 Lancer la partie
        </button>
      )}
    </div>
  );
}
