import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import RoleCard from './RoleCard.jsx';
import { role } from './roles.js';
import { canSpeak, stopSpeaking } from './narration.js';

/** Anneau de compte à rebours synchronisé sur l'échéance serveur. */
export function TimerRing({ endsAt, k }) {
  const [now, setNow] = useState(() => Date.now());
  const total = useRef({ k: null, ms: 1 });
  if (total.current.k !== k) total.current = { k, ms: Math.max(1000, (endsAt || 0) - Date.now()) };
  if (endsAt && endsAt - Date.now() > total.current.ms) total.current.ms = endsAt - Date.now();
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  if (!endsAt) return null;
  const left = Math.max(0, endsAt - now);
  const sec = Math.ceil(left / 1000);
  const frac = Math.min(1, left / total.current.ms);
  const C = 2 * Math.PI * 18;
  const urgent = sec <= 10;
  return (
    <div className="relative w-12 h-12 shrink-0" title={`${sec} s`} aria-label={`${sec} secondes restantes`}>
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r="18" fill="rgba(2,6,23,0.55)" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={urgent ? '#f87171' : '#fde68a'} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-mono text-sm font-bold tabular-nums ${urgent ? 'text-red-300 animate-pulse' : 'text-amber-100'}`}>
        {sec >= 100 ? `${Math.floor(sec / 60)}m` : sec}
      </span>
    </div>
  );
}

/** Ma carte : cachée par défaut (on joue souvent côte à côte), on la retourne pour la voir. */
export function MyCard({ ctx }) {
  const [open, setOpen] = useState(false);
  const { priv, name } = ctx;
  if (!priv.role) return null;
  const r = role(priv.role);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ minHeight: 0 }}
        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-black/40 border border-amber-200/30 pl-1.5 pr-3 py-1.5 text-xs font-semibold hover:bg-black/55 transition">
        <span className="w-6 h-8 rounded-[5px] lg-card-back flex items-center justify-center text-[10px]" aria-hidden="true">🌕</span>
        Ma carte
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
              <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
                className="flex flex-col items-center gap-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <RoleCard roleId={priv.role} size="lg" flipped desc />
                <div className="lg-glass w-full p-4 text-sm space-y-1.5">
                  <p className="text-amber-200 lg-title text-xs">Objectif : {r.goal}</p>
                  {priv.pack?.length > 0 && <p>🐺 Ta meute : <strong>{priv.pack.map(name).join(', ')}</strong></p>}
                  {priv.lover && <p>❤️ Tu es amoureux de <strong>{name(priv.lover)}</strong>. Si l'un meurt, l'autre aussi.</p>}
                  {priv.potions && <p>🧪 Potions : vie {priv.potions.heal ? '✅' : '❌'} · mort {priv.potions.kill ? '✅' : '❌'}</p>}
                  {priv.seerHistory?.length > 0 && (
                    <p>🔮 Visions : {priv.seerHistory.map((h) => `${name(h.id)} = ${role(h.role).icon} ${role(h.role).short}`).join(' · ')}</p>
                  )}
                  {!priv.alive && <p className="text-slate-400">💀 Tu es mort. Tu peux suivre la partie, mais plus parler !</p>}
                </div>
                <button type="button" className="lg-btn lg-btn-ghost" onClick={() => setOpen(false)}>Cacher ma carte</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export function NarratorToggle({ on, setOn }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" style={{ minHeight: 0 }} onClick={() => { if (on) stopSpeaking(); setOn(!on); }}
      title={on ? 'Couper le narrateur vocal' : 'Activer le narrateur vocal sur cet appareil'}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-base border transition ${on ? 'bg-amber-300/20 border-amber-200/50' : 'bg-black/40 border-white/15 opacity-70'}`}>
      {on ? '🗣️' : '🤐'}
    </button>
  );
}

/** Barre d'action en bas d'un écran (texte + bouton). */
export function ActionBar({ children }) {
  return <div className="lg-glass p-3 sm:p-4 flex flex-col items-center gap-3 text-center">{children}</div>;
}
