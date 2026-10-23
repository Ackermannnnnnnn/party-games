/** Qui est-ce ? — libellés partagés entre les options et le jeu (les données des persos sont côté serveur). */
export const UNIVERSES = [
  { id: 'anime', label: 'Anime', icon: '🎌', count: 39 },
  { id: 'cinema', label: 'Cinéma & séries', icon: '🎬', count: 20 },
  { id: 'dc', label: 'DC', icon: '🦇', count: 9 },
  { id: 'disney', label: 'Disney & Pixar', icon: '🏰', count: 15 },
  { id: 'gaming', label: 'Jeux vidéo', icon: '🎮', count: 22 },
  { id: 'marvel', label: 'Marvel', icon: '🦸', count: 15 },
  { id: 'simpsons', label: 'Simpson', icon: '🍩', count: 5 },
  { id: 'starwars', label: 'Star Wars', icon: '⚔️', count: 8 },
];

export const MODES = [
  { id: 'duel', icon: '🎯', label: 'Duel', min: 2, desc: 'Le classique : un plateau de visages, chaque camp a un perso secret. 1 contre 1, ou 2 équipes.' },
  { id: 'akinator', icon: '🧞', label: "L'app devine", min: 1, desc: 'Choisis un perso en secret : l\'app pose les questions et essaie de le trouver. Chacun son tour.' },
  { id: 'postit', icon: '🏷️', label: 'Qui suis-je ?', min: 2, desc: 'Chacun a un perso sur le front : tout le monde le voit sauf lui. À toi de trouver qui tu es.' },
  { id: 'meneur', icon: '🎩', label: 'Un meneur, tous devinent', min: 1, desc: "L'app (ou un joueur) cache un perso du plateau. Le premier qui le trouve gagne la manche." },
];

export const ANSWER_LABEL = { yes: 'Oui', no: 'Non', idk: 'Je ne sais pas', probably: 'Probablement', probably_not: 'Probablement pas' };
export const ANSWER_STYLE = {
  yes: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  probably: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20',
  no: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
  probably_not: 'bg-rose-500/10 text-rose-200 ring-rose-400/20',
  idk: 'bg-white/[0.06] text-slate-300 ring-white/10',
};
