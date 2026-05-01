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

export default function PhaseDayReveal() {
  const { gameState, room } = useGameStore();
  const day = gameState?.public?.day;
  const deaths = gameState?.public?.nightDeaths || [];

  return (
    <div className="card text-center py-10 sm:py-14 space-y-6">
      <motion.div
        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-6xl sm:text-7xl"
      >🌅</motion.div>
      <h2 className="font-display text-2xl sm:text-3xl text-amber-200">Jour {day} — Le village se réveille…</h2>

      {deaths.length === 0 && (
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-emerald-300 text-lg"
        >
          ☀️ Personne n'est mort cette nuit !
        </motion.p>
      )}

      {deaths.length > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 max-w-md mx-auto"
        >
          <p className="text-slate-300">
            {deaths.length === 1 ? 'Une victime a été retrouvée :' : 'Des victimes ont été retrouvées :'}
          </p>
          {deaths.map((d, i) => {
            const p = room.players.find(pl => pl.id === d.playerId);
            const role = ROLE_DISPLAY[d.roleId] || { icon: '❓', label: d.roleId || '?' };
            return (
              <motion.div
                key={i}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.6 }}
                className="bg-rose-500/20 border border-rose-500 rounded-xl p-4 space-y-2"
              >
                <p className="font-display text-2xl text-rose-100">💀 {p?.pseudo || '?'}</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 + i * 0.6 }}
                  className="text-base text-slate-300"
                >
                  Il était {role.icon} <strong className="text-white">{role.label}</strong>
                </motion.p>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
