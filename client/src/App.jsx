import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Howler } from 'howler';
import { useSocket, api } from './hooks/useSocket.js';
import { useGameStore } from './store/gameStore.js';
import Home from './pages/Home.jsx';
import GameRoom from './pages/GameRoom.jsx';
import VolumeToggle from './components/VolumeToggle.jsx';
import { AnimatePresence, motion } from 'framer-motion';

const REDIRECT_LABELS = {
  HOST_LEFT:        "L'hôte a quitté la room.",
  ROOM_CLOSED:      'La room a été fermée.',
  ROOM_NOT_FOUND:   "Cette room n'existe plus.",
  PLAYER_NOT_FOUND: 'Ta session de joueur a expiré.',
};

export default function App() {
  useSocket();
  const navigate     = useNavigate();
  const connected    = useGameStore((s) => s.connected);
  const serverError  = useGameStore((s) => s.serverError);
  const setError     = useGameStore((s) => s.setError);
  const room         = useGameStore((s) => s.room);
  const redirectHome = useGameStore((s) => s.redirectHomeReason);
  const clearRedirect = useGameStore((s) => s.clearRedirect);
  const resetRoom    = useGameStore((s) => s.resetRoom);

  // Watcher : si le serveur déclenche un retour au menu, on navigate
  useEffect(() => {
    if (redirectHome) {
      navigate('/');
      const label = REDIRECT_LABELS[redirectHome] || redirectHome;
      setError({ code: redirectHome, message: label });
      clearRedirect();
    }
  }, [redirectHome]);

  // Déblocage de l'AudioContext au 1er clic (Chrome/Safari bloquent l'audio
  // jusqu'à une interaction utilisateur). Une fois débloqué, plus besoin.
  useEffect(() => {
    const unlock = () => {
      try {
        if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume?.();
      } catch {}
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const goHome = () => {
    if (room) {
      api.leaveRoom();
      resetRoom();
    }
    navigate('/');
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <header className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between border-b border-slate-800/60 sticky top-0 bg-slate-900/80 backdrop-blur z-10">
        <button
          onClick={goHome}
          className="font-display text-xl sm:text-2xl tracking-wider text-brand-light hover:text-brand transition-colors"
        >
          PARTY GAMES
        </button>
        <div className="flex items-center gap-2">
          <VolumeToggle />
          <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {connected ? '● connecté' : '○ déconnecté'}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 sm:p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:code" element={<GameRoom />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <AnimatePresence>
        {serverError && (
          <motion.div
            key={serverError.code + (serverError.message || '')}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            onAnimationComplete={() => setTimeout(() => setError(null), 3500)}
            className="fixed bottom-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md bg-rose-500 text-white px-4 py-3 rounded-xl shadow-2xl text-sm sm:text-base text-center cursor-pointer"
            onClick={() => setError(null)}
          >
            ⚠️ {serverError.message || serverError.code}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
