import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * Flash plein écran "c'est ton tour". Ne bloque pas les clics (pointer-events: none)
 * et disparaît tout seul : le parent passe `show` à true pendant ~1,5 s.
 */
export default function TurnAlert({ show, label = 'À TOI DE JOUER !', emoji = '🎤' }) {
  const reduceMotion = useReducedMotion();

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          key="turn-alert"
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Halo violet sur les bords de l'écran */}
          <motion.div
            className="absolute inset-0"
            style={{ boxShadow: 'inset 0 0 120px 30px rgba(124, 58, 237, 0.65)' }}
            animate={reduceMotion ? undefined : { opacity: [0.4, 1, 0.4, 1, 0.6] }}
            transition={{ duration: 1.4 }}
          />
          <motion.div
            className="relative bg-brand text-white rounded-3xl px-8 py-6 shadow-2xl text-center border-2 border-brand-light"
            initial={reduceMotion ? false : { scale: 0.4, rotate: -6 }}
            animate={reduceMotion ? undefined : { scale: [0.4, 1.15, 1], rotate: [-6, 3, 0] }}
            exit={reduceMotion ? undefined : { scale: 0.8 }}
            transition={{ duration: 0.45 }}
          >
            <div className="text-5xl sm:text-6xl">{emoji}</div>
            <div className="font-display text-4xl sm:text-6xl tracking-wider mt-1">{label}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
