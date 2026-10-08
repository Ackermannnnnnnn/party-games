import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import GarticHeader, { WaitingCard } from './GarticHeader.jsx';
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
    <div className="space-y-6">
      <GarticHeader
        title={isGuess ? 'Que vois-tu ?' : 'Écris une phrase'}
        subtitle={isGuess ? 'Décris ce dessin : le joueur suivant devra le redessiner.' : 'Un mot ou une phrase que quelqu\'un devra dessiner. Plus c\'est absurde, mieux c\'est !'}
      />

      {isGuess && (
        <div className="max-w-lg mx-auto w-full">
          <div className="gp-polaroid -rotate-1">
            <DrawingView strokes={drawing || []} className="rounded" />
            <p className="gp-hand text-slate-500 text-center text-xl pt-1">
              {drawing && drawing.length === 0 ? 'Ce dessin est vide… invente !' : 'Qu\'est-ce que c\'est ?'}
            </p>
          </div>
        </div>
      )}

      {done ? (
        <WaitingCard
          icon={isGuess ? '🔍' : '✍️'}
          message={<>Tu as écrit <span className="gp-hand text-xl text-pink-200">« {text} »</span></>}
          onEdit={() => api.gameAction('edit', {})}
        />
      ) : (
        <form onSubmit={submit} className="max-w-xl mx-auto w-full space-y-4">
          {/* Lignes du carnet tous les 2,4rem, décalées de 0,75rem : le texte s'écrit pile sur une ligne */}
          <div className="gp-paper pr-4 pl-14 pt-3 relative" style={{ backgroundPosition: '0 0.75rem' }}>
            <label htmlFor="gp-text" className="sr-only">{isGuess ? 'Ta description du dessin' : 'Ta phrase'}</label>
            <input
              id="gp-text"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
              placeholder={isGuess ? 'Je vois…' : 'Un chat qui fait du ski…'}
              aria-label={isGuess ? 'Ta description du dessin' : 'Ta phrase'}
              autoComplete="off"
              className="gp-hand block w-full h-[2.4rem] bg-transparent text-3xl leading-[2.4rem] text-slate-800 placeholder:text-slate-400 outline-none"
              style={{ minHeight: 0 }}
            />
            <div className="flex items-center justify-between h-[2.4rem]">
              <span className="text-xs text-slate-400 tabular-nums">{text.length}/{MAX_LENGTH}</span>
              {!isGuess && suggestions.length > 0 && (
                <button
                  type="button"
                  onClick={suggest}
                  className="text-sm font-semibold text-violet-600 hover:text-pink-600 transition-colors"
                  style={{ minHeight: 0 }}
                  title="Une idée au hasard"
                  aria-label="Une idée au hasard"
                >
                  🎲 Une idée ?
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-center">
            <button className="gp-btn text-lg w-full sm:w-auto" disabled={!text.trim()}>
              ✅ Valider
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
