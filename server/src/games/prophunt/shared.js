/**
 * Prop Hunt — données partagées client / serveur (ce fichier est copié tel quel dans
 * server/src/games/prophunt/shared.js : ne rien importer ici).
 *
 * Unités : mètres, y vers le haut. Tous les objets sont faits de formes simples (style low-poly).
 *
 * Pièces d'un modèle (position = centre de la forme, l'objet est posé sur y = 0) :
 *   ['b', x, y, z, largeur, hauteur, profondeur, couleur, rotationY?]   boîte
 *   ['c', x, y, z, rayon, hauteur, couleur, côtés?, rayonHaut?]         cylindre
 *   ['s', x, y, z, rayon, couleur]                                       sphère
 *   ['k', x, y, z, rayon, hauteur, couleur, côtés?]                      cône
 */

// ───────────────────────── Modèles d'objets ─────────────────────────
const WOOD = 0x9a6b3f; const WOOD_D = 0x6b4526; const WOOD_L = 0xc8a06a;
const METAL = 0xa8adb5; const DARK = 0x2b2d33; const WHITE = 0xf2f2ef; const RED = 0xd94141;
const GREEN = 0x4f9a46; const LEAF = 0x3f8f3a; const POT = 0xb5653a; const BLUE = 0x3c74c9; const YEL = 0xf2c43d;

