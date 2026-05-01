import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';
import RolesGuide from './RolesGuide.jsx';

const DEFAULT_OPTS = {
  werewolfCount: 1,
  enabledRoles: ['voyante', 'sorciere', 'chasseur', 'garde'],
  enableMayor: true,
  dayVoteDurationSec: 60,
};

export default function WerewolfOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('werewolf', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest }) => {
      if (gameId !== 'werewolf' || !manifest) return;
      setManifest(manifest);
    };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'werewolf' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement…</p>;

  const update = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const toggleRole = (id) => {
    if (!isHost) return;
    setOpts(o => {
      const set = new Set(o.enabledRoles);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...o, enabledRoles: [...set] };
    });
  };

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-slate-400 tracking-wide">{label}</label>
      {children}
    </div>
  );
  const ReadOnly = ({ value }) => (
    <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{value}</span>
  );

  const totalRoles = opts.werewolfCount + opts.enabledRoles.length;
  const enoughRoom = playerCount >= totalRoles + 2; // au moins 2 villageois
  const minWolfCount = manifest.limits.werewolfCount.min;
  const maxWolfCount = manifest.limits.werewolfCount.max;

  return (
    <div className="space-y-4">
      {/* Tutoriel : disponible pour tous (joueurs ET hôte) avant la partie */}
      <RolesGuide />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label={`Nombre de loups : ${opts.werewolfCount}`}>
          {isHost ? (
            <input
              type="range"
              min={minWolfCount} max={maxWolfCount} step={1}
              value={opts.werewolfCount}
              onChange={(e) => update('werewolfCount', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={opts.werewolfCount} />}
        </Field>

        <Field label={`Temps de vote : ${opts.dayVoteDurationSec}s`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.dayVoteDurationSec.min} max={manifest.limits.dayVoteDurationSec.max} step={10}
              value={opts.dayVoteDurationSec}
              onChange={(e) => update('dayVoteDurationSec', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={`${opts.dayVoteDurationSec}s`} />}
        </Field>
      </div>

      <label className={`flex items-center gap-3 select-none ${isHost ? 'cursor-pointer' : ''} bg-slate-900/40 px-3 py-2 rounded-lg`}>
        <input
          type="checkbox" disabled={!isHost} checked={opts.enableMayor}
          onChange={(e) => update('enableMayor', e.target.checked)}
          className="accent-brand w-4 h-4"
        />
        <div>
          <p className="font-medium">👑 Élection du maire</p>
          <p className="text-xs text-slate-400">
            Le village élit un maire au début. Son vote compte double pour les lynchages.
          </p>
        </div>
      </label>

      <div>
        <p className="text-xs uppercase text-slate-400 tracking-wide mb-2">Rôles spéciaux</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {manifest.roles.map(r => {
            const active = opts.enabledRoles.includes(r.id);
            return (
              <button
                key={r.id}
                disabled={!isHost}
                onClick={() => toggleRole(r.id)}
                className={`text-left rounded-xl px-3 py-2 border-2 transition flex items-center gap-2 ${
                  active
                    ? 'bg-brand/20 border-brand text-white'
                    : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-500'
                } ${!isHost ? 'cursor-default' : ''}`}
              >
                <span className="text-2xl">{r.icon}</span>
                <span className="font-medium">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/40 rounded-lg p-3 text-sm space-y-1">
        <p>
          👥 <strong>{playerCount}</strong> joueurs · 🐺 <strong>{opts.werewolfCount}</strong> loup{opts.werewolfCount>1?'s':''}
          {opts.enabledRoles.includes('loup_blanc') && <span> · 🐺‍❄️ 1 loup blanc</span>}
          {' · '}⭐ {opts.enabledRoles.filter(r => r !== 'loup_blanc').length} autre{opts.enabledRoles.length>1?'s':''} rôle{opts.enabledRoles.length>1?'s':''} spécial
          {opts.enableMayor && <span> · 👑 maire</span>}
        </p>
        <p className="text-slate-400">→ Reste ~{Math.max(0, playerCount - totalRoles)} villageois</p>
      </div>

      {isHost && (
        <button
          onClick={() => onStart(opts)}
          disabled={playerCount < 5 || !enoughRoom}
          className="btn btn-primary w-full text-base sm:text-lg disabled:opacity-50"
        >
          🌙 Lancer la partie
        </button>
      )}
      {!enoughRoom && (
        <p className="text-rose-300 text-sm text-center">Pas assez de joueurs pour ces rôles (besoin d'au moins 2 villageois).</p>
      )}
    </div>
  );
}
