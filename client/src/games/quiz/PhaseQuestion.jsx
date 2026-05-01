import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';
import { motion } from 'framer-motion';

const COLORS = [
  'bg-rose-600 hover:bg-rose-500',
  'bg-sky-600 hover:bg-sky-500',
  'bg-amber-600 hover:bg-amber-500',
  'bg-emerald-600 hover:bg-emerald-500',
];
const SHAPES = ['▲', '◆', '●', '■'];

const DIFFICULTY_BADGES = {
  1: { label: 'Facile',    color: 'bg-emerald-500/20 text-emerald-300', max: 100 },
  2: { label: 'Moyen',     color: 'bg-amber-500/20 text-amber-300',     max: 200 },
  3: { label: 'Difficile', color: 'bg-orange-500/20 text-orange-300',   max: 300 },
  4: { label: 'Extrême',   color: 'bg-rose-500/20 text-rose-300',       max: 500 },
};

export default function PhaseQuestion() {
  const { gameState, room, playerId } = useGameStore();
  const p = gameState?.public || {};
  const priv = gameState?.private || {};
  const isHardcore = !!p.options?.hardcoreMode;
  const isBR = !!p.options?.battleRoyaleMode;
  const myAnswered = priv.hasAnswered || (p.answeredIds || []).includes(playerId);
  const iAmEliminated = priv.eliminated;

  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setText('');
    if (isHardcore && !myAnswered && !iAmEliminated) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [p.currentIdx]);

  const submitHardcore = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    api.gameAction('answer', { value: v });
    setText('');
  };

  const diff = DIFFICULTY_BADGES[p.difficulty] || DIFFICULTY_BADGES[1];

  // Vue "tu es éliminé" en Battle Royale
  if (iAmEliminated) {
    return (
      <div className="card text-center py-10 space-y-4">
        <div className="text-6xl">💀</div>
        <h2 className="font-display text-2xl text-rose-300">Tu es éliminé</h2>
        <p className="text-slate-300">Tu peux observer la fin de la partie.</p>
        <p className="text-slate-400 text-sm">Question {p.currentIdx + 1} / {p.total}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs sm:text-sm text-slate-400">
          Question {p.currentIdx + 1} / {p.total}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${diff.color}`}>
            {diff.label} · max {diff.max} pts
          </span>
          {isHardcore && <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] uppercase font-semibold">Hardcore</span>}
          {isBR && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] uppercase font-semibold">⚔️ Battle Royale</span>}
          {p.questionEndsAt && <Timer endsAt={p.questionEndsAt} />}
        </div>
      </div>

      {/* Image (optionnelle) */}
      {p.image && (
        <motion.div
          key={p.image}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <img
            src={p.image}
            alt="illustration"
            className="rounded-xl max-h-[280px] w-auto object-contain shadow-lg"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </motion.div>
      )}

      <motion.h2
        key={p.currentIdx}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-display text-xl sm:text-3xl text-center text-brand-light px-2 leading-snug"
      >
        {p.question}
      </motion.h2>

      {!isHardcore && p.answers && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {p.answers.map((ans, idx) => (
            <button
              key={idx}
              disabled={myAnswered}
              onClick={() => api.gameAction('answer', { idx })}
              className={`text-left rounded-xl p-4 text-white font-semibold shadow-lg transition-transform ${COLORS[idx]} ${
                myAnswered ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'
              }`}
            >
              <span className="text-2xl mr-2">{SHAPES[idx]}</span>
              {ans}
            </button>
          ))}
        </div>
      )}

      {isHardcore && (
        <form onSubmit={submitHardcore} className="space-y-3">
          {!myAnswered ? (
            <>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 50))}
                placeholder="Tape ta réponse…"
                maxLength={50}
                autoFocus
                autoComplete="off"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                Valider la réponse
              </button>
              <p className="text-center text-xs text-slate-400">
                Casse, accents et ponctuation sont ignorés.
              </p>
            </>
          ) : (
            <p className="text-center text-emerald-300 py-4">
              ✓ Réponse envoyée — en attente des autres…
            </p>
          )}
        </form>
      )}

      <div className="text-center text-sm text-slate-400">
        {myAnswered
          ? '✓ Réponse envoyée — en attente des autres…'
          : (isBR
              ? '⚠️ Mauvaise réponse = élimination !'
              : 'Réponds vite, gagne plus de points.')
        }
      </div>

      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {room.players.map(pl => {
          const eliminated = (p.eliminatedIds || []).includes(pl.id);
          const ans = (p.answeredIds || []).includes(pl.id);
          return (
            <span
              key={pl.id}
              className={`px-2 py-1 rounded-full text-xs ${
                eliminated ? 'bg-rose-900/40 text-rose-300 line-through' :
                ans ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {eliminated ? '💀' : ans ? '✓' : '⏳'} {pl.pseudo}
            </span>
          );
        })}
      </div>
    </div>
  );
}
