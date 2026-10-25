/**
 * Manoir (de nuit) : grande maison à étage — hall avec escalier monumental et galeries, salon à cheminée,
 * salle à manger, bibliothèque, cuisine, bureau ; à l'étage chambres, salle de bain, salle de jeux, grenier.
 * Dehors : fontaine, serre, labyrinthe de haies, cimetière, garage.
 */
import { builder, PI } from './build.js';

const K = 'furniture/'; const F = 'food/'; const N = 'nature/'; const C = 'cars/'; const G = 'graveyard/';

export function manor() {
  const b = builder();
  const F0 = 0.6; const F1 = 4.2; const TOP = 7.8; const T = 0.35;
  const OUT = 'brick:c9b8a2'; const IN = 'plaster:efe6d6'; const IN2 = 'plaster:e3d6c3';
  const WIN = (a, c, y0) => [a, c, y0 + 1.0, y0 + 2.8];

  // ─── sol, allée
  b.ground(-40, -36, 40, 36, 'grass:4f7a3c');
  b.slab(-2.5, 13, 2.5, 36, 0.02, 0.02, 'dirt:9c8a70', { ghost: true });
  b.slab(-12, 18, 12, 26, 0.02, 0.02, 'dirt:9c8a70', { ghost: true });
  // fondations et sols du manoir
  b.slab(-15, -10, 15, 8, F0, 0.9, 'plank:7a5034');
  b.slab(-4, 8, 4, 11, F0, 0.9, 'concrete:d8d2c4');
  b.stairs(0, 13, 0, -1, 0, 4, 0.15, 0.5, 6, 'concrete:d8d2c4');
  b.slab(-3.9, -9.8, 3.9, -2.1, F0 + 0.01, 0.01, 'carpet:6b2a2a', { ghost: true }); // bureau
  b.slab(-3.9, -2, 3.9, 7.9, F0 + 0.01, 0.01, 'tile:e8e0d0', { ghost: true }); // hall en damier
  b.slab(4.1, -9.9, 14.8, -0.1, F0 + 0.01, 0.01, 'tile:d9d2c2', { ghost: true }); // cuisine

  // ─── murs extérieurs (deux niveaux)
  for (const [y0, y1] of [[0, F1], [F1, TOP]]) {
    const up = y0 > 0; const fl = up ? F1 : F0;
    b.wx(-15, 15, 8, y0, y1, OUT, { t: T, inner: IN, side: -1, gaps: [up ? [-1, 1, F1, F1 + 2.4, false] : [-1.2, 1.2, F0, 3.2, false], WIN(-13, -10.5, fl), WIN(-8, -5.5, fl), WIN(5.5, 8, fl), WIN(10.5, 13, fl)] });
    b.wx(-15, 15, -10, y0, y1, OUT, { t: T, inner: IN, side: 1, gaps: [...(up ? [] : [[6, 7.2, F0, 3.0, false]]), WIN(-13, -10.5, fl), WIN(-8, -5.5, fl), WIN(-2, 2, fl), WIN(10, 13, fl)] });
    b.wz(-10, 8, -15, y0, y1, OUT, { t: T, inner: IN, side: 1, gaps: [WIN(2, 4.5, fl), WIN(-7, -4.5, fl)] });
    b.wz(-10, 8, 15, y0, y1, OUT, { t: T, inner: IN, side: -1, gaps: [WIN(2, 4.5, fl), WIN(-7, -4.5, fl)] });
  }
  // ─── rez-de-chaussée : cloisons
  b.wz(-10, 8, -4, F0, F1 - 0.3, IN2, { t: 0.2, gaps: [[3.5, 5, F0, 3.0], [-5.5, -4, F0, 3.0]] });
  b.wz(-10, 8, 4, F0, F1 - 0.3, IN2, { t: 0.2, gaps: [[3.5, 5, F0, 3.0], [-5.5, -4, F0, 3.0]] });
  b.wx(-4, 4, -2, F0, F1 - 0.3, IN2, { t: 0.2, gaps: [[2, 3.2, F0, 3.0]] });
  b.wx(-15, -4, 0, F0, F1 - 0.3, IN2, { t: 0.2, gaps: [[-9, -7.8, F0, 3.0]] });
  b.wx(4, 15, 0, F0, F1 - 0.3, IN2, { t: 0.2, gaps: [[8, 9.2, F0, 3.0]] });
  // escalier monumental (vers le fond) et étage
  b.stairs(0, 7.0, 0, -1, F0, 24, 0.15, 0.3, 2.0, 'carpet:7a2a2a');
  b.box(-1.05, F0 + 1.8, 3.4, 0.1, 3.6, 7.2, 'wood:4a2c1a', { ghost: true }); b.box(1.05, F0 + 1.8, 3.4, 0.1, 3.6, 7.2, 'wood:4a2c1a', { ghost: true });
  b.slab(-15, -10, 15, -0.2, F1, 0.3, 'plank:7a5034');
  b.slab(-15, -0.2, -2.6, 8, F1, 0.3, 'plank:7a5034');
  b.slab(2.6, -0.2, 15, 8, F1, 0.3, 'plank:7a5034');
  for (const [x1, z1, x2, z2] of [[-14.8, -9.8, 14.8, -0.2], [-14.8, -0.2, -2.6, 7.8], [2.6, -0.2, 14.8, 7.8]]) b.slab(x1, z1, x2, z2, F1 - 0.3, 0.02, 'ceiling', { ghost: true, ns: true });
  // garde-corps des galeries
  b.wz(-0.2, 7.8, -2.6, F1, F1 + 1.0, 'wood:4a2c1a', { t: 0.08 }); b.wz(-0.2, 7.8, 2.6, F1, F1 + 1.0, 'wood:4a2c1a', { t: 0.08 });
  b.wx(-2.6, -1.05, -0.2, F1, F1 + 1.0, 'wood:4a2c1a', { t: 0.08 }); b.wx(1.05, 2.6, -0.2, F1, F1 + 1.0, 'wood:4a2c1a', { t: 0.08 });
  // étage : cloisons
  b.wz(-10, 8, -4, F1, TOP, IN, { t: 0.2, gaps: [[4, 5.2], [-1.8, -0.6]] });
  b.wz(-10, 8, 4, F1, TOP, IN, { t: 0.2, gaps: [[4, 5.2], [-1.8, -0.6]] });
  b.wx(-4, 4, -2, F1, TOP, IN, { t: 0.2, gaps: [[-0.6, 0.6]] });
  b.wx(-15, -4, 0, F1, TOP, IN, { t: 0.2, gaps: [[-12, -10.8]] });
  b.wz(-10, 0, -9, F1, TOP, 'tileS:dbe7e4', { t: 0.15, gaps: [[-6, -4.8]] });
  b.wx(4, 15, 0, F1, TOP, IN, { t: 0.2, gaps: [[8, 9.2]] });
  b.slab(-14.8, -9.8, -9.1, -0.1, F1 + 0.01, 0.01, 'tileS', { ghost: true });
  // plafond, toit, balcon
  b.slab(-15.2, -10.2, 15.2, 8.2, TOP + 0.2, 0.2, 'plaster:efe6d6', { ns: true });
  b.slab(-14.8, -9.8, 14.8, 7.8, TOP, 0.02, 'ceiling', { ghost: true, ns: true });
  const rise = 4.2;
  b.prism(0, TOP + 0.2, -1, 30.4, rise, 18.4, OUT);
  const ang = Math.atan(rise / 9.2); const len = 9.9 / Math.cos(ang);
  b.decoBox(0, TOP + 0.2 + rise / 2 + 0.1, -1 + 4.6 + 0.35, 31.4, 0.2, len, 'roof:2f3540', ang);
  b.decoBox(0, TOP + 0.2 + rise / 2 + 0.1, -1 - 4.6 - 0.35, 31.4, 0.2, len, 'roof:2f3540', -ang);
  for (const x of [-9, 9]) b.box(x, TOP + 2.6, -4, 1.0, 3.6, 1.0, 'brick:8a6a5a', { ns: true });
  b.clip(-16, -11, 16, 9, TOP + 0.2);
  // porche : colonnes, balcon à l'étage
  for (const x of [-3.6, 3.6]) b.box(x, (F0 + F1 - 0.3) / 2, 10.6, 0.5, F1 - 0.3 - F0, 0.5, 'concrete:e8e2d6');
  b.slab(-4, 8, 4, 11, F1, 0.3, 'plank:6a4a34', { ns: true });
  b.wx(-4, 4, 10.95, F1, F1 + 1.0, 'concrete:e8e2d6', { t: 0.12 }); b.wz(8, 11, -3.95, F1, F1 + 1.0, 'concrete:e8e2d6', { t: 0.12 }); b.wz(8, 11, 3.95, F1, F1 + 1.0, 'concrete:e8e2d6', { t: 0.12 });
  b.clip(-4.3, 8.1, 4.3, 11.3, F1 + 1.0);

  // ─── lumières (lustres, porche, jardin, cimetière)
  b.light(0, F0 + 2.9, 9.8, 0xffb866, 5, 9);
  b.light(0, TOP - 1.0, 3.5, 0xffd9a0, 7, 14); b.light(-9.5, F1 - 0.6, 4, 0xffc888, 6, 11); b.light(-9.5, F1 - 0.6, -5, 0xffc888, 6, 11);
  b.light(9.5, F1 - 0.6, -5, 0xfff1d6, 6, 11); b.light(9.5, F1 - 0.6, 4, 0xffc888, 5, 10); b.light(9.5, TOP - 0.5, -5, 0xd0b0ff, 5, 11); b.light(-9.5, TOP - 0.5, 4, 0xffc888, 5, 10);
  b.light(26, 2.2, -24, 0x7dffb0, 5, 14); b.light(-14, 2.6, 21, 0xffd08a, 4, 12);
  b.obj('chandelier', 0, 3.5, 0, TOP - 1.25); b.obj('chandelier', -9.5, 4, 0, F1 - 1.5); b.obj('chandelier', -9.5, -5, 0, F1 - 1.5);

  // ─── HALL
  const y = F0;
  b.obj(K + 'rugRectangle', 0, 9.3, 0, y); b.obj(K + 'coatRackStanding', -3.4, 7.3, 0, y); b.obj(K + 'benchCushion', 3.5, 6.2, -PI / 2, y);
  b.obj(K + 'pottedPlant', -3.4, -1.4, 0, y); b.obj(K + 'pottedPlant', 3.4, -1.4, 0, y); b.obj('clock', -3.85, 2, PI / 2, y + 2.2); b.obj(N + 'statue_head', 3.4, 2.5, -PI / 2, y);
  b.obj(K + 'sideTable', -3.6, 2.5, PI / 2, y); b.obj(K + 'lampSquareTable', -3.6, 2.2, 0, y + 0.86); b.obj('flowerPot', -3.6, 2.9, 0, y + 0.86);
  // SALON (ouest, devant)
  b.obj('fireplace', -14.45, 4, PI / 2, y); b.obj(K + 'rugRounded', -11.2, 4, PI / 2, y);
  b.obj(K + 'loungeSofa', -9.6, 4, -PI / 2, y, 1, { tint: 0x6b2a3a }); b.obj(K + 'loungeChair', -12, 6.6, PI, y, 1, { tint: 0x6b2a3a }); b.obj(K + 'loungeChair', -12, 1.4, 0, y, 1, { tint: 0x6b2a3a });
  b.obj(K + 'tableCoffee', -11.7, 4, PI / 2, y); b.obj(F + 'cupTea', -11.6, 3.8, 0, y + 0.52); b.obj(K + 'books', -11.9, 4.4, 0.3, y + 0.52);
  b.obj('piano', -6.2, 7.45, PI, y); b.obj(K + 'stoolBarSquare', -6.2, 6.6, 0, y); b.obj(K + 'bookcaseClosedWide', -12, 0.38, 0, y); b.obj(K + 'lampRoundFloor', -14.4, 7.3, 0, y);
  b.obj(K + 'pottedPlant', -14.4, 0.6, 0, y); b.obj(K + 'radio', -12.6, 0.4, 0, y + 1.78); b.obj(K + 'speaker', -5, 0.5, 0, y); b.obj('candles', -14.45, 3.4, 0, y + 1.4);
  // SALLE À MANGER (ouest, fond)
  b.obj(K + 'tableCrossCloth', -9.5, -6, PI / 2, y); b.obj(K + 'tableCrossCloth', -9.5, -4.05, PI / 2, y);
  for (const z of [-6.6, -5.5, -4.4, -3.4]) { b.obj(K + 'chairCushion', -10.25, z, PI / 2, y); b.obj(K + 'chairCushion', -8.75, z, -PI / 2, y); }
  b.obj(K + 'chairCushion', -9.5, -7.4, 0, y); b.obj(K + 'chairCushion', -9.5, -2.65, PI, y);
  const T1 = y + 0.78;
  b.obj(F + 'turkey', -9.5, -5.2, 0.4, T1); b.obj(F + 'wineRed', -9.3, -6.3, 0, T1); b.obj(F + 'wineWhite', -9.7, -3.8, 0, T1); b.obj(F + 'cakeBirthday', -9.5, -3.3, 0, T1);
  for (const z of [-6.6, -5.5, -4.4, -3.4]) { b.obj(F + 'plateDinner', -9.85, z, 0, T1); b.obj(F + 'plateDinner', -9.15, z, 0, T1); b.obj(F + 'glassWine', -9.8, z + 0.25, 0, T1); }
  b.obj(K + 'sideTableDrawers', -14.55, -5, PI / 2, y); b.obj(F + 'bowl', -14.5, -5.3, 0, y + 0.86); b.obj('candles', -14.5, -4.6, 0, y + 0.86);
  b.obj(K + 'bookcaseClosedDoors', -12, -9.53, 0, y); b.obj(K + 'bookcaseClosedDoors', -7, -9.53, 0, y); b.obj(K + 'pottedPlant', -4.6, -9.4, 0, y);
  // BIBLIOTHÈQUE (est, devant)
  for (const x of [5.2, 7.0, 8.8]) b.obj(K + (x === 7.0 ? 'bookcaseOpen' : 'bookcaseClosed'), x, 7.5, PI, y);
  for (const z of [6.5, 5.6, 2.2, 1.3]) b.obj(K + (z > 4 ? 'bookcaseClosed' : 'bookcaseOpen'), 14.5, z, -PI / 2, y);
  b.obj(K + 'desk', 9.5, 3.4, 0, y); b.obj(K + 'chairDesk', 9.5, 4.3, PI, y); b.obj('globe', 10.4, 3.2, 0, y + 0.86); b.obj(K + 'books', 8.9, 3.3, 0.4, y + 0.86); b.obj(K + 'lampSquareTable', 8.5, 3.0, 0, y + 0.86);
  b.obj(K + 'loungeChairRelax', 6, 2.2, 0.6, y, 1, { tint: 0x2c4a3a }); b.obj(K + 'rugRound', 6.3, 3.4, 0, y); b.obj(K + 'loungeSofaOttoman', 6.9, 3.2, 0, y, 1, { tint: 0x2c4a3a });
  b.obj(G + 'trunk', 12.6, 1.0, 0, y); b.obj(K + 'lampRoundFloor', 14.4, 3.8, 0, y); b.obj('books', 12.6, 1.0, 0.4, y + 0.82);
  // CUISINE (est, fond)
  for (let i = 0; i < 7; i++) {
    const x = 8.0 + i * 0.97;
    const m = ['kitchenCabinet', 'kitchenSink', 'kitchenCabinetDrawer', 'kitchenStove', 'kitchenCabinet', 'kitchenCabinetDrawer', 'kitchenCabinet'][i];
    b.obj(K + m, x, -9.33, 0, y);
    if (i !== 3) b.obj(K + 'kitchenCabinetUpper', x, -9.58, 0, y + 1.6); else b.obj(K + 'hoodLarge', x, -9.5, 0, y + 1.45);
  }
  b.obj(K + 'kitchenFridgeLarge', 14.35, -6, -PI / 2, y); b.obj('cabinetOpen', 14.5, -4.4, -PI / 2, y); b.obj(K + 'kitchenFridgeSmall', 14.35, -3.2, -PI / 2, y);
  for (const x of [8.5, 9.47, 10.44]) b.obj(K + 'kitchenBar', x, -5.6, PI, y);
  for (const x of [8.5, 9.47, 10.44]) b.obj(K + 'stoolBar', x, -4.8, PI, y);
  const T2 = y + 1.01;
  b.obj(F + 'cuttingBoard', 8.2, -9.2, 0, T2); b.obj(F + 'knifeBlock', 9.9, -9.4, 0, T2); b.obj(F + 'pot', 10.9, -9.2, 0, T2); b.obj(F + 'fryingPan', 11.9, -9.2, 0.3, T2);
  b.obj(K + 'kitchenCoffeeMachine', 13.7, -9.4, 0, T2); b.obj(K + 'toaster', 12.8, -9.4, 0, T2); b.obj(F + 'bread', 8.6, -5.6, 0, y + 0.94); b.obj(F + 'loafBaguette', 9.4, -5.6, 0.6, y + 0.94);
  b.obj(F + 'apple', 10.3, -5.5, 0, y + 0.94); b.obj(F + 'orange', 10.45, -5.7, 0, y + 0.94); b.obj(F + 'wholeHam', 13.2, -9.25, 0, T2); b.obj(K + 'trashcan', 4.6, -9.5, 0, y);
  b.obj(K + 'tableRound', 6.6, -2.5, 0, y); b.obj(K + 'chairRounded', 5.8, -2.5, PI / 2, y); b.obj(K + 'chairRounded', 7.4, -2.5, -PI / 2, y); b.obj(F + 'bowlSoup', 6.6, -2.5, 0, y + 0.82);
  // BUREAU (centre, fond)
  b.obj(K + 'desk', 0, -8.3, 0, y); b.obj(K + 'chairDesk', 0, -7.4, PI, y); b.obj(K + 'laptop', 0.3, -8.4, 0.2, y + 0.86); b.obj(K + 'lampSquareTable', -0.6, -8.5, 0, y + 0.86);
  b.obj(K + 'bookcaseClosedDoors', -3.2, -9.53, 0, y); b.obj(K + 'bookcaseClosedDoors', 3.2, -9.53, 0, y); b.obj('globe', -3.3, -3, 0, y); b.obj(K + 'loungeChair', 2.6, -3.4, PI + 0.5, y, 1, { tint: 0x4a3020 });
  b.obj('filing', -3.6, -5.5, PI / 2, y); b.obj(G + 'trunkLong', 3.1, -6.3, -PI / 2, y);

  // ─── ÉTAGE
  const u = F1;
  // chambre principale (ouest, devant)
  b.obj(K + 'bedDouble', -13.6, 4, PI / 2, u); b.obj(K + 'cabinetBedDrawer', -14.5, 2.2, PI / 2, u); b.obj(K + 'cabinetBedDrawer', -14.5, 5.8, PI / 2, u);
  b.obj(K + 'lampRoundTable', -14.5, 2.2, 0, u + 0.59); b.obj(K + 'lampRoundTable', -14.5, 5.8, 0, u + 0.59);
  b.obj('wardrobe', -7, 7.55, PI, u); b.obj('wardrobe', -5.6, 7.55, PI, u); b.obj(K + 'rugRectangle', -11, 4, PI / 2, u); b.obj(K + 'loungeDesignChair', -9, 1, 0, u, 1, { tint: 0x5a4a7a });
  b.obj(K + 'sideTableDrawers', -10, 0.4, 0, u); b.obj(K + 'bathroomMirror', -10, 0.25, 0, u + 0.86); b.obj('candles', -9.6, 0.45, 0, u + 0.86); b.obj(K + 'bear', -12.6, 6.8, -0.4, u);
  // salle de bain
  b.obj(K + 'bathtub', -12, -9.15, 0, u); b.obj(K + 'shower', -14.2, -1, PI / 2, u); b.obj(K + 'toilet', -9.7, -2.2, -PI / 2, u);
  b.obj(K + 'bathroomSink', -9.5, -7.3, -PI / 2, u); b.obj(K + 'bathroomCabinet', -9.35, -5.9, -PI / 2, u + 1.2); b.obj('laundryBasket', -14.3, -6.5, 0, u); b.obj('shampoo', -11.2, -9.3, 0, u + 0.95);
  // chambre d'enfant
  b.obj(K + 'bedSingle', -7.4, -8.6, 0, u); b.obj(K + 'bear', -5, -9.4, 0.3, u); b.obj(K + 'bookcaseOpenLow', -4.6, -6, -PI / 2, u); b.obj('ball', -6.2, -4.5, 0, u);
  b.obj(K + 'rugRound', -6.4, -5, 0, u); b.obj('skateboard', -8.2, -3, 1.2, u); b.obj('wardrobeWhite', -8.4, -0.55, PI, u); b.obj(K + 'pillowBlue', -6, -3.3, 0.5, u);
  // grenier (centre, fond)
  b.obj(G + 'trunk', -3, -9.2, 0.1, u); b.obj(G + 'trunkLong', 3.2, -8.8, -0.2, u); b.obj(K + 'cardboardBoxClosed', -1.5, -9.4, 0.3, u); b.obj(K + 'cardboardBoxClosed', -1.4, -9.4, 0.1, u + 0.63);
  b.obj(K + 'cardboardBoxOpen', 0.8, -9.3, 0, u); b.obj(G + 'coffin', 1.5, -5.5, 0.3, u); b.obj(G + 'skeleton', -2.8, -5.6, 0.8, u); b.obj(K + 'loungeChair', 2.8, -3.4, PI + 0.3, u, 1, { tint: 0x5a5a4a });
  b.obj('mirror', -3.75, -4, PI / 2, u); b.obj(G + 'debrisWood', 0, -3.4, 0.6, u); b.obj(G + 'lanternCandle', -0.4, -7, 0, u);
  // chambre d'amis (est, devant)
  b.obj(K + 'bedSingle', 13.7, 6.4, -PI / 2, u); b.obj(K + 'bedSingle', 13.7, 2.4, -PI / 2, u); b.obj(K + 'cabinetBed', 14.5, 4.4, -PI / 2, u); b.obj(K + 'lampRoundTable', 14.5, 4.4, 0, u + 0.53);
  b.obj('wardrobe', 5.3, 7.55, PI, u); b.obj(K + 'desk', 9, 7.4, PI, u); b.obj(K + 'chairDesk', 9, 6.5, 0, u); b.obj(K + 'rugSquare', 10.5, 4.2, 0, u); b.obj(K + 'coatRackStanding', 4.6, 1, 0, u);
  // salle de jeux (est, fond)
  b.obj('billiard', 9.5, -5, PI / 2, u); b.obj('arcade', 14.5, -8.8, -PI / 2, u); b.obj('arcade', 14.5, -7.8, -PI / 2, u);
  b.obj(K + 'loungeSofaLong', 6, -9, 0, u, 1, { tint: 0x2b3f6b }); b.obj(K + 'cabinetTelevision', 6, -0.7, PI, u); b.obj(K + 'televisionModern', 6, -0.65, PI, u + 0.7);
  b.obj(K + 'speaker', 4.6, -0.6, PI, u); b.obj(K + 'kitchenBar', 13.5, -2.2, -PI / 2, u); b.obj(K + 'stoolBar', 12.7, -2.2, PI / 2, u); b.obj(F + 'sodaBottle', 13.5, -2.4, 0, u + 0.94);
  b.obj(K + 'tableCoffeeSquare', 6.2, -7.2, 0, u); b.obj(F + 'pizzaBox', 6.2, -7.2, 0.3, u + 0.52); b.obj('ball', 11.4, -2, 0, u);
  // galeries
  b.obj(K + 'pottedPlant', -3.3, 7.4, 0, u); b.obj(K + 'pottedPlant', 3.3, 7.4, 0, u); b.obj(N + 'statue_head', -3.3, 1.2, PI / 2, u); b.obj(K + 'benchCushion', 3.3, 3, -PI / 2, u, 1, { tint: 0x6b2a3a });
  // balcon
  b.obj(K + 'loungeChairRelax', -2.4, 9.6, PI, u, 1, { tint: 0x2c4a3a }); b.obj('flowerPot', 3.4, 10.5, 0, u); b.obj(K + 'tableCoffeeSquare', 0.6, 9.6, 0, u);

  // ─── JARDIN : fontaine, allée, réverbères
  b.obj('fountain', 0, 22, 0);
  for (const z of [16, 28]) for (const x of [-4, 4]) b.obj(G + 'lightpostDouble', x, z, x < 0 ? PI / 2 : -PI / 2);
  for (let z = 14; z <= 34; z += 2.2) { b.obj('hedge', -3.6, z, PI / 2); b.obj('hedge', 3.6, z, PI / 2); }
  for (const [x, z, m] of [[-10, 14, 'tree_oak'], [10, 14, 'tree_oak'], [-14, 30, 'tree_tall'], [14, 30, 'tree_default'], [-24, 30, 'tree_pineRoundA'], [24, 31, 'tree_pineRoundC'], [-34, 22, 'tree_fat'], [36, 20, 'tree_detailed'], [-20, 12, 'tree_detailed']]) b.obj(N + m, x, z, (x * 7) % 6);
  for (const [x, z] of [[-8, 18], [8, 18], [-8, 26], [8, 26]]) b.obj(K + 'bench', x, z, x < 0 ? PI / 2 : -PI / 2);
  for (const [x, z, m] of [[-6.5, 12.8, 'flower_redA'], [-7, 13.4, 'flower_purpleB'], [6.5, 12.8, 'flower_yellowA'], [7, 13.4, 'flower_redB'], [-12, 23, 'plant_bushDetailed'], [12, 21, 'plant_bushLarge'], [-16, 16, 'rock_largeB'], [17, 25, 'stump_old']]) b.obj(N + m, x, z, 0.4);
  b.obj(G + 'pumpkinCarved', -2.2, 12.6, 0.3); b.obj(G + 'pumpkinTallCarved', 2.3, 12.5, -0.4);
  // SERRE (ouest)
  b.slab(-34, 2, -24, 12, 0.08, 0.08, 'concrete:a8a49a');
  b.wx(-34, -24, 2, 0, 3, 'glass', { t: 0.06 }); b.wx(-34, -24, 12, 0, 3, 'glass', { t: 0.06, gaps: [[-29.6, -28.4, 0, 2.3]] });
  b.wz(2, 12, -34, 0, 3, 'glass', { t: 0.06 }); b.wz(2, 12, -24, 0, 3, 'glass', { t: 0.06 });
  for (let x = -34; x <= -24; x += 2.5) { b.box(x, 1.5, 2, 0.1, 3, 0.1, 'metal:e8e8e8'); b.box(x, 1.5, 12, 0.1, 3, 0.1, 'metal:e8e8e8'); }
  b.slab(-34.1, 1.9, -23.9, 12.1, 3.1, 0.1, 'glass', { ns: true }); b.clip(-34.2, 1.8, -23.8, 12.2, 3.0);
  for (const z of [4.5, 9.5]) { b.obj(K + 'sideTable', -31.5, z, 0); b.obj(K + 'sideTable', -26.5, z, 0); }
  for (const [x, z, m] of [[-32, 4.5, 'plantSmall1'], [-31, 4.5, 'plantSmall2'], [-27, 4.5, 'plantSmall3'], [-26, 4.5, 'plantSmall1'], [-32, 9.5, 'plantSmall2'], [-26.2, 9.5, 'plantSmall3']]) b.obj(K + m, x, z, 0, 0.86);
  for (const [x, z] of [[-33, 7], [-25, 7], [-29, 10.8]]) b.obj(N + 'pot_small', x, z);
  b.obj('wheelbarrow', -29, 6.8, 0.8); b.obj('bucket', -30.5, 7.2); b.obj(G + 'shovel', -28, 7.6, 1.2); b.obj(N + 'flower_yellowB', -33.2, 11); b.obj('watering', -27.6, 4.6, 0, 0.86);
  // LABYRINTHE DE HAIES (fond ouest)
  maze(b, -34, -34, 9, 9, 2.2);
  b.obj(N + 'statue_column', -24.1, -24.1); b.obj(G + 'lanternGlass', -22.6, -24.6);
  // CIMETIÈRE (fond est)
  for (let x = 16; x < 36; x += 2.2) { if (Math.abs(x + 1.1 - 25.9) > 0.5) b.obj(G + 'ironFence', x + 1.1, -14, 0); b.obj(G + 'ironFence', x + 1.1, -34, 0); }
  for (let z = -34; z < -14; z += 2.2) { b.obj(G + 'ironFence', 16, z + 1.1, PI / 2); b.obj(G + 'ironFence', 36.4, z + 1.1, PI / 2); }
  b.obj(G + 'ironFenceBorderGate', 25.9, -14, 0);
  const stones = ['gravestoneCross', 'gravestoneRound', 'gravestoneBevel', 'cross'];
  for (let i = 0; i < 16; i++) { const x = 19 + (i % 4) * 4.5; const z = -31 + Math.floor(i / 4) * 4.2; if (Math.abs(x - 26) < 2 && z > -20) continue; b.obj(G + stones[i % 4], x, z, ((i * 37) % 10) / 30 - 0.15); }
  b.obj(G + 'coffin', 30, -17.5, 0.2); b.obj(G + 'altarWood', 26, -32.5, 0); b.obj(G + 'urn', 25, -32.6); b.obj(G + 'urn', 27, -32.6); b.obj(G + 'fireBasket', 21, -17); b.obj(G + 'fireBasket', 31, -17);
  b.obj(G + 'pine', 34, -31); b.obj(G + 'pineCrooked', 18, -31.5); b.obj(G + 'rocks', 33.5, -20, 1); b.obj(G + 'skeleton', 22.5, -24, 0.4); b.obj(G + 'shovel', 29, -27.2, 0.8);
  b.obj(G + 'pumpkin', 23, -16); b.obj(G + 'pumpkinCarved', 24, -15.6, 0.5); b.obj(G + 'pumpkinTall', 28.6, -16.2); b.obj(G + 'lanternCandle', 25.2, -22.5); b.obj(G + 'lanternCandle', 26.8, -22.5);
  // GARAGE (est, devant)
  b.slab(19, 0, 31, 10, 0.12, 0.12, 'concrete:8f8c86');
  b.wx(19, 31, 0, 0, 3.4, 'wood:5a4030', { t: 0.25 }); b.wz(0, 10, 19, 0, 3.4, 'wood:5a4030', { t: 0.25, gaps: [[4.4, 5.6, 0.12, 2.3]] }); b.wz(0, 10, 31, 0, 3.4, 'wood:5a4030', { t: 0.25 });
  b.wx(19, 31, 10, 2.6, 3.4, 'wood:5a4030', { t: 0.25 });
  b.slab(18.8, -0.2, 31.2, 10.2, 3.6, 0.2, 'roof:2f3540', { ns: true }); b.clip(18.6, -0.4, 31.4, 10.4, 3.4);
  b.slab(19.2, 0.2, 30.8, 9.8, 3.4, 0.02, 'ceiling', { ghost: true, ns: true });
  b.obj(C + 'suvLuxury', 22.5, 5, PI, 0.12); b.obj(C + 'sedanSports', 27.5, 5.4, PI, 0.12); b.obj('toolbox', 30.2, 1, -PI / 2, 0.12); b.obj('oilDrum', 30.3, 2.4, 0, 0.12);
  b.obj(K + 'cardboardBoxClosed', 20, 0.8, 0.2, 0.12); b.obj('lawnmower', 30, 8.6, -PI / 2, 0.12); b.obj('tire', 19.8, 9, 0, 0.12); b.obj(N + 'log_stack', 33.5, 4, 0);
  b.light(25, 3.0, 5, 0xfff1d6, 3, 8);

  b.bounds(-40, 40, -36, 36);
  return {
    id: 'manor', name: 'Manoir', env: 'night', sun: [25, 40, 30],
    sky: 0x0b1226, fog: [0x0c1428, 30, 95], area: [-40, 40, -36, 36],
    look: { top: 0x070d22, horizon: 0x1c2b4e, ground: 0x0b0f0c, clouds: 0.5, cloudCol: 0x2a3550, stars: 1, sun: 1.1, sunColor: 0xa9bcff, hemi: [0x6d82c0, 0x1a1a22, 0.5], exposure: 1.3 },
    solids: b.solids, deco: b.deco, objects: b.objects, lights: b.lights,
    spawns: {
      hunters: [[0, 0.1, 33], [-2, 0.1, 33.5], [2, 0.1, 33.5], [-1, 0.1, 32], [1, 0.1, 32]],
      props: [[-2.5, 0.7, 5], [-7, 0.7, 6], [12, 0.7, -2], [-6, 0.7, -8], [12, 0.7, 6], [-2, 0.7, -5]],
    },
  };
}

