import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';
import TurnAlert from '../../components/TurnAlert.jsx';
import Avatar from '../../components/Avatar.jsx';
import { playTurnChime } from '../../hooks/useSounds.js';
import { clueError } from './wordRules.js';

/** Les joueurs dans l'ordre de parole, avec les indices déjà donnés. */
export function CluesTable({ highlightId = null, onPick, pickable, renderExtra }) {
  const { gameState, room, playerId } = useGameStore();
  const pub = gameState?.public || {};
  const descriptions = pub.descriptions || {};
  const order = pub.speakingOrder || [];
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {order.map((pid, i) => {
        const p = room.players.find((x) => x.id === pid);
        const words = descriptions[pid] || [];
        const current = pid === highlightId;
        const Tag = onPick && pickable?.(pid) ? 'button' : 'div';
        return (
          <motion.li key={pid} layout>
            <Tag type={Tag === 'button' ? 'button' : undefined} onClick={Tag === 'button' ? () => onPick(pid) : undefined}
              className={`w-full text-left flex items-start gap-3 rounded-2xl px-3 py-2.5 border transition ${current ? 'bg-amber-400/10 border-amber-300/60' : 'bg-white/[0.04] border-white/10'} ${!p ? 'opacity-40' : ''} ${Tag === 'button' ? 'hover:border-white/40 cursor-pointer' : ''}`}>
              <span className={`relative rounded-full shrink-0 ${current ? 'imp-speaker' : ''}`}>
                <Avatar id={p?.avatar} size="md" />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-slate-900 border border-white/20 text-[10px] flex items-center justify-center">{i + 1}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={`font-semibold truncate ${pid === playerId ? 'text-brand-light' : ''}`}>{p?.pseudo || 'parti'}{pid === playerId ? ' (toi)' : ''}</span>
                  {current && <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">parle</span>}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {words.length === 0 ? <span className="text-xs italic text-slate-500">pas encore d'indice</span> : words.map((w, j) => (
                    <motion.span key={j} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className={`rounded-lg px-2 py-0.5 text-sm font-semibold ${w === '—' ? 'bg-slate-700/60 text-slate-400' : w === '🗣️' ? 'bg-sky-500/20 text-sky-200' : 'bg-violet-500/25 text-violet-100'}`}>
                      {w === '🗣️' ? '🗣️ à l\'oral' : w}
                    </motion.span>
                  ))}
                </span>
                {renderExtra?.(pid)}
              </span>
            </Tag>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default function PhaseDescribe() {
  const { gameState, room, playerId } = useGameStore();
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [showTurnAlert, setShowTurnAlert] = useState(false);
  const inputRef = useRef(null);
  const announcedTurn = useRef(null);

  const pub = gameState?.public || {};
  const word = gameState?.private?.word;
  const descriptions = pub.descriptions || {};
  const currentSpeakerId = pub.currentSpeakerId;
  const speakingRound = pub.speakingRound || 1;
  const oral = pub.options?.clueMode === 'oral';
  const isHost = playerId === room.hostId;
  const isMyTurn = playerId === currentSpeakerId;
  const currentSpeaker = room.players.find((p) => p.id === currentSpeakerId);

  useEffect(() => { if (isMyTurn && !oral) inputRef.current?.focus(); }, [isMyTurn, oral]);

  // Quand mon tour commence : petit son, vibration (mobile) et flash à l'écran
  useEffect(() => {
    if (!isMyTurn) { announcedTurn.current = null; setShowTurnAlert(false); return undefined; }
    const key = `${speakingRound}-${currentSpeakerId}`;
    if (announcedTurn.current !== key) {
      announcedTurn.current = key;
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
    const problem = clueError(v, word, descriptions);
    if (problem) { setError(problem); return; }
    api.gameAction('submitWord', { text: v });
    setText('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <TurnAlert show={showTurnAlert} label={oral ? 'À TOI DE PARLER !' : 'À TOI DE JOUER !'} />

      <motion.div key={currentSpeakerId} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={`rounded-2xl px-4 py-4 text-center border ${isMyTurn ? 'bg-amber-400/15 border-amber-300/60' : 'bg-white/[0.04] border-white/10'}`}>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
          <span>Tour de parole n°{speakingRound}</span>
          <span className="flex items-center gap-3">
            {pub.turnEndsAt && <Timer endsAt={pub.turnEndsAt} />}
            {isHost && !isMyTurn && (
              <button type="button" onClick={() => api.gameAction('skipSpeaker', {})} className="text-slate-400 hover:text-rose-300" style={{ minHeight: 0 }}>⏭ passer</button>
            )}
          </span>
        </div>
        {isMyTurn ? (
          oral ? (
            <div className="space-y-3">
              <p className="imp-title text-3xl text-amber-200">🗣️ Dis UN mot à voix haute</p>
              <p className="text-sm text-slate-300">Un mot en rapport avec {word ? <>ton mot <strong>« {word} »</strong></> : 'ce que tu as compris'}, sans le dire !</p>
              <button type="button" className="btn btn-primary text-lg" onClick={() => api.gameAction('spoke', {})}>✓ J'ai donné mon indice</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="imp-title text-3xl text-amber-200">🎤 À toi ! Donne UN mot</p>
              <form onSubmit={submit} className="flex gap-2 max-w-md mx-auto">
                <input ref={inputRef} value={text} maxLength={30} aria-label="Ton indice" aria-invalid={!!error}
                  onChange={(e) => { setText(e.target.value.slice(0, 30)); setError(null); }}
                  placeholder={word ? 'Un indice, pas ton mot !' : 'Bluffe…'}
                  className={`flex-1 min-w-0 rounded-xl bg-black/40 border-2 px-4 py-3 text-lg font-semibold outline-none ${error ? 'border-rose-500' : 'border-white/15 focus:border-amber-300'}`} />
                <button className="btn btn-primary">Envoyer</button>
              </form>
              {error && <p className="text-rose-300 text-sm" role="alert">⚠️ {error}</p>}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center gap-3">
            {currentSpeaker && <Avatar id={currentSpeaker.avatar} size="md" />}
            <p className="text-lg">{oral ? '🗣️' : '🎤'} C'est à <strong className="text-amber-200">{currentSpeaker?.pseudo || '…'}</strong> {oral ? 'de parler' : 'de donner un indice'}</p>
            {oral && isHost && (
              <button type="button" className="text-xs underline text-slate-300" style={{ minHeight: 0 }} onClick={() => api.gameAction('spoke', {})}>valider pour lui</button>
            )}
          </div>
        )}
      </motion.div>

      <CluesTable highlightId={currentSpeakerId} />
    </div>
  );
}
