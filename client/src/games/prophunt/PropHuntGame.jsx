import { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import { syncClock, roughSync } from '../blindtest/audio.js';

// La 3D (Three.js) n'est téléchargée qu'au lancement d'une partie
const PropHunt3D = lazy(() => import('./PropHunt3D.jsx'));
const ProfilePanel = lazy(() => import('./ProfilePanel.jsx'));
const webglOk = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

export default function PropHuntGame() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const room = useGameStore((s) => s.room);
  const p = gameState?.public;
  const isHost = playerId === room?.hostId;
  useEffect(() => { syncClock(); }, []);
  useEffect(() => { roughSync(p?.serverNow); }, [p?.serverNow]);
  if (!p) return null;

  if (p.phase === 'GAME_OVER') return <GameOver p={p} isHost={isHost} playerId={playerId} />;
  if (!webglOk) {
    return <div className="card text-center text-slate-300">Ton appareil ne gère pas la 3D (WebGL) : impossible de jouer à Prop Hunt ici.</div>;
  }
  return (
    <Suspense fallback={<div className="ph-screen flex items-center justify-center text-slate-300">Chargement de Prop Hunt…</div>}>
      <PropHunt3D p={p} playerId={playerId} isHost={isHost} />
    </Suspense>
  );
}

function GameOver({ p, isHost, playerId }) {
  const rows = p.ranking || [];
  return (
    <div className="card space-y-5 text-center">
      <p className="font-display text-4xl text-slate-50">🏆 Fin de la partie</p>
      {rows[0] && (
        <div className="flex flex-wrap justify-center gap-6">
          {rows.filter((r) => r.score === rows[0].score).map((r) => (
            <div key={r.id} className="flex flex-col items-center gap-2">
              <Avatar id={r.avatar} size="xl" />
              <p className="font-display text-3xl text-amber-300">{r.pseudo}</p>
            </div>
          ))}
        </div>
      )}
      <MyProgress progress={p.progress?.[playerId]} />
      <ol className="max-w-md mx-auto space-y-1 text-left">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${r.id === playerId ? 'bg-teal-400/15' : 'bg-white/[0.04]'}`}>
            <span className="w-5 text-center font-bold text-teal-200">{1 + rows.filter((o) => o.score > r.score).length}</span>
            <Avatar id={r.avatar} size="xs" />
            <span className="flex-1 truncate">{r.pseudo}</span>
            <span className="text-xs text-slate-400">{r.kills} trouvé(s) · {r.survived} survie(s){p.progress?.[r.id] ? ` · +${p.progress[r.id].gained} XP` : ''}</span>
            <span className="w-10 text-right font-semibold tabular-nums">{r.score}</span>
          </li>
        ))}
      </ol>
      {isHost && (
        <div className="flex justify-center gap-2">
          <button type="button" className="btn btn-token" onClick={() => api.gameAction('restart')}>Rejouer</button>
          <button type="button" className="btn btn-ghost" onClick={() => api.gameAction('endGame')}>Retour au salon</button>
        </div>
      )}
    </div>
  );
}

/** XP gagnée, niveau, succès débloqués à la fin de la partie. */
function MyProgress({ progress }) {
  const [open, setOpen] = useState(false);
  if (!progress) return <p className="text-xs text-slate-500">Calcul de l'XP…</p>;
  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-md mx-auto rounded-2xl bg-gradient-to-r from-teal-400/15 to-amber-300/10 ring-1 ring-teal-300/30 p-4 space-y-2">
      <p className="font-display text-2xl text-slate-50">+{progress.gained} XP {progress.leveledUp && <span className="text-amber-300">· niveau {progress.level} ! 🎉</span>}</p>
      <p className="text-sm text-slate-300">Niveau {progress.level} · {progress.title} · {progress.xp} XP au total</p>
      {progress.newAchievements?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">{progress.newAchievements.map((a) => <span key={a.id} className="rounded-full bg-amber-300/20 px-2.5 py-1 text-xs text-amber-200">{a.icon} {a.name}</span>)}</div>
      )}
      <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => setOpen(true)}>🎖️ Voir mon profil</button>
      {open && <Suspense fallback={null}><ProfilePanel onClose={() => setOpen(false)} /></Suspense>}
    </motion.div>
  );
}
