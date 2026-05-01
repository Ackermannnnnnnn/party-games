import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';

const DEFAULT_OPTS = {
  category: 'all',
  difficulty: 'random',
  nbQuestions: 10,
  timePerQuestionSec: 20,
  hardcoreMode: false,
  battleRoyaleMode: false,
};

export default function QuizOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('quiz', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest }) => {
      if (gameId !== 'quiz' || !manifest) return;
      setManifest(manifest);
    };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'quiz' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;

  const update = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-slate-400 tracking-wide">{label}</label>
      {children}
    </div>
  );
  const ReadOnly = ({ value }) => (
    <span className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-300">{value}</span>
  );

  const categoryLabel = manifest.categories.find(c => c.id === opts.category)?.label || opts.category;
  const difficultyLabel = manifest.difficulties.find(d => d.id === opts.difficulty)?.label || opts.difficulty;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Catégorie">
          {isHost ? (
            <select
              value={opts.category}
              onChange={(e) => {
                const newCat = e.target.value;
                // Mode enfant : force la difficulté à 'easy' automatiquement
                if (newCat === 'enfant') {
                  setOpts(o => ({ ...o, category: newCat, difficulty: 'easy' }));
                } else {
                  update('category', newCat);
                }
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand"
            >
              {manifest.categories.map(c => (
                <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
              ))}
            </select>
          ) : <ReadOnly value={categoryLabel} />}
        </Field>

        <Field label={opts.category === 'enfant' ? 'Difficulté (verrouillée)' : 'Difficulté'}>
          {isHost && opts.category !== 'enfant' ? (
            <select
              value={opts.difficulty}
              onChange={(e) => update('difficulty', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand"
            >
              {manifest.difficulties.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          ) : opts.category === 'enfant' ? (
            <ReadOnly value="🧒 Mode enfant (questions simples uniquement)" />
          ) : <ReadOnly value={difficultyLabel} />}
        </Field>

        <Field label={`Nombre de questions : ${opts.nbQuestions}`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.nbQuestions.min}
              max={manifest.limits.nbQuestions.max}
              step={1}
              value={opts.nbQuestions}
              onChange={(e) => update('nbQuestions', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={opts.nbQuestions} />}
        </Field>

        <Field label={`Temps par question : ${opts.timePerQuestionSec}s`}>
          {isHost ? (
            <input
              type="range"
              min={manifest.limits.timePerQuestionSec.min}
              max={manifest.limits.timePerQuestionSec.max}
              step={5}
              value={opts.timePerQuestionSec}
              onChange={(e) => update('timePerQuestionSec', parseInt(e.target.value, 10))}
              className="accent-brand"
            />
          ) : <ReadOnly value={`${opts.timePerQuestionSec}s`} />}
        </Field>
      </div>

      <label className={`flex items-center gap-3 select-none ${isHost ? 'cursor-pointer' : ''} bg-slate-900/40 px-3 py-2 rounded-lg`}>
        <input
          type="checkbox"
          disabled={!isHost}
          checked={opts.hardcoreMode}
          onChange={(e) => update('hardcoreMode', e.target.checked)}
          className="accent-brand w-4 h-4"
        />
        <div>
          <p className="font-medium">🔥 Mode hardcore</p>
          <p className="text-xs text-slate-400">
            Pas de QCM. Tape la réponse à la main (casse, accents, ponctuation tolérés).
          </p>
        </div>
      </label>

      <label className={`flex items-center gap-3 select-none ${isHost ? 'cursor-pointer' : ''} bg-slate-900/40 px-3 py-2 rounded-lg`}>
        <input
          type="checkbox"
          disabled={!isHost}
          checked={opts.battleRoyaleMode}
          onChange={(e) => update('battleRoyaleMode', e.target.checked)}
          className="accent-brand w-4 h-4"
        />
        <div>
          <p className="font-medium">⚔️ Mode Battle Royale</p>
          <p className="text-xs text-slate-400">
            Une mauvaise réponse (ou pas de réponse) = élimination. Le dernier survivant gagne.
          </p>
        </div>
      </label>

      {isHost && (
        <button
          onClick={() => onStart(opts)}
          disabled={playerCount < 3}
          className="btn btn-primary w-full text-base sm:text-lg disabled:opacity-50"
        >
          🎯 Lancer le quiz
        </button>
      )}
    </div>
  );
}