const M = {
  // Maison
  chair: { name: 'Chaise', parts: [['b', 0, 0.45, 0, 0.45, 0.05, 0.45, WOOD], ['b', 0, 0.75, -0.2, 0.45, 0.55, 0.05, WOOD], ...legs(0.18, 0.18, 0.45, WOOD_D)] },
  table: { name: 'Table', parts: [['b', 0, 0.74, 0, 1.6, 0.06, 0.9, WOOD], ...legs(0.72, 0.38, 0.72, WOOD_D)] },
  sofa: { name: 'Canapé', parts: [['b', 0, 0.25, 0, 2, 0.4, 0.9, 0x5b6fb0], ['b', 0, 0.65, -0.35, 2, 0.5, 0.2, 0x4d5f9b], ['b', -0.9, 0.55, 0.05, 0.2, 0.3, 0.8, 0x4d5f9b], ['b', 0.9, 0.55, 0.05, 0.2, 0.3, 0.8, 0x4d5f9b]] },
  armchair: { name: 'Fauteuil', parts: [['b', 0, 0.25, 0, 0.9, 0.4, 0.85, 0xa0523d], ['b', 0, 0.7, -0.32, 0.9, 0.55, 0.2, 0x8c4433], ['b', -0.38, 0.55, 0.05, 0.15, 0.3, 0.75, 0x8c4433], ['b', 0.38, 0.55, 0.05, 0.15, 0.3, 0.75, 0x8c4433]] },
  bed: { name: 'Lit', parts: [['b', 0, 0.25, 0, 1.5, 0.3, 2, WOOD_D], ['b', 0, 0.48, 0.05, 1.4, 0.18, 1.85, WHITE], ['b', 0, 0.62, -0.75, 1.1, 0.12, 0.35, 0xe6e6f5], ['b', 0, 0.7, -0.98, 1.5, 0.9, 0.06, WOOD_D], ['b', 0, 0.6, 0.45, 1.42, 0.06, 0.9, 0x6a8fd6]] },
  lamp: { name: 'Lampadaire', parts: [['c', 0, 0.03, 0, 0.2, 0.06, DARK], ['c', 0, 0.8, 0, 0.025, 1.5, DARK, 8], ['c', 0, 1.6, 0, 0.25, 0.3, 0xf3e3b3, 12, 0.15]] },
  tv: { name: 'Télé', parts: [['b', 0, 0.3, 0, 1.2, 0.6, 0.45, WOOD_D], ['b', 0, 0.95, 0, 1.1, 0.65, 0.08, DARK], ['b', 0, 0.95, 0.045, 1.0, 0.56, 0.01, 0x2d4f6b]] },
  fridge: { name: 'Frigo', parts: [['b', 0, 0.9, 0, 0.7, 1.8, 0.7, WHITE], ['b', 0, 1.25, 0.36, 0.66, 0.02, 0.02, 0xcccccc], ['b', 0.25, 1.0, 0.37, 0.04, 0.4, 0.04, METAL], ['b', 0.25, 1.5, 0.37, 0.04, 0.3, 0.04, METAL]] },
  stove: { name: 'Cuisinière', parts: [['b', 0, 0.45, 0, 0.6, 0.9, 0.6, WHITE], ['b', 0, 0.91, 0, 0.6, 0.02, 0.6, DARK], ['b', 0, 0.45, 0.305, 0.5, 0.35, 0.01, 0x333333], ['c', -0.14, 0.93, -0.14, 0.09, 0.02, DARK], ['c', 0.14, 0.93, 0.14, 0.09, 0.02, DARK]] },
  cabinet: { name: 'Meuble de cuisine', static: true, parts: [['b', 0, 0.44, 0, 1, 0.88, 0.6, 0xe9e2d0], ['b', 0, 0.9, 0, 1.02, 0.04, 0.62, 0x6b6f75], ['b', -0.25, 0.5, 0.305, 0.46, 0.7, 0.01, 0xd8cfb8], ['b', 0.25, 0.5, 0.305, 0.46, 0.7, 0.01, 0xd8cfb8]] },
  bookshelf: { name: 'Bibliothèque', parts: [['b', 0, 0.95, 0, 0.9, 1.9, 0.35, WOOD_D], ['b', 0, 0.55, 0.03, 0.8, 0.28, 0.28, 0xb0413e], ['b', 0, 1.05, 0.03, 0.8, 0.28, 0.28, 0x3e6ab0], ['b', 0, 1.5, 0.03, 0.8, 0.28, 0.28, 0x6fa04a]] },
  plant: { name: 'Plante', parts: [['c', 0, 0.18, 0, 0.18, 0.36, POT, 10, 0.22], ['s', 0, 0.62, 0, 0.32, LEAF], ['s', 0.12, 0.85, 0.05, 0.2, GREEN]] },
  plantTall: { name: 'Grande plante', parts: [['c', 0, 0.22, 0, 0.22, 0.44, 0xe8e2d6, 10, 0.26], ['c', 0, 0.9, 0, 0.03, 1, WOOD_D, 6], ['s', 0, 1.45, 0, 0.45, LEAF], ['s', 0.2, 1.2, 0.1, 0.3, GREEN]] },
  barrel: { name: 'Tonneau', parts: [['c', 0, 0.45, 0, 0.33, 0.9, WOOD, 14, 0.3], ['c', 0, 0.2, 0, 0.34, 0.05, DARK, 14], ['c', 0, 0.7, 0, 0.34, 0.05, DARK, 14]] },
  crate: { name: 'Caisse en bois', parts: [['b', 0, 0.4, 0, 0.8, 0.8, 0.8, WOOD_L], ['b', 0, 0.4, 0.405, 0.8, 0.1, 0.01, WOOD], ['b', 0, 0.4, -0.405, 0.8, 0.1, 0.01, WOOD]] },
  box: { name: 'Carton', parts: [['b', 0, 0.25, 0, 0.6, 0.5, 0.45, 0xc49a62], ['b', 0, 0.5, 0, 0.62, 0.02, 0.1, 0xa47c48]] },
  boxSmall: { name: 'Petit carton', parts: [['b', 0, 0.15, 0, 0.35, 0.3, 0.3, 0xc9a26c], ['b', 0, 0.3, 0, 0.36, 0.02, 0.08, 0xa47c48]] },
  bin: { name: 'Poubelle', parts: [['c', 0, 0.35, 0, 0.22, 0.7, 0x6b7a85, 12, 0.25], ['c', 0, 0.72, 0, 0.26, 0.05, 0x55626b, 12]] },
  washer: { name: 'Machine à laver', parts: [['b', 0, 0.43, 0, 0.6, 0.86, 0.6, WHITE], ['c', 0, 0.45, 0.3, 0.2, 0.03, 0x88a6c4, 16]] },
  toilet: { name: 'Toilettes', parts: [['c', 0, 0.2, 0.05, 0.18, 0.4, WHITE, 12, 0.22], ['b', 0, 0.55, -0.2, 0.4, 0.5, 0.18, WHITE], ['c', 0, 0.41, 0.05, 0.22, 0.03, 0xe0e0e0, 14]] },
  dresser: { name: 'Commode', parts: [['b', 0, 0.45, 0, 1, 0.9, 0.5, WOOD], ['b', 0, 0.25, 0.255, 0.9, 0.02, 0.01, WOOD_D], ['b', 0, 0.55, 0.255, 0.9, 0.02, 0.01, WOOD_D]] },
  mug: { name: 'Tasse', parts: [['c', 0, 0.05, 0, 0.045, 0.1, RED, 12], ['b', 0.06, 0.055, 0, 0.02, 0.06, 0.012, RED]] },
  plates: { name: 'Pile d\'assiettes', parts: [['c', 0, 0.04, 0, 0.13, 0.08, WHITE, 16]] },
  book: { name: 'Livre', parts: [['b', 0, 0.03, 0, 0.2, 0.05, 0.28, 0x7b3fa0], ['b', 0.0, 0.03, 0.005, 0.19, 0.04, 0.27, 0xf1ead8]] },
  bottle: { name: 'Bouteille', parts: [['c', 0, 0.11, 0, 0.04, 0.22, 0x2f7d4a, 10], ['c', 0, 0.27, 0, 0.015, 0.1, 0x2f7d4a, 8]] },
  toaster: { name: 'Grille-pain', parts: [['b', 0, 0.1, 0, 0.28, 0.2, 0.16, METAL], ['b', 0, 0.2, 0, 0.2, 0.01, 0.1, DARK]] },
  microwave: { name: 'Micro-ondes', parts: [['b', 0, 0.16, 0, 0.5, 0.32, 0.36, WHITE], ['b', -0.06, 0.16, 0.181, 0.32, 0.22, 0.01, DARK]] },
  kettle: { name: 'Bouilloire', parts: [['c', 0, 0.12, 0, 0.09, 0.24, 0x3d8bd6, 12, 0.07], ['b', -0.1, 0.15, 0, 0.03, 0.12, 0.03, DARK]] },
  cereal: { name: 'Boîte de céréales', parts: [['b', 0, 0.15, 0, 0.2, 0.3, 0.07, YEL], ['b', 0, 0.17, 0.036, 0.12, 0.12, 0.002, RED]] },
  can: { name: 'Conserve', parts: [['c', 0, 0.06, 0, 0.04, 0.12, 0xd8473d, 12], ['c', 0, 0.06, 0, 0.041, 0.06, WHITE, 12]] },
  fruitbowl: { name: 'Coupe de fruits', parts: [['c', 0, 0.05, 0, 0.16, 0.1, WHITE, 12, 0.1], ['s', -0.05, 0.12, 0, 0.06, 0xf08a24], ['s', 0.06, 0.12, 0.02, 0.06, RED], ['s', 0, 0.15, -0.05, 0.055, 0x9ccc3d]] },
  watermelon: { name: 'Pastèque', parts: [['s', 0, 0.18, 0, 0.19, 0x3b8a3a]] },
  clock: { name: 'Horloge', parts: [['c', 0, 0.2, 0, 0.2, 0.06, WHITE, 16], ['c', 0, 0.2, 0.03, 0.21, 0.02, DARK, 16]] },
  // Bureau
  desk: { name: 'Bureau', parts: [['b', 0, 0.73, 0, 1.4, 0.05, 0.7, 0xd9d4c7], ['b', -0.66, 0.36, 0, 0.05, 0.72, 0.65, 0x8e939b], ['b', 0.66, 0.36, 0, 0.05, 0.72, 0.65, 0x8e939b]] },
  officeChair: { name: 'Chaise de bureau', parts: [['c', 0, 0.06, 0, 0.3, 0.05, DARK, 5], ['c', 0, 0.28, 0, 0.03, 0.42, METAL, 6], ['b', 0, 0.5, 0, 0.5, 0.08, 0.5, 0x36475e], ['b', 0, 0.88, -0.22, 0.45, 0.6, 0.07, 0x36475e]] },
  monitor: { name: 'Écran', parts: [['b', 0, 0.01, 0, 0.25, 0.02, 0.18, DARK], ['b', 0, 0.12, 0, 0.04, 0.2, 0.04, DARK], ['b', 0, 0.35, 0, 0.6, 0.36, 0.04, DARK], ['b', 0, 0.35, 0.021, 0.55, 0.31, 0.002, 0x3a6ea5]] },
  printer: { name: 'Photocopieuse', parts: [['b', 0, 0.5, 0, 0.8, 1.0, 0.65, 0xe4e4df], ['b', 0, 1.02, -0.05, 0.75, 0.05, 0.5, 0x9da3ab], ['b', 0.25, 0.85, 0.33, 0.25, 0.1, 0.01, 0x2f2f2f]] },
  waterCooler: { name: 'Fontaine à eau', parts: [['b', 0, 0.5, 0, 0.35, 1.0, 0.35, WHITE], ['c', 0, 1.2, 0, 0.15, 0.4, 0x9fd3f0, 14]] },
  filing: { name: 'Classeur', parts: [['b', 0, 0.65, 0, 0.5, 1.3, 0.6, 0x8a929c], ['b', 0, 0.35, 0.305, 0.12, 0.03, 0.01, DARK], ['b', 0, 0.75, 0.305, 0.12, 0.03, 0.01, DARK], ['b', 0, 1.1, 0.305, 0.12, 0.03, 0.01, DARK]] },
  coffeeMachine: { name: 'Machine à café', parts: [['b', 0, 0.22, 0, 0.3, 0.44, 0.35, DARK], ['b', 0, 0.12, 0.12, 0.18, 0.02, 0.1, METAL], ['c', 0, 0.06, 0.1, 0.035, 0.08, WHITE, 10]] },
  whiteboard: { name: 'Tableau blanc', parts: [['b', 0, 1.3, 0, 1.6, 1.0, 0.05, WHITE], ['b', -0.75, 0.6, 0, 0.05, 1.2, 0.4, METAL], ['b', 0.75, 0.6, 0, 0.05, 1.2, 0.4, METAL]] },
  // Supérette
  shelf: { name: 'Rayon', static: true, parts: [['b', 0, 0.9, -0.28, 2, 1.8, 0.04, 0x9aa4ad], ['b', 0, 0.12, 0, 2, 0.04, 0.6, 0xc6ccd2], ['b', 0, 0.72, 0, 2, 0.04, 0.6, 0xc6ccd2], ['b', 0, 1.32, 0, 2, 0.04, 0.6, 0xc6ccd2], ['b', -0.99, 0.9, 0, 0.04, 1.8, 0.6, 0x9aa4ad], ['b', 0.99, 0.9, 0, 0.04, 1.8, 0.6, 0x9aa4ad]] },
  cart: { name: 'Caddie', parts: [['b', 0, 0.62, 0, 0.55, 0.45, 0.85, METAL], ['b', 0, 0.32, 0, 0.5, 0.04, 0.8, 0x7d838b], ['b', 0, 0.95, -0.47, 0.5, 0.04, 0.04, RED], ...wheels(0.22, 0.35)] },
  register: { name: 'Caisse', static: true, parts: [['b', 0, 0.45, 0, 1.8, 0.9, 0.7, 0x56606b], ['b', 0, 0.92, 0, 1.8, 0.04, 0.72, 0x2f3238], ['b', 0.6, 1.08, 0, 0.35, 0.28, 0.3, DARK]] },
  freezer: { name: 'Congélateur', parts: [['b', 0, 0.42, 0, 1.6, 0.84, 0.8, WHITE], ['b', 0, 0.86, 0, 1.56, 0.04, 0.76, 0xa9d8f5]] },
  pallet: { name: 'Palette', parts: [['b', 0, 0.06, 0, 1.2, 0.12, 1.0, WOOD_L], ['b', 0, 0.13, 0, 1.2, 0.02, 1.0, WOOD]] },
  rice: { name: 'Sac de riz', parts: [['b', 0, 0.12, 0, 0.4, 0.24, 0.6, 0xe9dfc4], ['b', 0, 0.245, 0, 0.3, 0.01, 0.2, RED]] },
  cone: { name: 'Plot', parts: [['b', 0, 0.02, 0, 0.36, 0.04, 0.36, 0xf26b21], ['k', 0, 0.33, 0, 0.14, 0.6, 0xf26b21, 10], ['c', 0, 0.38, 0, 0.09, 0.08, WHITE, 10, 0.07]] },
  forklift: { name: 'Chariot élévateur', static: true, parts: [['b', 0, 0.55, 0, 1.1, 0.8, 1.8, YEL], ['b', 0, 1.5, -0.4, 1.0, 0.08, 0.9, DARK], ['b', -0.45, 1.05, -0.4, 0.06, 1.0, 0.06, DARK], ['b', 0.45, 1.05, -0.4, 0.06, 1.0, 0.06, DARK], ['b', 0, 1.2, 1.0, 0.9, 2.4, 0.08, DARK], ['b', -0.25, 0.08, 1.4, 0.12, 0.06, 0.9, METAL], ['b', 0.25, 0.08, 1.4, 0.12, 0.06, 0.9, METAL], ...wheels(0.5, 0.65, 0.22)] },
  // Rue et jardin
  car: { name: 'Voiture', parts: [['b', 0, 0.55, 0, 1.8, 0.6, 4.2, 0x3a7bd5], ['b', 0, 1.1, -0.2, 1.6, 0.55, 2.2, 0x3a7bd5], ['b', 0, 1.1, -0.2, 1.62, 0.4, 2.0, 0x9fc5e8], ...wheels(0.85, 1.35, 0.33)] },
  carRed: { name: 'Voiture rouge', parts: [['b', 0, 0.55, 0, 1.8, 0.6, 4.2, 0xc83c3c], ['b', 0, 1.1, -0.2, 1.6, 0.55, 2.2, 0xc83c3c], ['b', 0, 1.1, -0.2, 1.62, 0.4, 2.0, 0x9fc5e8], ...wheels(0.85, 1.35, 0.33)] },
  bus: { name: 'Bus', static: true, parts: [['b', 0, 1.6, 0, 2.5, 2.6, 9, 0xf2b929], ['b', 0, 2.1, 0, 2.52, 0.8, 8.6, 0x86a9c4], ['b', 0, 0.45, 0, 2.4, 0.3, 8.8, DARK], ...wheels(1.15, 3.2, 0.5)] },
  mailbox: { name: 'Boîte aux lettres', parts: [['c', 0, 0.55, 0, 0.04, 1.1, WOOD_D, 6], ['b', 0, 1.2, 0, 0.3, 0.3, 0.5, BLUE], ['b', 0.16, 1.3, 0.1, 0.02, 0.15, 0.06, RED]] },
  hydrant: { name: 'Borne à incendie', parts: [['c', 0, 0.3, 0, 0.13, 0.6, RED, 10], ['s', 0, 0.62, 0, 0.13, RED], ['c', 0, 0.38, 0, 0.05, 0.36, RED, 8], ['c', 0, 0.02, 0, 0.18, 0.04, RED, 10]] },
  bench: { name: 'Banc', parts: [['b', 0, 0.45, 0, 1.8, 0.06, 0.45, WOOD], ['b', 0, 0.75, -0.2, 1.8, 0.35, 0.05, WOOD], ['b', -0.8, 0.22, 0, 0.06, 0.44, 0.4, DARK], ['b', 0.8, 0.22, 0, 0.06, 0.44, 0.4, DARK]] },
  trashcan: { name: 'Poubelle de rue', parts: [['c', 0, 0.45, 0, 0.3, 0.9, 0x3b6e46, 12], ['c', 0, 0.92, 0, 0.32, 0.06, 0x2f5a39, 12]] },
  tree: { name: 'Arbre', static: true, parts: [['c', 0, 1.2, 0, 0.18, 2.4, 0x6e4a2c, 8, 0.14], ['s', 0, 3, 0, 1.3, LEAF], ['s', 0.6, 2.6, 0.3, 0.8, GREEN], ['s', -0.5, 3.3, -0.3, 0.8, GREEN]] },
  bush: { name: 'Buisson', parts: [['s', 0, 0.45, 0, 0.55, LEAF], ['s', 0.35, 0.35, 0.15, 0.38, GREEN]] },
  bbq: { name: 'Barbecue', parts: [['c', 0, 0.85, 0, 0.32, 0.25, DARK, 14, 0.36], ['b', -0.2, 0.4, 0, 0.04, 0.8, 0.04, DARK], ['b', 0.2, 0.4, 0, 0.04, 0.8, 0.04, DARK], ['b', 0, 0.4, 0.2, 0.04, 0.8, 0.04, DARK]] },
  gnome: { name: 'Nain de jardin', parts: [['c', 0, 0.12, 0, 0.1, 0.24, BLUE, 8, 0.07], ['s', 0, 0.3, 0, 0.08, 0xf4c7a1], ['s', 0, 0.26, 0.04, 0.07, WHITE], ['k', 0, 0.45, 0, 0.09, 0.22, RED, 8]] },
  doghouse: { name: 'Niche', parts: [['b', 0, 0.4, 0, 0.9, 0.8, 1.1, 0xb5653a], ['b', 0, 0.35, 0.551, 0.4, 0.5, 0.01, 0x3a2414], ['b', -0.24, 0.98, 0, 0.55, 0.06, 1.2, 0x8c3a2f, 0], ['b', 0.24, 0.98, 0, 0.55, 0.06, 1.2, 0x8c3a2f, 0]] },
  picnic: { name: 'Table de pique-nique', parts: [['b', 0, 0.75, 0, 1.8, 0.06, 0.8, WOOD_L], ['b', 0, 0.45, -0.6, 1.8, 0.05, 0.3, WOOD_L], ['b', 0, 0.45, 0.6, 1.8, 0.05, 0.3, WOOD_L], ['b', -0.7, 0.37, 0, 0.08, 0.74, 1.4, WOOD], ['b', 0.7, 0.37, 0, 0.08, 0.74, 1.4, WOOD]] },
  ball: { name: 'Ballon', parts: [['s', 0, 0.12, 0, 0.12, 0xe8532e]] },
  tire: { name: 'Pneu', parts: [['c', 0, 0.12, 0, 0.35, 0.24, DARK, 14]] },
  streetlamp: { name: 'Réverbère', static: true, parts: [['c', 0, 2.2, 0, 0.07, 4.4, 0x3a3d42, 8], ['b', 0, 4.4, 0.4, 0.15, 0.1, 0.8, 0x3a3d42], ['b', 0, 4.3, 0.75, 0.3, 0.12, 0.3, 0xfff1c4]] },
  fence: { name: 'Barrière', static: true, parts: [['b', 0, 0.5, 0, 2, 0.1, 0.06, WHITE], ['b', 0, 0.85, 0, 2, 0.1, 0.06, WHITE], ...[-0.9, -0.45, 0, 0.45, 0.9].map((x) => ['b', x, 0.5, 0, 0.1, 1.0, 0.08, WHITE])] },
  sink: { name: 'Lavabo', parts: [['c', 0, 0.45, 0, 0.07, 0.8, WHITE, 8], ['b', 0, 0.88, 0, 0.55, 0.12, 0.45, WHITE], ['c', 0, 1.0, -0.15, 0.02, 0.15, METAL, 6]] },
  stall: { name: 'Cabine', static: true, parts: [['b', -0.5, 1.0, 0, 0.05, 1.8, 1.4, 0x7ea6a3], ['b', 0.5, 1.0, 0, 0.05, 1.8, 1.4, 0x7ea6a3]] },
};

