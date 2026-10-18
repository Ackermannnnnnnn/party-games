/**
 * Rôles du Loup-Garou (Thiercelieux).
 * team : 'village' | 'wolves' (le loup blanc est compté avec les loups pour la nuit,
 * mais il gagne seul s'il est le dernier survivant).
 */
export const ROLES = {
  villageois: {
    id: 'villageois', label: 'Simple villageois', icon: '🧑‍🌾', team: 'village',
    description: "Aucun pouvoir, mais ta voix compte : observe, débats et démasque les loups pendant le vote du village.",
  },
  loup_garou: {
    id: 'loup_garou', label: 'Loup-garou', icon: '🐺', team: 'wolves',
    description: "Chaque nuit, avec ta meute, choisis une victime à dévorer. Le jour, fais-toi passer pour un innocent.",
  },
  voyante: {
    id: 'voyante', label: 'Voyante', icon: '🔮', team: 'village',
    description: "Chaque nuit, découvre le vrai rôle d'un joueur. Aide le village… sans te faire repérer par les loups.",
  },
  sorciere: {
    id: 'sorciere', label: 'Sorcière', icon: '🧪', team: 'village',
    description: "Tu vois la victime des loups. Une potion de vie pour la sauver, une potion de mort pour tuer : chacune une seule fois dans la partie.",
  },
  chasseur: {
    id: 'chasseur', label: 'Chasseur', icon: '🏹', team: 'village',
    description: "Quand tu meurs, de nuit comme de jour, tu tires une dernière balle et emportes un joueur avec toi.",
  },
  cupidon: {
    id: 'cupidon', label: 'Cupidon', icon: '💘', team: 'village',
    description: "La première nuit, désigne deux amoureux (toi compris si tu veux). Si l'un meurt, l'autre meurt de chagrin. Un loup et un villageois amoureux gagnent ensemble s'ils restent les derniers.",
  },
  garde: {
    id: 'garde', label: 'Garde', icon: '🛡️', team: 'village',
    description: "Chaque nuit, protège un joueur (toi compris) de l'attaque des loups. Jamais le même deux nuits de suite.",
  },
  petite_fille: {
    id: 'petite_fille', label: 'Petite fille', icon: '👧', team: 'village',
    description: "Pendant la nuit des loups, tu peux entrouvrir les yeux : tu vois leurs messages et leur cible, sans savoir qui parle. Mais les loups sentent qu'on les observe…",
  },
  loup_blanc: {
    id: 'loup_blanc', label: 'Loup blanc', icon: '🐺', team: 'wolves', solo: true,
    description: "Tu chasses avec les loups, mais une nuit sur deux tu peux dévorer un loup. Tu gagnes seul si tu es le dernier survivant.",
  },
};

/** Rôles spéciaux que l'hôte peut ajouter (le maire est une élection, pas une carte). */
export const SPECIAL_ROLES = ['voyante', 'sorciere', 'chasseur', 'garde', 'cupidon', 'petite_fille', 'loup_blanc'];

export function isWolf(roleId) { return ROLES[roleId]?.team === 'wolves'; }

/** Composition conseillée selon le nombre de joueurs. */
export function suggestComposition(n) {
  const wolves = n <= 6 ? 1 : n <= 11 ? 2 : n <= 15 ? 3 : 4;
  const roles = ['voyante', 'sorciere'];
  if (n >= 6) roles.push('chasseur');
  if (n >= 7) roles.push('garde');
  if (n >= 8) roles.push('cupidon');
  if (n >= 9) roles.push('petite_fille');
  if (n >= 12) roles.push('loup_blanc');
  return { wolves, roles };
}

export function listRoles() {
  return Object.values(ROLES).map(({ id, label, icon, team, description, solo }) => ({ id, label, icon, team, description, solo: !!solo }));
}
