import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { api } from '../../hooks/useSocket.js';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../../components/Avatar.jsx';

const REVEAL_DELAY_MS = 1400;
const INITIAL_DELAY_MS = 1000;

export default function PhasePodium() {
  const { gameState, room, playerId } = useGameStore();
  const { play } = useSounds();
  const p = gameState?.public || {};
  const isHost = playerId === room.hostId;
  const [showRecap, setShowRecap] = useState(false);
  const isHardcore = !!p.options?.hardcoreMode;
  const isBR = !!p.options?.battleRoyaleMode;

  const ranking = (p.ranking || []).map(({ playerId: pid, points, eliminated }) => {
    const pl = room.players.find(x => x.id === pid);
    return {
      pseudo: pl?.pseudo || '?',
      avatar: pl?.avatar,
      points,
      isMe: pid === playerId,
      eliminated,
      pid,
    };
  });

  // Reveal progressif : on dévoile depuis le bas vers le haut.
  // revealedFromBottom = combien d'items dévoilés en partant du dernier.
  const totalToReveal = ranking.length;
  const [revealedFromBottom, setRevealedFromBottom] = useState(0);
  const isRevealComplete = revealedFromBottom >= totalToReveal;

  useEffect(() => {
    if (totalToReveal === 0) return;
    const t1 = setTimeout(() => {
      setRevealedFromBottom(1);
      play('tick');
    }, INITIAL_DELAY_MS);
    return () => clearTimeout(t1);
  }, [totalToReveal]);

  useEffect(() => {
    if (revealedFromBottom === 0 || isRevealComplete) return;
    const t = setTimeout(() => {
      setRevealedFromBottom(n => n + 1);
      // son spécial pour le top 3 (les 3 derniers révélés)
      if (revealedFromBottom + 1 >= totalToReveal - 2) {
        play('reveal');
      } else {
        play('tick');
      }
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [revealedFromBottom]);

  useEffect(() => {
    if (isRevealComplete) play('victory');
  }, [isRevealComplete]);

  const skipReveal = () => setRevealedFromBottom(totalToReveal);

  const history = p.history || [];
  const myCorrectCount = history.filter(h => h.perPlayer?.[playerId]?.correct).length;

  /**
   * Affichage final attendu :
   *   ┌───────────────────────────────┐
   *   │  🥇  1er  (révélé en DERNIER) │  ← TOP
   *   │  🥈  2e   (révélé avant)      │
   *   │  🥉  3e                       │
   *   │  #4                           │
   *   │  ...                          │
   *   │  #N (dernier, révélé EN PREMIER) │  ← BOTTOM
   *   └───────────────────────────────┘
   *
   * Reveal: on dévoile #N en premier, puis #N-1, ..., puis #1.
   */
  const isRevealed = (rank) => {
    // rank 0 = 1er (top), N-1 = dernier (bottom)
    const fromBottom = totalToReveal - 1 - rank; // 0 pour dernier, N-1 pour 1er
    return fromBottom < revealedFromBottom;
  };

  return (
    <div className="card text-center space-y-6 py-6 sm:py-10">
      <h2 className="font-display text-3xl sm:text-4xl text-brand-light">
        🏆 Résultats finaux
        {isBR && <span className="block text-base sm:text-lg text-purple-300 mt-1">⚔️ Battle Royale</span>}
      </h2>

      {!isRevealComplete && (
        <div className="space-y-2">
          <p className="text-slate-300 italic">Révélation en cours…</p>
          <button onClick={skipReveal} className="text-xs text-slate-500 hover:text-slate-300 underline">
            ⏭ Passer l'animation
          </button>
        </div>
      )}

      {/* Liste : ordre normal du DOM (1er en haut, dernier en bas).
          Chaque slot est soit "?" placeholder (caché) soit la carte révélée. */}
      <ol className="space-y-2 max-w-xl mx-auto text-left">
        {ranking.map((pl, idx) => {
          const realRank = idx; // 0 = 1er
          const revealed = isRevealed(idx);
          const medal = ['🥇', '🥈', '🥉'][realRank];
          const isTop3 = realRank < 3;

          return (
            <li key={pl.pid} className="relative">
              <AnimatePresence mode="wait">
                {!revealed ? (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="bg-slate-800/40 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-700"
                  >
                    <span className="text-slate-500 text-2xl font-mono">#{realRank + 1}</span>
                    <span className="text-slate-500 text-sm">?</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      isTop3 ? (
                        realRank === 0 ? 'bg-amber-500/30 border border-amber-400 shadow-lg shadow-amber-500/20' :
                        realRank === 1 ? 'bg-slate-500/30 border border-slate-400' :
                        'bg-orange-700/30 border border-orange-500'
                      ) : 'bg-slate-900/50'
                    } ${pl.isMe ? 'ring-2 ring-brand' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`${realRank === 0 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
                        {medal || `#${realRank + 1}`}
                      </span>
                      <Avatar id={pl.avatar} size={realRank === 0 ? 'md' : 'sm'} />
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${pl.isMe ? 'text-brand-light' : ''}`}>
                          {pl.pseudo}{pl.isMe && ' (toi)'}
                        </p>
                        {pl.eliminated && (
                          <p className="text-xs text-rose-300">💀 éliminé</p>
                        )}
                      </div>
                    </div>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="font-mono font-bold text-lg sm:text-xl text-brand-light"
                    >
                      {pl.points} pts
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {isRevealComplete && (
        <>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-300 text-sm"
          >
            Tu as eu <strong className="text-emerald-300">{myCorrectCount}</strong> bonne(s) réponse(s) sur {history.length}.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
          >
            <button onClick={() => setShowRecap(!showRecap)} className="btn btn-ghost text-sm">
              {showRecap ? '🔼 Cacher le récap' : '🔍 Voir le récap des questions'}
            </button>
            {isHost ? (
              <button className="btn btn-primary" onClick={() => api.gameAction('endGame', {})}>
                🔄 Retour au lobby (mêmes joueurs)
              </button>
            ) : (
              <p className="text-slate-400 italic text-sm self-center">En attente de l'hôte…</p>
            )}
          </motion.div>
        </>
      )}

      {showRecap && (
        <div className="border-t border-slate-700 pt-4 text-left space-y-3 max-w-2xl mx-auto">
          {history.map((h, i) => {
            const my = h.perPlayer?.[playerId];
            return (
              <div key={i} className="bg-slate-900/40 rounded-lg p-3">
                <p className="text-sm font-semibold mb-2">
                  <span className="text-slate-400 mr-2">Q{i + 1}.</span>
                  {h.question}
                </p>
                {h.image && (
                  <img src={h.image} alt="" className="max-h-32 rounded mb-2" onError={(e) => e.target.style.display='none'} />
                )}
                <p className="text-sm">
                  Bonne réponse :{' '}
                  <span className="text-emerald-300 font-semibold">{h.correctAnswer}</span>
                </p>
                {my && (
                  <p className="text-sm">
                    {!my.answered && <span className="text-slate-400 italic">⏰ Pas répondu</span>}
                    {my.answered && my.correct && (
                      <span className="text-emerald-300">✓ Bonne réponse (+{my.points} pts)</span>
                    )}
                    {my.answered && !my.correct && (
                      <span className="text-rose-300">
                        ✗ Tu as répondu :{' '}
                        <strong>
                          {isHardcore ? my.value : (h.answers?.[my.value] ?? '?')}
                        </strong>
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