function legs(dx, dz, h, color) {
  return [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].map(([x, z]) => ['b', x, h / 2, z, 0.05, h, 0.05, color]);
}
function wheels(dx, dz, r = 0.08) {
  return [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].map(([x, z]) => ['c', x, r, z, r, 0.12, 0x1f1f22, 10]);
}

/** Boîte englobante d'un modèle (sans rotation), à l'échelle 1. */
export function modelBounds(id) {
  const m = M[id];
  if (!m) return null;
  if (m._b) return m._b;
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const p of m.parts) {
    let hx; let hy; let hz;
    if (p[0] === 'b') { hx = p[4] / 2; hy = p[5] / 2; hz = p[6] / 2; if (p[8]) { const c = Math.abs(Math.cos(p[8])); const s = Math.abs(Math.sin(p[8])); [hx, hz] = [hx * c + hz * s, hx * s + hz * c]; } }
    else if (p[0] === 'c') { const r = Math.max(p[4], p[8] || 0); hx = r; hz = r; hy = p[5] / 2; }
    else if (p[0] === 's') { hx = hy = hz = p[4]; }
    else { hx = hz = p[4]; hy = p[5] / 2; }
    min[0] = Math.min(min[0], p[1] - hx); max[0] = Math.max(max[0], p[1] + hx);
    min[1] = Math.min(min[1], p[2] - hy); max[1] = Math.max(max[1], p[2] + hy);
    min[2] = Math.min(min[2], p[3] - hz); max[2] = Math.max(max[2], p[3] + hz);
  }
  m._b = { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  return m._b;
}

