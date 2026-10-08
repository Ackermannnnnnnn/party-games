/**
 * Phrases de secours de Gartic Phone.
 * Servent de suggestions (bouton 🎲) et remplacent la phrase d'un joueur qui n'a rien écrit à temps.
 */
export const PROMPTS = [
  'Un chat qui fait du ski',
  'Un dinosaure chez le coiffeur',
  'Une pizza qui a peur du four',
  'Un pirate allergique à la mer',
  'Un escargot en excès de vitesse',
  'Une girafe dans un ascenseur',
  'Un robot qui apprend à danser',
  'Un fantôme qui a peur du noir',
  'Un pingouin au bord de la piscine',
  'Une vache qui fait du parachute',
  'Un cactus qui veut un câlin',
  'Un astronaute qui a oublié ses clés',
  'Un requin chez le dentiste',
  'Une licorne dans les embouteillages',
  'Un bonhomme de neige à la plage',
  'Un dragon qui souffle ses bougies',
  'Un hérisson qui gonfle des ballons',
  'Un poisson rouge qui promène son humain',
  'Une mamie championne de skate',
  'Un zombie végétarien',
  'Un ours qui fait du yoga',
  'Une banane qui glisse sur une peau de banane',
  'Un vampire chez le dentiste',
  'Un kangourou qui a perdu sa poche',
  'Une tortue ninja en retard',
  'Un extraterrestre qui prend le métro',
  'Un canard qui déteste l\'eau',
  'Un chevalier qui combat une mouche',
  'Une sorcière en trottinette électrique',
  'Un lapin magicien qui sort un humain du chapeau',
  'Un éléphant sur un trampoline',
  'Un clown triste à un anniversaire',
  'Une araignée qui tricote un pull',
  'Un loup qui commande une salade',
  'Un nuage qui pleure de rire',
  'Un pigeon voyageur qui a perdu son GPS',
  'Un cuisinier qui se bat avec des spaghettis',
  'Un chien qui passe son permis de conduire',
  'Une momie qui cherche du papier toilette',
  'Un père Noël en vacances d\'été',
];

/** Renvoie `n` phrases différentes tirées au hasard. */
export function randomPrompts(n = 1) {
  const pool = [...PROMPTS];
  const out = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
