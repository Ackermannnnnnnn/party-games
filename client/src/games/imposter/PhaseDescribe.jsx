import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';
import Timer from '../../components/Timer.jsx';
import TurnAlert from '../../components/TurnAlert.jsx';
import { playTurnChime } from '../../hooks/useSounds.js';
import { clueError } from './wordRules.js';

export default function PhaseDescribe() {
  const { gameState, room, playerId } = useGameStore();
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [showTurnAlert, setShowTurnAlert] = useState(false);
  const inputRef = useRef(null);
  const announcedTurn = useRef(null);

  const word           = gameState?.private?.word;
  const descriptions   = gameState?.public?.descriptions || {};
  const speakingOrder  = gameState?.public?.speakingOrder || [];
  const currentSpeakerId = gameState?.public?.currentSpeakerId;
  const speakingRound  = gameState?.public?.speakingRound || 1;
  const eliminated     = new Set(gameState?.public?.eliminatedIds || []);
  const turnEndsAt     = gameState?.public?.turnEndsAt;

  const isHost = playerId === room.hostId;
  const isMyTurn = playerId === currentSpeakerId;
  const currentSpeaker = room.players.find(p => p.id === currentSpeakerId);

  // Auto-focus input quand c'est mon tour
  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  // Quand mon tour commence : petit son, vibration (mobile) et flash à l'écran
  useEffect(() => {
    if (!isMyTurn) {
      announcedTurn.current = null;
      setShowTurnAlert(false);
      return;
    }
    // Une seule annonce par tour (le StrictMode de React rejoue les effets en dev)
    if (announcedTurn.current !== speakingRound) {
      announcedTurn.current = speakingRound;
      playTurnChime();
      try { navigator.vibrate?.(200); } catch {}
    }
    setShowTurnAlert(true);
    const t = setTimeout(() => setShowTurnAlert(false), 1500);
    return () => clearTimeout(t);
  }, [isMyTurn, speakingRound]);

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    // Mot interdit (le mien, ou déjà donné) : on prévient sans effacer la saisie
    const problem = clueError(v, word, descriptions);
    if (problem) {
      setError(problem);
      return;
    }
    api.gameAction('submitWord', { text: v });
    setText('');
    setError(null);
  };

  return (
    <div className="card space-y-5">
      <TurnAlert show={showTurnAlert} />
      <div className="text-center">
        {word ? (
          <>
            <p className="text-slate-400 text-sm">Ton mot</p>
            <p className="font-display text-3xl text-brand-light">{word}</p>
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm">🎩 Tu es Mr White</p>
            <p className="font-display text-xl text-amber-300">Bluffe ! Devine le thème depuis les indices des autres.</p>
          </>
        )}
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Tour de parole #{speakingRound}</h3>
          <div className="flex items-center gap-3">
            {turnEndsAt && <Timer endsAt={turnEndsAt} />}
            {isHost && (
              <button
                onClick={() => api.gameAction('skipSpeaker', {})}
                className="text-xs text-slate-400 hover:text-rose-300"
                title="Passer le joueur courant (s'il est AFK)"
              >
                ⏭ skip joueur
              </button>
            )}
          </div>
        </div>

        {/* Bandeau : c'est à X de parler */}
        <motion.div
          key={currentSpeakerId}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-xl px-4 py-3 mb-4 ${
            isMyTurn
              ? 'bg-brand/30 border border-brand text-white'
              : 'bg-slate-900/60 border border-slate-700 text-slate-300'
          }`}
        >
          {isMyTurn ? (
            <p className="font-semibold">🎤 À toi de jouer ! Donne UN mot lié à ton mot secret.</p>
          ) : (
            <p>🎤 C'est à <strong>{currentSpeaker?.pseudo || '…'}</strong> de parler.</p>
          )}
        </motion.div>

        {isMyTurn && (
          <>
            <form onSubmit={submit} className="flex gap-2">
              <input
                ref={inputRef}
                className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 outline-none focus:border-brand ${
                  error ? 'border-rose-500' : 'border-slate-700'
                }`}
                placeholder="Ex: rouge"
                value={text}
                onChange={(e) => { setText(e.target.value.slice(0, 30)); setError(null); }}
                maxLength={30}
                aria-invalid={!!error}
              />
              <button className="btn btn-primary text-sm">Envoyer</button>
            </form>
            {error && <p className="text-rose-300 text-sm mt-2" role="alert">⚠️ {error}</p>}
          </>
        )}
      </div>

      {/* Récap des mots prononcés (par joueur, dans l'ordre des tours) */}
      <div>
        <h3 className="font-semibold mb-2">Mots prononcés</h3>
        <ul className="space-y-1.5">
          {speakingOrder.map((pid) => {
            const p = room.players.find(x => x.id === pid);
            if (!p) return null;
            const words = descriptions[pid] || [];
            const out = eliminated.has(pid);
            const isCurrent = pid === currentSpeakerId;
            return (
              <li
                key={pid}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  isCurrent ? 'bg-brand/10 border border-brand/40' : 'bg-slate-900/40'
                } ${out ? 'opacity-40 line-through' : ''}`}
              >
                <span className="w-32 truncate font-medium">{p.pseudo}</span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {words.length === 0
                    ? <span className="italic text-slate-500 text-sm">…</span>
                    : words.map((w, i) => (
                        <span key={i} className="bg-slate-800 px-2 py-0.5 rounded text-sm">
                          {w}
                        </span>
                      ))
                  }
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
