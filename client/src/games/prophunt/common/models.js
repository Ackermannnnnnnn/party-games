/**
 * Prop Hunt — catalogue des objets (partagé client / serveur, copié tel quel dans
 * server/src/games/prophunt/common : ne rien importer d'autre que les fichiers de ce dossier).
 *
 * Unités : mètres, y vers le haut, l'objet est posé sur y = 0, sa face avant regarde +z.
 *
 * Pièces d'un modèle (position = centre de la forme) :
 *   ['b', x, y, z, largeur, hauteur, profondeur, matière, rotationY?]   boîte
 *   ['c', x, y, z, rayon, hauteur, matière, côtés?, rayonHaut?]          cylindre
 *   ['s', x, y, z, rayon, matière]                                       sphère
 *   ['k', x, y, z, rayon, hauteur, matière, côtés?]                      cône
 *
 * Matière : un nombre (peinture de cette couleur), un nom de MATS ('wood') ou 'nom:couleur' ('fabric:5b6fb0').
 * Chaque pièce sert aussi de volume de collision : un meuble creux (armoire, casier) est donc
 * vraiment creux, on peut s'y glisser.
 */
import { ASSETS } from './assets.js';
import { assetName } from './assetNames.js';

/** Matières : couleur de base, texture procédurale, rugosité, métal, émission, verre, nc = on passe au travers. */
export const MATS = {
  paint: { c: 0xeeeeee, r: 0.65 },
  wood: { c: 0x9a6b3f, t: 'wood', r: 0.7 },
  woodD: { c: 0x6b4526, t: 'wood', r: 0.65 },
  woodL: { c: 0xc8a06a, t: 'wood', r: 0.7 },
  plank: { c: 0xb08458, t: 'plank', r: 0.78, s: 2 },
  metal: { c: 0xa8adb5, t: 'metal', m: 0.75, r: 0.38 },
  steel: { c: 0x6e747c, t: 'metal', m: 0.7, r: 0.45 },
  chrome: { c: 0xdfe3e8, m: 1, r: 0.12 },
  plastic: { c: 0x2b2d33, r: 0.4 },
  rubber: { c: 0x1d1d20, r: 0.95 },
  fabric: { c: 0x5b6fb0, t: 'fabric', r: 1, s: 0.6 },
  leather: { c: 0x5a3424, t: 'fabric', r: 0.55, s: 0.4 },
  glass: { c: 0xcfe9f5, glass: 0.28, r: 0.05 },
  window: { c: 0x1d2a35, r: 0.08, m: 0.5 },
  water: { c: 0x2f8fc4, glass: 0.7, r: 0.05 },
  leaf: { c: 0x3f8f3a, t: 'leaf', r: 0.9, nc: true, s: 1.2 },
  grass: { c: 0x6ea84f, t: 'grass', r: 1, s: 3 },
  dirt: { c: 0x7a5c3e, t: 'grass', r: 1, s: 3 },
  asphalt: { c: 0x6a6c70, t: 'asphalt', r: 0.95, s: 4 },
  concrete: { c: 0xb9b6ae, t: 'concrete', r: 0.9, s: 3 },
  tile: { c: 0xe8e4dc, t: 'tile', r: 0.3, s: 1.2 },
  tileS: { c: 0xe6f0f0, t: 'tileS', r: 0.25, s: 0.6 },
  brick: { c: 0xd08a6c, t: 'brick', r: 0.9, s: 1.6 },
  plaster: { c: 0xe9e4da, t: 'plaster', r: 0.9, s: 2 },
  ceiling: { c: 0xf2f0ea, t: 'plaster', r: 0.95, s: 2, em: 0.32 },
  siding: { c: 0xb7d0e0, t: 'siding', r: 0.7, s: 1.5 },
  roof: { c: 0x8c3a2f, t: 'roof', r: 0.85, s: 1.5 },
  carpet: { c: 0x6b7280, t: 'carpet', r: 1, s: 1.5 },
  card: { c: 0xc49a62, t: 'card', r: 0.9, s: 0.8 },
  light: { c: 0xfffbea, e: 1.6 },
  screen: { c: 0x2c5e8f, e: 0.55, r: 0.15 },
  ceramic: { c: 0xf4f4f2, r: 0.18 },
};

const W = 'wood'; const WD = 'woodD'; const WL = 'woodL';
const MET = 'metal'; const DARK = 'plastic'; const WHITE = 'paint:f2f2ef'; const RED = 0xd94141;
const GREEN = 0x4f9a46; const LEAF = 'leaf'; const LEAF2 = 'leaf:57a345'; const POT = 0xb5653a; const BLUE = 0x3c74c9; const YEL = 0xf2c43d;
const CER = 'ceramic';

function legs(dx, dz, h, mat, t = 0.05) {
  return [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].map(([x, z]) => ['b', x, h / 2, z, t, h, t, mat]);
}
function wheels(dx, dz, r = 0.08, w = 0.12) {
  return [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].map(([x, z]) => ['c', x, r, z, r, w, 'rubber', 12]);
}
/** Roues de voiture (cylindre couché : on l'approche par une boîte arrondie visuellement). */
function carWheels(dx, dz, r) {
  return [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].flatMap(([x, z]) => [['b', x, r, z, 0.24, r * 2, r * 2, 'rubber'], ['b', x + Math.sign(x) * 0.005, r, z, 0.245, r * 1.1, r * 1.1, 'chrome']]);
}
/**
 * Meuble creux ouvert à l'avant (+z) : fond, côtés, dessus, socle, étagères, porte ouverte à 90°.
 * door : 'right' | 'left' | 'both' | null
 */
function hollow(w, h, d, mat, { t = 0.03, shelves = [], door = 'right', doorMat = mat, plinth = 0.06, handle = MET } = {}) {
  const parts = [
    ['b', 0, h / 2, -d / 2 + t / 2, w, h, t, mat],
    ['b', -w / 2 + t / 2, h / 2, 0, t, h, d, mat],
    ['b', w / 2 - t / 2, h / 2, 0, t, h, d, mat],
    ['b', 0, h - t / 2, 0, w, t, d, mat],
    ['b', 0, plinth + t / 2, 0, w - 2 * t, t, d - t, mat],
  ];
  if (plinth > 0) parts.push(['b', 0, plinth / 2, d / 2 - 0.05, w - 2 * t, plinth, 0.02, mat]);
  for (const y of shelves) parts.push(['b', 0, y, 0, w - 2 * t, t, d - t, mat]);
  const dh = h - plinth - 0.02;
  const doorAt = (side, dw) => {
    const x = side * (w / 2 - t / 2);
    parts.push(['b', x, plinth + dh / 2, d / 2 + dw / 2, t, dh, dw, doorMat]);
    parts.push(['b', x + side * 0.025, plinth + dh * 0.5, d / 2 + dw - 0.06, 0.02, 0.14, 0.02, handle]);
  };
  if (door === 'right') doorAt(1, w);
  else if (door === 'left') doorAt(-1, w);
  else if (door === 'both') { doorAt(1, w / 2); doorAt(-1, w / 2); }
  return parts;
}