/** Vie d'un objet selon sa taille (comme dans Garry's Mod : petit = fragile, gros = solide). */
export function modelHp(id, scale = 1) {
  const b = modelBounds(id);
  if (!b) return 100;
  const vol = b.size[0] * b.size[1] * b.size[2] * scale ** 3;
  return Math.max(25, Math.min(200, Math.round(20 + 140 * Math.cbrt(vol))));
}

export const MODELS = M;

// ───────────────────────── Maps ─────────────────────────
/**
 * Une map = des volumes fixes (murs, sols, toits : boîtes de couleur) + des objets (modèles posés).
 * Les objets « static » ne servent pas de déguisement (bus, rayons…), mais on peut tirer dessus.
 */
function builder() {
  const solids = []; // [x, y, z, w, h, d, color, invisible?, noCollide?]
  const objects = []; // { m, x, y, z, ry, s }
  const api = {
    solids, objects,
    box(x, y, z, w, h, d, color, opts = {}) { solids.push([x, y, z, w, h, d, color, !!opts.invisible, !!opts.ghost]); },
    /** Mur le long de X (de x1 à x2), avec ouvertures [[début, fin, hauteurBas?, hauteurHaut?]] */
    wallX(x1, x2, z, h, color, gaps = [], t = 0.2, y0 = 0) {
      const xs = [x1, ...gaps.flatMap((g) => [g[0], g[1]]), x2];
      for (let i = 0; i < xs.length; i += 2) if (xs[i + 1] - xs[i] > 0.01) api.box((xs[i] + xs[i + 1]) / 2, y0 + h / 2, z, xs[i + 1] - xs[i], h, t, color);
      for (const g of gaps) {
        const top = g[3] ?? 2.3; const bottom = g[2] ?? 0;
        if (top < h) api.box((g[0] + g[1]) / 2, y0 + (top + h) / 2, z, g[1] - g[0], h - top, t, color);
        if (bottom > 0) api.box((g[0] + g[1]) / 2, y0 + bottom / 2, z, g[1] - g[0], bottom, t, color);
      }
    },
    /** Mur le long de Z */
    wallZ(z1, z2, x, h, color, gaps = [], t = 0.2, y0 = 0) {
      const zs = [z1, ...gaps.flatMap((g) => [g[0], g[1]]), z2];
      for (let i = 0; i < zs.length; i += 2) if (zs[i + 1] - zs[i] > 0.01) api.box(x, y0 + h / 2, (zs[i] + zs[i + 1]) / 2, t, h, zs[i + 1] - zs[i], color);
      for (const g of gaps) {
        const top = g[3] ?? 2.3; const bottom = g[2] ?? 0;
        if (top < h) api.box(x, y0 + (top + h) / 2, (g[0] + g[1]) / 2, t, h - top, g[1] - g[0], color);
        if (bottom > 0) api.box(x, y0 + bottom / 2, (g[0] + g[1]) / 2, t, bottom, g[1] - g[0], color);
      }
    },
    obj(m, x, z, ry = 0, y = 0, s = 1) { objects.push({ m, x, y, z, ry, s }); },
    /** Mur invisible autour de la map */
    bounds(x1, x2, z1, z2, h = 12) {
      api.box((x1 + x2) / 2, h / 2, z1 - 0.5, x2 - x1 + 2, h, 1, 0, { invisible: true });
      api.box((x1 + x2) / 2, h / 2, z2 + 0.5, x2 - x1 + 2, h, 1, 0, { invisible: true });
      api.box(x1 - 0.5, h / 2, (z1 + z2) / 2, 1, h, z2 - z1 + 2, 0, { invisible: true });
      api.box(x2 + 0.5, h / 2, (z1 + z2) / 2, 1, h, z2 - z1 + 2, 0, { invisible: true });
    },
  };
  return api;
}

