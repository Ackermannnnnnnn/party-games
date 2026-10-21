import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = {
  themes: [],
  level: 'mixte',
  imposterCount: 1,
  imposterKnows: true,
  voteDurationSec: 60,
  turnDurationSec: 0,
  mrWhiteEnabled: false,
  clueMode: 'ecrit',
  showTheme: true,
};
const LEVELS = [
  { id: 'facile', label: '🟢 Facile', desc: 'Mots proches mais bien différents' },
  { id: 'mixte', label: '🎲 Mixte', desc: 'Un peu de tout' },
  { id: 'difficile', label: '🔴 Difficile', desc: 'Mots presque identiques' },
];
const VOTE_TIMES = [30, 45, 60, 90, 120, 180];
const TURN_TIMES = [0, 20, 30, 45, 60, 90];

/** Panneau d'options du jeu de l'imposteur, synchronisé en temps réel entre l'hôte et les joueurs. */
export default function GameOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [rawOpts, setOpts, isHost] = useGameOptions('imposter', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => { if (gameId === 'imposter' && m) setManifest(m); };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'imposter' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;

  // Anciennes options (un seul thème) → liste de thèmes
  const opts = { ...DEFAULT_OPTS, ...rawOpts };
  if (!Array.isArray(opts.themes)) opts.themes = rawOpts.theme && rawOpts.theme !== 'random' ? [rawOpts.theme] : [];
  const set = (k, v) => isHost && setOpts((o) => ({ ...DEFAULT_OPTS, ...o, themes: opts.themes, [k]: v }));
  const toggleTheme = (id) => set('themes', opts.themes.includes(id) ? opts.themes.filter((t) => t !== id) : [...opts.themes, id]);

  // Mr White est un joueur EN PLUS des imposteurs : il prend une place et demande 4 joueurs.
  const mrWhiteMin = manifest.limits.mrWhiteMinPlayers || 4;
  const mrWhiteInPlay = opts.mrWhiteEnabled && playerCount >= mrWhiteMin;
  const maxImposter = Math.max(1, Math.min(manifest.limits.imposterCount.max, playerCount - 2 - (mrWhiteInPlay ? 1 : 0)));
  const imposterCount = Math.min(opts.imposterCount, maxImposter);
  const chosen = opts.themes.length ? manifest.themes.filter((t) => opts.themes.includes(t.id)) : manifest.themes;
  const available = chosen.reduce((n, t) => n + (opts.level === 'facile' ? t.facile : opts.level === 'difficile' ? t.difficile : t.count), 0);
  const civils = playerCount - imposterCount - (mrWhiteInPlay ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* Thèmes */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-slate-400">Thèmes des mots</p>
          {isHost && opts.themes.length > 0 && (
            <button type="button" className="text-xs text-brand-light underline" style={{ minHeight: 0 }} onClick={() => set('themes', [])}>Tous les thèmes</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={!isHost} onClick={() => set('themes', [])} aria-pressed={opts.themes.length === 0}
            className={`rounded-full px-3 py-1.5 text-sm border transition ${opts.themes.length === 0 ? 'bg-brand border-brand text-white' : 'bg-slate-900/60 border-slate-700 text-slate-300'}`} style={{ minHeight: 0 }}>
            🎲 Tous
          </button>
          {manifest.themes.map((t) => {
            const on = opts.themes.includes(t.id);
            return (
              <button key={t.id} type="button" disabled={!isHost} onClick={() => toggleTheme(t.id)} aria-pressed={on} style={{ minHeight: 0 }}
                className={`rounded-full px-3 py-1.5 text-sm border transition ${on ? 'bg-brand/30 border-brand text-white' : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'} ${isHost ? '' : 'cursor-default'}`}>
                {t.label} <span className="text-[10px] opacity-60">{t.count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Difficulté */}
      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Difficulté des mots</p>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" disabled={!isHost} onClick={() => set('level', l.id)} aria-pressed={opts.level === l.id}
              className={`rounded-xl px-2 py-2 border text-center transition ${opts.level === l.id ? 'bg-brand/25 border-brand' : 'bg-slate-900/60 border-slate-700'}`}>
              <span className="block text-sm font-semibold">{l.label}</span>
              <span className="block text-[10px] text-slate-400 leading-tight">{l.desc}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{available} paires de mots disponibles avec ces réglages.</p>
      </section>

      {/* Indices */}
      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Comment donner les indices ?</p>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: 'ecrit', label: '⌨️ À l\'écrit', desc: 'On tape son mot, tout le monde le voit' }, { id: 'oral', label: '🗣️ À voix haute', desc: 'Même pièce ou en vocal' }].map((m) => (
            <button key={m.id} type="button" disabled={!isHost} onClick={() => set('clueMode', m.id)} aria-pressed={opts.clueMode === m.id}
              className={`rounded-xl px-2 py-2 border text-center transition ${opts.clueMode === m.id ? 'bg-brand/25 border-brand' : 'bg-slate-900/60 border-slate-700'}`}>
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-[10px] text-slate-400 leading-tight">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Rôles */}
      <section className="grid sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-xl bg-rose-500/10 border border-rose-400/25 px-3 py-2">
          <div>
            <p className="font-semibold">😈 Imposteurs</p>
            <p className="text-[11px] text-slate-400">max {maxImposter} avec {playerCount} joueurs</p>
          </div>
          <div className="flex items-center gap-2">
            {isHost && <button type="button" aria-label="Un imposteur de moins" className="w-8 h-8 rounded-full bg-white/10 font-bold disabled:opacity-30" disabled={imposterCount <= 1} onClick={() => set('imposterCount', imposterCount - 1)}>−</button>}
            <span className="font-display text-2xl w-6 text-center">{imposterCount}</span>
            {isHost && <button type="button" aria-label="Un imposteur de plus" className="w-8 h-8 rounded-full bg-white/10 font-bold disabled:opacity-30" disabled={imposterCount >= maxImposter} onClick={() => set('imposterCount', imposterCount + 1)}>+</button>}
          </div>
        </div>
        <Toggle on={opts.mrWhiteEnabled} disabled={!isHost} onChange={(v) => set('mrWhiteEnabled', v)} title="🎩 Mr White"
          desc={playerCount < mrWhiteMin && opts.mrWhiteEnabled ? `⚠️ Il faut ${mrWhiteMin} joueurs : la partie se jouera sans lui.` : 'Un joueur en plus, sans mot. Éliminé, il peut gagner seul en devinant le mot.'} />
        <Toggle on={opts.imposterKnows} disabled={!isHost} onChange={(v) => set('imposterKnows', v)} title="👁 L'imposteur le sait"
          desc="Décoché = mode hardcore : personne ne sait s'il est imposteur." />
        <Toggle on={opts.showTheme} disabled={!isHost} onChange={(v) => set('showTheme', v)} title="🏷️ Afficher le thème"
          desc="Tout le monde voit le thème du mot (aide Mr White et l'imposteur)." />
      </section>

      {/* Minuteurs */}
      <section className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">⏱ Temps par indice
          <select disabled={!isHost} value={opts.turnDurationSec} onChange={(e) => set('turnDurationSec', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {TURN_TIMES.map((t) => <option key={t} value={t}>{t === 0 ? 'Illimité' : `${t} s`}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">🗳️ Temps de vote
          <select disabled={!isHost} value={opts.voteDurationSec} onChange={(e) => set('voteDurationSec', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {VOTE_TIMES.map((t) => <option key={t} value={t}>{t < 60 ? `${t} s` : `${t / 60} min${t % 60 ? ' 30' : ''}`}</option>)}
          </select>
        </label>
      </section>

      <p className="text-xs text-slate-400 text-center">
        👥 {playerCount} joueurs : {Math.max(0, civils)} civil{civils > 1 ? 's' : ''} · {imposterCount} imposteur{imposterCount > 1 ? 's' : ''}{mrWhiteInPlay ? ' · 1 Mr White' : ''}
      </p>

      {isHost && (
        <button type="button" onClick={() => onStart({ ...opts, imposterCount })} disabled={playerCount < 3} className="btn btn-token w-full text-lg disabled:opacity-40">
          🕵️ Lancer la partie
        </button>
      )}
    </div>
  );
}

function Toggle({ on, onChange, disabled, title, desc }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on}
      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-left border transition ${on ? 'bg-brand/15 border-brand/50' : 'bg-slate-900/50 border-slate-700'} ${disabled ? 'cursor-default' : ''}`}>
      <span className={`mt-0.5 w-9 h-5 rounded-full relative shrink-0 transition ${on ? 'bg-brand' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
      </span>
    </button>
  );
}
