import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_INFO = {
  villageois:  { icon: '🧑‍🌾', label: 'Villageois',   desc: 'Tu n\'as pas de pouvoir spécial. Aide les autres à démasquer les loups en discutant et en votant la journée.' },
  loup_garou:  { icon: '🐺',   label: 'Loup-Garou',  desc: 'Chaque nuit avec tes complices, vous choisissez ensemble une victime à dévorer.' },
  loup_blanc:  { icon: '🐺‍❄️', label: 'Loup Blanc',  desc: 'Tu votes avec les loups la nuit. Une nuit sur deux (paire), tu peux dévorer un loup. Tu gagnes SEUL si tu finis dernier survivant.' },
  voyante:     { icon: '🔮',   label: 'Voyante',     desc: 'Chaque nuit, tu peux découvrir le rôle d\'un joueur de ton choix.' },
  sorciere:    { icon: '🧙‍♀️', label: 'Sorcière',    desc: 'Tu as deux potions : sauver la victime des loups, ou tuer un joueur. Une seule utilisation par potion sur toute la partie.' },
  chasseur:    { icon: '🏹',   label: 'Chasseur',    desc: 'Quand tu meurs, tu emportes un joueur de ton choix avec toi.' },
  cupidon:     { icon: '💘',   label: 'Cupidon',     desc: 'La 1ère nuit, désigne 2 amoureux. Si l\'un meurt, l\'autre meurt aussi de chagrin.' },
  garde:       { icon: '🛡️',   label: 'Garde',       desc: 'Chaque nuit tu protèges un joueur des loups. Tu ne peux pas protéger le même joueur 2 nuits de suite. La sorcière peut quand même tuer.' },
};

/**
 * Badge flottant qui montre au joueur son rôle, avec un point d'interrogation
 * pour ouvrir l'explication. Affiché en permanence pendant la partie.
 */
export default function MyRoleBadge({ roleId }) {
  const [open, setOpen] = useState(false);
  const info = ROLE_INFO[roleId];
  if (!info) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-600 hover:border-brand text-slate-100 px-3 py-1.5 rounded-full shadow-lg text-sm transition"
        title="Voir mon rôle et son explication"
      >
        <span className="text-lg">{info.icon}</span>
        <span className="font-medium">{info.label}</span>
        <span className="ml-1 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">?</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-3">
                <div className="text-6xl">{info.icon}</div>
                <h3 className="font-display text-2xl text-brand-light">{info.label}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{info.desc}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="btn btn-ghost w-full mt-5"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
