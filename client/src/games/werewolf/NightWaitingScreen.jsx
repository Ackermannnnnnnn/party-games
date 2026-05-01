import { motion } from 'framer-motion';

/**
 * Écran "le village dort" affiché aux joueurs qui ne sont pas concernés
 * par la phase de nuit en cours.
 */
export default function NightWaitingScreen({ icon = '🌙', title, subtitle }) {
  return (
    <div className="card text-center py-12 sm:py-16 space-y-4">
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-6xl sm:text-8xl"
      >
        {icon}
      </motion.div>
      <h2 className="font-display text-2xl sm:text-3xl text-slate-300">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
    </div>
  );
}
