import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';

const STEP_ICONS = { WRITE: '✍️', DRAW: '🎨', GUESS: '🔍' };
const stepType = (i) => (i === 0 ? 'WRITE' : i % 2 === 1 ? 'DRAW' : 'GUESS');

/** Minuteur circulaire : l'anneau se vide, passe à l'orange puis au rouge. */
export function RingTimer({ endsAt, durationSec, size = 64 }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return null;
  const remaining = Math.max(0, endsAt - now);
  const total = Math.max(1, (durationSec || 1) * 1000);
  const ratio = Math.min(1, remaining / total);
  const sec = Math.ceil(remaining / 1000);
  const r = size / 2 - 5;
  const circumference = 2 * Math.PI * r;
  const color = sec <= 5 ? '#f43f5e' : sec <= 15 ? '#f59e0b' : '#a78bfa';
  return (
    <div
      className={`relative shrink-0 ${sec <= 5 && remaining > 0 ? 'animate-pulse' : ''}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${sec} secondes restantes`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums" style={{ color }}>
        {sec}
      </span>
    </div>
  );
}

/** Suivi des étapes : ✍️ — 🎨 — 🔍 — 🎨 … */
function StepTracker({ step, totalSteps }) {
  return (
    <ol className="flex items-center justify-center gap-1 sm:gap-1.5" aria-label={`Étape ${step + 1} sur ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li key={i} className="flex items-center gap-1 sm:gap-1.5">
            {i > 0 && (
              <span className={`h-0.5 w-3 sm:w-6 rounded-full ${i <= step ? 'bg-pink-300/70' : 'bg-white/10'}`} aria-hidden="true" />
            )}
            <motion.span
              className={`flex items-center justify-center rounded-full text-sm sm:text-base ${
                state === 'current'
                  ? 'w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/30'
                  : state === 'done'
                    ? 'w-7 h-7 sm:w-8 sm:h-8 bg-white/15'
                    : 'w-7 h-7 sm:w-8 sm:h-8 bg-white/5 opacity-50'
              }`}
              animate={state === 'current' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={state === 'current' ? { duration: 1.6, repeat: Infinity } : {}}
            >
              {state === 'done' ? '✓' : STEP_ICONS[stepType(i)]}
            </motion.span>
          </li>
        );
      })}
    </ol>
  );
}

/** Joueurs de la partie : qui a terminé, qui est encore en train de jouer. */
export function PlayersStrip() {
  const { gameState, room } = useGameStore();
  const pub = gameState?.public || {};
  const done = new Set(pub.doneIds || []);
  const required = new Set(pub.requiredIds || []);
  return (
    <ul className="flex flex-wrap justify-center gap-3">
      {(pub.players || []).map((p) => {
        const present = room.players.some((x) => x.id === p.id);
        const isDone = done.has(p.id);
        const waiting = required.has(p.id) && !isDone;
        return (
          <li key={p.id} className={`flex flex-col items-center w-14 ${present ? '' : 'opacity-35'}`} title={p.pseudo}>
            <motion.div className="relative" animate={isDone ? { y: [0, -4, 0] } : { y: 0 }} transition={{ duration: 0.4 }}>
              <Avatar id={p.avatar} size="md" className={isDone ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#12142b]' : ''} />
              {isDone && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 text-[#12142b] text-xs font-black flex items-center justify-center">✓</span>
              )}
              {waiting && (
                <span className="absolute -bottom-1 -right-1 px-1 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center gap-px">
                  <span className="gp-dot">•</span><span className="gp-dot">•</span><span className="gp-dot">•</span>
                </span>
              )}
            </motion.div>
            <span className="mt-1 text-[11px] text-slate-300 truncate max-w-full">{p.pseudo}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** En-tête commun aux étapes : suivi des étapes, titre, minuteur et commande de l'hôte. */
export default function GarticHeader({ title, subtitle }) {
  const { gameState, room, playerId } = useGameStore();
  const pub = gameState?.public || {};
  const isHost = playerId === room.hostId;
  const doneCount = (pub.requiredIds || []).filter((id) => (pub.doneIds || []).includes(id)).length;

  return (
    <div className="space-y-4">
      <StepTracker step={pub.step} totalSteps={pub.totalSteps} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="gp-title text-3xl sm:text-4xl leading-none">{title}</h2>
          {subtitle && <p className="text-slate-300 text-sm mt-1">{subtitle}</p>}
        </div>
        <RingTimer endsAt={pub.stepEndsAt} durationSec={pub.stepDurationSec} />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400 -mt-1">
        <span>{doneCount}/{(pub.requiredIds || []).length} ont terminé</span>
        {isHost && (
          <button
            type="button"
            onClick={() => api.gameAction('forceNext', {})}
            className="hover:text-pink-300 transition-colors"
            style={{ minHeight: 0 }}
            title="Terminer l'étape sans attendre les retardataires"
          >
            ⏭ passer à la suite
          </button>
        )}
      </div>
    </div>
  );
}

/** Écran affiché après avoir validé : on attend les autres, on peut encore modifier. */
export function WaitingCard({ icon, message, onEdit }) {
  return (
    <div className="text-center space-y-5 py-4">
      <div className="text-6xl"><span className="gp-wiggle">{icon}</span></div>
      <div>
        <p className="gp-title text-3xl">C'est envoyé !</p>
        <p className="text-slate-300 mt-1">{message}</p>
      </div>
      <PlayersStrip />
      <button type="button" className="gp-btn-ghost" onClick={onEdit}>✏️ Modifier</button>
    </div>
  );
}
