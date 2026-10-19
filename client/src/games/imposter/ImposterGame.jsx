import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from '../../components/Avatar.jsx';
import PhaseReveal from './PhaseReveal.jsx';
import PhaseDescribe from './PhaseDescribe.jsx';
import PhaseRoundEnd from './PhaseRoundEnd.jsx';
import PhaseVote from './PhaseVote.jsx';
import PhaseMrWhiteGuess from './PhaseMrWhiteGuess.jsx';
import PhaseResults from './PhaseResults.jsx';

const phaseComponents = {
  REVEAL:           PhaseReveal,
  DESCRIBE:         PhaseDescribe,
  ROUND_END:        PhaseRoundEnd,
  VOTE:             PhaseVote,
  MR_WHITE_GUESS:   PhaseMrWhiteGuess,
  RESULTS:          PhaseResults,
};

const PHASE_LABEL = {
  REVEAL: 'Ton mot secret', DESCRIBE: 'Les indices', ROUND_END: 'Fin du tour', VOTE: 'Le vote', MR_WHITE_GUESS: 'Mr White', RESULTS: 'Résultats',
};

/** Mon mot, caché derrière un bouton (on joue souvent côte à côte). */
function MyWord() {
  const priv = useGameStore((s) => s.gameState?.private) || {};
  const [show, setShow] = useState(false);
  if (priv.spectator || (!priv.word && priv.role !== 'mr_white')) return null;
  const label = priv.role === 'mr_white' ? '🎩 Mr White' : priv.word;
  return (
    <button type="button" style={{ minHeight: 0 }}
      onPointerDown={() => setShow(true)} onPointerUp={() => setShow(false)} onPointerLeave={() => setShow(false)}
      onKeyDown={(e) => e.key === ' ' && setShow(true)} onKeyUp={() => setShow(false)}
      className="select-none rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
      title="Maintiens appuyé pour voir ton mot">
      {show ? <span className="text-amber-200">{label}</span> : '👁 Mon mot'}
    </button>
  );
}

/** Classement cumulé de toutes les parties jouées dans la room. */
export function Scoreboard({ scores, playerId, gained = {}, compact = false }) {
  if (!scores?.length) return null;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <ol className={`space-y-1.5 ${compact ? 'text-sm' : ''}`}>
      {scores.map((s, i) => (
        <motion.li key={s.id} layout className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${s.id === playerId ? 'bg-brand/20 border border-brand/40' : 'bg-white/[0.04]'} ${s.left ? 'opacity-50' : ''}`}>
          <span className="w-6 text-center">{medals[i] || `${i + 1}.`}</span>
          <Avatar id={s.avatar} size="xs" />
          <span className="flex-1 truncate font-medium">{s.pseudo}{s.id === playerId ? ' (toi)' : ''}</span>
          {gained[s.id] > 0 && <span className="text-emerald-300 text-xs font-bold">+{gained[s.id]}</span>}
          <span className="font-mono font-bold tabular-nums">{s.points}</span>
        </motion.li>
      ))}
    </ol>
  );
}

function ScoresButton() {
  const { gameState, playerId } = useGameStore();
  const [open, setOpen] = useState(false);
  const scores = gameState?.public?.scores || [];
  if (!scores.some((s) => s.points > 0)) return null;
  return (
    <>
      <button type="button" style={{ minHeight: 0 }} onClick={() => setOpen(true)}
        className="rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold whitespace-nowrap">🏆 Classement</button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
              <motion.div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-4" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}>
                <p className="imp-title text-2xl text-center mb-3">🏆 Classement</p>
                <Scoreboard scores={scores} playerId={playerId} />
                <button type="button" className="btn btn-ghost w-full mt-4" onClick={() => setOpen(false)}>Fermer</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export default function ImposterGame() {
  const gameState = useGameStore((s) => s.gameState);
  const { play } = useSounds();
  const phase = gameState?.public?.phase;
  const isSpectator = !!gameState?.private?.spectator;

  useEffect(() => {
    if (phase === 'REVEAL') play('reveal');
    if (phase === 'VOTE') play('vote');
    if (phase === 'RESULTS') {
      const winner = gameState?.public?.result?.winner;
      const role = gameState?.private?.role;
      // Mr White partage la victoire des imposteurs, sauf s'il devine le mot (il gagne alors seul)
      const youWon = winner === 'civils'   ? role === 'civil'
                   : winner === 'mr_white' ? role === 'mr_white'
                   : winner === 'imposter' ? (role === 'imposter' || role === 'mr_white')
                   : false;
      if (winner && role) play(youWon ? 'victory' : 'defeat');
    }
  }, [phase]);

  if (!gameState) return null;
  const pub = gameState.public;
  const Component = phaseComponents[phase];

  return (
    <div className="imp-shell">
      <div className="imp-inner space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-rose-200/80">🕵️ Imposteur · partie {pub.round}</p>
            <h2 className="imp-title text-3xl sm:text-4xl leading-none">{PHASE_LABEL[phase] || ''}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pub.theme && phase !== 'RESULTS' && <span className="imp-chip">{pub.theme.label}</span>}
            <ScoresButton />
            {phase !== 'RESULTS' && <MyWord />}
          </div>
        </div>

        {isSpectator ? (
          <div className="text-center py-10 space-y-3">
            <div className="text-6xl">👀</div>
            <h3 className="imp-title text-3xl">Tu es spectateur</h3>
            <p className="text-slate-300">Une partie est en cours. Tu joueras dès la <strong>prochaine partie</strong>.</p>
            {pub.descriptions && Object.keys(pub.descriptions).length > 0 && <p className="text-slate-400 text-sm">Observe les indices et devine qui est l'imposteur 😉</p>}
          </div>
        ) : !Component ? <p>Phase inconnue : {phase}</p> : (
          <motion.div key={phase + (pub.round || '')} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Component />
            </motion.div>
        )}
      </div>
    </div>
  );
}
