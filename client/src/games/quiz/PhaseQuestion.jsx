import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import { DIFF, SHAPES, TimeBar } from './QuizGame.jsx';

/** En-tête commun : n° de question, catégorie, difficulté, mon score. */
export function QuestionHeader() {
  const { gameState, playerId } = useGameStore();
  const p = gameState?.public || {};
  const priv = gameState?.private || {};
  const me = (p.leaderboard || []).find((x) => x.playerId === playerId);
  const d = DIFF[p.difficulty] || DIFF[1];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="qz-title text-2xl">Q{p.currentIdx + 1}<span className="text-slate-400 text-lg">/{p.total}</span></span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{p.categoryLabel}</span>
        <span className={`text-xs font-semibold ${d.color}`}>{'●'.repeat(p.difficulty || 1)}{'○'.repeat(4 - (p.difficulty || 1))} {d.label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {priv.streak >= 2 && <span className="rounded-full bg-orange-500/20 text-orange-200 px-2 py-0.5 font-bold">🔥 {priv.streak} d'affilée</span>}
        {me && <span className="rounded-full bg-indigo-500/25 px-2.5 py-0.5 font-mono font-bold">{me.points} pts</span>}
      </div>
    </div>
  );
}

export default function PhaseQuestion() {
  const { gameState, room } = useGameStore();
  const p = gameState?.public || {};
  const priv = gameState?.private || {};
  const hardcore = !!p.options?.hardcoreMode;
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setText(''); if (hardcore) setTimeout(() => inputRef.current?.focus(), 50); }, [p.currentIdx, hardcore]);

  const answered = new Set(p.answeredIds || []);
  const expected = (p.expectedIds || []).map((id) => room.players.find((x) => x.id === id)).filter(Boolean);
  const removed = new Set(priv.removed || []);
  const locked = priv.hasAnswered || priv.eliminated;
  const jokersOn = p.options?.jokers && !priv.eliminated;

  return (
    <div className="space-y-4">
      <QuestionHeader />
      <TimeBar endsAt={p.questionEndsAt} totalMs={(p.options?.timePerQuestionSec || 20) * 1000} />

      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-5 sm:py-7 text-center">
        <p className="text-lg sm:text-2xl font-bold leading-snug">{p.question}</p>
        {p.image && (
          <img key={p.image} src={p.image} alt="" className="mx-auto mt-4 max-h-44 sm:max-h-56 rounded-xl shadow-lg object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
      </motion.div>

      {priv.eliminated && <p className="text-center text-rose-300 font-semibold">💀 Tu es éliminé — regarde les autres se battre !</p>}

      {hardcore ? (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !locked) api.gameAction('answer', { value: text.trim() }); }}>
          <input ref={inputRef} value={locked && priv.myAnswer ? String(priv.myAnswer) : text} onChange={(e) => setText(e.target.value.slice(0, 60))} disabled={locked}
            aria-label="Ta réponse" placeholder="Tape ta réponse…" autoComplete="off" spellCheck={false}
            className="flex-1 min-w-0 rounded-xl bg-black/40 border-2 border-white/15 focus:border-cyan-300 px-4 py-3 text-lg font-semibold outline-none disabled:opacity-60" />
          <button className="btn btn-primary" disabled={locked || !text.trim()}>Valider</button>
        </form>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {(p.answers || []).map((a, i) => {
            const gone = removed.has(i);
            const picked = priv.myAnswer === i;
            return (
              <motion.button key={i} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                disabled={locked || gone} onClick={() => api.gameAction('answer', { idx: i })}
                className={`qz-answer qz-a${i} ${picked ? 'qz-picked' : ''} ${(locked && !picked) || gone ? 'qz-dim' : ''}`}>
                <span className="qz-shape" aria-hidden="true">{SHAPES[i]}</span>
                <span className="text-base sm:text-lg leading-tight">{gone ? '—' : a}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {jokersOn && !locked && (priv.jokers?.fifty || priv.jokers?.double || priv.doubled) && (
        <div className="flex justify-center gap-2">
          {priv.jokers?.fifty && (
            <button type="button" onClick={() => api.gameAction('joker', { type: 'fifty' })} className="rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-bold hover:bg-white/20" style={{ minHeight: 0 }}>
              ✂️ 50/50
            </button>
          )}
          {priv.doubled ? <span className="rounded-full bg-yellow-400/20 border border-yellow-300/50 px-4 py-1.5 text-sm font-bold text-yellow-200">✖️2 activé !</span> : priv.jokers?.double && (
            <button type="button" onClick={() => api.gameAction('joker', { type: 'double' })} className="rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-bold hover:bg-white/20" style={{ minHeight: 0 }}>
              ✖️2 Double
            </button>
          )}
        </div>
      )}

      {priv.hasAnswered && <p className="text-center text-cyan-200 text-sm font-semibold">✓ Réponse envoyée{priv.doubled ? ' (points ×2)' : ''} — on attend les autres…</p>}

      <div className="flex flex-wrap justify-center gap-1.5" aria-label="Qui a répondu">
        {expected.map((pl) => (
          <span key={pl.id} title={pl.pseudo} className={`rounded-full transition ${answered.has(pl.id) ? 'ring-2 ring-cyan-300' : 'opacity-35 grayscale'}`}>
            <Avatar id={pl.avatar} size="sm" />
          </span>
        ))}
      </div>
    </div>
  );
}
