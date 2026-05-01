import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';

const REASON_LABELS = {
  empty: 'vide',
  'too-short': '< 2 chars',
  'wrong-letter': 'mauvaise lettre',
  'challenged': 'contestée',
};

export default function PhaseScoring() {
  const { gameState, room, playerId } = useGameStore();
  const p = gameState?.public || {};
  const isHost = playerId === room.hostId;
  const r = p.result;
  if (!r) return null;
  const categories = p.categories || [];

  const ranked = [...room.players]
    .map(pl => ({
      ...pl,
      total: r.result[pl.id]?.total || 0,
      cumul: p.scores?.[pl.id] || 0,
      perCategory: r.result[pl.id]?.perCategory || {},
      fullClear: r.result[pl.id]?.fullClear,
      isMe: pl.id === playerId,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="card space-y-5">
      <div className="text-center">
        <p className="text-xs sm:text-sm text-slate-400">Manche {r.round} / {p.totalRounds}</p>
        <h2 className="font-display text-2xl sm:text-3xl text-brand-light">
          📊 Scores — Lettre {r.letter}
        </h2>
      </div>

      {/* Classement de la manche */}
      <div className="space-y-2">
        {ranked.map((pl, i) => (
          <motion.div
            key={pl.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-xl p-3 ${pl.isMe ? 'bg-brand/20 border border-brand/50' : 'bg-slate-900/40'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold flex items-center gap-2">
                <span className="text-slate-400 font-mono">#{i + 1}</span>
                {pl.pseudo}{pl.isMe && ' (toi)'}
                {pl.fullClear && <span className="text-amber-300 text-sm">🌟 carton plein</span>}
              </span>
              <span className="font-mono font-bold text-brand-light text-lg">
                +{pl.total} <span className="text-xs text-slate-400">(total: {pl.cumul})</span>
              </span>
            </div>
            {/* Détail par catégorie */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
              {categories.map(cat => {
                const c = pl.perCategory[cat.id] || {};
                return (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between rounded px-2 py-1 ${
                      c.valid ? (c.duplicate ? 'bg-amber-500/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-200') : 'bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    <span className="truncate">
                      <span className="text-xs opacity-60">{cat.icon}</span>{' '}
                      <strong>{c.value || '—'}</strong>
                    </span>
                    <span className="text-xs font-mono">
                      {c.points} pt{c.points > 1 ? 's' : ''}
                      {!c.valid && c.reason && <span className="opacity-60"> ({REASON_LABELS[c.reason]})</span>}
                      {c.valid && c.duplicate && <span className="opacity-60"> (doublon)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {isHost && (
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          {p.canContinue ? (
            <button onClick={() => api.gameAction('nextRound', {})} className="btn btn-primary">
              ▶ Manche suivante
            </button>
          ) : (
            <p className="text-slate-300 italic self-center">
              Dernière manche jouée — le podium arrive…
            </p>
          )}
          <button onClick={() => api.gameAction('endGame', {})} className="btn btn-ghost">
            🏁 Voir le podium final
          </button>
        </div>
      )}
      {!isHost && (
        <p className="text-center text-slate-400 italic text-sm">En attente de l'hôte…</p>
      )}
    </div>
  );
}
