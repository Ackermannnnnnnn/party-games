import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';

const COLORS = [
  'bg-rose-600',
  'bg-sky-600',
  'bg-amber-600',
  'bg-emerald-600',
];

const SHAPES = ['▲', '◆', '●', '■'];

export default function PhaseReveal() {
  const { gameState, room, playerId } = useGameStore();
  const p = gameState?.public || {};
  const isHost = playerId === room.hostId;

  const myTally = (p.tally || []).find(t => t.playerId === playerId);

  // Tri des joueurs par score décroissant
  const ranked = room.players
    .map(pl => ({ ...pl, score: p.scores?.[pl.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="card space-y-5">
      <div className="text-center">
        <p className="text-xs sm:text-sm text-slate-400">
          Question {p.currentIdx + 1} / {p.total}
        </p>
        <h2 className="font-display text-xl sm:text-2xl text-brand-light mt-1">{p.question}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(p.answers || []).map((ans, idx) => {
          const isCorrect = idx === p.correct;
          return (
            <div
              key={idx}
              className={`rounded-xl p-4 text-white font-semibold relative overflow-hidden ${COLORS[idx]} ${
                !isCorrect ? 'opacity-30' : ''
              }`}
            >
              <span className="text-2xl mr-2">{SHAPES[idx]}</span>
              {ans}
              {isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl"
                >
                  ✓
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mon résultat */}
      {myTally && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center rounded-xl py-3 ${
            !myTally.answered ? 'bg-slate-700/50 text-slate-300' :
            myTally.correct ? 'bg-emerald-600/30 text-emerald-200' : 'bg-rose-600/30 text-rose-200'
          }`}
        >
          {!myTally.answered && '⏰ Tu n\'as pas répondu à temps.'}
          {myTally.answered && myTally.correct && (
            <>🎉 Bonne réponse ! <strong>+{myTally.points} pts</strong></>
          )}
          {myTally.answered && !myTally.correct && '❌ Mauvaise réponse — 0 pt.'}
        </motion.div>
      )}

      {/* Mini classement */}
      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Classement actuel</h3>
        <ul className="space-y-1">
          {ranked.map((pl, i) => (
            <li key={pl.id} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
              pl.id === playerId ? 'bg-brand/20' : 'bg-slate-900/40'
            }`}>
              <span>
                <span className="text-slate-400 mr-2">#{i + 1}</span>
                {pl.pseudo}{pl.id === playerId && ' (toi)'}
              </span>
              <span className="font-mono font-bold text-brand-light">{pl.score}</span>
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <button
          className="btn btn-ghost w-full text-sm"
          onClick={() => api.gameAction('skipReveal', {})}
        >
          ⏭ Passer à la suite
        </button>
      )}
    </div>
  );
}
