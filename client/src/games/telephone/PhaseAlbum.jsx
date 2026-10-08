import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import DrawingView from './DrawingView.jsx';

/**
 * Album : on découvre comment chaque phrase a évolué de joueur en joueur,
 * façon conversation. L'hôte tourne les pages, tout le monde voit la même chose.
 */
export default function PhaseAlbum() {
  const { gameState, room, playerId } = useGameStore();
  const pub = gameState?.public || {};
  const entries = pub.entries || [];
  const albums = pub.albums || [];
  const isHost = playerId === room.hostId;
  const lastRef = useRef(null);

  const allShown = entries.length >= pub.total;
  const isLastAlbum = pub.albumIdx >= pub.albumCount - 1;

  // Amène la dernière entrée révélée à l'écran
  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [pub.albumIdx, entries.length]);

  const verb = (entry, index) => {
    if (entry.type === 'drawing') return 'a dessiné';
    return index === 0 ? 'a écrit' : 'a deviné';
  };

  return (
    <div className="space-y-6">
      {/* En-tête de l'album */}
      <div className="text-center space-y-3">
        <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-slate-300 bg-white/5 border border-white/10 rounded-full px-3 py-1">
          Album {pub.albumIdx + 1} / {pub.albumCount}
        </span>
        <div className="flex items-center justify-center gap-3">
          <Avatar id={pub.owner?.avatar} size="lg" ring />
          <h2 className="gp-title text-4xl sm:text-5xl leading-none text-left">
            L'album<br className="sm:hidden" /> de {pub.owner?.pseudo}
          </h2>
        </div>
        {/* Sommaire : l'hôte peut rouvrir un album */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {albums.map((a, i) => {
            const active = i === pub.albumIdx;
            const cls = `px-3 py-1 rounded-full text-xs border transition-colors ${
              active
                ? 'bg-gradient-to-r from-pink-500 to-violet-500 border-transparent text-white'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`;
            const label = <>{a.done ? '✓ ' : ''}{a.owner.pseudo}</>;
            return isHost ? (
              <button
                key={a.owner.id}
                type="button"
                onClick={() => api.gameAction('albumGoto', { index: i })}
                aria-current={active}
                className={`${cls} hover:border-pink-300`}
                style={{ minHeight: 0 }}
              >
                {label}
              </button>
            ) : (
              <span key={a.owner.id} className={cls}>{label}</span>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <ol className="space-y-5 max-w-xl mx-auto w-full">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const right = index % 2 === 1;
          return (
            <motion.li
              key={`${pub.albumIdx}-${index}`}
              ref={isLast ? lastRef : null}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className={`flex items-end gap-2 ${right ? 'flex-row-reverse' : ''}`}
            >
              <Avatar id={entry.author.avatar} size="md" />
              <div className={`min-w-0 flex-1 flex flex-col ${right ? 'items-end' : 'items-start'}`}>
                <p className="text-xs text-slate-400 mb-1 px-1">
                  <strong className="text-slate-200">{entry.author.pseudo}</strong> {verb(entry, index)}
                  {entry.auto && <span className="text-slate-500"> · complété automatiquement</span>}
                </p>
                {entry.type === 'text' ? (
                  <p
                    className={`gp-hand text-2xl sm:text-3xl leading-snug px-5 py-3 max-w-full break-words shadow-lg ${
                      right
                        ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white rounded-3xl rounded-br-md'
                        : 'bg-white text-slate-800 rounded-3xl rounded-bl-md'
                    }`}
                  >
                    {entry.text}
                  </p>
                ) : entry.strokes.length === 0 ? (
                  <p className="gp-hand text-xl px-5 py-6 rounded-2xl border-2 border-dashed border-white/15 text-slate-400 w-full text-center">
                    Pas de dessin…
                  </p>
                ) : (
                  <div className={`gp-polaroid w-full ${right ? 'rotate-1' : '-rotate-1'}`}>
                    <DrawingView strokes={entry.strokes} animate={isLast} className="rounded" />
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>

      <p className="text-center text-xs text-slate-500">{entries.length} / {pub.total} pages</p>

      {pub.finished && (
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center gp-title text-3xl"
        >
          🎉 Tous les albums ont été lus !
        </motion.p>
      )}

      {/* Commandes */}
      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {!(allShown && isLastAlbum) && (
            <button className="gp-btn text-lg" onClick={() => api.gameAction('albumNext', {})}>
              {allShown ? '📖 Album suivant' : '▶ Révéler la suite'}
            </button>
          )}
          {pub.finished && (
            <button className="gp-btn text-lg" onClick={() => api.gameAction('restart', {})}>
              🔁 Nouvelle partie
            </button>
          )}
          <button className="gp-btn-ghost" onClick={() => api.gameAction('endGame', {})}>
            🏠 Retour au lobby
          </button>
        </div>
      ) : (
        <p className="text-center text-slate-400 italic text-sm">
          {pub.finished ? "Tous les albums ont été lus. En attente de l'hôte…" : "L'hôte tourne les pages…"}
        </p>
      )}
    </div>
  );
}
