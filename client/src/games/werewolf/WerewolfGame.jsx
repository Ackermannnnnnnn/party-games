import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/800.css';
import { socket } from '../../lib/socket.js';
import { playTurnChime, useSounds } from '../../hooks/useSounds.js';
import Scene from './Scene.jsx';
import { MyCard, NarratorToggle, TimerRing } from './Hud.jsx';
import { Deal, Night } from './Night.jsx';
import { Debate, Execution, Hunter, MayorElected, MayorElection, Morning, Succession, Tiebreak } from './Day.jsx';
import GameOver from './GameOver.jsx';
import Chronicle from './Chronicle.jsx';
import { narrate, narrationKey, speak, stopSpeaking } from './narration.js';
import { useWerewolf } from './useWerewolf.js';

const STEP_SOUND = { CUPIDON: 'ww_cupid', LOVERS: 'ww_cupid', GUARD: 'ww_guard', WOLVES: 'ww_wolves', WHITE_WOLF: 'ww_wolves', SEER: 'ww_seer', WITCH: 'ww_witch', DUSK: 'ww_night' };

function skyFor(s) {
  if (s.phase === 'DEAL' || s.phase === 'NIGHT') return 'night';
  if (s.phase === 'MORNING') return 'dawn';
  if (s.phase === 'GAME_OVER') return { wolves: 'blood', village: 'gold', lovers: 'rose', white_wolf: 'night' }[s.result?.winner] || 'night';
  return 'day';
}

function isMyTurn(ctx) {
  const { s, priv, playerId, alive } = ctx;
  if (s.phase === 'HUNTER') return s.hunterId === playerId;
  if (s.phase === 'SUCCESSION') return s.successionFrom === playerId;
  if (s.phase === 'TIEBREAK') return s.mayorId === playerId;
  if (s.phase !== 'NIGHT' || !alive) return false;
  const r = priv.role;
  return (s.step === 'CUPIDON' && r === 'cupidon') || (s.step === 'LOVERS' && !!priv.lover) || (s.step === 'GUARD' && r === 'garde')
    || (s.step === 'WOLVES' && (r === 'loup_garou' || r === 'loup_blanc' || r === 'petite_fille'))
    || (s.step === 'WHITE_WOLF' && r === 'loup_blanc') || (s.step === 'SEER' && r === 'voyante') || (s.step === 'WITCH' && r === 'sorciere');
}