/** Labyrinthe de haies (parcours en profondeur, reproductible) : nx × nz cases de `cell` mètres. */
function maze(b, x0, z0, nx, nz, cell) {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const seen = new Set(); const open = new Set();
  const k = (x, z) => `${x},${z}`;
  const stack = [[0, 0]]; seen.add(k(0, 0));
  while (stack.length) {
    const [x, z] = stack[stack.length - 1];
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [x + dx, z + dz]).filter(([a, c]) => a >= 0 && c >= 0 && a < nx && c < nz && !seen.has(k(a, c)));
    if (!n.length) { stack.pop(); continue; }
    const [a, c] = n[Math.floor(rnd() * n.length)];
    open.add([k(x, z), k(a, c)].sort().join('|')); seen.add(k(a, c)); stack.push([a, c]);
  }
  const H = 2.2; const t = 0.6; const mat = 'leaf:3d6b34';
  const isOpen = (a, c) => open.has([a, c].sort().join('|'));
  for (let x = 0; x < nx; x++) {
    for (let z = 0; z <= nz; z++) {
      const wall = z === 0 || z === nz || !isOpen(k(x, z - 1), k(x, z));
      const entry = (z === nz && x === nx - 1) || (z === 0 && x === 0);
      if (wall && !entry) b.box(x0 + (x + 0.5) * cell, H / 2, z0 + z * cell, cell + t, H, t, mat);
    }
  }
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x <= nx; x++) {
      const wall = x === 0 || x === nx || !isOpen(k(x - 1, z), k(x, z));
      if (wall) b.box(x0 + x * cell, H / 2, z0 + (z + 0.5) * cell, t, H, cell + t, mat);
    }
  }
  b.clip(x0 - 0.5, z0 - 0.5, x0 + nx * cell + 0.5, z0 + nz * cell + 0.5, H);
}