const M = {
  // ─────────── Salon, chambre ───────────
  chair: { name: 'Chaise', parts: [['b', 0, 0.45, 0, 0.45, 0.05, 0.45, W], ['b', 0, 0.78, -0.2, 0.45, 0.5, 0.04, W], ['b', 0, 0.98, -0.2, 0.47, 0.08, 0.05, WD], ...legs(0.19, 0.19, 0.45, WD, 0.045)] },
  stool: { name: 'Tabouret', parts: [['c', 0, 0.7, 0, 0.18, 0.05, W, 16], ...legs(0.11, 0.11, 0.68, MET, 0.03)] },
  table: { name: 'Table', parts: [['b', 0, 0.74, 0, 1.6, 0.05, 0.9, W], ['b', 0, 0.68, 0, 1.45, 0.08, 0.75, WD], ...legs(0.72, 0.38, 0.72, WD, 0.07)] },
  coffeeTable: { name: 'Table basse', parts: [['b', 0, 0.42, 0, 1.1, 0.05, 0.6, WL], ['b', 0, 0.12, 0, 1.0, 0.03, 0.5, WL], ...legs(0.5, 0.25, 0.42, WD, 0.05)] },
  sofa: { name: 'Canapé', parts: [['b', 0, 0.12, 0, 2, 0.12, 0.9, WD], ['b', -0.48, 0.32, 0.06, 0.95, 0.24, 0.72, 'fabric:5b6fb0'], ['b', 0.48, 0.32, 0.06, 0.95, 0.24, 0.72, 'fabric:5b6fb0'], ['b', 0, 0.65, -0.35, 1.8, 0.62, 0.2, 'fabric:4d5f9b'], ['b', -0.9, 0.5, 0.0, 0.2, 0.5, 0.9, 'fabric:4d5f9b'], ['b', 0.9, 0.5, 0.0, 0.2, 0.5, 0.9, 'fabric:4d5f9b'], ['b', -0.5, 0.62, -0.18, 0.4, 0.3, 0.12, 'fabric:e0b860']] },
  armchair: { name: 'Fauteuil', parts: [['b', 0, 0.12, 0, 0.9, 0.12, 0.85, WD], ['b', 0, 0.32, 0.06, 0.6, 0.24, 0.7, 'fabric:a0523d'], ['b', 0, 0.7, -0.32, 0.9, 0.62, 0.2, 'fabric:8c4433'], ['b', -0.38, 0.5, 0.0, 0.15, 0.5, 0.85, 'fabric:8c4433'], ['b', 0.38, 0.5, 0.0, 0.15, 0.5, 0.85, 'fabric:8c4433']] },
  bed: { name: 'Lit', static: true, parts: [['b', 0, 0.2, 0, 1.5, 0.22, 2.05, WD], ['b', 0, 0.42, 0.05, 1.42, 0.22, 1.9, 'fabric:f4f1ea'], ['b', -0.35, 0.6, -0.72, 0.6, 0.14, 0.38, 'fabric:ffffff'], ['b', 0.35, 0.6, -0.72, 0.6, 0.14, 0.38, 'fabric:ffffff'], ['b', 0, 0.75, -1.0, 1.55, 1.1, 0.07, WD], ['b', 0, 0.55, 0.38, 1.46, 0.08, 1.2, 'fabric:6a8fd6'], ...legs(0.7, 0.98, 0.1, WD, 0.08)] },
  bedKid: { name: 'Lit d\'enfant', static: true, parts: [['b', 0, 0.2, 0, 1.0, 0.22, 1.9, 'paint:f2f2ef'], ['b', 0, 0.4, 0.05, 0.92, 0.2, 1.75, 'fabric:ffffff'], ['b', 0, 0.56, -0.65, 0.6, 0.12, 0.35, 'fabric:ffffff'], ['b', 0, 0.5, 0.3, 0.96, 0.08, 1.1, 'fabric:e86a8f'], ['b', 0, 0.7, -0.93, 1.05, 1.0, 0.06, 'paint:f2f2ef']] },
  nightstand: { name: 'Table de chevet', parts: hollow(0.45, 0.55, 0.4, WL, { shelves: [0.3], door: null, t: 0.025 }) },
  lamp: { name: 'Lampadaire', parts: [['c', 0, 0.02, 0, 0.18, 0.04, DARK, 16], ['c', 0, 0.8, 0, 0.02, 1.55, MET, 8], ['c', 0, 1.62, 0, 0.24, 0.3, 'fabric:f3e3b3', 16, 0.14], ['s', 0, 1.55, 0, 0.06, 'light']] },
  deskLamp: { name: 'Lampe de bureau', parts: [['c', 0, 0.015, 0, 0.08, 0.03, DARK, 12], ['c', 0, 0.18, 0, 0.012, 0.32, MET, 6], ['c', 0, 0.36, 0.04, 0.09, 0.12, 'paint:e8b23a', 12, 0.04]] },
  tv: { name: 'Meuble télé', static: true, parts: [['b', 0, 0.25, 0, 1.6, 0.5, 0.45, WD], ['b', -0.4, 0.25, 0.226, 0.7, 0.36, 0.01, W], ['b', 0.4, 0.25, 0.226, 0.7, 0.36, 0.01, W], ['b', 0, 0.53, 0, 0.3, 0.06, 0.2, DARK], ['b', 0, 0.95, 0, 1.3, 0.76, 0.06, DARK], ['b', 0, 0.95, 0.032, 1.22, 0.68, 0.005, 'screen']] },
  fridge: { name: 'Frigo', parts: [['b', 0, 0.9, 0, 0.7, 1.8, 0.7, WHITE], ['b', 0, 1.25, 0.352, 0.68, 0.015, 0.01, 'paint:bdbdbd'], ['b', 0.27, 0.95, 0.37, 0.03, 0.4, 0.04, 'chrome'], ['b', 0.27, 1.5, 0.37, 0.03, 0.3, 0.04, 'chrome'], ['b', -0.1, 1.55, 0.356, 0.08, 0.08, 0.005, 0xe24d4d], ['b', 0.05, 1.45, 0.356, 0.07, 0.09, 0.005, 0x4d8ee2]] },
  stove: { name: 'Cuisinière', parts: [['b', 0, 0.45, 0, 0.6, 0.9, 0.6, WHITE], ['b', 0, 0.905, 0, 0.6, 0.012, 0.6, 'plastic:1b1b1e'], ['b', 0, 0.42, 0.302, 0.48, 0.32, 0.005, 'glass'], ['b', 0, 0.68, 0.31, 0.5, 0.03, 0.03, 'chrome'], ['c', -0.14, 0.915, -0.14, 0.09, 0.01, 'steel', 16], ['c', 0.14, 0.915, 0.14, 0.09, 0.01, 'steel', 16], ['c', -0.14, 0.915, 0.14, 0.07, 0.01, 'steel', 16], ['c', 0.14, 0.915, -0.14, 0.07, 0.01, 'steel', 16], ['b', 0, 1.0, -0.28, 0.6, 0.18, 0.04, WHITE]] },
  cabinet: { name: 'Meuble de cuisine', static: true, parts: [['b', 0, 0.44, 0, 1, 0.88, 0.6, 'paint:e9e2d0'], ['b', 0, 0.9, 0, 1.02, 0.04, 0.62, 'concrete:6b6f75'], ['b', -0.25, 0.5, 0.302, 0.47, 0.72, 0.01, 'paint:dcd3bd'], ['b', 0.25, 0.5, 0.302, 0.47, 0.72, 0.01, 'paint:dcd3bd'], ['b', -0.05, 0.7, 0.31, 0.02, 0.12, 0.02, 'chrome'], ['b', 0.05, 0.7, 0.31, 0.02, 0.12, 0.02, 'chrome']] },
  cabinetOpen: { name: 'Placard ouvert', static: true, parts: [...hollow(1, 0.88, 0.6, 'paint:e9e2d0', { t: 0.025, door: 'right', doorMat: 'paint:dcd3bd', plinth: 0.08 }), ['b', 0, 0.9, 0, 1.02, 0.04, 0.62, 'concrete:6b6f75']] },
  sinkCounter: { name: 'Évier', static: true, parts: [['b', 0, 0.44, 0, 1.2, 0.88, 0.6, 'paint:e9e2d0'], ['b', 0, 0.9, 0, 1.22, 0.04, 0.62, 'concrete:6b6f75'], ['b', 0, 0.86, 0.02, 0.6, 0.1, 0.42, 'chrome'], ['c', 0, 1.05, -0.22, 0.02, 0.3, 'chrome', 8], ['b', 0, 1.18, -0.12, 0.03, 0.03, 0.22, 'chrome']] },
  wallCabinet: { name: 'Placard mural', static: true, parts: hollow(1, 0.7, 0.35, 'paint:e9e2d0', { t: 0.02, door: 'left', plinth: 0, shelves: [0.35] }) },
  wardrobe: { name: 'Armoire', static: true, parts: hollow(1.2, 2.0, 0.62, WD, { t: 0.035, door: 'right', doorMat: W }) },
  wardrobeWhite: { name: 'Armoire blanche', static: true, parts: hollow(1.0, 2.0, 0.6, 'paint:f0eee8', { t: 0.03, door: 'left' }) },
  bookshelf: { name: 'Bibliothèque', static: true, parts: [...hollow(0.9, 1.9, 0.35, WD, { t: 0.03, door: null, shelves: [0.5, 0.95, 1.4] }), ...[0.07, 0.52, 0.97].flatMap((y, i) => [['b', -0.2, y + 0.18, 0.02, 0.36, 0.3, 0.24, [0xb0413e, 0x3e6ab0, 0x6fa04a][i]], ['b', 0.22, y + 0.15, 0.02, 0.3, 0.26, 0.24, [0xd9a23b, 0x7b3fa0, 0x2f8f8a][i]]])] },
  plant: { name: 'Plante', parts: [['c', 0, 0.18, 0, 0.18, 0.36, POT, 14, 0.22], ['c', 0, 0.35, 0, 0.17, 0.02, 'dirt', 14], ['s', 0, 0.62, 0, 0.3, LEAF], ['s', 0.12, 0.85, 0.05, 0.2, LEAF2], ['s', -0.12, 0.78, -0.06, 0.18, LEAF2]] },
  plantTall: { name: 'Grande plante', parts: [['c', 0, 0.22, 0, 0.22, 0.44, 'ceramic:e8e2d6', 14, 0.26], ['c', 0, 0.9, 0, 0.03, 1, WD, 6], ['s', 0, 1.45, 0, 0.42, LEAF], ['s', 0.2, 1.2, 0.1, 0.3, LEAF2], ['s', -0.18, 1.7, -0.05, 0.25, LEAF2]] },
  flowerPot: { name: 'Pot de fleurs', parts: [['c', 0, 0.1, 0, 0.1, 0.2, POT, 12, 0.13], ['s', 0, 0.28, 0, 0.12, LEAF2], ['s', 0.04, 0.36, 0.02, 0.05, 0xe84a7a], ['s', -0.05, 0.34, -0.02, 0.05, 0xf2d03d]] },
  barrel: { name: 'Tonneau', parts: [['c', 0, 0.45, 0, 0.32, 0.9, W, 16, 0.3], ['c', 0, 0.15, 0, 0.335, 0.05, 'steel', 16], ['c', 0, 0.75, 0, 0.335, 0.05, 'steel', 16]] },
  oilDrum: { name: 'Bidon', parts: [['c', 0, 0.45, 0, 0.3, 0.9, 'metal:2d6cb5', 16], ['c', 0, 0.3, 0, 0.305, 0.03, 'metal:24599a', 16], ['c', 0, 0.6, 0, 0.305, 0.03, 'metal:24599a', 16]] },
  crate: { name: 'Caisse en bois', parts: [['b', 0, 0.4, 0, 0.8, 0.8, 0.8, WL], ['b', 0, 0.4, 0.405, 0.8, 0.12, 0.012, W], ['b', 0, 0.4, -0.405, 0.8, 0.12, 0.012, W], ['b', 0.405, 0.4, 0, 0.012, 0.12, 0.8, W], ['b', -0.405, 0.4, 0, 0.012, 0.12, 0.8, W]] },
  box: { name: 'Carton', parts: [['b', 0, 0.25, 0, 0.6, 0.5, 0.45, 'card'], ['b', 0, 0.501, 0, 0.6, 0.004, 0.08, 'paint:d8c79a']] },
  boxSmall: { name: 'Petit carton', parts: [['b', 0, 0.15, 0, 0.35, 0.3, 0.3, 'card:c9a26c'], ['b', 0, 0.301, 0, 0.35, 0.004, 0.06, 'paint:d8c79a']] },
  boxLong: { name: 'Long carton', parts: [['b', 0, 0.2, 0, 1.0, 0.4, 0.4, 'card:bf9358'], ['b', 0, 0.401, 0, 1.0, 0.004, 0.07, 'paint:d8c79a']] },
  bin: { name: 'Poubelle', parts: [['c', 0, 0.35, 0, 0.21, 0.7, 'metal:7b8a95', 16, 0.24], ['c', 0, 0.72, 0, 0.25, 0.05, 'plastic:4b565e', 16]] },
  washer: { name: 'Machine à laver', parts: [['b', 0, 0.43, 0, 0.6, 0.86, 0.6, WHITE], ['c', 0, 0.42, 0.3, 0.2, 0.03, 'chrome', 20], ['c', 0, 0.42, 0.31, 0.16, 0.03, 'glass', 20], ['b', 0, 0.8, 0.3, 0.5, 0.08, 0.01, 'plastic:d0d0d0']] },
  toilet: { name: 'Toilettes', parts: [['c', 0, 0.2, 0.05, 0.17, 0.4, CER, 14, 0.21], ['b', 0, 0.58, -0.2, 0.4, 0.4, 0.17, CER], ['c', 0, 0.415, 0.06, 0.22, 0.03, CER, 16], ['b', 0, 0.79, -0.2, 0.42, 0.03, 0.19, CER]] },
  bathtub: { name: 'Baignoire', static: true, parts: [['b', 0, 0.02, 0, 0.75, 0.04, 1.7, CER], ['b', -0.36, 0.28, 0, 0.06, 0.56, 1.7, CER], ['b', 0.36, 0.28, 0, 0.06, 0.56, 1.7, CER], ['b', 0, 0.28, -0.83, 0.66, 0.56, 0.06, CER], ['b', 0, 0.28, 0.83, 0.66, 0.56, 0.06, CER], ['c', 0, 0.75, -0.8, 0.02, 0.4, 'chrome', 8]] },
  shower: { name: 'Douche', static: true, parts: [['b', 0, 0.05, 0, 0.9, 0.1, 0.9, CER], ['b', -0.44, 1.05, 0, 0.02, 1.9, 0.9, 'glass'], ['b', 0, 1.05, -0.44, 0.9, 1.9, 0.02, 'tileS'], ['c', 0.3, 1.9, -0.38, 0.08, 0.02, 'chrome', 12]] },
  dresser: { name: 'Commode', parts: [['b', 0, 0.45, 0, 1, 0.9, 0.5, W], ...[0.2, 0.45, 0.7].flatMap((y) => [['b', 0, y, 0.252, 0.92, 0.2, 0.01, WL], ['b', 0, y, 0.262, 0.16, 0.025, 0.02, 'chrome']])] },
  mug: { name: 'Tasse', parts: [['c', 0, 0.05, 0, 0.045, 0.1, 'ceramic:d94141', 14], ['b', 0.055, 0.055, 0, 0.02, 0.06, 0.012, 'ceramic:d94141']] },
  plates: { name: 'Pile d\'assiettes', parts: [['c', 0, 0.04, 0, 0.13, 0.08, CER, 18]] },
  book: { name: 'Livre', parts: [['b', 0, 0.025, 0, 0.2, 0.05, 0.28, 0x7b3fa0], ['b', 0.006, 0.025, 0.004, 0.19, 0.04, 0.27, 'paint:f1ead8']] },
  books: { name: 'Pile de livres', parts: [['b', 0, 0.025, 0, 0.22, 0.05, 0.3, 0x7b3fa0], ['b', 0.01, 0.07, 0, 0.2, 0.04, 0.27, 0x2e86c1], ['b', -0.01, 0.11, 0.01, 0.21, 0.04, 0.29, 0xc0392b]] },
  bottle: { name: 'Bouteille', parts: [['c', 0, 0.11, 0, 0.04, 0.22, 'glass', 12], ['c', 0, 0.1, 0, 0.041, 0.08, 0x2f7d4a, 12], ['c', 0, 0.27, 0, 0.015, 0.1, 'glass', 8], ['c', 0, 0.325, 0, 0.017, 0.015, RED, 8]] },
  wine: { name: 'Bouteille de vin', parts: [['c', 0, 0.12, 0, 0.038, 0.24, 'glass:2f4a2a', 12], ['c', 0, 0.11, 0, 0.039, 0.08, 'paint:efe6cf', 12], ['c', 0, 0.3, 0, 0.014, 0.12, 'glass:2f4a2a', 8]] },
  toaster: { name: 'Grille-pain', parts: [['b', 0, 0.1, 0, 0.28, 0.2, 0.16, 'chrome'], ['b', 0, 0.2, 0, 0.2, 0.01, 0.1, DARK], ['b', 0.15, 0.12, 0, 0.02, 0.04, 0.02, DARK]] },
  microwave: { name: 'Micro-ondes', parts: [['b', 0, 0.16, 0, 0.5, 0.32, 0.36, WHITE], ['b', -0.06, 0.16, 0.181, 0.32, 0.22, 0.005, 'window:1d2a33'], ['b', 0.17, 0.16, 0.181, 0.1, 0.24, 0.005, DARK]] },
  kettle: { name: 'Bouilloire', parts: [['c', 0, 0.12, 0, 0.09, 0.24, 'metal:3d8bd6', 14, 0.07], ['b', -0.1, 0.15, 0, 0.03, 0.14, 0.03, DARK], ['c', 0, 0.01, 0, 0.1, 0.02, DARK, 14]] },
  cereal: { name: 'Boîte de céréales', parts: [['b', 0, 0.15, 0, 0.2, 0.3, 0.07, YEL], ['b', 0, 0.17, 0.0355, 0.14, 0.14, 0.002, RED], ['b', 0, 0.26, 0.0355, 0.18, 0.04, 0.002, BLUE]] },
  cerealBlue: { name: 'Céréales choco', parts: [['b', 0, 0.15, 0, 0.2, 0.3, 0.07, 0x5a3420], ['b', 0, 0.17, 0.0355, 0.14, 0.14, 0.002, 0xf2c43d], ['b', 0, 0.26, 0.0355, 0.18, 0.04, 0.002, 0xe8e8e8]] },
  can: { name: 'Conserve', parts: [['c', 0, 0.06, 0, 0.04, 0.12, 'metal:c9ccd1', 14], ['c', 0, 0.06, 0, 0.041, 0.08, 0xd8473d, 14]] },
  canGreen: { name: 'Petits pois', parts: [['c', 0, 0.06, 0, 0.04, 0.12, 'metal:c9ccd1', 14], ['c', 0, 0.06, 0, 0.041, 0.08, 0x4f9a46, 14]] },
  soda: { name: 'Canette', parts: [['c', 0, 0.06, 0, 0.033, 0.12, 'metal:d2232a', 14], ['c', 0, 0.121, 0, 0.028, 0.004, 'chrome', 14]] },
  sodaPack: { name: 'Pack de canettes', parts: [['b', 0, 0.065, 0, 0.27, 0.13, 0.2, 'metal:2a62c9'], ['b', 0, 0.132, 0, 0.27, 0.004, 0.2, 'chrome']] },
  waterPack: { name: 'Pack d\'eau', parts: [...[-0.14, -0.047, 0.047, 0.14].flatMap((x) => [-0.05, 0.05].map((z) => ['c', x, 0.16, z, 0.045, 0.32, 'glass:a8d8f0', 10])), ['b', 0, 0.2, 0, 0.38, 0.1, 0.2, 'paint:2f7fd1']] },
  milk: { name: 'Brique de lait', parts: [['b', 0, 0.11, 0, 0.09, 0.22, 0.09, 'paint:f5f5f5'], ['b', 0, 0.12, 0.046, 0.08, 0.08, 0.002, 0x3c74c9], ['b', 0, 0.235, 0, 0.09, 0.03, 0.05, 'paint:f5f5f5']] },
  juice: { name: 'Jus d\'orange', parts: [['b', 0, 0.12, 0, 0.1, 0.24, 0.07, 0xf08a24], ['b', 0, 0.13, 0.0355, 0.08, 0.1, 0.002, 0x7cc24a]] },
  eggs: { name: 'Boîte d\'œufs', parts: [['b', 0, 0.035, 0, 0.3, 0.07, 0.11, 'card:b9b1a0']] },
  chips: { name: 'Paquet de chips', parts: [['b', 0, 0.14, 0, 0.2, 0.28, 0.08, 0xe8b923], ['b', 0, 0.15, 0.041, 0.14, 0.1, 0.002, RED], ['b', 0, 0.285, 0, 0.2, 0.012, 0.03, 0xe8b923]] },
  detergent: { name: 'Lessive', parts: [['b', 0, 0.15, 0, 0.2, 0.3, 0.12, 0xf26b21], ['b', 0, 0.15, 0.061, 0.15, 0.12, 0.002, 0x2e86c1], ['c', 0, 0.31, 0, 0.035, 0.03, 0x2e86c1, 10]] },
  shampoo: { name: 'Shampoing', parts: [['b', 0, 0.1, 0, 0.08, 0.2, 0.05, 0x5dc1b9], ['c', 0, 0.215, 0, 0.022, 0.03, 'paint:ffffff', 8]] },
  toiletPaper: { name: 'Papier toilette', parts: [...[-0.06, 0.06].flatMap((x) => [-0.06, 0.06].flatMap((z) => [['c', x, 0.055, z, 0.055, 0.11, 'paint:fbfbfb', 12], ['c', x, 0.165, z, 0.055, 0.11, 'paint:fbfbfb', 12]]))] },
  rice: { name: 'Sac de riz', parts: [['b', 0, 0.12, 0, 0.4, 0.24, 0.6, 'fabric:e9dfc4'], ['b', 0, 0.245, 0, 0.3, 0.004, 0.2, RED]] },
  flour: { name: 'Sac de farine', parts: [['b', 0, 0.13, 0, 0.18, 0.26, 0.1, 'paint:f3eee2'], ['b', 0, 0.12, 0.051, 0.12, 0.08, 0.002, 0x3c74c9]] },
  pasta: { name: 'Paquet de pâtes', parts: [['b', 0, 0.1, 0, 0.17, 0.2, 0.06, 0x2a56a8], ['b', 0, 0.1, 0.031, 0.1, 0.08, 0.002, 'paint:f2d38a']] },
  jar: { name: 'Pot de confiture', parts: [['c', 0, 0.06, 0, 0.045, 0.12, 'glass:b0324a', 12], ['c', 0, 0.13, 0, 0.047, 0.025, 'paint:e8d9b5', 12]] },
  fruitbowl: { name: 'Coupe de fruits', parts: [['c', 0, 0.05, 0, 0.16, 0.1, CER, 14, 0.1], ['s', -0.05, 0.12, 0, 0.06, 0xf08a24], ['s', 0.06, 0.12, 0.02, 0.06, RED], ['s', 0, 0.15, -0.05, 0.055, 0x9ccc3d]] },
  watermelon: { name: 'Pastèque', parts: [['s', 0, 0.18, 0, 0.19, 'paint:3b8a3a']] },
  pumpkin: { name: 'Citrouille', parts: [['s', 0, 0.16, 0, 0.2, 'paint:e8761e'], ['c', 0, 0.36, 0, 0.02, 0.06, 0x4d6b2a, 6]] },
  apple: { name: 'Pomme', parts: [['s', 0, 0.045, 0, 0.045, 0xc8302b]] },
  banana: { name: 'Régime de bananes', parts: [['b', 0, 0.03, 0, 0.2, 0.05, 0.08, 0xf2d03d, 0.4], ['b', 0, 0.06, 0, 0.18, 0.04, 0.07, 0xf2d03d, -0.3]] },
  clock: { name: 'Horloge', parts: [['c', 0, 0.2, 0, 0.2, 0.05, CER, 20], ['c', 0, 0.2, 0.028, 0.21, 0.02, DARK, 20]] },
  teddy: { name: 'Nounours', parts: [['s', 0, 0.14, 0, 0.13, 'fabric:a8754a'], ['s', 0, 0.33, 0, 0.1, 'fabric:a8754a'], ['s', -0.07, 0.42, 0, 0.04, 'fabric:a8754a'], ['s', 0.07, 0.42, 0, 0.04, 'fabric:a8754a'], ['s', 0, 0.31, 0.08, 0.04, 'fabric:e0c9a6']] },
  guitar: { name: 'Guitare', parts: [['b', 0, 0.25, 0, 0.36, 0.42, 0.1, W], ['b', 0, 0.58, 0, 0.26, 0.3, 0.1, W], ['b', 0, 0.98, 0, 0.06, 0.55, 0.04, WD], ['c', 0, 0.36, 0.051, 0.06, 0.005, DARK, 14]] },
  skateboard: { name: 'Skate', parts: [['b', 0, 0.08, 0, 0.2, 0.02, 0.8, 'paint:2b8f9e'], ...wheels(0.07, 0.28, 0.03, 0.04)] },
  pillow: { name: 'Coussin', parts: [['b', 0, 0.08, 0, 0.45, 0.16, 0.45, 'fabric:e0b860']] },
  rug: { name: 'Tapis', static: true, parts: [['b', 0, 0.005, 0, 2.4, 0.01, 1.6, 'carpet:9e3b3b']] },
  laundryBasket: { name: 'Panier à linge', parts: [['c', 0, 0.28, 0, 0.24, 0.56, 'fabric:cdbb98', 12, 0.27], ['b', 0, 0.55, 0, 0.3, 0.08, 0.3, 'fabric:7d9ac9']] },
  fan: { name: 'Ventilateur', parts: [['c', 0, 0.02, 0, 0.16, 0.04, 'paint:f0f0f0', 14], ['c', 0, 0.55, 0, 0.02, 1.05, 'chrome', 8], ['c', 0, 1.15, 0.04, 0.22, 0.08, 'paint:f0f0f0', 18]] },
  mirror: { name: 'Miroir', static: true, parts: [['b', 0, 1.3, 0, 0.6, 0.8, 0.03, 'chrome']] },
  // ─────────── Bureau ───────────
  desk: { name: 'Bureau', parts: [['b', 0, 0.73, 0, 1.4, 0.04, 0.7, 'woodL:d9cfb8'], ['b', -0.66, 0.36, 0, 0.04, 0.72, 0.66, 'steel'], ['b', 0.66, 0.36, 0, 0.04, 0.72, 0.66, 'steel'], ['b', 0, 0.45, -0.3, 1.28, 0.4, 0.02, 'steel']] },
  officeChair: { name: 'Chaise de bureau', parts: [['c', 0, 0.06, 0, 0.3, 0.04, DARK, 5], ['c', 0, 0.28, 0, 0.03, 0.42, 'chrome', 8], ['b', 0, 0.5, 0, 0.5, 0.08, 0.5, 'fabric:36475e'], ['b', 0, 0.9, -0.23, 0.45, 0.6, 0.07, 'fabric:36475e'], ['b', -0.26, 0.64, 0, 0.04, 0.2, 0.3, DARK], ['b', 0.26, 0.64, 0, 0.04, 0.2, 0.3, DARK]] },
  monitor: { name: 'Écran', parts: [['b', 0, 0.01, 0, 0.25, 0.02, 0.18, DARK], ['b', 0, 0.12, -0.03, 0.04, 0.2, 0.03, DARK], ['b', 0, 0.36, 0, 0.6, 0.36, 0.035, DARK], ['b', 0, 0.36, 0.0185, 0.56, 0.32, 0.002, 'screen']] },
  laptop: { name: 'Portable', parts: [['b', 0, 0.01, 0, 0.34, 0.02, 0.24, 'metal:9aa0a8'], ['b', 0, 0.13, -0.12, 0.34, 0.24, 0.012, 'metal:9aa0a8'], ['b', 0, 0.13, -0.113, 0.31, 0.2, 0.002, 'screen']] },
  keyboard: { name: 'Clavier', parts: [['b', 0, 0.012, 0, 0.44, 0.025, 0.14, DARK]] },
  phone: { name: 'Téléphone', parts: [['b', 0, 0.03, 0, 0.18, 0.06, 0.2, DARK], ['b', 0, 0.07, -0.02, 0.18, 0.03, 0.05, DARK]] },
  printer: { name: 'Photocopieuse', parts: [['b', 0, 0.5, 0, 0.8, 1.0, 0.65, 'paint:e4e4df'], ['b', 0, 1.02, -0.05, 0.75, 0.05, 0.5, 'plastic:9da3ab'], ['b', 0.25, 0.85, 0.33, 0.25, 0.1, 0.005, 'screen'], ['b', 0, 0.4, 0.33, 0.7, 0.02, 0.01, 'plastic:9da3ab']] },
  waterCooler: { name: 'Fontaine à eau', parts: [['b', 0, 0.5, 0, 0.35, 1.0, 0.35, WHITE], ['c', 0, 1.22, 0, 0.15, 0.42, 'glass:9fd3f0', 16], ['b', 0, 0.8, 0.18, 0.12, 0.06, 0.04, 0x3c74c9]] },
  filing: { name: 'Classeur', parts: [['b', 0, 0.65, 0, 0.5, 1.3, 0.6, 'steel:8a929c'], ...[0.3, 0.72, 1.12].map((y) => ['b', 0, y, 0.305, 0.14, 0.03, 0.02, 'chrome'])] },
  coffeeMachine: { name: 'Machine à café', parts: [['b', 0, 0.22, 0, 0.3, 0.44, 0.35, DARK], ['b', 0, 0.06, 0.12, 0.2, 0.02, 0.12, 'chrome'], ['c', 0, 0.11, 0.1, 0.035, 0.08, CER, 10], ['b', 0, 0.36, 0.176, 0.12, 0.06, 0.002, 'screen']] },
  whiteboard: { name: 'Tableau blanc', static: true, parts: [['b', 0, 1.35, 0, 1.6, 1.0, 0.04, 'ceramic:fbfbfb'], ['b', 0, 0.86, 0.05, 1.5, 0.03, 0.08, 'metal'], ['b', -0.78, 0.65, 0, 0.04, 1.3, 0.04, MET], ['b', 0.78, 0.65, 0, 0.04, 1.3, 0.04, MET], ['b', -0.78, 0.02, 0, 0.06, 0.04, 0.45, MET], ['b', 0.78, 0.02, 0, 0.06, 0.04, 0.45, MET]] },
  serverRack: { name: 'Baie serveur', static: true, parts: [...hollow(0.7, 2.0, 0.9, 'plastic:1d1f24', { t: 0.03, door: 'right', doorMat: 'window:20262e', plinth: 0.05 }), ...[0.3, 0.55, 0.8, 1.05, 1.3, 1.55].map((y) => ['b', 0, y, -0.1, 0.62, 0.18, 0.6, 'steel:3a3e45']), ...[0.3, 0.55, 0.8, 1.05, 1.3, 1.55].map((y) => ['b', -0.2, y, 0.205, 0.08, 0.02, 0.005, 'light:5dff9b'])] },
  locker: { name: 'Casier', static: true, parts: hollow(0.5, 1.9, 0.5, 'steel:5d7a8c', { t: 0.025, door: 'left', doorMat: 'steel:6f8fa3', plinth: 0.08, shelves: [1.6] }) },
  lockerClosed: { name: 'Casier fermé', static: true, parts: [['b', 0, 0.95, 0, 0.5, 1.9, 0.5, 'steel:5d7a8c'], ['b', 0, 1.0, 0.252, 0.44, 1.7, 0.005, 'steel:6f8fa3'], ['b', 0.15, 1.0, 0.258, 0.03, 0.12, 0.01, 'chrome'], ...[1.6, 1.65, 1.7].map((y) => ['b', 0, y, 0.256, 0.3, 0.015, 0.003, 'plastic:2c3a44'])] },
  bench: { name: 'Banc', parts: [['b', 0, 0.45, 0, 1.8, 0.05, 0.45, W], ['b', 0, 0.78, -0.2, 1.8, 0.3, 0.04, W], ['b', -0.8, 0.22, 0, 0.06, 0.44, 0.4, 'steel:3a3d42'], ['b', 0.8, 0.22, 0, 0.06, 0.44, 0.4, 'steel:3a3d42']] },
  benchPlain: { name: 'Banc de vestiaire', parts: [['b', 0, 0.44, 0, 1.6, 0.05, 0.35, WL], ...legs(0.7, 0.12, 0.42, MET, 0.04)] },
  // ─────────── Supérette ───────────
  shelf: { name: 'Rayon', static: true, parts: [['b', 0, 0.95, -0.28, 2, 1.9, 0.03, 'steel:9aa4ad'], ['b', 0, 0.06, 0, 2, 0.12, 0.6, 'steel:7d868f'], ['b', 0, 0.12, 0, 2, 0.02, 0.6, 'metal:c6ccd2'], ['b', 0, 0.72, 0.02, 2, 0.02, 0.56, 'metal:c6ccd2'], ['b', 0, 1.32, 0.02, 2, 0.02, 0.56, 'metal:c6ccd2'], ['b', -0.99, 0.95, 0, 0.03, 1.9, 0.6, 'steel:9aa4ad'], ['b', 0.99, 0.95, 0, 0.03, 1.9, 0.6, 'steel:9aa4ad'], ['b', 0, 0.68, 0.3, 2, 0.06, 0.01, 'paint:f2c43d'], ['b', 0, 1.28, 0.3, 2, 0.06, 0.01, 'paint:f2c43d']] },
  shelfEnd: { name: 'Tête de gondole', static: true, parts: [['b', 0, 0.06, 0, 1.2, 0.12, 0.5, 'steel:7d868f'], ['b', 0, 0.12, 0, 1.2, 0.02, 0.5, 'metal:c6ccd2'], ['b', 0, 0.7, 0.0, 1.2, 0.02, 0.46, 'metal:c6ccd2'], ['b', 0, 1.0, -0.24, 1.2, 2.0, 0.03, 'paint:d94141'], ['b', 0, 2.1, -0.24, 1.3, 0.3, 0.05, 'paint:f2c43d']] },
  fridgeDisplay: { name: 'Vitrine réfrigérée', static: true, parts: [['b', 0, 1.0, -0.36, 1.4, 2.0, 0.06, 'paint:e8ecef'], ['b', -0.68, 1.0, 0, 0.04, 2.0, 0.75, 'paint:e8ecef'], ['b', 0.68, 1.0, 0, 0.04, 2.0, 0.75, 'paint:e8ecef'], ['b', 0, 1.98, 0, 1.4, 0.04, 0.75, 'paint:e8ecef'], ['b', 0, 0.08, 0, 1.36, 0.16, 0.7, 'steel:6e747c'], ['b', 0, 0.6, -0.02, 1.32, 0.02, 0.62, 'chrome'], ['b', 0, 1.05, -0.02, 1.32, 0.02, 0.62, 'chrome'], ['b', 0, 1.5, -0.02, 1.32, 0.02, 0.62, 'chrome'], ['b', 0, 1.0, 0.37, 1.32, 1.82, 0.02, 'glass'], ['b', 0, 1.93, 0.36, 1.3, 0.04, 0.02, 'light']] },
  cart: { name: 'Caddie', parts: [['b', 0, 0.62, -0.42, 0.55, 0.42, 0.02, 'chrome'], ['b', 0, 0.62, 0.42, 0.5, 0.42, 0.02, 'chrome'], ['b', -0.27, 0.62, 0, 0.02, 0.42, 0.85, 'chrome'], ['b', 0.27, 0.62, 0, 0.02, 0.42, 0.85, 'chrome'], ['b', 0, 0.42, 0, 0.52, 0.02, 0.84, 'chrome'], ['b', 0, 0.22, 0, 0.5, 0.02, 0.7, 'chrome'], ['b', 0, 0.98, -0.48, 0.52, 0.04, 0.04, 'plastic:d94141'], ...wheels(0.22, 0.35, 0.06, 0.04)] },
  basket: { name: 'Panier', parts: [['b', 0, 0.12, 0, 0.45, 0.24, 0.32, 'plastic:d94141'], ['b', 0, 0.12, 0, 0.42, 0.2, 0.29, 'plastic:b52f2f']] },
  register: { name: 'Caisse', static: true, parts: [['b', 0, 0.45, 0, 1.8, 0.9, 0.7, 'paint:56606b'], ['b', 0, 0.92, 0, 1.8, 0.04, 0.72, 'plastic:2f3238'], ['b', -0.35, 0.945, 0, 0.9, 0.01, 0.5, 'rubber'], ['b', 0.6, 1.08, 0, 0.35, 0.28, 0.3, DARK], ['b', 0.6, 1.14, 0.151, 0.3, 0.16, 0.002, 'screen'], ['c', 0.75, 1.3, -0.2, 0.02, 0.6, 'chrome', 6], ['b', 0.75, 1.65, -0.2, 0.12, 0.16, 0.02, 'light:7de0ff']] },
  freezer: { name: 'Congélateur', static: true, parts: [['b', 0, 0.42, 0, 1.6, 0.84, 0.8, WHITE], ['b', 0, 0.85, 0, 1.56, 0.02, 0.76, 'glass:a9d8f5'], ['b', 0, 0.6, 0.0, 1.5, 0.3, 0.7, 'paint:dbe8ef']] },
  pallet: { name: 'Palette', parts: [['b', 0, 0.06, 0, 1.2, 0.1, 1.0, WL], ['b', 0, 0.13, 0, 1.2, 0.03, 1.0, W]] },
  palletRack: { name: 'Rack', static: true, parts: [...[[-1.45, -0.5], [1.45, -0.5], [-1.45, 0.5], [1.45, 0.5]].map(([x, z]) => ['b', x, 2, z, 0.08, 4, 0.08, 'metal:3d6fb5']), ...[1.5, 3].flatMap((y) => [['b', 0, y, -0.5, 3, 0.1, 0.06, 'metal:e8762c'], ['b', 0, y, 0.5, 3, 0.1, 0.06, 'metal:e8762c'], ['b', 0, y + 0.06, 0, 2.9, 0.02, 1.0, WL]])] },
  cone: { name: 'Plot', parts: [['b', 0, 0.015, 0, 0.36, 0.03, 0.36, 0xf26b21], ['k', 0, 0.33, 0, 0.14, 0.6, 0xf26b21, 14], ['c', 0, 0.38, 0, 0.09, 0.08, 'paint:ffffff', 14, 0.07]] },
  wetFloor: { name: 'Panneau sol glissant', parts: [['b', 0, 0.3, -0.08, 0.3, 0.6, 0.02, YEL, 0], ['b', 0, 0.3, 0.08, 0.3, 0.6, 0.02, YEL, 0]] },
  forklift: { name: 'Chariot élévateur', static: true, parts: [['b', 0, 0.55, 0, 1.1, 0.8, 1.8, 'paint:f2b929'], ['b', 0, 2.1, -0.4, 1.0, 0.06, 0.9, 'steel:2b2d33'], ['b', -0.45, 1.35, -0.8, 0.06, 1.5, 0.06, 'steel:2b2d33'], ['b', 0.45, 1.35, -0.8, 0.06, 1.5, 0.06, 'steel:2b2d33'], ['b', -0.45, 1.35, 0.05, 0.06, 1.5, 0.06, 'steel:2b2d33'], ['b', 0.45, 1.35, 0.05, 0.06, 1.5, 0.06, 'steel:2b2d33'], ['b', 0, 1.15, -0.25, 0.5, 0.1, 0.5, 'fabric:2b2d33'], ['b', 0, 1.4, 1.0, 0.9, 2.6, 0.08, 'steel:2b2d33'], ['b', -0.25, 0.08, 1.45, 0.12, 0.05, 0.9, 'steel'], ['b', 0.25, 0.08, 1.45, 0.12, 0.05, 0.9, 'steel'], ...carWheels(0.5, 0.6, 0.22)] },
  // ─────────── Rue, jardin ───────────
  car: { name: 'Voiture', parts: carParts(0x3a7bd5) },
  carRed: { name: 'Voiture rouge', parts: carParts(0xc83c3c) },
  carWhite: { name: 'Voiture blanche', parts: carParts(0xe9e9e4) },
  van: { name: 'Camionnette', static: true, parts: [['b', 0, 1.2, -0.4, 2.0, 1.9, 3.8, 'paint:ececec'], ['b', 0, 0.85, 1.85, 2.0, 1.1, 1.2, 'paint:ececec'], ['b', 0, 1.6, 1.55, 1.9, 0.6, 0.6, 'window:2a3a46'], ['b', 1.003, 1.5, -0.4, 0.005, 0.6, 2.4, 0xd94141], ['b', -1.003, 1.5, -0.4, 0.005, 0.6, 2.4, 0xd94141], ...carWheels(0.88, 1.5, 0.36)] },
  bus: { name: 'Bus', static: true, parts: [['b', 0, 1.65, 0, 2.5, 2.5, 9, 'paint:f2b929'], ['b', 0, 2.2, 0.2, 2.52, 0.75, 7.6, 'window:2a3a46'], ['b', 0, 2.2, 4.51, 2.3, 0.85, 0.02, 'window:2a3a46'], ['b', 0, 0.5, 0, 2.4, 0.4, 8.8, 'plastic:2b2d33'], ['b', 0, 1.25, 4.52, 2.3, 0.18, 0.04, 'chrome'], ['b', -0.9, 1.1, 4.52, 0.3, 0.2, 0.03, 'light'], ['b', 0.9, 1.1, 4.52, 0.3, 0.2, 0.03, 'light'], ...carWheels(1.13, 3.0, 0.5)] },
  mailbox: { name: 'Boîte aux lettres', parts: [['c', 0, 0.55, 0, 0.04, 1.1, WD, 6], ['b', 0, 1.2, 0, 0.28, 0.3, 0.48, 'metal:3c74c9'], ['b', 0.15, 1.3, 0.1, 0.02, 0.15, 0.06, RED]] },
  hydrant: { name: 'Borne à incendie', parts: [['c', 0, 0.3, 0, 0.13, 0.6, 'metal:c83c3c', 14], ['s', 0, 0.62, 0, 0.13, 'metal:c83c3c'], ['c', 0, 0.38, 0, 0.05, 0.36, 'metal:c83c3c', 8], ['c', 0, 0.02, 0, 0.18, 0.04, 'metal:c83c3c', 14]] },
  trashcan: { name: 'Poubelle de rue', parts: [['c', 0, 0.45, 0, 0.3, 0.9, 'metal:3b6e46', 16], ['c', 0, 0.92, 0, 0.32, 0.06, 'metal:2f5a39', 16]] },
  wheelieBin: { name: 'Conteneur à ordures', parts: [['b', 0, 0.5, 0, 0.6, 1.0, 0.72, 'plastic:2f6e3c'], ['b', 0, 1.02, 0.02, 0.64, 0.05, 0.78, 'plastic:28603a'], ['c', -0.25, 0.1, -0.33, 0.1, 0.06, 'rubber', 10], ['c', 0.25, 0.1, -0.33, 0.1, 0.06, 'rubber', 10]] },
  dumpster: { name: 'Benne', static: true, parts: [['b', 0, 0.1, 0, 2, 0.2, 1.4, 'metal:2f5f8f'], ['b', 0, 0.75, -0.68, 2, 1.3, 0.04, 'metal:2f5f8f'], ['b', 0, 0.75, 0.68, 2, 1.3, 0.04, 'metal:2f5f8f'], ['b', -0.98, 0.75, 0, 0.04, 1.3, 1.4, 'metal:2f5f8f'], ['b', 0.98, 0.75, 0, 0.04, 1.3, 1.4, 'metal:2f5f8f'], ['b', 0, 1.42, -0.5, 2, 0.04, 0.5, 'plastic:1f2a36']] },
  tree: { name: 'Arbre', static: true, parts: [['c', 0, 1.3, 0, 0.18, 2.6, 'wood:6e4a2c', 10, 0.13], ['s', 0, 3.2, 0, 1.4, LEAF], ['s', 0.7, 2.7, 0.3, 0.9, LEAF2], ['s', -0.6, 3.5, -0.3, 0.9, LEAF2], ['s', 0.1, 4.1, 0.3, 0.8, LEAF]] },
  pine: { name: 'Sapin', static: true, parts: [['c', 0, 0.6, 0, 0.15, 1.2, 'wood:5a3c24', 8], ['k', 0, 2.0, 0, 1.2, 2.0, 'leaf:2f6b35', 10], ['k', 0, 3.2, 0, 0.9, 1.6, 'leaf:2f6b35', 10], ['k', 0, 4.2, 0, 0.55, 1.2, 'leaf:2f6b35', 10]] },
  bush: { name: 'Buisson', parts: [['s', 0, 0.45, 0, 0.55, LEAF], ['s', 0.35, 0.35, 0.15, 0.38, LEAF2], ['s', -0.3, 0.32, -0.1, 0.34, LEAF2]] },
  hedge: { name: 'Haie', static: true, parts: [['b', 0, 0.6, 0, 2, 1.2, 0.7, LEAF]] },
  bbq: { name: 'Barbecue', parts: [['c', 0, 0.85, 0, 0.32, 0.25, 'metal:2b2d33', 16, 0.36], ['c', 0, 1.0, 0, 0.33, 0.04, 'chrome', 16], ['b', -0.2, 0.4, 0, 0.04, 0.8, 0.04, DARK], ['b', 0.2, 0.4, 0, 0.04, 0.8, 0.04, DARK], ['b', 0, 0.4, 0.2, 0.04, 0.8, 0.04, DARK]] },
  gnome: { name: 'Nain de jardin', parts: [['c', 0, 0.12, 0, 0.1, 0.24, 'paint:3c74c9', 10, 0.07], ['s', 0, 0.3, 0, 0.08, 'paint:f4c7a1'], ['s', 0, 0.26, 0.04, 0.07, 'paint:ffffff'], ['k', 0, 0.45, 0, 0.09, 0.22, 'paint:d94141', 10]] },
  doghouse: { name: 'Niche', parts: [['b', 0, 0.02, 0, 0.9, 0.04, 1.1, W], ['b', 0, 0.42, -0.53, 0.9, 0.8, 0.04, 'wood:b5653a'], ['b', -0.43, 0.42, 0, 0.04, 0.8, 1.1, 'wood:b5653a'], ['b', 0.43, 0.42, 0, 0.04, 0.8, 1.1, 'wood:b5653a'], ['b', -0.3, 0.42, 0.53, 0.3, 0.8, 0.04, 'wood:b5653a'], ['b', 0.3, 0.42, 0.53, 0.3, 0.8, 0.04, 'wood:b5653a'], ['b', 0, 0.86, 0, 1.0, 0.08, 1.2, 'roof:8c3a2f']] },
  picnic: { name: 'Table de pique-nique', parts: [['b', 0, 0.75, 0, 1.8, 0.05, 0.8, WL], ['b', 0, 0.45, -0.6, 1.8, 0.05, 0.3, WL], ['b', 0, 0.45, 0.6, 1.8, 0.05, 0.3, WL], ['b', -0.7, 0.37, 0, 0.07, 0.74, 1.4, W], ['b', 0.7, 0.37, 0, 0.07, 0.74, 1.4, W]] },
  deckChair: { name: 'Transat', parts: [['b', 0, 0.3, 0.2, 0.6, 0.05, 1.0, 'fabric:2b8f9e'], ['b', 0, 0.55, -0.42, 0.6, 0.5, 0.05, 'fabric:2b8f9e'], ...legs(0.27, 0.4, 0.28, 'chrome', 0.03)] },
  parasol: { name: 'Parasol', parts: [['c', 0, 0.05, 0, 0.25, 0.1, 'concrete', 12], ['c', 0, 1.1, 0, 0.025, 2.1, 'chrome', 6], ['k', 0, 2.2, 0, 1.2, 0.4, 'fabric:e05252', 12]] },
  cooler: { name: 'Glacière', parts: [['b', 0, 0.2, 0, 0.6, 0.4, 0.38, 'plastic:2f7fd1'], ['b', 0, 0.42, 0, 0.62, 0.05, 0.4, 'plastic:f0f0f0']] },
  ball: { name: 'Ballon', parts: [['s', 0, 0.12, 0, 0.12, 'paint:e8532e']] },
  basketball: { name: 'Ballon de basket', parts: [['s', 0, 0.12, 0, 0.12, 'leather:d9732e']] },
  tire: { name: 'Pneu', parts: [['c', 0, 0.12, 0, 0.35, 0.24, 'rubber', 18]] },
  toolbox: { name: 'Caisse à outils', parts: [['b', 0, 0.12, 0, 0.5, 0.24, 0.22, 'metal:c83c3c'], ['b', 0, 0.27, 0, 0.3, 0.04, 0.03, DARK]] },
  paintCan: { name: 'Pot de peinture', parts: [['c', 0, 0.1, 0, 0.1, 0.2, 'metal:c9ccd1', 14], ['c', 0, 0.1, 0, 0.101, 0.12, 'paint:3c9ad6', 14]] },
  lawnmower: { name: 'Tondeuse', parts: [['b', 0, 0.2, 0, 0.5, 0.25, 0.6, 'plastic:3a8f3e'], ['b', 0, 0.55, -0.45, 0.45, 0.04, 0.04, DARK], ['b', -0.2, 0.4, -0.38, 0.03, 0.45, 0.03, DARK, 0], ['b', 0.2, 0.4, -0.38, 0.03, 0.45, 0.03, DARK], ...wheels(0.27, 0.22, 0.09, 0.05)] },
  wheelbarrow: { name: 'Brouette', parts: [['b', 0, 0.55, 0, 0.6, 0.3, 0.8, 'metal:3a8f3e'], ['c', 0, 0.2, 0.55, 0.2, 0.08, 'rubber', 14], ['b', -0.25, 0.45, -0.6, 0.04, 0.04, 0.6, W], ['b', 0.25, 0.45, -0.6, 0.04, 0.04, 0.6, W]] },
  trashBag: { name: 'Sac poubelle', parts: [['s', 0, 0.25, 0, 0.27, 'plastic:1d1f22'], ['c', 0, 0.52, 0, 0.05, 0.1, 'plastic:1d1f22', 8]] },
  streetlamp: { name: 'Réverbère', static: true, parts: [['c', 0, 2.3, 0, 0.07, 4.6, 'steel:3a3d42', 10], ['b', 0, 4.6, 0.4, 0.12, 0.08, 0.85, 'steel:3a3d42'], ['b', 0, 4.53, 0.75, 0.3, 0.08, 0.35, 'light']] },
  fence: { name: 'Barrière', static: true, parts: [['b', 0, 0.45, 0, 2, 0.1, 0.05, WHITE], ['b', 0, 0.85, 0, 2, 0.1, 0.05, WHITE], ...[-0.9, -0.45, 0, 0.45, 0.9].map((x) => ['b', x, 0.55, 0, 0.1, 1.1, 0.07, WHITE])] },
  fenceWood: { name: 'Palissade', static: true, parts: [...[-0.875, -0.625, -0.375, -0.125, 0.125, 0.375, 0.625, 0.875].map((x) => ['b', x, 0.85, 0, 0.23, 1.7, 0.04, 'wood:a77b4f']), ['b', 0, 0.4, -0.04, 2, 0.1, 0.04, 'wood:8c6440'], ['b', 0, 1.35, -0.04, 2, 0.1, 0.04, 'wood:8c6440']] },
  barrier: { name: 'Barrière de chantier', static: true, parts: [['b', 0, 0.8, 0, 2, 0.25, 0.05, 'paint:f2f2f2'], ['b', -0.5, 0.8, 0.027, 0.4, 0.24, 0.005, 0xd94141], ['b', 0.3, 0.8, 0.027, 0.4, 0.24, 0.005, 0xd94141], ['b', -0.85, 0.45, 0, 0.06, 0.9, 0.5, 'steel'], ['b', 0.85, 0.45, 0, 0.06, 0.9, 0.5, 'steel']] },
  sink: { name: 'Lavabo', parts: [['c', 0, 0.42, 0, 0.07, 0.76, CER, 10], ['b', 0, 0.86, 0, 0.55, 0.12, 0.45, CER], ['c', 0, 1.0, -0.15, 0.02, 0.16, 'chrome', 6]] },
  stall: { name: 'Cabine', static: true, parts: [['b', -0.6, 1.05, 0, 0.04, 1.9, 1.5, 'paint:7ea6a3'], ['b', 0.6, 1.05, 0, 0.04, 1.9, 1.5, 'paint:7ea6a3']] },
  slide: { name: 'Toboggan', static: true, parts: [['b', 0, 1.0, -1.2, 1.0, 0.06, 1.0, 'paint:e05252'], ...legs(0.45, 0.45, 1.0, 'metal:3c74c9', 0.07).map((p) => (p[3] -= 1.2, p)), ['b', 0, 0.55, 0.15, 0.6, 0.04, 2.0, 'paint:f2c43d']] },
  swing: { name: 'Balançoire', static: true, parts: [['b', 0, 2.1, 0, 2.6, 0.1, 0.1, 'metal:3c74c9'], ['b', -1.25, 1.05, 0, 0.08, 2.1, 0.08, 'metal:3c74c9'], ['b', 1.25, 1.05, 0, 0.08, 2.1, 0.08, 'metal:3c74c9'], ['b', -0.5, 0.45, 0, 0.45, 0.04, 0.2, 'rubber'], ['b', 0.5, 0.45, 0, 0.45, 0.04, 0.2, 'rubber'], ['b', -0.7, 1.3, 0, 0.015, 1.7, 0.015, 'chrome'], ['b', -0.3, 1.3, 0, 0.015, 1.7, 0.015, 'chrome'], ['b', 0.3, 1.3, 0, 0.015, 1.7, 0.015, 'chrome'], ['b', 0.7, 1.3, 0, 0.015, 1.7, 0.015, 'chrome']] },
  sandbox: { name: 'Bac à sable', static: true, parts: [['b', 0, 0.12, -0.97, 2, 0.24, 0.06, W], ['b', 0, 0.12, 0.97, 2, 0.24, 0.06, W], ['b', -0.97, 0.12, 0, 0.06, 0.24, 2, W], ['b', 0.97, 0.12, 0, 0.06, 0.24, 2, W], ['b', 0, 0.06, 0, 1.88, 0.1, 1.88, 'concrete:e8d49a']] },
  bucket: { name: 'Seau', parts: [['c', 0, 0.12, 0, 0.12, 0.24, 'plastic:f2c43d', 12, 0.14]] },
  container: { name: 'Conteneur', static: true, parts: [['b', 0, 0.05, 0, 2.4, 0.1, 6, 'steel:8c3a2f'], ['b', 0, 2.5, 0, 2.4, 0.1, 6, 'steel:8c3a2f'], ['b', -1.17, 1.3, 0, 0.06, 2.5, 6, 'metal:a2412f'], ['b', 1.17, 1.3, 0, 0.06, 2.5, 6, 'metal:a2412f'], ['b', 0, 1.3, -2.97, 2.4, 2.5, 0.06, 'metal:a2412f'], ['b', -1.17, 1.3, 3.6, 0.06, 2.4, 1.2, 'metal:a2412f'], ['b', 1.17, 1.3, 3.6, 0.06, 2.4, 1.2, 'metal:a2412f']] },
  shed: { name: 'Cabane de jardin', static: true, parts: [['b', 0, 0.05, 0, 2.4, 0.1, 2, W], ['b', 0, 1.15, -0.98, 2.4, 2.1, 0.04, 'wood:8d6a45'], ['b', -1.18, 1.15, 0, 0.04, 2.1, 2, 'wood:8d6a45'], ['b', 1.18, 1.15, 0, 0.04, 2.1, 2, 'wood:8d6a45'], ['b', -0.75, 1.15, 0.98, 0.9, 2.1, 0.04, 'wood:8d6a45'], ['b', 0.75, 1.15, 0.98, 0.9, 2.1, 0.04, 'wood:8d6a45'], ['b', 0, 2.05, 0.98, 0.6, 0.3, 0.04, 'wood:8d6a45'], ['b', 0, 2.28, 0, 2.6, 0.1, 2.3, 'roof:3d4f3a']] },
  trampoline: { name: 'Trampoline', static: true, parts: [['c', 0, 0.75, 0, 1.6, 0.06, 'rubber', 20], ['c', 0, 0.8, 0, 1.65, 0.05, 'plastic:3c74c9', 20], ...[[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]].map(([x, z]) => ['b', x, 0.37, z, 0.06, 0.74, 0.06, 'steel'])] },
  pingpong: { name: 'Table de ping-pong', static: true, parts: [['b', 0, 0.76, 0, 1.52, 0.04, 2.74, 'paint:2b6aa3'], ['b', 0, 0.84, 0, 1.6, 0.14, 0.02, 'fabric:f2f2f2'], ...legs(0.6, 1.1, 0.74, 'steel', 0.05)] },
  arcade: { name: 'Borne d\'arcade', static: true, parts: [['b', 0, 0.85, 0, 0.7, 1.7, 0.75, 'paint:2a2e52'], ['b', 0, 1.35, 0.3, 0.6, 0.45, 0.02, 'screen'], ['b', 0, 0.95, 0.35, 0.65, 0.05, 0.3, 'plastic:111111'], ['b', 0, 1.72, 0.2, 0.68, 0.2, 0.3, 'light:ff5ea8']] },
  candles: { name: 'Chandelier', parts: [['c', 0, 0.02, 0, 0.08, 0.04, 'metal:c8a06a', 10], ['c', 0, 0.15, 0, 0.015, 0.26, 'metal:c8a06a', 6], ['b', 0, 0.28, 0, 0.3, 0.02, 0.02, 'metal:c8a06a'], ...[-0.14, 0, 0.14].map((x) => ['c', x, 0.36, 0, 0.018, 0.14, 'paint:f4efe0', 8]), ...[-0.14, 0, 0.14].map((x) => ['s', x, 0.45, 0, 0.018, 'light:ffb050'])] },
  watering: { name: 'Arrosoir', parts: [['c', 0, 0.13, 0, 0.11, 0.26, 'metal:4f9a6a', 12], ['b', 0.17, 0.2, 0, 0.22, 0.03, 0.03, 'metal:4f9a6a', 0], ['b', -0.1, 0.27, 0, 0.03, 0.12, 0.1, 'metal:4f9a6a']] },
  backpack: { name: 'Cartable', parts: [['b', 0, 0.22, 0, 0.32, 0.42, 0.16, 'fabric:c83c3c'], ['b', 0, 0.16, 0.1, 0.26, 0.2, 0.06, 'fabric:a02f2f'], ['b', 0, 0.44, -0.02, 0.2, 0.04, 0.04, 'plastic'], ['b', -0.1, 0.24, -0.09, 0.04, 0.34, 0.02, 'plastic'], ['b', 0.1, 0.24, -0.09, 0.04, 0.34, 0.02, 'plastic']] },
  skeletonModel: { name: 'Squelette de SVT', static: true, parts: [['c', 0, 0.03, 0, 0.25, 0.06, 'plastic', 10], ['c', 0, 0.8, 0, 0.02, 1.5, 'chrome', 6], ['s', 0, 1.6, 0, 0.11, 'ceramic:efe8d6'], ['b', 0, 1.25, 0, 0.3, 0.38, 0.14, 'ceramic:efe8d6'], ['b', 0, 0.92, 0, 0.26, 0.12, 0.12, 'ceramic:efe8d6'], ['b', -0.2, 1.2, 0, 0.05, 0.55, 0.05, 'ceramic:efe8d6'], ['b', 0.2, 1.2, 0, 0.05, 0.55, 0.05, 'ceramic:efe8d6'], ['b', -0.08, 0.55, 0, 0.06, 0.65, 0.06, 'ceramic:efe8d6'], ['b', 0.08, 0.55, 0, 0.06, 0.65, 0.06, 'ceramic:efe8d6']] },
  hoop: { name: 'Panier de basket', static: true, parts: [['b', 0, 1.5, -0.6, 0.12, 3.0, 0.12, 'steel:3a3d42'], ['b', 0, 3.05, -0.35, 1.8, 1.05, 0.06, 'paint:f4f4f0'], ['b', 0, 3.05, -0.318, 0.6, 0.45, 0.01, 'paint:d94141'], ['c', 0, 2.9, -0.02, 0.23, 0.03, 'metal:e8762c', 16], ['b', 0, 1.0, -0.6, 0.6, 0.06, 0.06, 'steel:3a3d42']] },
  gymMat: { name: 'Tapis de gym', parts: [['b', 0, 0.1, 0, 1.0, 0.2, 2.0, 'fabric:2f6fb5']] },
  gymMatStack: { name: 'Pile de tapis', parts: [['b', 0, 0.1, 0, 1.0, 0.2, 2.0, 'fabric:2f6fb5'], ['b', 0.02, 0.3, 0.03, 1.0, 0.2, 2.0, 'fabric:c83c3c'], ['b', -0.02, 0.5, -0.02, 1.0, 0.2, 2.0, 'fabric:2f6fb5']] },
  vaultBox: { name: 'Plinth', parts: [['b', 0, 0.45, 0, 0.6, 0.9, 1.4, 'wood:c8a06a'], ['b', 0, 0.94, 0, 0.62, 0.08, 1.42, 'leather:6b4526']] },
  globe: { name: 'Globe', parts: [['c', 0, 0.03, 0, 0.12, 0.06, 'wood:6b4526', 12], ['c', 0, 0.2, 0, 0.015, 0.3, 'metal:c8a06a', 6], ['s', 0, 0.42, 0, 0.2, 'paint:3c8ad6']] },
  tray: { name: 'Plateau-repas', parts: [['b', 0, 0.015, 0, 0.45, 0.03, 0.32, 'plastic:7a8a99']] },
  fountain: { name: 'Fontaine', static: true, parts: [['c', 0, 0.3, 0, 2.4, 0.6, 'concrete:c9c3b6', 24], ['c', 0, 0.55, 0, 2.1, 0.1, 'water', 24], ['c', 0, 1.2, 0, 0.3, 1.4, 'concrete:c9c3b6', 12], ['c', 0, 1.95, 0, 0.8, 0.15, 'concrete:c9c3b6', 18], ['s', 0, 2.2, 0, 0.25, 'concrete:c9c3b6']] },
  piano: { name: 'Piano', static: true, parts: [['b', 0, 0.75, -0.2, 1.5, 1.3, 0.35, 'wood:2a1a12'], ['b', 0, 0.72, 0.12, 1.5, 0.05, 0.3, 'wood:2a1a12'], ['b', 0, 0.76, 0.14, 1.36, 0.04, 0.22, 'ceramic:f4f4f0'], ['b', -0.7, 0.36, 0.12, 0.08, 0.72, 0.3, 'wood:2a1a12'], ['b', 0.7, 0.36, 0.12, 0.08, 0.72, 0.3, 'wood:2a1a12']] },
  fireplace: { name: 'Cheminée', static: true, parts: [['b', -0.8, 0.6, 0, 0.4, 1.2, 0.6, 'brick:b07060'], ['b', 0.8, 0.6, 0, 0.4, 1.2, 0.6, 'brick:b07060'], ['b', 0, 1.3, 0, 2.2, 0.2, 0.7, 'concrete:e8e2d6'], ['b', 0, 0.6, -0.25, 1.2, 1.2, 0.1, 'brick:5a3a30'], ['b', 0, 0.05, 0.05, 1.2, 0.1, 0.5, 'concrete:3a3a3a'], ['b', 0, 0.2, 0.05, 0.7, 0.15, 0.2, 'light:ff8a3a']] },
  billiard: { name: 'Billard', static: true, parts: [['b', 0, 0.75, 0, 1.4, 0.1, 2.6, 'wood:5a3420'], ['b', 0, 0.805, 0, 1.24, 0.01, 2.44, 'fabric:1f7a45'], ...legs(0.55, 1.15, 0.72, 'wood:5a3420', 0.14)] },
  chandelier: { name: 'Lustre', static: true, parts: [['c', 0, 0.6, 0, 0.02, 1.2, 'metal:c8a06a', 6], ['c', 0, 0.05, 0, 0.5, 0.06, 'metal:c8a06a', 16], ...[0, 1, 2, 3, 4, 5].map((i) => ['s', Math.cos(i) * 0.45, 0.14, Math.sin(i) * 0.45, 0.06, 'light:ffd9a0'])] },
  vending: { name: 'Distributeur', static: true, parts: [['b', 0, 0.95, 0, 0.9, 1.9, 0.8, 'paint:c8232c'], ['b', -0.12, 1.1, 0.402, 0.6, 1.2, 0.01, 'window:1e2a33'], ['b', 0.33, 1.2, 0.402, 0.16, 0.5, 0.01, DARK], ['b', -0.12, 1.75, 0.402, 0.6, 0.15, 0.01, 'light']] },
};

