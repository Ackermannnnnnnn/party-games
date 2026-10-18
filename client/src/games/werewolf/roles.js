/** Rôles côté client : textes, icônes et palettes des cartes. */
export const ROLES = {
  villageois: {
    label: 'Simple villageois', short: 'Villageois', icon: '🧑‍🌾', team: 'village',
    art: ['#b45309', '#78350f'], glow: '#fbbf24',
    desc: "Aucun pouvoir, mais ta voix compte : observe, débats et démasque les loups pendant le vote du village.",
    goal: 'Éliminer tous les loups-garous.',
  },
  loup_garou: {
    label: 'Loup-garou', short: 'Loup-garou', icon: '🐺', team: 'wolves',
    art: ['#b91c1c', '#450a0a'], glow: '#f87171',
    desc: "Chaque nuit, avec ta meute, choisis une victime à dévorer. Le jour, fais-toi passer pour un innocent.",
    goal: 'Dévorer tous les villageois.',
  },
  voyante: {
    label: 'Voyante', short: 'Voyante', icon: '🔮', team: 'village',
    art: ['#7c3aed', '#2e1065'], glow: '#c4b5fd',
    desc: "Chaque nuit, découvre le vrai rôle d'un joueur. Aide le village… sans te faire repérer par les loups.",
    goal: 'Éliminer tous les loups-garous.',
  },
  sorciere: {
    label: 'Sorcière', short: 'Sorcière', icon: '🧪', team: 'village',
    art: ['#059669', '#022c22'], glow: '#6ee7b7',
    desc: "Tu vois la victime des loups. Une potion de vie pour la sauver, une potion de mort pour tuer : chacune une seule fois dans la partie.",
    goal: 'Éliminer tous les loups-garous.',
  },
  chasseur: {
    label: 'Chasseur', short: 'Chasseur', icon: '🏹', team: 'village',
    art: ['#65a30d', '#1a2e05'], glow: '#bef264',
    desc: "Quand tu meurs, de nuit comme de jour, tu tires une dernière balle et emportes un joueur avec toi.",
    goal: 'Éliminer tous les loups-garous.',
  },
  cupidon: {
    label: 'Cupidon', short: 'Cupidon', icon: '💘', team: 'village',
    art: ['#db2777', '#500724'], glow: '#f9a8d4',
    desc: "La première nuit, désigne deux amoureux (toi compris si tu veux). Si l'un meurt, l'autre meurt de chagrin.",
    goal: 'Éliminer tous les loups-garous.',
  },
  garde: {
    label: 'Garde', short: 'Garde', icon: '🛡️', team: 'village',
    art: ['#2563eb', '#172554'], glow: '#93c5fd',
    desc: "Chaque nuit, protège un joueur (toi compris) de l'attaque des loups. Jamais le même deux nuits de suite.",
    goal: 'Éliminer tous les loups-garous.',
  },
  petite_fille: {
    label: 'Petite fille', short: 'Petite fille', icon: '👧', team: 'village',
    art: ['#ea580c', '#431407'], glow: '#fdba74',
    desc: "Pendant la nuit des loups, entrouvre les yeux : tu vois leurs messages et leur cible, sans savoir qui parle. Mais ils sentent qu'on les observe…",
    goal: 'Éliminer tous les loups-garous.',
  },
  loup_blanc: {
    label: 'Loup blanc', short: 'Loup blanc', icon: '🐺', team: 'solo',
    art: ['#94a3b8', '#0f172a'], glow: '#e2e8f0',
    desc: "Tu chasses avec les loups, mais une nuit sur deux tu peux dévorer un loup. Tu gagnes seul si tu es le dernier survivant.",
    goal: 'Être le dernier survivant.',
  },
};

export const role = (id) => ROLES[id] || { label: '???', short: '???', icon: '❔', art: ['#334155', '#0f172a'], glow: '#94a3b8', desc: '', goal: '' };

/** Ordre d'affichage de la composition. */
export const ROLE_ORDER = ['loup_garou', 'loup_blanc', 'voyante', 'sorciere', 'chasseur', 'garde', 'cupidon', 'petite_fille', 'villageois'];

export const NIGHT_PHASES = ['NIGHT'];
export const isNightish = (phase) => phase === 'NIGHT' || phase === 'DEAL';

/** « la Voyante », « un Loup-garou »… */
export function withArticle(roleId, indefinite = false) {
  const r = role(roleId);
  const fem = ['voyante', 'sorciere', 'petite_fille'].includes(roleId);
  if (indefinite) return `${fem ? 'une' : 'un'} ${r.short}`;
  return `${fem ? 'la' : 'le'} ${r.short}`;
}

export const WINNERS = {
  village: { title: 'Le village triomphe !', icon: '🌅', color: '#fbbf24', text: 'Tous les loups-garous ont été démasqués. Thiercelieux peut enfin dormir tranquille.' },
  wolves: { title: 'Les loups-garous dévorent le village', icon: '🐺', color: '#ef4444', text: 'La meute a eu raison des villageois. Le hurlement résonne sur les ruines de Thiercelieux.' },
  white_wolf: { title: 'Le loup blanc règne seul', icon: '🐺', color: '#e2e8f0', text: 'Il a trahi la meute et le village : il est le dernier survivant.' },
  lovers: { title: "L'amour a tout vaincu", icon: '💞', color: '#f472b6', text: 'Un loup et un villageois, unis contre tous, survivent ensemble.' },
  nobody: { title: 'Personne ne survit…', icon: '🪦', color: '#94a3b8', text: 'Le village est désert. Il ne reste que le vent.' },
};
