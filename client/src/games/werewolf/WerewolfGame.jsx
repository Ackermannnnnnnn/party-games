import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSounds } from '../../hooks/useSounds.js';
import { socket } from '../../lib/socket.js';
import { AnimatePresence, motion } from 'framer-motion';
import PhaseDealRoles from './PhaseDealRoles.jsx';
import PhaseMayorElection from './PhaseMayorElection.jsx';
import PhaseCupidon from './PhaseCupidon.jsx';
import PhaseLovers from './PhaseLovers.jsx';
import PhaseGuard from './PhaseGuard.jsx';
import PhaseWolves from './PhaseWolves.jsx';
import PhaseWhiteWolf from './PhaseWhiteWolf.jsx';
import PhaseSeer from './PhaseSeer.jsx';
import PhaseWitch from './PhaseWitch.jsx';
import PhaseDayReveal from './PhaseDayReveal.jsx';
import PhaseHunter from './PhaseHunter.jsx';
import PhaseDayVote from './PhaseDayVote.jsx';
import PhaseLynch from './PhaseLynch.jsx';
import PhaseGameOver from './PhaseGameOver.jsx';
import MyRoleBadge from './MyRoleBadge.jsx';

const phaseComponents = {
  DEAL_ROLES:        PhaseDealRoles,
  MAYOR_ELECTION:    PhaseMayorElection,
  NIGHT_CUPIDON:     PhaseCupidon,
  NIGHT_LOVERS:      PhaseLovers,
  NIGHT_GUARD:       PhaseGuard,
  NIGHT_WEREWOLVES:  PhaseWolves,
  NIGHT_WHITE_WOLF:  PhaseWhiteWolf,
  NIGHT_SEER:        PhaseSeer,
  NIGHT_WITCH:       PhaseWitch,
  DAY_REVEAL:        PhaseDayReveal,
  DAY_HUNTER:        PhaseHunter,
  DAY_VOTE:          PhaseDayVote,
  DAY_LYNCH:         PhaseLynch,
  GAME_OVER:         PhaseGameOver,
};

const NIGHT_PHASES = ['NIGHT_CUPIDON','NIGHT_LOVERS','NIGHT_GUARD','NIGHT_WEREWOLVES','NIGHT_WHITE_WOLF','NIGHT_SEER','NIGHT_WITCH'];
const DAY_PHASES   = ['DAY_REVEAL','DAY_HUNTER','DAY_VOTE','DAY_LYNCH'];

export default function WerewolfGame() {
  const gameState = useGameStore((s) => s.gameState);
  const { play } = useSounds();
  const phase = gameState?.public?.phase;
  const myRole = gameState?.private?.role;
  const isNight = NIGHT_PHASES.includes(phase);
  const isDay   = DAY_PHASES.includes(phase);

  // Sons d'événements liés à la phase
  useEffect(() => {
    switch (phase) {
      case 'DEAL_ROLES':       play('reveal'); break;
      case 'MAYOR_ELECTION':   play('ww_day'); break;
      case 'NIGHT_CUPIDON':    play('ww_cupid'); break;
      case 'NIGHT_GUARD':      play('ww_guard'); break;          // SON DISTINCT
      case 'NIGHT_WEREWOLVES': play('ww_wolves'); break;
      case 'NIGHT_WHITE_WOLF': play('ww_wolves'); break;
      case 'NIGHT_SEER':       play('ww_seer'); break;
      case 'NIGHT_WITCH':      play('ww_witch'); break;
      case 'DAY_REVEAL':       play('ww_day'); setTimeout(() => play('ww_death'), 600); break;
      // pas de son auto au DAY_HUNTER : le tir résonne quand le chasseur tire
      case 'DAY_VOTE':         play('vote'); break;
      case 'DAY_LYNCH':        play('ww_lynch'); break;
      case 'GAME_OVER': {
        const winner = gameState?.public?.result?.winner;
        if (winner === 'wolves' || winner === 'white_wolf') play('ww_wolves_win');
        else play('ww_village_win');
        break;
      }
    }
  }, [phase]);

  // Son du tir : déclenché par l'event serveur quand le chasseur valide
  useEffect(() => {
    const onEvent = (e) => {
      if (e?.type === 'hunterShot') play('ww_hunter');
    };
    socket.on('game:event', onEvent);
    return () => socket.off('game:event', onEvent);
  }, []);

  if (!gameState) return null;
  const Component = phaseComponents[phase];
  if (!Component) return <div className="card">Phase inconnue: {phase}</div>;

  const bgClass = isNight
    ? 'bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950'
    : isDay
      ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-orange-950/60'
      : 'bg-slate-900';

  // On affiche le badge "Mon rôle" sauf pendant la phase DEAL (qui montre déjà la carte)
  // et GAME_OVER (qui révèle tout).
  const showBadge = myRole && phase !== 'DEAL_ROLES' && phase !== 'GAME_OVER';

  return (
    <div className={`relative rounded-2xl transition-colors duration-700 ${bgClass}`}>
      {showBadge && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4 flex justify-end">
          <MyRoleBadge roleId={myRole} />
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase + (gameState.public?.day ?? '')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
        >
          <Component />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
