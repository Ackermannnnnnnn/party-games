export const ROLES = {
  villageois: {
    id: 'villageois', label: 'Villageois', icon: '🧑‍🌾', team: 'village',
    description: 'Tu es un simple villageois. Aide à démasquer les loups en votant la journée.',
  },
  loup_garou: {
    id: 'loup_garou', label: 'Loup-Garou', icon: '🐺', team: 'wolves',
    description: 'Avec tes complices, choisissez une victime à dévorer chaque nuit.',
  },
  voyante: {
    id: 'voyante', label: 'Voyante', icon: '🔮', team: 'village',
    description: 'Chaque nuit, tu peux découvrir le rôle d\'un joueur de ton choix.',
  },
  sorciere: {
    id: 'sorciere', label: 'Sorcière', icon: '🧙‍♀️', team: 'village',
    description: 'Deux potions : sauver la victime des loups OU tuer un joueur. Une seule fois chacune.',
  },
  chasseur: {
    id: 'chasseur', label: 'Chasseur', icon: '🏹', team: 'village',
    description: 'Quand tu meurs, tu emportes un joueur de ton choix avec toi.',
  },
  cupidon: {
    id: 'cupidon', label: 'Cupidon', icon: '💘', team: 'village',
    description: 'La 1ère nuit, désigne 2 amoureux. Si l\'un meurt, l\'autre meurt aussi.',
  },
  // ───── NOUVEAUX ─────
  garde: {
    id: 'garde', label: 'Garde', icon: '🛡️', team: 'village',
    description: 'Chaque nuit tu protèges un joueur des loups. Tu ne peux pas protéger le même joueur 2 nuits de suite.',
  },
  loup_blanc: {
    id: 'loup_blanc', label: 'Loup Blanc', icon: '🐺‍❄️', team: 'wolves',
    description: 'Tu joues avec les loups, mais tu peux dévorer un loup une nuit sur deux. Tu gagnes seul si tu es le dernier survivant.',
  },
  maire: {
    id: 'maire', label: 'Maire (élu)', icon: '👑', team: 'village',
    description: 'Élu par le village au début. Ton vote pour le lynchage compte double.',
  },
};

export function getRole(id) { return ROLES[id]; }
export function isWolf(roleId) { return ROLES[roleId]?.team === 'wolves'; }

/** Le maire n'est pas un rôle distribué : il est élu, pas tiré. */
export function listAssignableRoles() {
  return Object.values(ROLES)
    .filter(r => !['villageois', 'loup_garou', 'maire'].includes(r.id))
    .map(r => ({ id: r.id, label: r.label, icon: r.icon, team: r.team }));
}
