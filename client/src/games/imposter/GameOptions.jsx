import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = {
  theme: 'random',
  imposterCount: 1,
  imposterKnows: true,
  voteDurationSec: 45,
  turnDurationSec: 0,
};

/**
 * Panneau d'options du jeu de l'imposteur.
 * Synchronisé en temps réel entre l'hôte et tous les joueurs.
 */
export default function GameOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('imposter', DEFAULT_OPTS);

  // Charger le manifest des thèmes
  useEffect(() => {
    const onOptions = ({ gameId, manifest }) => {
      if (gameId !== 'imposter' || !manifest) return;
      setManifest(manifest);
      // Pas d'écrasement de opts ici : useGameOptions a déjà la bonne valeur
    };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'imposter' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) {
    return <p className="text-slate-400 text-sm">Chargement des options…</p>;
  }

  const maxImposterCap = Math.max(1, playerCount - 2);
  const maxImposter = Math.min(manifest.limits.imposterCount.max, maxImposterCap);

  const update = (key, value) => setOpts(o => ({ ...o, [key]: value }));

  // Si pas hôte : juste affichage
  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-slate-400 tracking-wide">{label}</label>
      {children}
    </div>
  );

  const ReadOnly = ({ value }) => (
    <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{value}</span>
  );

  const themeLabel = manifest.themes.find(t => t.id === opts.theme)?.label || opts.theme;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Thème */}
        <Field label="Thème des mots">
          {isHost ? (
            <select
              value={opts.theme}
              onChange={(e) => update('theme', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand"
            >
              {manifest.themes.map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.pairCount} paires)</option>
              ))}
            </select>
          ) : <ReadOnly value={themeLabel} />}
        </Field>

        {/* Nb d'imposteurs */}
        <Field label={`Nombre d'imposteurs (max ${maxImposter})`}>
          {isHost ? (
            <input
              type="number"
              min={manifest.limits.imposterCount.min}
              max={maxImposter}
              value={opts.imposterCount}
              onChange={(e) => update('imposterCount', Math.max(1, Math.min(maxImposter, parseInt(e.target.value, 10) || 1)))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand"
            />
          ) : <ReadOnly value={opts.imposterCount} />}
        </Field>

        {/* Vote durée */}
        <Field label={`Temps de vote : ${opts.voteDurationSec}s`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.voteDurationSec.min}
              max={manifest.limits.voteDurationSec.max}
              step={5}
              value={opts.voteDurationSec}
              onChange={(e) => update('voteDurationSec', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={`${opts.voteDurationSec}s`} />}
        </Field>

        {/* Tour durée */}
        <Field label={`Temps par tour : ${opts.turnDurationSec === 0 ? 'illimité' : opts.turnDurationSec + 's'}`}>
          {isHost ? (
            <input
              type="range"
              min={0}
              max={manifest.limits.turnDurationSec.max}
              step={5}
              value={opts.turnDurationSec}
              onChange={(e) => update('turnDurationSec', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={opts.turnDurationSec === 0 ? 'illimité' : `${opts.turnDurationSec}s`} />}
        </Field>
      </div>

      {/* Imposter sait */}
      <label className={`flex items-center gap-3 select-none ${isHost ? 'cursor-pointer' : ''} bg-slate-900/40 px-3 py-2 rounded-lg`}>
        <input
          type="checkbox"
          disabled={!isHost}
          checked={opts.imposterKnows}
          onChange={(e) => update('imposterKnows', e.target.checked)}
          className="accent-brand w-4 h-4"
        />
        <div>
          <p className="font-medium">L'imposteur sait qu'il est l'imposteur</p>
          <p className="text-xs text-slate-400">
            Décoche pour le mode "hardcore" : l'imposteur ne sait pas, il doit s'en rendre compte tout seul.
          </p>
        </div>
      </label>

      {isHost && (
        <button
          onClick={() => onStart(opts)}
          disabled={playerCount < 3}
          className="btn btn-primary w-full text-lg disabled:opacity-50"
        >
          🎭 Lancer la partie
        </button>
      )}
    </div>
  );
}