export default function WerewolfGame() {
  const ctx = useWerewolf();
  const { play } = useSounds();
  const [narrator, setNarratorState] = useState(() => {
    try { const v = localStorage.getItem('lg-narrator'); return v === null ? null : v === '1'; } catch { return null; }
  });
  const narratorOn = narrator ?? !!ctx?.isHost;
  const setNarrator = (v) => { setNarratorState(v); try { localStorage.setItem('lg-narrator', v ? '1' : '0'); } catch {} };
  const [flash, setFlash] = useState(0);

  const s = ctx?.s;
  const key = narrationKey(s);
  const lines = s ? narrate(s, ctx.name) : { title: '', text: '' };
  const myTurn = ctx ? isMyTurn(ctx) : false;

  // Annonces : voix du narrateur + ambiance sonore
  const lastKey = useRef(null);
  useEffect(() => {
    if (!s || lastKey.current === key) return;
    lastKey.current = key;
    if (narratorOn && lines.text) speak(lines.text);
    if (s.phase === 'NIGHT') play(STEP_SOUND[s.step] || 'ww_night');
    else if (s.phase === 'DEAL') play('reveal');
    else if (s.phase === 'MORNING') { play('ww_day'); if (s.morning?.deaths?.length) setTimeout(() => play('ww_death'), 900); }
    else if (s.phase === 'EXECUTION') { if (s.execution?.id) play('ww_lynch'); }
    else if (s.phase === 'DEBATE') play('vote');
    else if (s.phase === 'MAYOR_ELECTED') play('reveal');
    else if (s.phase === 'GAME_OVER') play(['wolves', 'white_wolf'].includes(s.result?.winner) ? 'ww_wolves_win' : 'ww_village_win');
  }, [key]);
  useEffect(() => () => stopSpeaking(), []);

  // « C'est ton tour » : petit carillon + vibration
  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (myTurn && !wasMyTurn.current) { playTurnChime(); try { navigator.vibrate?.([120, 80, 120]); } catch {} }
    wasMyTurn.current = myTurn;
  }, [myTurn]);

  // Coup de feu du chasseur
  useEffect(() => {
    const onEvent = (e) => { if (e?.type === 'hunterShot') { play('ww_hunter'); setFlash((f) => f + 1); } };
    socket.on('game:event', onEvent);
    return () => socket.off('game:event', onEvent);
  }, []);

  if (!ctx) return null;
  const phase = s.phase;
  const dayish = !['DEAL', 'NIGHT', 'GAME_OVER'].includes(phase);

  let stage = null;
  switch (phase) {
    case 'DEAL': stage = <Deal ctx={ctx} />; break;
    case 'NIGHT': stage = <Night ctx={ctx} />; break;
    case 'MORNING': stage = <Morning ctx={ctx} />; break;
    case 'HUNTER': stage = <Hunter ctx={ctx} />; break;
    case 'SUCCESSION': stage = <Succession ctx={ctx} />; break;
    case 'MAYOR_ELECTION': stage = <MayorElection ctx={ctx} />; break;
    case 'MAYOR_ELECTED': stage = <MayorElected ctx={ctx} />; break;
    case 'DEBATE': case 'RUNOFF': stage = <Debate ctx={ctx} />; break;
    case 'TIEBREAK': stage = <Tiebreak ctx={ctx} />; break;
    case 'EXECUTION': stage = <Execution ctx={ctx} />; break;
    case 'GAME_OVER': stage = <GameOver ctx={ctx} />; break;
    default: stage = <p className="text-center">…</p>;
  }

  const subtitle = phase === 'DEAL' ? 'Distribution des cartes' : phase === 'NIGHT' ? `Nuit ${s.night}` : phase === 'GAME_OVER' ? `${s.night} nuit${s.night > 1 ? 's' : ''}` : `Jour ${s.night}`;

  return (
    <Scene sky={skyFor(s)}>
      <AnimatePresence>
        {flash > 0 && (
          <motion.div key={flash} className="fixed inset-0 z-40 pointer-events-none bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />
        )}
      </AnimatePresence>
      <header className="flex items-start justify-between gap-3 pr-12 sm:pr-24">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-amber-100/70">{phase === 'NIGHT' || phase === 'DEAL' ? '🌙' : phase === 'GAME_OVER' ? '📜' : '☀️'} {subtitle}</p>
          <h2 className="lg-title text-2xl sm:text-4xl font-bold leading-tight truncate">{phase === 'GAME_OVER' ? 'Loup-Garou' : lines.title}</h2>
        </div>
      </header>
      <div className="flex items-center justify-end gap-2 mt-2">
        {phase !== 'GAME_OVER' && <TimerRing endsAt={s.stepEndsAt} k={key} />}
        <NarratorToggle on={narratorOn} setOn={setNarrator} />
        {phase !== 'GAME_OVER' && <MyCard ctx={ctx} />}
      </div>

      {phase !== 'GAME_OVER' && lines.text && (
        <AnimatePresence mode="wait">
          <motion.p key={key} initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            className="lg-narrator text-center text-base sm:text-xl leading-relaxed max-w-2xl mx-auto my-3 sm:my-5 text-amber-50/95">
            {lines.text}
          </motion.p>
        </AnimatePresence>
      )}
      {myTurn && phase !== 'NIGHT' && <p className="text-center text-[11px] uppercase tracking-[0.3em] text-amber-200 mb-2">C'est à toi</p>}

      <AnimatePresence mode="wait">
        <motion.div key={`${phase}-${s.step || ''}-${s.night}-${s.gameNo}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
          {stage}
        </motion.div>
      </AnimatePresence>

      {(dayish || phase === 'NIGHT') && (
        <div className="mt-5">
          <Chronicle s={s} name={ctx.name} secret={ctx.ghost?.secret} />
        </div>
      )}
    </Scene>
  );
}
