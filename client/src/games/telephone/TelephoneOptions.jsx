import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = { writeSec: 60, drawSec: 90, guessSec: 45, turns: 0 };

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

/** Options de Gartic Phone, synchronisées en temps réel entre l'hôte et les joueurs. */
export default function TelephoneOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('telephone', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => {
      if (gameId === 'telephone' && m) setManifest(m);
    };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'telephone' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;

  const { limits } = manifest;
  const update = (key, value) => setOpts((o) => ({ ...o, [key]: value }));

  // Jamais plus d'étapes que de joueurs (sinon quelqu'un reverrait un album)
  const maxTurns = Math.max(limits.turns.min, Math.min(limits.turns.max, playerCount));
  const steps = opts.turns > 0 ? Math.min(opts.turns, Math.max(playerCount, 3)) : Math.max(playerCount, 3);
  const draws = Math.floor(steps / 2);
  const guesses = Math.max(0, steps - 1 - draws);
  const maxMinutes = Math.ceil((opts.writeSec + draws * opts.drawSec + guesses * opts.guessSec) / 60);
  const turnChoices = [];
  for (let n = limits.turns.min; n <= maxTurns; n++) turnChoices.push(n);

  const slider = (key, step) => (
    <input
      type="range"
      min={limits[key].min}
      max={limits[key].max}
      step={step}
      value={opts[key]}
      onChange={(e) => update(key, parseInt(e.target.value, 10))}
      className="accent-brand"
    />
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label={`Temps pour dessiner : ${opts.drawSec}s`}>
          {isHost ? slider('drawSec', 10) : <ReadOnly value={`${opts.drawSec}s`} />}
        </Field>
        <Field label={`Temps pour deviner : ${opts.guessSec}s`}>
          {isHost ? slider('guessSec', 5) : <ReadOnly value={`${opts.guessSec}s`} />}
        </Field>
        <Field label={`Temps pour la phrase de départ : ${opts.writeSec}s`}>
          {isHost ? slider('writeSec', 10) : <ReadOnly value={`${opts.writeSec}s`} />}
        </Field>
        <Field label="Nombre d'étapes">
          {isHost ? (
            <select
              value={opts.turns}
              onChange={(e) => update('turns', parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand"
            >
              <option value={0}>Automatique (une par joueur)</option>
              {turnChoices.map((n) => <option key={n} value={n}>{n} étapes</option>)}
            </select>
          ) : (
            <ReadOnly value={opts.turns > 0 ? `${opts.turns} étapes` : 'Automatique (une par joueur)'} />
          )}
        </Field>
      </div>

      <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
        Chacun écrit une phrase, puis les albums tournent : on dessine la phrase reçue, on décrit le dessin reçu, et ainsi de suite.
        À la fin, on découvre ensemble comment chaque phrase a déraillé.
        {playerCount >= 3 && <> Avec {playerCount} joueurs : {steps} étapes, environ {maxMinutes} min au maximum.</>}
      </p>

      {isHost && (
        <button
          onClick={() => onStart(opts)}
          disabled={playerCount < 3}
          className="btn btn-primary w-full text-lg disabled:opacity-50"
        >
          🎨 Lancer la partie
        </button>
      )}
    </div>
  );
}
