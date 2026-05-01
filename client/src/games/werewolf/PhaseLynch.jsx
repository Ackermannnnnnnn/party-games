import { useGameStore } from '../../store/gameStore.js';
import { motion } from 'framer-motion';

const ROLE_DISPLAY = {
  villageois:  { icon: '🧑‍🌾', label: 'Villageois' },
  loup_garou:  { icon: '🐺',   label: 'Loup-Garou' },
  loup_blanc:  { icon: '🐺‍❄️', label: 'Loup Blanc' },
  voyante:     { icon: '🔮',   label: 'Voyante' },
  sorciere:    { icon: '🧙‍♀️', label: 'Sorcière' },
  chasseur:    { icon: '🏹',   label: 'Chasseur' },
  cupidon:     { icon: '💘',   label: 'Cupidon' },
  garde:       { icon: '🛡️',   label: 'Garde' },
};

export default function PhaseLynch() {
  const { gameState, room } = useGameStore();
  const last = gameState?.public?.lastLynch;
  if (!last) return null;
  const lynched = last.lynchedId ? room.players.find(p => p.id === last.lynchedId) : null;
  const role = last.lynchedRoleId ? ROLE_DISPLAY[last.lynchedRoleId] : null;

  return (
    <div className="card text-center py-12 space-y-5">
      {last.tied ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-6xl">🤷</div>
          <h2 className="font-display text-2xl mt-3 text-slate-300">Égalité !</h2>
          <p className="text-slate-400 text-sm mt-2">Personne n'est lynché aujourd'hui.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3">
          <div className="text-6xl">⚖️</div>
          <h2 className="font-display text-2xl text-rose-200">{lynched?.pseudo} a été lynché !</h2>
          {role && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="text-base text-slate-300"
            >
              Il était {role.icon} <strong className="text-white">{role.label}</strong>
            </motion.p>
          )}
          <p className="text-slate-400 text-sm pt-2">Le village se prépare pour la nuit…</p>
        </motion.div>
      )}
    </div>
  );
}
