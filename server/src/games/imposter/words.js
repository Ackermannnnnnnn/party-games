/**
 * Paires de mots pour le jeu de l'imposteur.
 * - Chaque paire = [motCivils, motImposteur]
 * - Les deux mots doivent être PROCHES sémantiquement
 *   (sinon trop facile à démasquer).
 */
export const WORD_PAIRS = [
  ['Pizza', 'Tarte'],
  ['Chien', 'Loup'],
  ['Café', 'Thé'],
  ['Football', 'Rugby'],
  ['Mer', 'Lac'],
  ['Voiture', 'Moto'],
  ['Roi', 'Empereur'],
  ['Guitare', 'Violon'],
  ['Pilote', 'Astronaute'],
  ['Boulanger', 'Pâtissier'],
  ['Pomme', 'Poire'],
  ['Ski', 'Snowboard'],
  ['Médecin', 'Infirmier'],
  ['Lune', 'Soleil'],
  ['Téléphone', 'Tablette'],
  ['Pluie', 'Neige'],
  ['Restaurant', 'Cantine'],
  ['Roman', 'Bande dessinée'],
  ['Acteur', 'Chanteur'],
  ['Tigre', 'Lion'],
  ['Sandwich', 'Hamburger'],
  ['Avion', 'Hélicoptère'],
  ['Bibliothèque', 'Librairie'],
  ['Vélo', 'Trottinette'],
  ['Plage', 'Piscine'],
];

export function pickRandomPair() {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}
