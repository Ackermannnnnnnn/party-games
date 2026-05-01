import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = {
  categoryIds: [],
  customCategories: [],
  nbRounds: 5,
  timePerRoundSec: 90,
  validationMode: 'collective',
  stopMode: 'anyFull',
  hardLetters: false,
};

export default function PetitBacOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('petitbac', DEFAULT_OPTS);
  const [newCustom, setNewCustom] = useState('');

  // Charger le manifest des catégories built-in
  useEffect(() => {
    const onOptions = ({ gameId, manifest }) => {
      if (gameId !== 'petitbac' || !manifest) return;
      setManifest(manifest);
      // Initialiser les catégories par défaut si vide
      if (opts.categoryIds.length === 0) {
        setOpts(o => ({ ...o, ...manifest.defaults }));
      }
    };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'petitbac' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement…</p>;

  const update = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const toggleCategory = (id) => {
    if (!isHost) return;
    setOpts(o => {
      const set = new Set(o.categoryIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...o, categoryIds: [...set] };
    });
  };
  const addCustom = () => {
    const label = newCustom.trim();
    if (!label || !isHost) return;
    if (opts.customCategories.length >= 8) return;
    setOpts(o => ({
      ...o,
      customCategories: [...o.customCategories, { label, icon: '✨' }],
    }));
    setNewCustom('');
  };
  const removeCustom = (idx) => {
    if (!isHost) return;
    setOpts(o => ({
      ...o,
      customCategories: o.customCategories.filter((_, i) => i !== idx),
    }));
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

  const totalCats = opts.categoryIds.length + (opts.customCategories?.length || 0);
  const enoughCats = totalCats >= 3;

  const validationLabel = {
    collective: '🗳️ Collective (vote)',
    auto: '⚡ Auto (juste check lettre)',
    host: '👑 Maître du jeu décide',
  };
  const stopLabel = {
    disabled: '🚫 Désactivé',
    anyFull: '✅ Quand quelqu\'un a tout rempli',
    host: '👑 Hôte uniquement',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label={`Nombre de manches : ${opts.nbRounds}`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.nbRounds.min} max={manifest.limits.nbRounds.max}
              step={1} value={opts.nbRounds}
              onChange={(e) => update('nbRounds', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={opts.nbRounds} />}
        </Field>

        <Field label={`Temps par manche : ${opts.timePerRoundSec}s`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.timePerRoundSec.min} max={manifest.limits.timePerRoundSec.max}
              step={10} value={opts.timePerRoundSec}
              onChange={(e) => update('timePerRoundSec', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={`${opts.timePerRoundSec}s`} />}
        </Field>

        <Field label="Mode de validation">
          {isHost ? (
            <select value={opts.validationMode} onChange={(e) => update('validationMode', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand">
              <option value="collective">🗳️ Collective (vote des autres)</option>
              <option value="auto">⚡ Auto (juste check de la lettre)</option>
              <option value="host">👑 Maître du jeu décide</option>
            </select>
          ) : <ReadOnly value={validationLabel[opts.validationMode]} />}
        </Field>

        <Field label="Bouton STOP">
          {isHost ? (
            <select value={opts.stopMode} onChange={(e) => update('stopMode', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand">
              <option value="anyFull">✅ Quand quelqu'un a tout rempli</option>
              <option value="host">👑 Hôte uniquement</option>
              <option value="disabled">🚫 Désactivé</option>
            </select>
          ) : <ReadOnly value={stopLabel[opts.stopMode]} />}
        </Field>
      </div>

      <label className={`flex items-center gap-3 select-none ${isHost ? 'cursor-pointer' : ''} bg-slate-900/40 px-3 py-2 rounded-lg`}>
        <input
          type="checkbox" disabled={!isHost} checked={opts.hardLetters}
          onChange={(e) => update('hardLetters', e.target.checked)}
          className="accent-brand w-4 h-4"
        />
        <div>
          <p className="font-medium">🔥 Lettres hardcore</p>
          <p className="text-xs text-slate-400">Inclut Q, K, W, X, Y, Z. Sinon désactivées.</p>
        </div>
      </label>

      <div>
        <p className="text-xs uppercase text-slate-400 tracking-wide mb-2">
          Catégories ({totalCats} sélectionnée{totalCats > 1 ? 's' : ''}, min 3)
        </p>
        <div className="flex flex-wrap gap-2">
          {manifest.categories.map(cat => {
            const active = opts.categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id} disabled={!isHost} onClick={() => toggleCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  active ? 'bg-brand border-brand text-white' : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-500'
                } ${!isHost ? 'cursor-default' : ''}`}
              >
                {cat.icon} {cat.label}
              </button>
            );
          })}
        </div>

        {/* Catégories custom */}
        {(opts.customCategories?.length > 0 || isHost) && (
          <div className="mt-3 space-y-2">
            <p className="text-xs uppercase text-slate-400 tracking-wide">
              Catégories perso ({opts.customCategories?.length || 0}/8)
            </p>
            {opts.customCategories?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {opts.customCategories.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-purple-500/20 border border-purple-500/40 text-purple-200"
                  >
                    {c.icon || '✨'} {c.label}
                    {isHost && (
                      <button
                        onClick={() => removeCustom(i)}
                        className="ml-1 text-purple-300 hover:text-rose-300"
                        title="Retirer"
                      >×</button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {isHost && opts.customCategories.length < 8 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCustom}
                  onChange={(e) => setNewCustom(e.target.value.slice(0, 30))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                  placeholder="Ex: Personnage de manga, Boisson…"
                  maxLength={30}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button onClick={addCustom} disabled={!newCustom.trim()} className="btn btn-ghost text-sm px-3 py-2 disabled:opacity-50">
                  + Ajouter
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isHost && (
        <button
          onClick={() => onStart(opts)}
          disabled={playerCount < 3 || !enoughCats}
          className="btn btn-primary w-full text-base sm:text-lg disabled:opacity-50"
        >
          📝 Lancer le Petit Bac
        </button>
      )}
      {!enoughCats && <p className="text-rose-300 text-sm text-center">Sélectionne au moins 3 catégories.</p>}
    </div>
  );
}
