import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import StepHeader from './StepHeader.jsx';
import DrawingView from './DrawingView.jsx';
import { useDraft } from './useDraft.js';

const MAX_LENGTH = 80;

/**
 * Étapes "texte" :
 *   - WRITE : écrire la phrase de départ (avec des idées au hasard)
 *   - GUESS : décrire le dessin reçu
 */
export default function PhaseText() {
  const { gameState } = useGameStore();
  const pub = gameState?.public || {};
  const priv = gameState?.private || {};
  const isGuess = pub.phase === 'GUESS';
  const done = !!priv.done;
  const drawing = priv.prompt?.type === 'drawing' ? priv.prompt.strokes : null;
  const suggestions = priv.suggestions || [];
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  const [text, setText] = useDraft(
    `tel:${pub.gameKey}:${pub.step}`,
    '',
    (value) => api.gameAction('submitText', { text: value, step: pub.step, draft: true }),
    { done, endsAt: pub.stepEndsAt, isEmpty: (v) => !v.trim() },
  );

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    api.gameAction('submitText', { text: text.trim(), step: pub.step });
  };

  const suggest = () => {
    if (suggestions.length === 0) return;
    setText(suggestions[suggestionIdx % suggestions.length]);
    setSuggestionIdx((i) => i + 1);
  };

  return (
    <div className="card space-y-4">
      <StepHeader icon={isGuess ? '🔍' : '✍️'} title={isGuess ? 'Que vois-tu ?' : 'Écris une phrase'} />

      {isGuess ? (
        <div className="max-w-xl mx-auto w-full space-y-2">
          <DrawingView strokes={drawing || []} />
          {drawing && drawing.length === 0 && (
            <p className="text-center text-amber-300 text-sm">Ce dessin est vide… invente ce que tu veux !</p>
          )}
        </div>
      ) : (
        <p className="text-slate-300 text-center">
          Un mot ou une phrase que quelqu'un d'autre devra <strong>dessiner</strong>. Plus c'est absurde, mieux c'est.
        </p>
      )}

      {done ? (
        <div className="text-center space-y-3 py-2">
          <p className="text-emerald-300 font-semibold">✅ Envoyé : « {text} »</p>
          <p className="text-slate-400 text-sm">En attente des autres joueurs…</p>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => api.gameAction('edit', {})}>
            ✏️ Modifier
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2 max-w-xl mx-auto w-full">
          <div className="flex gap-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
              placeholder={isGuess ? 'Décris ce dessin…' : 'Ex : un chat qui fait du ski'}
              aria-label={isGuess ? 'Ta description du dessin' : 'Ta phrase'}
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand"
            />
            {!isGuess && suggestions.length > 0 && (
              <button type="button" onClick={suggest} className="btn btn-ghost px-3" title="Une idée au hasard" aria-label="Une idée au hasard">
                🎲
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 tabular-nums">{text.length}/{MAX_LENGTH}</span>
            <button className="btn btn-primary disabled:opacity-50" disabled={!text.trim()}>
              ✅ Valider
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