const PI = Math.PI;

/** Lotissement : deux maisons face à face, une rue, des jardins. */
function suburb() {
  const b = builder();
  const GRASS = 0x6ea84f; const ROAD = 0x45484d; const WALK = 0xb9b6ae;
  b.box(0, -0.05, 0, 64, 0.1, 56, GRASS);
  b.box(0, 0.01, 0, 64, 0.02, 8, ROAD);
  for (let x = -28; x <= 28; x += 6) b.box(x, 0.025, 0, 2.5, 0.01, 0.2, 0xf1e9c9, { ghost: true });
  b.box(0, 0.08, 5, 64, 0.16, 2, WALK); b.box(0, 0.08, -5, 64, 0.16, 2, WALK);

  // Maison : 12 × 9 m, salon + cuisine, garage ouvert. `dir` = 1 (au nord, porte vers le sud) ou -1.
  const house = (cx, cz, dir, wall, roof) => {
    const f = (dz) => cz + dir * dz; // profondeur depuis la façade
    const front = f(0); const back = f(9);
    const z1 = Math.min(front, back); const z2 = Math.max(front, back);
    const x1 = cx - 6; const x2 = cx + 6;
    b.box(cx, 0.06, (z1 + z2) / 2, 12, 0.12, 9, 0xc19a6b); // parquet
    b.wallX(x1, x2, front, 3, wall, [[cx - 4.5, cx - 3.2], [cx - 1.6, cx - 0.2, 1, 2.1], [cx + 1.5, cx + 3.2, 1, 2.1]]);
    b.wallX(x1, x2, back, 3, wall, [[cx + 2, cx + 3.2]]);
    b.wallZ(z1, z2, x1, 3, wall, [[(z1 + z2) / 2 - 1, (z1 + z2) / 2 + 0.5, 1, 2.1]]);
    b.wallZ(z1, z2, x2, 3, wall, [[(z1 + z2) / 2 - 0.6, (z1 + z2) / 2 + 0.6]]);
    b.wallZ(z1, z2, cx, 3, 0xe9e4da, [[(z1 + z2) / 2 - 0.6, (z1 + z2) / 2 + 0.6]], 0.15); // mur intérieur
    b.box(cx, 3.15, (z1 + z2) / 2, 12.8, 0.3, 9.8, roof);
    b.box(cx, 3.55, (z1 + z2) / 2, 10, 0.5, 7, roof);
    // garage
    const gx = cx + 9;
    b.box(gx, 0.04, (z1 + z2) / 2, 6, 0.08, 9, 0x8c8c8c);
    b.wallX(gx - 3, gx + 3, back, 2.8, 0xd9d2c3);
    b.wallZ(z1, z2, gx + 3, 2.8, 0xd9d2c3);
    b.box(gx, 2.95, (z1 + z2) / 2, 6.4, 0.3, 9.4, 0x6d6f73);
    // salon (côté x1)
    const zm = (z1 + z2) / 2;
    b.obj('sofa', cx - 3, f(6.5), dir > 0 ? 0 : PI);
    b.obj('tv', cx - 3, f(3.4), dir > 0 ? PI : 0);
    b.obj('armchair', cx - 5, f(5), PI / 2);
    b.obj('lamp', cx - 5.4, f(8.2));
    b.obj('bookshelf', cx - 1, f(8.5), dir > 0 ? 0 : PI);
    b.obj('plant', cx - 5.3, f(1));
    b.obj('clock', cx - 2.5, f(8.75), dir > 0 ? 0 : PI, 2);
    b.obj('ball', cx - 4.2, f(2.4));
    // cuisine (côté x2)
    b.obj('table', cx + 3, zm);
    b.obj('chair', cx + 2.3, zm - 0.7, 0); b.obj('chair', cx + 3.7, zm - 0.7, 0);
    b.obj('chair', cx + 2.3, zm + 0.7, PI); b.obj('chair', cx + 3.7, zm + 0.7, PI);
    b.obj('fruitbowl', cx + 3, zm, 0, 0.77); b.obj('mug', cx + 2.4, zm + 0.2, 0, 0.77); b.obj('plates', cx + 3.5, zm - 0.2, 0, 0.77);
    b.obj('fridge', cx + 5.4, f(8.4), dir > 0 ? 0 : PI);
    b.obj('stove', cx + 4.3, f(8.5), dir > 0 ? 0 : PI);
    b.obj('cabinet', cx + 2.4, f(8.5), dir > 0 ? 0 : PI); b.obj('toaster', cx + 2.2, f(8.5), 0, 0.92); b.obj('kettle', cx + 2.7, f(8.4), 0, 0.92);
    b.obj('bin', cx + 5.5, f(1));
    b.obj('washer', cx + 0.6, f(8.5), dir > 0 ? 0 : PI);
    // garage
    b.obj(dir > 0 ? 'car' : 'carRed', gx, zm, 0);
    b.obj('box', gx + 2.2, f(8), 0.3); b.obj('boxSmall', gx + 2.4, f(7.2), 0.8); b.obj('tire', gx - 2.3, f(7.9));
    b.obj('crate', gx + 2.2, f(1.2), 0.2); b.obj('barrel', gx - 2.3, f(1.4));
    // jardin à l'arrière
    const yb = f(13);
    b.obj('bbq', cx - 3, yb); b.obj('picnic', cx + 1.5, yb); b.obj('doghouse', cx + 6, yb, dir > 0 ? 0 : PI);
    b.obj('gnome', cx - 5, f(11)); b.obj('gnome', cx + 4, f(15)); b.obj('bush', cx - 7, f(15)); b.obj('bush', cx + 9, f(11)); b.obj('ball', cx + 2.5, f(15.5));
    b.obj('tree', cx - 8, f(17)); b.obj('tree', cx + 11, f(17));
    // clôture du jardin
    for (let x = x1 - 2; x <= x2 + 8; x += 2) b.obj('fence', x + 1, f(19.6));
    // devant : boîte aux lettres, buissons
    b.obj('mailbox', cx - 6.5, f(-2.2)); b.obj('bush', cx + 0.8, f(-1.2)); b.obj('bush', cx - 2, f(-1.2));
  };
  house(-5, -9, -1, 0xe8d8b0, 0x8c3a2f);
  house(-5, 9, 1, 0xb7d0e0, 0x3d4f6b);
  // rue
  b.obj('bus', 2, 0, PI / 2);
  b.obj('car', -18, 2.2, PI / 2); b.obj('carRed', 16, -2.2, -PI / 2);
  for (const x of [-26, -14, 14, 26]) { b.obj('tree', x, 5.8); b.obj('tree', x + 4, -5.8); }
  for (const x of [-22, 6, 22]) { b.obj('streetlamp', x, 4.6, PI); b.obj('streetlamp', x + 3, -4.6, 0); }
  b.obj('hydrant', -10, 4.6); b.obj('hydrant', 18, -4.6);
  b.obj('bench', -24, -5.3, 0, 0.16); b.obj('bench', 10, 5.3, PI, 0.16);
  b.obj('trashcan', -20, -4.6); b.obj('trashcan', 12, 4.6);
  b.obj('cone', 7.5, 1.5); b.obj('cone', 8.2, 2.4); b.obj('cone', -8, -2.6);
  b.bounds(-30, 30, -26, 26);
  return {
    id: 'suburb', name: 'Lotissement', outdoor: true, sky: 0x9fd0f2, fog: [0xbfdcf0, 30, 80], light: 1.0,
    solids: b.solids, objects: b.objects,
    spawns: { hunters: [[-26, 0.2, 0], [-26, 0.2, 2], [-26, 0.2, -2], [-24, 0.2, 1], [-24, 0.2, -1]], props: [[0, 0.2, -12], [0, 0.2, 12], [-10, 0.2, -2], [10, 0.2, 2], [20, 0.2, 0], [-13, 0.2, -3]] },
  };
}

