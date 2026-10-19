import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import { SHAPES, TimeBar } from './QuizGame.jsx';
import { QuestionHeader } from './PhaseQuestion.jsx';

export default function PhaseReveal() {
  const { gameState, room, playerId } = useGameStore();
  const p = gameState?.public || {};
  const r = p.reveal || {};
  const hardcore = !!p.options?.hardcoreMode;
  const isHost = playerId === room.hostId;
  const mine = r.perPlayer?.[playerId];
  const total = Math.max(1, (r.counts || []).reduce((a, b) => a + b, 0));
  const pickers = (i) => Object.entries(r.perPlayer || {}).filter(([, v]) => v.answered && v.value === i).map(([id]) => (p.leaderboard || []).find((x) => x.playerId === id)).filter(Boolean);
  const top = (p.leaderboard || []).slice(0, 5);
  const last = p.currentIdx + 1 >= p.total;

  return (
    <div className="space-y-4">
      <QuestionHeader />
      <div className="rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-4 text-center">
        <p className="text-base sm:text-xl font-bold leading-snug">{p.question}</p>
      </div>

      {/* Mon résultat */}
      {mine && !mine.eliminated && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220 }}
          className={`rounded-2xl px-4 py-3 text-center border ${mine.correct ? 'bg-emerald-500/20 border-emerald-400/60' : 'bg-rose-500/15 border-rose-400/50'}`}>
          <p className="qz-title text-4xl">{mine.correct ? '✅ Bonne réponse !' : mine.answered ? '❌ Raté…' : '⏰ Trop tard !'}</p>
          {mine.correct && (
            <p className="text-sm font-semibold">
              +{mine.points} pts{mine.doubled ? ' (×2)' : ''}{mine.streak >= 2 ? ` · 🔥 série de ${mine.streak}` : ''}{mine.fast ? ' · ⚡ éclair' : ''}
            </p>
          )}
          {mine.justEliminated && <p className="text-sm font-bold text-rose-200 mt-1">💀 Tu es éliminé !</p>}
          {mine.saved && <p className="text-sm text-amber-200 mt-1">😅 Tout le monde s'est trompé : personne n'est éliminé.</p>}
        </motion.div>
      )}

      {/* La bonne réponse et la répartition */}
      {hardcore ? (
        <div className="space-y-2">
          <p className="text-center">Réponse : <strong className="text-emerald-300 text-xl">{r.correctAnswer}</strong></p>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {(r.typed || []).map((t) => {
              const pl = (p.leaderboard || []).find((x) => x.playerId === t.id);
              return (
                <li key={t.id} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm ${t.correct ? 'bg-emerald-500/25 text-emerald-100' : 'bg-rose-500/20 text-rose-100 line-through decoration-1'}`}>
                  <Avatar id={pl?.avatar} size="xs" /> {String(t.value)}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {(p.answers || []).map((a, i) => {
            const ok = i === r.correct;
            const n = r.counts?.[i] || 0;
            return (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
                className={`qz-answer qz-a${i} ${ok ? 'qz-picked' : 'qz-dim'} flex-col !items-stretch !gap-2`}>
                <span className="flex items-center gap-3">
                  <span className="qz-shape" aria-hidden="true">{ok ? '✓' : SHAPES[i]}</span>
                  <span className="flex-1 text-base sm:text-lg leading-tight">{a}</span>
                  <span className="font-mono text-sm">{n}</span>
                </span>
                <span className="qz-bar !h-1.5"><motion.span initial={{ width: 0 }} animate={{ width: `${(n / total) * 100}%` }} transition={{ delay: 0.4, duration: 0.6 }} style={{ background: 'rgba(255,255,255,0.85)' }} /></span>
                {pickers(i).length > 0 && (
                  <span className="flex -space-x-1.5">{pickers(i).map((pl) => <Avatar key={pl.playerId} id={pl.avatar} size="xs" className="ring-2 ring-black/30" />)}</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Classement */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Classement</p>
        <ol className="space-y-1">
          {top.map((pl, i) => {
            const res = r.perPlayer?.[pl.playerId];
            return (
              <motion.li layout key={pl.playerId} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${pl.playerId === playerId ? 'bg-indigo-500/25' : ''} ${pl.eliminated ? 'opacity-50' : ''}`}>
                <span className="w-5 text-center text-sm">{['🥇', '🥈', '🥉'][i] || i + 1}</span>
                <Avatar id={pl.avatar} size="xs" />
                <span className="flex-1 truncate text-sm font-semibold">{pl.pseudo}{pl.eliminated ? ' 💀' : ''}</span>
                {res?.points > 0 && <span className="text-xs font-bold text-emerald-300">+{res.points}</span>}
                {pl.streak >= 2 && <span className="text-xs">🔥{pl.streak}</span>}
                <span className="font-mono text-sm font-bold tabular-nums">{pl.points}</span>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1"><TimeBar endsAt={p.phaseEndsAt} totalMs={7000} /></div>
        {isHost && (
          <button type="button" className="btn btn-primary !py-2 text-sm" onClick={() => api.gameAction('next', {})}>{last ? '🏆 Résultats' : 'Suivante ⏭'}</button>
        )}
      </div>
    </div>
  );
}
