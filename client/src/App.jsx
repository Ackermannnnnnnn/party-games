import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Howler } from 'howler';
import { useSocket, api } from './hooks/useSocket.js';
import { useGameStore } from './store/gameStore.js';
import Home from './pages/Home.jsx';
import GameRoom from './pages/GameRoom.jsx';
import Admin from './pages/Admin.jsx';
import VolumeToggle from './components/VolumeToggle.jsx';
import { AnimatePresence, motion } from 'framer-motion';

const REDIRECT_LABELS = {
  HOST_LEFT:        "L'hôte a quitté la room.",
  KICKED:           "L'hôte t'a expulsé de la room.",
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
  const notice       = useGameStore((s) => s.notice);
  const setNotice    = useGameStore((s) => s.setNotice);

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
    <div className="min-h-full app-bg">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-slate-950/75 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <button onClick={goHome} className="group flex items-center gap-2" style={{ minHeight: 0 }} aria-label="Accueil">
            <Logo />
            <span className="font-display text-lg sm:text-xl text-slate-50 group-hover:text-white">Party Games</span>
          </button>
          <div className="flex items-center gap-1.5">
            <VolumeToggle />
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-slate-400" title={connected ? 'Connecté au serveur' : 'Connexion au serveur…'}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]' : 'bg-rose-400 animate-pulse'}`} />
              <span className="hidden sm:inline">{connected ? 'En ligne' : 'Connexion…'}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 pb-10 pt-3 sm:px-4 sm:pt-5">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:code" element={<GameRoom />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <AnimatePresence>
        {notice && !serverError && (
          <motion.div
            key={notice.message}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onAnimationComplete={() => setTimeout(() => setNotice(null), 4000)}
            className="fixed z-50 top-[4.25rem] left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md bg-slate-800 text-slate-50 px-4 py-3 rounded-2xl shadow-2xl ring-1 ring-white/10 text-sm text-center cursor-pointer"
            onClick={() => setNotice(null)}
            role="status"
          >
            {notice.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serverError && (
          <motion.div
            key={serverError.code + (serverError.message || '')}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            onAnimationComplete={() => setTimeout(() => setError(null), 3500)}
            className="fixed z-50 bottom-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md bg-[#2a1520] text-rose-100 px-4 py-3 rounded-2xl shadow-2xl ring-1 ring-rose-400/40 text-sm sm:text-base text-center cursor-pointer"
            onClick={() => setError(null)}
          >
            {serverError.message || serverError.code}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Logo : trois jetons empilés (iris, jaune, menthe). */
function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="shrink-0 transition-transform group-hover:-rotate-6">
      <circle cx="9" cy="15" r="7" fill="#7b61ff" />
      <circle cx="17" cy="15" r="7" fill="#ffc93c" style={{ mixBlendMode: 'screen' }} />
      <circle cx="13" cy="8.5" r="5.5" fill="#3ddc97" style={{ mixBlendMode: 'screen' }} />
    </svg>
  );
}