/** Supérette : rayons, caisses, entrepôt à l'arrière. */
function store() {
  const b = builder();
  const W = 0xe7e4dc; const H = 5;
  b.box(0, -0.05, 0, 36, 0.1, 44, 0xd8d4c8);
  for (let x = -16; x <= 16; x += 4) for (let z = -6; z <= 20; z += 4) if (((x + z) / 4) % 2 === 0) b.box(x, 0.005, z, 4, 0.01, 4, 0xc9c4b6, { ghost: true });
  b.box(0, 0.01, -15, 36, 0.02, 14, 0x9a9a96, { ghost: true }); // béton de l'entrepôt
  b.wallX(-18, 18, 22, H, 0xbcd4e6, [[-3, 3]]); // vitrine + entrée
  b.wallX(-18, 18, -22, H, W, [[8, 12, 0, 3.5]]); // quai
  b.wallZ(-22, 22, -18, H, W); b.wallZ(-22, 22, 18, H, W);
  b.wallX(-18, 18, -8, H, 0xd0cbc0, [[-12, -9.5], [9.5, 12]]); // séparation entrepôt
  b.box(0, H + 0.15, 0, 37, 0.3, 45, 0x9c9a95); // toit
  // néons
  for (let x = -12; x <= 12; x += 6) b.box(x, H - 0.1, 6, 0.3, 0.06, 20, 0xfffff0, { ghost: true });
  // rayons : 5 allées
  const products = ['cereal', 'can', 'bottle', 'boxSmall', 'rice', 'watermelon', 'can', 'cereal'];
  let k = 0;
  for (const x of [-12, -6, 0, 6, 12]) {
    for (const z of [-3, -1, 1, 3, 5, 7, 9, 11]) {
      if (z % 4 !== 1 && z % 4 !== -3) continue;
      b.obj('shelf', x - 0.32, z + 0.5, -PI / 2); b.obj('shelf', x + 0.32, z + 0.5, PI / 2);
      for (const side of [-1, 1]) {
        for (const [lvl, y] of [[0, 0.14], [1, 0.74], [2, 1.34]]) {
          const m = products[(k++) % products.length];
          if (m === 'watermelon' && lvl > 0) continue;
          b.obj(m, x + side * 0.32, z + (k % 3) * 0.4 - 0.1, (k % 4) * 0.4, y);
          b.obj(products[(k + 3) % products.length] === 'watermelon' ? 'can' : products[(k + 3) % products.length], x + side * 0.32, z + 0.9, k * 0.7, y);
        }
      }
    }
  }
  // caisses et entrée
  for (const x of [-10, -4, 4]) { b.obj('register', x, 15.5, 0); b.obj('officeChair', x + 0.4, 16.4, PI); }
  for (const [x, z] of [[11, 19], [11.7, 19.2], [12.4, 19.4], [-14, 18], [15, 14]]) b.obj('cart', x, z, PI / 2 + (x % 2) * 0.3);
  b.obj('freezer', 14, 9, PI / 2); b.obj('freezer', 14, 5, PI / 2);
  b.obj('crate', -15.5, 12); b.obj('watermelon', -15.5, 12.2, 0, 0.8); b.obj('watermelon', -15.3, 11.8, 0, 0.8); b.obj('crate', -15.5, 13);
  b.obj('plantTall', 2.5, 20.8); b.obj('plantTall', -2.5, 20.8); b.obj('bin', 4, 20.8); b.obj('cone', -6, 19);
  b.obj('waterCooler', 16.8, 16);
  // entrepôt
  for (const [x, z] of [[-14, -12], [-14, -16], [-10, -19], [-4, -12], [-4, -16], [2, -19]]) {
    b.obj('pallet', x, z); b.obj('crate', x - 0.2, z, 0, 0.14); b.obj('box', x + 0.3, z + 0.1, 0.2, 0.94);
  }
  b.obj('forklift', 6, -14, 0.4);
  for (const [x, z] of [[14, -12], [14.8, -12.6], [15.4, -11.8], [14.2, -18], [15, -18.5]]) b.obj('barrel', x, z);
  for (const [x, z, r] of [[8, -10, 0.3], [9, -10.6, 1], [10, -9.8, 2], [-16, -9.5, 0], [0, -10, 0.6]]) b.obj('box', x, z, r);
  b.obj('rice', 11, -18); b.obj('rice', 11.5, -18.6, 0.5); b.obj('tire', -8, -20.5); b.obj('cone', 10, -21);
  b.bounds(-18, 18, -22, 26);
  b.box(0, -0.05, 24, 36, 0.1, 6, 0x9a9a96); // parking devant
  b.obj('carRed', -9, 24.5, PI / 2); b.obj('cart', 8, 24, 0.4); b.obj('cone', 4, 23.5);
  return {
    id: 'store', name: 'Supérette', outdoor: false, sky: 0x2b2a28, fog: [0x2b2a28, 25, 60], light: 1.15,
    solids: b.solids, objects: b.objects,
    spawns: { hunters: [[0, 0.2, 24.5], [-2, 0.2, 24.5], [2, 0.2, 24.5], [-4, 0.2, 24.5], [4, 0.2, 24.5]], props: [[0, 0.2, 0], [-9, 0.2, 4], [9, 0.2, 4], [-6, 0.2, -14], [6, 0.2, -18], [0, 0.2, 12]] },
  };
}

