import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { motion } from 'framer-motion';

const ROLE_INFO = {
  villageois:  { icon: '🧑‍🌾', label: 'Villageois',   team: 'village', color: 'bg-emerald-500/20 text-emerald-300', desc: 'Aide les autres à démasquer les loups en votant la journée.' },
  loup_garou:  { icon: '🐺',   label: 'Loup-Garou',  team: 'wolves',  color: 'bg-rose-500/20 text-rose-300',       desc: 'Avec tes complices, choisissez une victime chaque nuit.' },
  loup_blanc:  { icon: '🐺‍❄️', label: 'Loup Blanc',  team: 'wolves',  color: 'bg-slate-300/10 text-slate-100',     desc: 'Tu votes avec les loups, mais 1 nuit sur 2 tu peux dévorer un loup. Tu gagnes SEUL si tu finis dernier.' },
  voyante:     { icon: '🔮',   label: 'Voyante',     team: 'village', color: 'bg-purple-500/20 text-purple-300',   desc: 'Chaque nuit, découvre le rôle d\'un joueur.' },
  sorciere:    { icon: '🧙‍♀️', label: 'Sorcière',    team: 'village', color: 'bg-fuchsia-500/20 text-fuchsia-300', desc: 'Tu as 2 potions : sauver la victime des loups, ou tuer un joueur.' },
  chasseur:    { icon: '🏹',   label: 'Chasseur',    team: 'village', color: 'bg-amber-500/20 text-amber-300',     desc: 'Si tu meurs, tu emportes un joueur de ton choix.' },
  cupidon:     { icon: '💘',   label: 'Cupidon',     team: 'village', color: 'bg-pink-500/20 text-pink-300',       desc: 'La 1ère nuit, désigne 2 amoureux. Si l\'un meurt, l\'autre meurt aussi.' },
  garde:       { icon: '🛡️',   label: 'Garde',       team: 'village', color: 'bg-sky-500/20 text-sky-300',         desc: 'Chaque nuit tu protèges un joueur des loups (pas le même 2 nuits de suite).' },
};

export default function PhaseDealRoles() {
  const { gameState, room } = useGameStore();
  const role = gameState?.private?.role;
  const allies = gameState?.private?.wolfAllies || [];
  const info = ROLE_INFO[role];
  const [revealed, setRevealed] = useState(false);

  const allyNames = allies.map(id => room.players.find(p => p.id === id)?.pseudo).filter(Boolean);

  if (!info) {
    return <div className="card text-center p-10"><p className="text-slate-300">Distribution des rôles…</p></div>;
  }

  return (
    <div className="card text-center py-10 sm:py-14 space-y-6">
      <h2 className="font-display text-2xl sm:text-3xl text-brand-light">Ton rôle est…</h2>

      {/* Carte qui se retourne (effet 3D) */}
      <div className="flex justify-center">
        <motion.button
          onClick={() => setRevealed(true)}
          disabled={revealed}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.7 }}
          className="relative w-48 h-72 sm:w-56 sm:h-80"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Dos de la carte */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-slate-600 flex flex-col items-center justify-center text-slate-400"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-5xl mb-2">🌕</div>
            <p className="text-sm">Clique pour révéler</p>
          </div>
          {/* Face de la carte */}
          <div
            className={`absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center p-4 ${info.color} ${
              info.team === 'wolves' ? 'border-rose-500' : 'border-emerald-500'
            }`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-6xl sm:text-7xl mb-3">{info.icon}</div>
            <p className="font-display text-2xl sm:text-3xl mb-2">{info.label}</p>
            <p className="text-xs sm:text-sm opacity-80 leading-snug">{info.desc}</p>
          </div>
        </motion.button>
      </div>

      {revealed && info.team === 'wolves' && allyNames.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-rose-500/10 border border-rose-500/40 text-rose-200 rounded-xl p-3 max-w-md mx-auto"
        >
          🐺 Tes complices : <strong>{allyNames.join(', ')}</strong>
        </motion.div>
      )}

      {revealed && info.team === 'wolves' && allyNames.length === 0 && (
        <p className="text-rose-300 text-sm">Tu es seul loup. À toi de jouer fin.</p>
      )}

      {revealed && (
        <p className="text-slate-400 text-sm">Mémorise-le bien… La nuit tombe dans quelques secondes.</p>
      )}
    </div>
  );
}