// ─────────── Modèles Kenney (CC0) : boîtes de collision précalculées, rendu par le fichier GLB ───────────
const KENNEY_STATIC = /^(furniture\/(wall|floor|stairs|doorway|paneling)|cars\/|nature\/(tree_|tent_|statue_(obelisk|column)|fence_)|graveyard\/(ironFence|lightpost|altar))/;
for (const [id, a] of Object.entries(ASSETS)) {
  M[id] = { name: assetName(id), glb: id, static: KENNEY_STATIC.test(id), parts: a.b.map((b) => ['b', b[0], b[1], b[2], b[3] * 2, b[4] * 2, b[5] * 2, null]) };
}

function carParts(color) {
  const body = `metal:${color.toString(16).padStart(6, '0')}`;
  return [
    ['b', 0, 0.55, 0, 1.8, 0.55, 4.2, body],
    ['b', 0, 1.05, -0.25, 1.62, 0.5, 2.1, body],
    ['b', 0, 1.06, -0.25, 1.64, 0.36, 1.9, 'window:1f2b35'],
    ['b', 0, 1.06, 0.83, 1.5, 0.4, 0.02, 'window:1f2b35'],
    ['b', 0, 0.55, 2.1, 1.82, 0.16, 0.03, 'chrome'],
    ['b', 0, 0.55, -2.1, 1.82, 0.16, 0.03, 'chrome'],
    ['b', -0.65, 0.7, 2.1, 0.32, 0.12, 0.02, 'light'],
    ['b', 0.65, 0.7, 2.1, 0.32, 0.12, 0.02, 'light'],
    ['b', -0.65, 0.7, -2.1, 0.32, 0.12, 0.02, 'light:ff3b3b'],
    ['b', 0.65, 0.7, -2.1, 0.32, 0.12, 0.02, 'light:ff3b3b'],
    ...carWheels(0.82, 1.35, 0.33),
  ];
}

