/**
 * Catégories du Petit Bac.
 * - id : identifiant interne
 * - label : ce que voit le joueur
 * - icon : emoji court
 *
 * Pour ajouter une catégorie, il suffit d'en ajouter une ici. Tout le reste suit.
 */
export const CATEGORIES = [
  { id: 'prenom',     label: 'Prénom',           icon: '👤' },
  { id: 'pays',       label: 'Pays',             icon: '🌍' },
  { id: 'ville',      label: 'Ville',            icon: '🏙️' },
  { id: 'animal',     label: 'Animal',           icon: '🐾' },
  { id: 'metier',     label: 'Métier',           icon: '👨‍🍳' },
  { id: 'plante',     label: 'Plante / Fleur',   icon: '🌸' },
  { id: 'fruit',      label: 'Fruit / Légume',   icon: '🍎' },
  { id: 'plat',       label: 'Plat',             icon: '🍽️' },
  { id: 'objet',      label: 'Objet',            icon: '📦' },
  { id: 'sport',      label: 'Sport',            icon: '⚽' },
  { id: 'celebrite',  label: 'Célébrité',        icon: '⭐' },
  { id: 'film',       label: 'Film / Série',     icon: '🎬' },
  { id: 'marque',     label: 'Marque',           icon: '🏷️' },
  { id: 'couleur',    label: 'Couleur',          icon: '🎨' },
  { id: 'heros',      label: 'Héros',            icon: '🦸' },
  { id: 'mechant',    label: 'Méchant',          icon: '😈' },
];

export const DEFAULT_CATEGORY_IDS = ['prenom', 'pays', 'animal', 'metier', 'fruit', 'objet'];

/** Lettres "facile" (sans Q, K, W, X, Y, Z qui sont galère en français). */
export const EASY_LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');
export const ALL_LETTERS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}

export function listCategories() {
  return CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon }));
}
