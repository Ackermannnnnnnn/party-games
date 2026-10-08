import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import DrawingView from './DrawingView.jsx';

/**
 * Album : on découvre comment chaque phrase a évolué de joueur en joueur.
 * L'hôte tourne les pages, tout le monde voit la même chose en même temps.
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
    <div className="card space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Album {pub.albumIdx + 1} / {pub.albumCount}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-brand-light">
          📖 L'album de {pub.owner?.pseudo}
        </h2>
      </div>

      {/* Sommaire : l'hôte peut rouvrir un album */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {albums.map((a, i) => {
          const active = i === pub.albumIdx;
          const cls = `px-3 py-1 rounded-full text-xs border ${
            active ? 'bg-brand border-brand-light text-white' : 'bg-slate-900/60 border-slate-700 text-slate-300'
          }`;
          const label = <>{a.done ? '✓ ' : ''}{a.owner.pseudo}</>;
          return isHost ? (
            <button
              key={a.owner.id}
              type="button"
              onClick={() => api.gameAction('albumGoto', { index: i })}
              aria-current={active}
              className={`${cls} hover:border-brand-light`}
              style={{ minHeight: 0 }}
            >
              {label}
            </button>
          ) : (
            <span key={a.owner.id} className={cls}>{label}</span>
          );
        })}
      </div>

      <ol className="space-y-4 max-w-xl mx-auto w-full">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          return (
            <motion.li
              key={`${pub.albumIdx}-${index}`}
              ref={isLast ? lastRef : null}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Avatar id={entry.author.avatar} size="sm" />
                <span>
                  <strong className="text-white">{entry.author.pseudo}</strong> {verb(entry, index)}
                  {entry.auto && <span className="text-slate-500"> (complété automatiquement)</span>}
                </span>
              </div>
              {entry.type === 'text' ? (
                <p className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3 text-lg sm:text-xl font-semibold break-words">
                  « {entry.text} »
                </p>
              ) : entry.strokes.length === 0 ? (
                <p className="bg-slate-900/40 border border-dashed border-slate-700 rounded-xl px-4 py-6 text-center text-slate-400 italic">
                  Pas de dessin
                </p>
              ) : (
                <DrawingView strokes={entry.strokes} animate={isLast} />
              )}
            </motion.li>
          );
        })}
      </ol>

      <p className="text-center text-xs text-slate-500">
        {entries.length} / {pub.total} pages
      </p>

      {/* Commandes */}
      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {!(allShown && isLastAlbum) && (
            <button className="btn btn-primary" onClick={() => api.gameAction('albumNext', {})}>
              {allShown ? '📖 Album suivant' : '▶ Révéler la suite'}
            </button>
          )}
          {pub.finished && (
            <button className="btn btn-primary" onClick={() => api.gameAction('restart', {})}>
              🔁 Nouvelle partie
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => api.gameAction('endGame', {})}>
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