/** Open-space : îlots de bureaux, salle de réunion, cafétéria, toilettes, coin photocopie. */
function office() {
  const b = builder();
  const H = 3.2; const W = 0xeeece6; const G = 0xa9cde0;
  b.box(0, -0.05, 0, 32, 0.1, 32, 0x8090a3);
  b.wallX(-16, 16, -16, H, W); b.wallX(-16, 16, 16, H, W, [[-2, 2]]);
  b.wallZ(-16, 16, -16, H, W); b.wallZ(-16, 16, 16, H, W);
  b.box(0, H + 0.15, 0, 33, 0.3, 33, 0xdedbd2);
  for (let x = -12; x <= 12; x += 6) for (let z = -12; z <= 12; z += 6) b.box(x, H - 0.05, z, 1.2, 0.04, 1.2, 0xffffff, { ghost: true });
  // salle de réunion (nord-ouest) : cloisons vitrées
  b.wallX(-16, -6, -6, H, G, [[-9, -7.5]], 0.1); b.wallZ(-16, -6, -6, H, G, [], 0.1);
  b.obj('table', -11, -11, 0, 0, 1.4);
  for (const x of [-12.2, -11, -9.8]) { b.obj('chair', x, -12.2, 0); b.obj('chair', x, -9.8, PI); }
  b.obj('whiteboard', -11, -15.6, 0); b.obj('plantTall', -15.2, -6.8); b.obj('mug', -11.4, -11, 0, 1.06); b.obj('book', -10.5, -10.8, 0.4, 1.06);
  // cafétéria (nord-est)
  b.wallX(6, 16, -6, H, W, [[7, 8.5]], 0.15); b.wallZ(-16, -6, 6, H, W, [], 0.15);
  b.obj('fridge', 15.4, -15.2, -PI / 2); b.obj('cabinet', 15.4, -13.5, -PI / 2); b.obj('cabinet', 15.4, -12.5, -PI / 2);
  b.obj('coffeeMachine', 15.4, -13.6, -PI / 2, 0.92); b.obj('microwave', 15.4, -12.4, -PI / 2, 0.92);
  b.obj('waterCooler', 6.6, -15.4); b.obj('sofa', 10, -15.2, 0); b.obj('table', 10.5, -10, 0, 0, 0.8);
  b.obj('chair', 9.9, -9.2, PI); b.obj('chair', 11.1, -10.8, 0); b.obj('plant', 6.6, -6.7); b.obj('bin', 15.3, -6.7);
  b.obj('mug', 10.3, -10, 0, 0.6); b.obj('fruitbowl', 10.9, -10.1, 0, 0.6);
  // toilettes (sud-est)
  b.wallX(8, 16, 7, H, 0xcfe3e0, [[8.6, 9.8]], 0.15); b.wallZ(7, 16, 8, H, 0xcfe3e0, [], 0.15);
  for (const z of [9.5, 11.5, 13.5]) { b.obj('stall', 14.8, z, PI / 2); b.obj('toilet', 15.4, z, -PI / 2); }
  b.obj('sink', 8.6, 13, PI / 2); b.obj('sink', 8.6, 14.5, PI / 2); b.obj('bin', 9, 15.4);
  // coin photocopie (sud-ouest)
  b.obj('printer', -15.2, 12, PI / 2); b.obj('filing', -15.4, 9.5, PI / 2); b.obj('filing', -15.4, 8.8, PI / 2);
  b.obj('box', -14, 15, 0.2); b.obj('boxSmall', -13.3, 15.2, 0.6); b.obj('plantTall', -15.2, 15.2); b.obj('waterCooler', -10, 15.5);
  // îlots de bureaux
  for (const [cx, cz] of [[-6, 2], [0, 2], [6, 2], [-6, 9], [0, 9], [3, -10]]) {
    for (const [dx, dz, ry] of [[-0.72, -0.4, 0], [0.72, -0.4, 0], [-0.72, 0.4, PI], [0.72, 0.4, PI]]) {
      b.obj('desk', cx + dx, cz + dz, ry, 0, 1);
      b.obj('monitor', cx + dx, cz + dz * 1.3, ry, 0.755);
      b.obj('officeChair', cx + dx, cz + dz * 2.6, ry + PI);
      if ((cx + dx * 3 + cz) % 3 === 0) b.obj('mug', cx + dx + 0.4, cz + dz * 1.2, 0, 0.755);
      if ((cx * 2 + dz * 5) % 4 === 0) b.obj('book', cx + dx - 0.4, cz + dz * 1.2, 0.6, 0.755);
    }
    b.obj('plant', cx + 2, cz, 0);
  }
  b.obj('bookshelf', -4, -15.7); b.obj('bookshelf', -3, -15.7); b.obj('clock', 0, -15.85, 0, 2.2); b.obj('bin', 2, -15.4);
  b.obj('armchair', 12, 2, -PI / 2); b.obj('armchair', 12, 4.5, -PI / 2); b.obj('lamp', 13.5, 3.2);
  b.bounds(-16, 16, -16, 20);
  b.box(0, -0.05, 18, 34, 0.1, 4.2, 0x9a9a96); // palier
  return {
    id: 'office', name: 'Open-space', outdoor: false, sky: 0x1f2329, fog: [0x1f2329, 25, 60], light: 1.15,
    solids: b.solids, objects: b.objects,
    spawns: { hunters: [[0, 0.2, 18], [-1.5, 0.2, 18.5], [1.5, 0.2, 18.5], [-2.5, 0.2, 17.5], [2.5, 0.2, 17.5]], props: [[0, 0.2, 0], [-11, 0.2, -8], [11, 0.2, -12], [-12, 0.2, 12], [12, 0.2, 3], [0, 0.2, -6]] },
  };
}

