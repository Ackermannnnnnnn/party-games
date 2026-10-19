import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = {
  categories: [],
  difficulty: 'random',
  nbQuestions: 15,
  timePerQuestionSec: 20,
  hardcoreMode: false,
  battleRoyaleMode: false,
  jokers: true,
};
const COUNTS = [5, 10, 15, 20, 25, 30, 40];
const TIMES = [10, 15, 20, 30, 45, 60];

export default function QuizOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [rawOpts, setOpts, isHost] = useGameOptions('quiz', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => { if (gameId === 'quiz' && m) setManifest(m); };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'quiz' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;

  const opts = { ...DEFAULT_OPTS, ...rawOpts };
  if (!Array.isArray(opts.categories)) opts.categories = rawOpts.category && rawOpts.category !== 'all' ? [rawOpts.category] : [];
  const set = (k, v) => isHost && setOpts((o) => ({ ...DEFAULT_OPTS, ...o, categories: opts.categories, [k]: v }));
  const toggleCat = (id) => set('categories', opts.categories.includes(id) ? opts.categories.filter((c) => c !== id) : [...opts.categories, id]);

  const cats = manifest.categories;
  const chosen = opts.categories.length ? cats.filter((c) => opts.categories.includes(c.id)) : cats.filter((c) => c.id !== 'enfant');
  const diffKey = { easy: 1, medium: 2, hard: 3, extreme: 4 }[opts.difficulty];
  const available = chosen.reduce((n, c) => n + (diffKey ? c.countByDifficulty[diffKey] : c.count), 0);

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-slate-400">Catégories</p>
          {isHost && opts.categories.length > 0 && (
            <button type="button" className="text-xs text-brand-light underline" style={{ minHeight: 0 }} onClick={() => set('categories', [])}>Toutes</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={!isHost} onClick={() => set('categories', [])} aria-pressed={opts.categories.length === 0} style={{ minHeight: 0 }}
            className={`rounded-full px-3 py-1.5 text-sm border transition ${opts.categories.length === 0 ? 'bg-brand border-brand text-white' : 'bg-slate-900/60 border-slate-700 text-slate-300'}`}>
            🎲 Toutes
          </button>
          {cats.map((c) => {
            const on = opts.categories.includes(c.id);
            return (
              <button key={c.id} type="button" disabled={!isHost} onClick={() => toggleCat(c.id)} aria-pressed={on} style={{ minHeight: 0 }}
                className={`rounded-full px-3 py-1.5 text-sm border transition ${on ? 'bg-brand/30 border-brand text-white' : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'} ${isHost ? '' : 'cursor-default'}`}>
                {c.label} <span className="text-[10px] opacity-60">{c.count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{available} questions disponibles avec ces réglages · jamais les mêmes que lors des 5 dernières parties.</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Difficulté</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {manifest.difficulties.map((d) => (
            <button key={d.id} type="button" disabled={!isHost} onClick={() => set('difficulty', d.id)} aria-pressed={opts.difficulty === d.id}
              className={`rounded-xl px-2 py-2 text-xs sm:text-sm font-semibold border transition ${opts.difficulty === d.id ? 'bg-brand/25 border-brand' : 'bg-slate-900/60 border-slate-700'}`}>
              {d.label}
            </button>
          ))}
        </div>
        {opts.difficulty === 'progressive' && <p className="text-[11px] text-slate-500 mt-1">On commence facile et ça se corse jusqu'aux questions extrêmes.</p>}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">❓ Nombre de questions
          <select disabled={!isHost} value={opts.nbQuestions} onChange={(e) => set('nbQuestions', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {COUNTS.map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">⏱ Temps par question
          <select disabled={!isHost} value={opts.timePerQuestionSec} onChange={(e) => set('timePerQuestionSec', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {TIMES.map((n) => <option key={n} value={n}>{n} secondes</option>)}
          </select>
        </label>
      </section>

      <section className="grid sm:grid-cols-3 gap-2">
        <Toggle on={opts.jokers} disabled={!isHost} onChange={(v) => set('jokers', v)} title="🃏 Jokers" desc="50/50 et points ×2, une fois chacun par partie." />
        <Toggle on={opts.hardcoreMode} disabled={!isHost} onChange={(v) => set('hardcoreMode', v)} title="⌨️ Réponse libre" desc="Pas de choix : on tape la réponse (petites fautes tolérées)." />
        <Toggle on={opts.battleRoyaleMode} disabled={!isHost} onChange={(v) => set('battleRoyaleMode', v)} title="⚔️ Battle Royale" desc="Une mauvaise réponse et tu es éliminé. Dernier debout gagne." />
      </section>

      <p className="text-[11px] text-slate-500 text-center">Points : base selon la difficulté + bonus de rapidité + 🔥 bonus de série.</p>

      {isHost && (
        <button type="button" onClick={() => onStart(opts)} disabled={available === 0} className="btn btn-primary w-full text-lg disabled:opacity-50">
          🎯 Lancer le quiz {playerCount === 1 ? '(en solo)' : ''}
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
