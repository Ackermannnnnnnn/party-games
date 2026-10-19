import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds, playSuccess, playFail } from '../../hooks/useSounds.js';
import PhaseQuestion from './PhaseQuestion.jsx';
import PhaseReveal from './PhaseReveal.jsx';
import PhasePodium from './PhasePodium.jsx';

export const SHAPES = ['▲', '◆', '●', '■'];
export const DIFF = { 1: { label: 'Facile', color: 'text-emerald-300' }, 2: { label: 'Moyen', color: 'text-amber-300' }, 3: { label: 'Difficile', color: 'text-orange-400' }, 4: { label: 'Extrême', color: 'text-rose-400' } };

/** Barre de temps qui se vide. */
export function TimeBar({ endsAt, totalMs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, []);
  if (!endsAt) return null;
  const left = Math.max(0, endsAt - now);
  const frac = Math.min(1, left / totalMs);
  const sec = Math.ceil(left / 1000);
  const color = frac > 0.5 ? '#22d3ee' : frac > 0.2 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex items-center gap-3" aria-label={`${sec} secondes`}>
      <div className="qz-bar flex-1"><span style={{ width: `${frac * 100}%`, background: color }} /></div>
      <span className={`font-mono font-bold tabular-nums w-8 text-right ${sec <= 5 ? 'text-rose-300 animate-pulse' : ''}`}>{sec}</span>
    </div>
  );
}

function Countdown({ endsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, []);
  const left = Math.max(0, (endsAt || 0) - now);
  const n = Math.ceil(left / 1000) - 1;
  const p = useGameStore((s) => s.gameState?.public) || {};
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">{p.total} questions · {p.options?.timePerQuestionSec}s chacune</p>
      <AnimatePresence mode="wait">
        <motion.span key={n} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.35 }}
          className="qz-title text-9xl text-white drop-shadow-[0_0_30px_rgba(99,102,241,0.8)]">
          {n > 0 ? n : 'GO !'}
        </motion.span>
      </AnimatePresence>
      <p className="text-slate-300">{p.options?.hardcoreMode ? '⌨️ Réponse libre : tape la réponse' : 'Touche la bonne réponse le plus vite possible'}{p.options?.battleRoyaleMode ? ' · ⚔️ une erreur et tu es éliminé !' : ''}</p>
    </div>
  );
}

export default function QuizGame() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const { play } = useSounds();
  const p = gameState?.public;
  const phase = p?.phase;
  const lastRevealKey = useRef(null);

  // Son à la révélation : bonne ou mauvaise réponse
  useEffect(() => {
    if (phase !== 'REVEAL' || !p?.reveal) return;
    const key = `${p.gameNo}-${p.reveal.index}`;
    if (lastRevealKey.current === key) return;
    lastRevealKey.current = key;
    const mine = p.reveal.perPlayer?.[playerId];
    if (mine?.correct) playSuccess(); else if (mine) playFail();
  }, [phase, p?.reveal?.index]);
  useEffect(() => { if (phase === 'COUNTDOWN') play('reveal'); }, [phase, p?.gameNo]);

  if (!p) return null;
  let content = null;
  if (phase === 'COUNTDOWN') content = <Countdown endsAt={p.phaseEndsAt} />;
  else if (phase === 'QUESTION') content = <PhaseQuestion />;
  else if (phase === 'REVEAL') content = <PhaseReveal />;
  else if (phase === 'PODIUM') content = <PhasePodium />;

  return (
    <div className="qz-shell">
      <div className="qz-inner">
        <motion.div key={`${phase}-${p.currentIdx}-${p.gameNo}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            {content}
          </motion.div>
      </div>
    </div>
  );
}