/** Cuisine géante : tout est ×6, tu es minuscule. */
function kitchen() {
  const b = builder();
  const S = 6;
  b.box(0, -0.05, 0, 44, 0.1, 44, 0xeee7d8);
  for (let x = -20; x < 22; x += 4) for (let z = -20; z < 22; z += 4) if (((x + z) / 4) % 2 === 0) b.box(x + 2, 0.005, z + 2, 4, 0.01, 4, 0x3a3f45, { ghost: true });
  const W = 0xf0d9a8; const H = 18;
  b.wallX(-22, 22, -22, H, W); b.wallX(-22, 22, 22, H, W);
  b.wallZ(-22, 22, -22, H, 0xe9c98f); b.wallZ(-22, 22, 22, H, 0xe9c98f);
  b.box(0, H + 0.2, 0, 45, 0.4, 45, 0xf6f1e4);
  // plinthe
  b.box(0, 0.4, -21.8, 44, 0.8, 0.2, 0xffffff, { ghost: true });
  // grande table et chaises
  b.obj('table', 0, 0, 0, 0, S);
  b.obj('chair', -2.2, -3.6, 0, 0, S); b.obj('chair', 2.2, -3.6, 0, 0, S); b.obj('chair', 2.2, 3.6, PI, 0, S); b.obj('chair', -2.2, 3.6, PI, 0, S);
  const T = 0.76 * S; // dessus de la table
  b.obj('mug', -3, -1, 0.5, T, S); b.obj('plates', 2.5, 0.8, 0, T, S); b.obj('fruitbowl', 0, 0, 0, T, S); b.obj('bottle', 3.5, -1.5, 0, T, S);
  b.obj('cereal', -1.5, 1.5, 0.3, T, S); b.obj('book', 1.5, -1.6, 0.6, T, S); b.obj('kettle', -4, 1, 0, T, S); b.obj('toaster', 4, 1.5, 0.2, T, S);
  // escalier de livres jusqu'à la table (12 marches de 38 cm)
  const colors = [0x7b3fa0, 0xc0392b, 0x2e86c1, 0x27ae60, 0xd68910, 0x884ea0, 0x1f618d, 0xb03a2e, 0x117a65, 0xca6f1e, 0x6c3483, 0x2874a6];
  for (let i = 0; i < 12; i++) b.box(-9.5 + i * 0.45, (0.38 * (i + 1)) / 2, -2.2, 0.45, 0.38 * (i + 1), 2.4, colors[i]);
  // plan de travail le long du mur nord
  for (let x = -18; x <= 6; x += 6) b.obj('cabinet', x, -19.8, 0, 0, S);
  b.obj('fridge', 14, -19.4, 0, 0, S); b.obj('stove', 9.5, -19.6, 0, 0, S);
  b.obj('microwave', -14, -19.6, 0, 0.92 * S, S); b.obj('coffeeMachine', -6, -19.6, 0, 0.92 * S, S);
  // au sol
  b.obj('bin', 18, 0, 0, 0, S); b.obj('ball', -14, 10, 0, 0, S); b.obj('box', 12, 14, 0.4, 0, S); b.obj('boxSmall', 15, 10, 0.9, 0, S);
  b.obj('washer', -18.2, 8, PI / 2, 0, S); b.obj('book', -10, 16, 0.4, 0, S); b.obj('book', -10, 16, 0.9, 0.3, S);
  b.obj('mug', 8, 8, 0, 0, S); b.obj('bottle', 9, 7, 0, 0, S); b.obj('can', -6, 12, 0, 0, S); b.obj('can', -5.4, 12.6, 0, 0, S);
  b.obj('plant', 18.5, 18.5, 0, 0, S); b.obj('gnome', 4, 16, 0.5, 0, S); b.obj('watermelon', -16, -10, 0, 0, S);
  b.bounds(-22, 22, -22, 22, 20);
  return {
    id: 'kitchen', name: 'Cuisine géante', outdoor: false, sky: 0xf6f1e4, fog: [0xf6efe0, 40, 90], light: 1.25,
    solids: b.solids, objects: b.objects,
    spawns: { hunters: [[0, 0.2, 18], [-2, 0.2, 18], [2, 0.2, 18], [-4, 0.2, 18], [4, 0.2, 18]], props: [[0, 0.2, -10], [-12, 0.2, -6], [12, 0.2, -6], [-14, 0.2, 4], [14, 0.2, 4], [0, 0.2, 8]] },
  };
}

const BUILDERS = { suburb, store, office, kitchen };
export const MAP_LIST = [
  { id: 'suburb', name: 'Lotissement', icon: '🏡', desc: 'Deux maisons face à face, la rue, les jardins.' },
  { id: 'store', name: 'Supérette', icon: '🛒', desc: 'Rayons, caisses et entrepôt à l\'arrière.' },
  { id: 'office', name: 'Open-space', icon: '🏢', desc: 'Bureaux, salle de réunion, cafétéria, toilettes.' },
  { id: 'kitchen', name: 'Cuisine géante', icon: '🍳', desc: 'Tu es minuscule dans une cuisine immense.' },
];

const cache = new Map();
/** Map construite (mise en cache). */
export function getMap(id) {
  if (!BUILDERS[id]) id = 'suburb';
  if (!cache.has(id)) cache.set(id, BUILDERS[id]());
  return cache.get(id);
}

/** Objets dont on peut prendre l'apparence (pas les « static »). */
export function disguisableModels(map) {
  const ok = (o) => {
    const m = MODELS[o.m];
    if (!m || m.static) return false;
    const b = modelBounds(o.m);
    return Math.max(...b.size) * (o.s || 1) <= 3.2; // pas de déguisement géant (table de la cuisine, etc.)
  };
  return [...new Set(map.objects.filter(ok).map((o) => `${o.m}@${o.s}`))];
}

/** Un objet de la map peut-il servir de déguisement ? */
export function canDisguiseAs(o) {
  const m = MODELS[o.m];
  if (!m || m.static) return false;
  return Math.max(...modelBounds(o.m).size) * (o.s || 1) <= 3.2;
}

export const TAUNTS = [
  { id: 'whistle', label: 'Sifflet' }, { id: 'boing', label: 'Boing' }, { id: 'honk', label: 'Klaxon' },
  { id: 'quack', label: 'Coin coin' }, { id: 'cuckoo', label: 'Coucou' }, { id: 'laugh', label: 'Rire' },
];

export const PLAYER = { radius: 0.32, height: 1.8, eye: 1.62, speed: 5.2, sprint: 7.4, jump: 5.6, gravity: 16 };
