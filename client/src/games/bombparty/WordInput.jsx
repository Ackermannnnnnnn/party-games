import { useEffect, useRef, useState } from 'react';
import { api } from '../../hooks/useSocket.js';
import { Highlight } from './Arena.jsx';

/**
 * Zone de saisie. Quand c'est ton tour : tu tapes, les autres voient tes lettres en direct,
 * Entrée pour valider. Sinon : on montre qui joue et ce qu'il tape.
 */
export default function WordInput({ state, playerId, lastEvent }) {
  const isMyTurn = state.holderId === playerId && state.phase === 'PLAYING';
  const holder = state.players.find((p) => p.id === state.holderId);
  const [text, setText] = useState('');
  const [shake, setShake] = useState(0);
  const inputRef = useRef(null);
  const sendTimer = useRef(null);

  // Nouveau tour : champ vide et focus
  useEffect(() => {
    setText('');
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn, state.turnStartedAt]);

  // Mot refusé : on secoue le champ (le texte reste pour pouvoir corriger)
  useEffect(() => {
    if (lastEvent?.type === 'fail' && lastEvent.playerId === playerId) setShake((s) => s + 1);
  }, [lastEvent?.seq]);

  const onChange = (e) => {
    const value = e.target.value.slice(0, 30);
    setText(value);
    // Envoi de la saisie en direct, au plus toutes les 60 ms
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => api.gameAction('typing', { text: value }), 60);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    clearTimeout(sendTimer.current);
    api.gameAction('submitWord', { word: text.trim() });
  };

  const myFail = lastEvent?.type === 'fail' && lastEvent.playerId === playerId && isMyTurn;

  if (!isMyTurn) {
    return (
      <div className="text-center space-y-1 min-h-[88px] flex flex-col justify-center">
        <p className="text-slate-300">
          💣 C'est à <strong className="text-orange-300">{holder?.pseudo || '…'}</strong> de trouver un mot avec{' '}
          <strong className="uppercase text-white">{state.syllable}</strong>
        </p>
        <p className="font-mono text-2xl font-bold text-white min-h-[2rem]">
          <Highlight text={state.input} syllable={state.syllable} />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 max-w-md mx-auto w-full">
      <p className="text-center text-orange-200 font-semibold">
        🔥 À toi ! Un mot contenant <span className="uppercase text-white text-lg">{state.syllable}</span>
      </p>
      <div key={shake} className={`flex gap-2 ${shake ? 'bp-shake' : ''}`}>
        <input
          ref={inputRef}
          value={text}
          onChange={onChange}
          maxLength={30}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-label="Ton mot"
          aria-invalid={myFail}
          placeholder="Tape ton mot…"
          className={`flex-1 min-w-0 rounded-2xl px-4 py-3 text-2xl font-bold font-mono bg-black/40 border-2 outline-none transition-colors ${
            myFail ? 'border-rose-500 text-rose-100' : 'border-orange-400/60 focus:border-orange-300 text-white'
          }`}
        />
        <button className="bp-btn px-5" disabled={!text.trim()} aria-label="Valider le mot">⏎</button>
      </div>
      <p className={`text-center text-sm min-h-[1.25rem] ${myFail ? 'text-rose-300' : 'text-slate-500'}`} role="status">
        {myFail ? `« ${lastEvent.word} » : ${lastEvent.message}` : `${state.syllableCount?.toLocaleString('fr-FR')} mots possibles`}
      </p>
    </form>
  );
}
