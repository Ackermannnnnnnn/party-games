import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES_GUIDE = [
  { id: 'villageois', icon: '🧑‍🌾', label: 'Villageois', team: 'village',
    desc: 'Aucun pouvoir. Discute, déduit, vote la journée pour démasquer les loups.' },
  { id: 'loup_garou', icon: '🐺', label: 'Loup-Garou', team: 'wolves',
    desc: 'Avec ses complices, choisit chaque nuit qui dévorer. Les loups gagnent quand ils sont aussi nombreux que les villageois.' },
  { id: 'loup_blanc', icon: '🐺‍❄️', label: 'Loup Blanc', team: 'wolves',
    desc: 'Joue avec les loups la nuit. Une nuit sur deux, peut dévorer un loup. Gagne SEUL s\'il finit dernier survivant — il a donc intérêt à éliminer ses propres complices !' },
  { id: 'voyante', icon: '🔮', label: 'Voyante', team: 'village',
    desc: 'Chaque nuit, découvre le rôle d\'un joueur. À toi d\'utiliser cette info subtilement sans te griller.' },
  { id: 'sorciere', icon: '🧙‍♀️', label: 'Sorcière', team: 'village',
    desc: 'Deux potions, une seule fois chacune sur toute la partie : 💚 sauver la victime des loups, 🧪 tuer un joueur.' },
  { id: 'chasseur', icon: '🏹', label: 'Chasseur', team: 'village',
    desc: 'Quand il meurt (loup, sorcière, lynchage...), il choisit IMMÉDIATEMENT un joueur à abattre avec lui.' },
  { id: 'cupidon', icon: '💘', label: 'Cupidon', team: 'village',
    desc: 'La 1ère nuit uniquement, désigne 2 joueurs amoureux. Si l\'un meurt, l\'autre meurt aussi de chagrin.' },
  { id: 'garde', icon: '🛡️', label: 'Garde', team: 'village',
    desc: 'Chaque nuit, protège un joueur des loups. Ne peut pas protéger le même 2 nuits de suite. La sorcière passe outre.' },
  { id: 'maire', icon: '👑', label: 'Maire (élu)', team: 'village',
    desc: 'Élu au début par tout le village. Son vote pour le lynchage compte DOUBLE.' },
];

const TEAM_COLORS = {
  village: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100',
  wolves:  'bg-rose-500/15 border-rose-500/40 text-rose-100',
};

/**
 * Bouton + modal qui explique tous les rôles avant la partie.
 */
export default function RolesGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost text-sm w-full"
      >
        📖 Voir les rôles et leurs règles
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto scrollable"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-2xl text-brand-light">📖 Guide des rôles</h3>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>

              <p className="text-sm text-slate-400 mb-4">
                Le but : <strong className="text-emerald-300">les villageois</strong> doivent éliminer tous les loups.
                <strong className="text-rose-300"> Les loups</strong> gagnent quand ils sont aussi nombreux que les autres.
              </p>

              <ul className="space-y-2">
                {ROLES_GUIDE.map(r => (
                  <li key={r.id} className={`rounded-xl p-3 border ${TEAM_COLORS[r.team]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{r.icon}</span>
                      <strong className="font-display text-lg">{r.label}</strong>
                      <span className="text-xs ml-auto opacity-70">{r.team === 'wolves' ? 'Loups' : 'Village'}</span>
                    </div>
                    <p className="text-sm leading-relaxed opacity-90">{r.desc}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 bg-slate-800/40 rounded-lg p-3 text-sm space-y-2">
                <p><strong>⏱️ Déroulé d'une partie</strong></p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Distribution des cartes (chacun voit son rôle en secret)</li>
                  <li>Élection du maire (si activé)</li>
                  <li>1ère nuit : Cupidon désigne les amoureux, puis le cycle commence</li>
                  <li>Chaque nuit : Garde → Loups → Loup Blanc (paire) → Voyante → Sorcière</li>
                  <li>Chaque jour : révélation des morts → vote du village → on lynche</li>
                  <li>Boucle jusqu'à la victoire d'un camp</li>
                </ol>
              </div>

              <button onClick={() => setOpen(false)} className="btn btn-primary w-full mt-5">
                J'ai compris
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
