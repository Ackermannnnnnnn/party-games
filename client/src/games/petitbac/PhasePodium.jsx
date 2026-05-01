import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { api } from '../../hooks/useSocket.js';
import { motion, AnimatePresence } from 'framer-motion';

const REVEAL_DELAY_MS = 1300;
const INITIAL_DELAY_MS = 800;

export default function PhasePodium() {
  const { gameState, room, playerId } = useGameStore();
  const { play } = useSounds();
  const p = gameState?.public || {};
  const isHost = playerId === room.hostId;
  const [showHistory, setShowHistory] = useState(false);

  const ranking = (p.ranking || []).map(({ playerId: pid, points }) => ({
    pseudo: room.players.find(pl => pl.id === pid)?.pseudo || '?',
    points,
    isMe: pid === playerId,
    pid,
  }));

  const totalToReveal = ranking.length;
  const [revealedFromBottom, setRevealedFromBottom] = useState(0);
  const isRevealComplete = revealedFromBottom >= totalToReveal;

  useEffect(() => {
    if (totalToReveal === 0) return;
    const t = setTimeout(() => { setRevealedFromBottom(1); play('tick'); }, INITIAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [totalToReveal]);

  useEffect(() => {
    if (revealedFromBottom === 0 || isRevealComplete) return;
    const t = setTimeout(() => {
      setRevealedFromBottom(n => n + 1);
      if (revealedFromBottom + 1 >= totalToReveal - 2) play('reveal'); else play('tick');
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [revealedFromBottom]);

  useEffect(() => { if (isRevealComplete) play('victory'); }, [isRevealComplete]);

  const skipReveal = () => setRevealedFromBottom(totalToReveal);
  const isRevealed = (idx) => (totalToReveal - 1 - idx) < revealedFromBottom;

  const history = p.history || [];

  return (
    <div className="card text-center space-y-6 py-6 sm:py-10">
      <h2 className="font-display text-3xl sm:text-4xl text-brand-light">🏆 Podium final</h2>
      <p className="text-slate-400 text-sm">{history.length} manche{history.length > 1 ? 's' : ''} jouée{history.length > 1 ? 's' : ''}</p>

      {!isRevealComplete && (
        <button onClick={skipReveal} className="text-xs text-slate-500 hover:text-slate-300 underline">
          ⏭ Passer l'animation
        </button>
      )}

      <ol className="space-y-2 max-w-xl mx-auto text-left">
        {ranking.map((pl, idx) => {
          const realRank = idx;
          const revealed = isRevealed(idx);
          const medal = ['🥇', '🥈', '🥉'][realRank];
          const isTop3 = realRank < 3;
          return (
            <li key={pl.pid} className="relative">
              <AnimatePresence mode="wait">
                {!revealed ? (
                  <motion.div
                    key="ph"
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
                    key="rv"
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
                      <span className={realRank === 0 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}>
                        {medal || `#${realRank + 1}`}
                      </span>
                      <p className={`font-bold truncate ${pl.isMe ? 'text-brand-light' : ''}`}>
                        {pl.pseudo}{pl.isMe && ' (toi)'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-lg sm:text-xl text-brand-light">
                      {pl.points} pts
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {isRevealComplete && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => setShowHistory(!showHistory)} className="btn btn-ghost text-sm">
              {showHistory ? '🔼 Cacher l\'historique' : '📜 Voir toutes les manches'}
            </button>
            {isHost ? (
              <button className="btn btn-primary" onClick={() => api.gameAction('endGame', {})}>
                🔄 Retour au lobby (mêmes joueurs)
              </button>
            ) : (
              <p className="text-slate-400 italic text-sm self-center">En attente de l'hôte…</p>
            )}
          </div>
        </motion.div>
      )}

      {showHistory && (
        <div className="border-t border-slate-700 pt-4 text-left space-y-3 max-w-2xl mx-auto">
          {history.map((h) => (
            <div key={h.round} className="bg-slate-900/40 rounded-lg p-3">
              <p className="font-semibold mb-1">Manche {h.round} — Lettre {h.letter}</p>
              <ul className="text-sm space-y-0.5">
                {Object.entries(h.result)
                  .map(([pid, r]) => ({
                    pseudo: room.players.find(pl => pl.id === pid)?.pseudo || '?',
                    total: r.total,
                  }))
                  .sort((a, b) => b.total - a.total)
                  .map((x, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{x.pseudo}</span>
                      <span className="font-mono">{x.total} pts</span>
                    </li>
                  ))
                }
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