/** Boîte englobante d'un modèle (sans rotation), à l'échelle 1. */
export function modelBounds(id) {
  const m = M[id];
  if (!m) return null;
  if (m._b) return m._b;
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const p of m.parts) {
    const h = partHalf(p);
    min[0] = Math.min(min[0], p[1] - h[0]); max[0] = Math.max(max[0], p[1] + h[0]);
    min[1] = Math.min(min[1], p[2] - h[1]); max[1] = Math.max(max[1], p[2] + h[1]);
    min[2] = Math.min(min[2], p[3] - h[2]); max[2] = Math.max(max[2], p[3] + h[2]);
  }
  m._b = { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  return m._b;
}

/** Demi-tailles d'une pièce dans le repère de l'objet (rotation de la pièce incluse). */
export function partHalf(p) {
  if (p[0] === 'b') {
    let hx = p[4] / 2; const hy = p[5] / 2; let hz = p[6] / 2;
    if (p[8]) { const c = Math.abs(Math.cos(p[8])); const s = Math.abs(Math.sin(p[8])); [hx, hz] = [hx * c + hz * s, hx * s + hz * c]; }
    return [hx, hy, hz];
  }
  if (p[0] === 'c') { const r = Math.max(p[4], p[8] || 0); return [r, p[5] / 2, r]; }
  if (p[0] === 's') return [p[4], p[4], p[4]];
  return [p[4], p[5] / 2, p[4]];
}

/** Matière d'une pièce (dernier champ « matière » selon le type). */
export function partMat(p) {
  return p[0] === 'b' ? p[7] : p[0] === 'c' ? p[6] : p[0] === 's' ? p[5] : p[6];
}

/** { key, color, def } d'une matière ('wood', 'wood:aabbcc' ou un nombre). */
export function resolveMat(spec) {
  if (typeof spec === 'number') return { key: 'paint', color: spec, def: MATS.paint };
  const [k, hex] = String(spec).split(':');
  const def = MATS[k] || MATS.paint;
  return { key: MATS[k] ? k : 'paint', color: hex ? parseInt(hex, 16) : def.c, def };
}

/** Vie d'un objet selon sa taille (comme dans Garry's Mod : petit = fragile, gros = solide). */
export function modelHp(id, scale = 1) {
  const b = modelBounds(id);
  if (!b) return 100;
  const vol = b.size[0] * b.size[1] * b.size[2] * scale ** 3;
  return Math.max(25, Math.min(200, Math.round(20 + 140 * Math.cbrt(vol))));
}

export const MODELS = M;
