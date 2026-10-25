/**
 * École : couloir central bordé de casiers, deux salles de classe, labo de sciences, CDI,
 * hall d'entrée ; gymnase (haut plafond), cantine avec cuisine, toilettes, salle des profs.
 * Dehors : cour avec terrain de basket, aire de jeux, parking et bus scolaire.
 */
import { builder, PI } from './build.js';

const K = 'furniture/'; const F = 'food/'; const N = 'nature/'; const C = 'cars/';

export function school() {
  const b = builder();
  const H = 3.6; const HG = 6.2; const FL = 0.15;
  const OUT = 'brick:d9a07a'; const IN = 'plaster:eef0ea'; const IN2 = 'plaster:e2ecef';
  b.ground(-36, -32, 36, 32, 'grass:6a9a4a');
  b.slab(-26, -12, 26, 12, FL, 0.6, 'tile:e6e2d8');
  b.slab(-26, -2, 26, 2, FL + 0.005, 0.005, 'tileS:cfd8de', { ghost: true });
  b.slab(-25.9, -11.9, -8.1, -2.1, FL + 0.005, 0.005, 'plank:c99a62', { ghost: true });
  // ─── murs extérieurs
  const W = (a, c) => [a, c, 1.1, 2.9];
  b.wx(-26, 26, 12, 0, H, OUT, { t: 0.3, inner: IN, side: -1, gaps: [W(-23, -20), W(-18, -15), W(-10, -7), W(-5, -2.5), [-1.2, 1.2, FL, 2.6, false], W(3, 6), W(8, 11), W(16, 19), W(21, 24)] });
  b.wx(-8, 26, -12, 0, H, OUT, { t: 0.3, inner: IN, side: 1, gaps: [W(-5, -2), W(1, 4), W(7, 9), W(12, 14), W(18, 21), [23, 24.2, FL, 2.4, false]] });
  b.wx(-26, -8, -12, 0, HG, OUT, { t: 0.3, inner: IN, side: 1, gaps: [[-23, -19, 3.6, 5.4], [-15, -11, 3.6, 5.4]] });
  b.wz(-12, 12, -26, 0, H, OUT, { t: 0.3, inner: IN, side: 1, gaps: [[-1.3, 1.3, FL, 2.7, false], W(5, 9)] });
  b.wz(-12, -2, -26, H, HG, OUT, { t: 0.3, inner: IN, side: 1 });
  b.wz(-12, 12, 26, 0, H, OUT, { t: 0.3, inner: IN, side: -1, gaps: [[-1.3, 1.3, FL, 2.7, false], W(5, 9), W(-9, -5)] });
  // couloir
  b.wx(-26, 26, 2, FL, H, IN2, { t: 0.2, gaps: [[-16, -14.8], [-3, -1.8], [-1.5, 1.5], [1.8, 3], [14.8, 16]] });
  b.wx(-26, -8, -2, FL, HG, IN2, { t: 0.2, gaps: [[-18, -15.6, FL, 2.6]] });
  b.wx(-8, 26, -2, FL, H, IN2, { t: 0.2, gaps: [[-1, 1.4], [12.4, 13.6], [19, 20.2]] });
  // salles au nord
  b.wz(2, 12, -13, FL, H, IN, { t: 0.2 });
  b.wz(2, 12, -1.5, FL, H, IN, { t: 0.2 }); b.wz(2, 12, 1.5, FL, H, IN, { t: 0.2 });
  b.wz(2, 12, 13, FL, H, IN, { t: 0.2, gaps: [[6, 7.2]] });
  // au sud
  b.wz(-12, -2, -8, FL, HG, IN, { t: 0.25 });
  b.wz(-12, -2, 10, FL, H, 'tileS:dbe7e4', { t: 0.2 }); b.wz(-12, -2, 16, FL, H, 'tileS:dbe7e4', { t: 0.2 });
  b.slab(10.1, -11.9, 15.9, -2.1, FL + 0.006, 0.005, 'tileS', { ghost: true });
  b.slab(16.1, -11.9, 25.9, -2.1, FL + 0.006, 0.005, 'carpet:7a6a5a', { ghost: true });
  b.slab(-25.9, 2.1, -13.1, 11.9, FL + 0.006, 0.005, 'plank:b08458', { ghost: true });
  b.slab(-12.9, 2.1, -1.6, 11.9, FL + 0.006, 0.005, 'plank:b08458', { ghost: true });
  b.slab(13.1, 2.1, 25.9, 11.9, FL + 0.006, 0.005, 'carpet:3f5a7a', { ghost: true });
  // plafonds et toits
  b.slab(-8.2, -12.2, 26.2, 12.2, H + 0.25, 0.25, 'roof:5a5550', { ns: true });
  b.slab(-26.2, -2, -8.2, 12.2, H + 0.25, 0.25, 'roof:5a5550', { ns: true });
  b.slab(-26.2, -12.2, -8, -1.9, HG + 0.25, 0.25, 'roof:5a5550', { ns: true });
  b.slab(-25.85, -1.9, 25.85, 11.85, H, 0.02, 'ceiling', { ghost: true, ns: true });
  b.slab(-7.9, -11.85, 25.85, -1.9, H, 0.02, 'ceiling', { ghost: true, ns: true });
  b.slab(-25.85, -11.85, -8.1, -2.1, HG, 0.02, 'ceiling', { ghost: true, ns: true });
  b.clip(-27, -2, 27, 13, H); b.clip(-8.1, -13, 27, -2, H); b.clip(-27, -13, -8, -1.9, HG);
  for (let x = -22; x <= 22; x += 4) b.box(x, H - 0.03, 0, 1.2, 0.04, 0.5, 'light', { ghost: true });
  for (const [x, z] of [[-20, 7], [-7, 7], [7, 7], [19, 7], [0, -7], [6, -7], [13, -7], [21, -7]]) b.box(x, H - 0.03, z, 1.2, 0.04, 1.2, 'light', { ghost: true });
  for (const [x, z] of [[-21, -7], [-13, -7]]) b.box(x, HG - 0.03, z, 1.6, 0.04, 1.6, 'light', { ghost: true });
  const y = FL;

  // ─── COULOIR : casiers (on peut s'y cacher), bancs, plantes
  const lockerRow = (x1, x2, z, ry) => { for (let x = x1; x <= x2; x += 0.52) b.obj(Math.round(x * 7) % 3 === 0 ? 'locker' : 'lockerClosed', x, z, ry, y); };
  lockerRow(-25.2, -16.6, 1.65, PI); lockerRow(-14.2, -3.6, 1.65, PI); lockerRow(3.6, 14.2, 1.65, PI); lockerRow(16.6, 25.2, 1.65, PI);
  lockerRow(-14.6, -8.6, -1.65, 0); lockerRow(1.8, 11.8, -1.65, 0); lockerRow(14.2, 18.6, -1.65, 0); lockerRow(20.8, 25.2, -1.65, 0);
  b.obj(K + 'trashcan', -7.6, -1.6, 0, y); b.obj(K + 'pottedPlant', -25.5, -1.5, 0, y); b.obj(K + 'pottedPlant', 25.5, -1.5, 0, y); b.obj('wetFloor', 7, 0.3, 0.4, y);
  // HALL D'ENTRÉE
  b.obj(K + 'bookcaseClosedWide', 0, 2.4, PI, y); b.obj(K + 'pottedPlant', -1.0, 11.4, 0, y); b.obj(K + 'pottedPlant', 1.0, 11.4, 0, y); b.obj(K + 'rugDoormat', 0, 11.4, 0, y);
  b.obj(K + 'benchCushionLow', -1.1, 7, PI / 2, y, 1, { tint: 0x3f6fb5 }); b.obj(K + 'benchCushionLow', 1.1, 7, -PI / 2, y, 1, { tint: 0x3f6fb5 });
  // ─── SALLES DE CLASSE
  const classroom = (x0, flip) => {
    // tableau au mur ouest, élèves tournés vers lui
    b.obj('whiteboard', x0 + 0.2, 7, PI / 2, y);
    b.obj(K + 'desk', x0 + 1.9, 9.6, -PI / 2, y); b.obj(K + 'chairDesk', x0 + 1.0, 9.6, PI / 2, y); b.obj('globe', x0 + 2.0, 10.1, 0, y + 0.86); b.obj(K + 'laptop', x0 + 2.0, 9.3, -PI / 2, y + 0.86);
    let n = 0;
    for (const dx of [4.2, 6.9, 9.6]) for (const z of [3.9, 6.0, 8.1, 10.2]) {
      b.obj(K + 'sideTable', x0 + dx, z, PI / 2, y);
      for (const dz of [-0.3, 0.3]) b.obj(K + 'chair', x0 + dx + 0.75, z + dz, -PI / 2, y);
      n += 1;
      const r = (n * 37 + x0) % 5;
      if (r === 0) b.obj(K + 'books', x0 + dx, z - 0.2, 0.3, y + 0.86); else if (r === 1) b.obj('backpack', x0 + dx + 1.15, z + 0.2, -PI / 2, y); else if (r === 2) b.obj(F + 'apple', x0 + dx - 0.1, z + 0.3, 0, y + 0.86); else if (r === 3) b.obj('mug', x0 + dx, z, 0, y + 0.86);
    }
    for (const z of [4, 6, 8]) b.obj(K + 'bookcaseOpenLow', x0 + 12.55, z, -PI / 2, y);
    b.obj(K + 'trashcan', x0 + 12.4, 11.4, 0, y); b.obj(K + 'pottedPlant', x0 + 12.3, 2.6, 0, y); b.obj(K + 'coatRack', x0 + 6, 2.12, 0, y + 1.4);
    void flip;
  };
  classroom(-26); classroom(-13);
  // LABO DE SCIENCES (x 1.5 → 13)
  b.obj('whiteboard', 12.8, 7, -PI / 2, y);
  for (const z of [4.2, 7.0, 9.8]) for (const x of [3.6, 7.2]) {
    b.obj(K + 'kitchenCabinet', x, z, 0, y); b.obj(K + 'kitchenSink', x + 0.97, z, 0, y);
    b.obj(K + 'stoolBarSquare', x, z + 0.9, 0, y); b.obj(K + 'stoolBarSquare', x + 0.97, z + 0.9, 0, y);
    b.obj((x + z) % 2 > 1 ? 'bottle' : 'jar', x - 0.2, z, 0, y + 1.01); b.obj('flowerPot', x + 0.25, z - 0.2, 0, y + 1.01);
  }
  b.obj('skeletonModel', 12, 3.0, -PI / 2, y); b.obj(K + 'bookcaseClosedDoors', 2.1, 11.4, PI / 2, y); b.obj(K + 'bookcaseClosedDoors', 2.1, 10.4, PI / 2, y); b.obj('globe', 12.2, 11.2, 0, y);
  b.obj(K + 'desk', 11.4, 7, PI / 2, y); b.obj(K + 'chairDesk', 12.3, 7, -PI / 2, y); b.obj(K + 'computerScreen', 11.3, 7, PI / 2, y + 0.86);
  // CDI (x 13 → 26)
  for (const x of [14.2, 15.2, 16.2, 17.2, 21.8, 22.8, 23.8, 24.8]) b.obj(K + (x % 2 > 1 ? 'bookcaseOpen' : 'bookcaseClosed'), x, 11.55, PI, y);
  for (const z of [3.8, 4.8, 9.2, 10.2]) b.obj(K + 'bookcaseOpen', 25.55, z, -PI / 2, y);
  for (const [x, z] of [[17, 5.2], [21.5, 5.2]]) { b.obj(K + 'tableRound', x, z, 0, y); for (const a of [0.6, 2.2, 3.8, 5.4]) b.obj(K + 'chairRounded', x + Math.sin(a) * 1.0, z + Math.cos(a) * 1.0, a + PI, y); b.obj(K + 'books', x, z, 0.4, y + 0.82); }
  b.obj(K + 'loungeSofa', 19.4, 9.6, PI, y, 1, { tint: 0x3f6fb5 }); b.obj(K + 'rugRound', 19.4, 8.4, 0, y); b.obj(K + 'loungeSofaOttoman', 19.4, 7.9, 0, y, 1, { tint: 0xe0a030 });
  b.obj(K + 'desk', 14.4, 3.3, PI / 2, y); b.obj(K + 'computerScreen', 14.3, 3.3, PI / 2, y + 0.86); b.obj(K + 'chairDesk', 15.3, 3.3, -PI / 2, y); b.obj(K + 'pottedPlant', 25.4, 7, 0, y); b.obj(K + 'bear', 14.2, 8.6, PI / 2, y);
  // GYMNASE (x -26 → -8, z -12 → -2)
  b.slab(-24.5, -10.5, -9.5, -3.5, FL + 0.012, 0.004, 'paint:c8443a', { ghost: true });
  b.slab(-24.3, -10.3, -9.7, -3.7, FL + 0.014, 0.004, 'plank:d2a26a', { ghost: true });
  b.slab(-17.05, -10.3, -16.95, -3.7, FL + 0.016, 0.004, 'paint:c8443a', { ghost: true });
  b.obj('hoop', -25.2, -7, PI / 2, y); b.obj('hoop', -8.8, -7, -PI / 2, y);
  b.obj('gymMatStack', -24.5, -2.9, PI / 2, y); b.obj('gymMat', -22, -10.8, PI / 2, y); b.obj('gymMat', -20, -10.8, PI / 2, y); b.obj('vaultBox', -13, -10.6, PI / 2, y);
  for (const x of [-21, -13]) b.obj(K + 'benchCushionLow', x, -2.55, PI, y, 1, { tint: 0x3f6fb5 });
  b.obj('basketball', -18, -6.5, 0, y); b.obj('basketball', -15.5, -9, 0, y); b.obj('ball', -11, -4, 0, y); b.obj('cone', -20, -5, 0, y); b.obj('cone', -19, -9, 0, y); b.obj('cone', -14, -5.5, 0, y);
  b.obj('pingpong', -11.4, -9.8, PI / 2, y); b.obj('trampoline', -22.2, -6.8, 0, y); b.obj(K + 'speaker', -8.6, -2.6, -PI / 2, y);
  // CANTINE (x -8 → 10) et cuisine
  for (const z of [-4.6, -7.4, -10.2]) for (const x of [-6.0, -1.6]) {
    b.obj(K + 'table', x, z, 0, y); b.obj(K + 'table', x + 1.89, z, 0, y);
    for (const dx of [-0.6, 0.4, 1.4, 2.4]) { b.obj(K + 'chair', x + dx - 0.1, z - 0.8, 0, y); b.obj(K + 'chair', x + dx - 0.1, z + 0.8, PI, y); }
    b.obj('tray', x + 0.3, z - 0.25, 0, y + 0.73); b.obj('tray', x + 1.6, z + 0.25, 0.2, y + 0.73);
    b.obj(F + ['burger', 'fries', 'sandwich', 'pizza', 'salad', 'sodaCan'][Math.abs(Math.round(x + z)) % 6], x + 0.3, z - 0.25, 0, y + 0.76);
    b.obj(F + ['apple', 'sodaCan', 'pudding', 'banana', 'orange', 'cupcake'][Math.abs(Math.round(x * 2 + z)) % 6], x + 1.6, z + 0.25, 0.4, y + 0.76);
  }
  for (const z of [-3.2, -4.17, -5.14, -6.11, -7.08, -8.05, -9.02]) b.obj(K + 'kitchenBar', 4.4, z, PI / 2, y);
  for (let i = 0; i < 5; i++) { const x = 5.3 + i * 0.97; b.obj(K + ['kitchenStove', 'kitchenCabinet', 'kitchenSink', 'kitchenCabinetDrawer', 'kitchenStove'][i], x, -11.33, 0, y); if (i % 2 === 0) b.obj(K + 'hoodLarge', x, -11.5, 0, y + 1.45); }
  b.obj(K + 'kitchenFridgeLarge', 9.4, -9.4, -PI / 2, y); b.obj(K + 'kitchenFridgeLarge', 9.4, -8.2, -PI / 2, y); b.obj('cabinetOpen', 9.6, -6.9, -PI / 2, y);
  b.obj(F + 'pot', 5.3, -11.2, 0, y + 1.01); b.obj(F + 'potStew', 9.17, -11.2, 0, y + 1.01); b.obj(F + 'panStew', 6.3, -11.2, 0, y + 1.01);
  b.obj(F + 'loaf', 4.4, -4.2, 0.3, y + 0.94); b.obj(F + 'bowlSoup', 4.4, -5.1, 0, y + 0.94); b.obj(F + 'pudding', 4.4, -6.1, 0, y + 0.94); b.obj(F + 'apple', 4.4, -7.0, 0, y + 0.94);
  b.obj('crate', 7, -3, 0.3, y); b.obj(F + 'watermelon', 7, -3, 0, y + 0.8); b.obj('rice', 8.4, -3, 0.2, y); b.obj(K + 'trashcan', -7.5, -11.4, 0, y); b.obj('wetFloor', 2, -6, 0.3, y);
  // TOILETTES (x 10 → 16)
  for (const z of [-10.8, -9.0, -7.2]) { b.obj('stall', 14.8, z, PI / 2, y); b.obj('toilet', 15.45, z, -PI / 2, y); }
  b.obj('sink', 10.45, -9.5, PI / 2, y); b.obj('sink', 10.45, -8.0, PI / 2, y); b.obj('mirror', 10.2, -8.75, PI / 2, y); b.obj(K + 'trashcan', 11, -2.6, 0, y); b.obj('toiletPaper', 13.2, -11.5, 0, y);
  // SALLE DES PROFS (x 16 → 26)
  b.obj(K + 'loungeSofaCorner', 24.7, -10.7, -PI / 2, y, 1, { tint: 0x7a4a6a }); b.obj(K + 'tableCoffee', 23, -9, 0, y); b.obj(F + 'cupTea', 23, -9, 0, y + 0.52);
  b.obj(K + 'table', 19.4, -7, 0, y); for (const dx of [-0.5, 0.5]) { b.obj(K + 'chairCushion', 19.4 + dx, -7.8, 0, y); b.obj(K + 'chairCushion', 19.4 + dx, -6.2, PI, y); }
  b.obj(K + 'kitchenCabinet', 17, -11.33, 0, y); b.obj(K + 'kitchenCoffeeMachine', 17, -11.4, 0, y + 1.01); b.obj(K + 'kitchenFridgeSmall', 18, -11.5, 0, y); b.obj(K + 'kitchenMicrowave', 17.4, -11.4, 0, y + 1.01);
  for (let i = 0; i < 5; i++) b.obj(i % 2 ? 'locker' : 'lockerClosed', 25.6, -3 - i * 0.52, -PI / 2, y);
  b.obj(K + 'bookcaseClosedDoors', 16.5, -4.5, PI / 2, y); b.obj(K + 'pottedPlant', 16.5, -2.6, 0, y); b.obj('printer', 21.6, -11.4, 0, y); b.obj(F + 'donutSprinkles', 19.2, -7, 0, y + 0.73); b.obj(F + 'cupTea', 19.7, -7.1, 0, y + 0.73);

  // ─── DEHORS : cour (nord), terrain de basket, aire de jeux
  b.slab(-26, 12, 26, 30, 0.02, 0.02, 'asphalt:8a8c90', { ghost: true });
  b.slab(-16, 16, 0, 26, 0.025, 0.005, 'paint:3a6aa5', { ghost: true });
  b.slab(-15.6, 16.4, -0.4, 25.6, 0.03, 0.005, 'paint:4f86c6', { ghost: true });
  b.slab(-8.06, 16.4, -7.94, 25.6, 0.035, 0.004, 'paint:f4f4f0', { ghost: true });
  b.obj('hoop', -15.4, 21, PI / 2); b.obj('hoop', -0.6, 21, -PI / 2); b.obj('basketball', -9, 19); b.obj('basketball', -5, 23.5);
  b.obj('slide', 10, 24, PI); b.obj('swing', 18, 26); b.obj('sandbox', 18, 19.5); b.obj('bucket', 18.4, 19.8, 0, 0.11); b.obj('trampoline', 9, 17.5);
  for (const x of [-22, -19, 4, 22]) b.obj(K + 'bench', x, 13.2, PI);
  for (const [x, z, m] of [[-24, 28, 'tree_oak'], [-20, 28.5, 'tree_default'], [3, 28.5, 'tree_fat'], [14, 29, 'tree_detailed'], [24, 28, 'tree_tall'], [-34, 10, 'tree_oak'], [34, -10, 'tree_default'], [33, 14, 'tree_fat'], [-33, -18, 'tree_detailed'], [0, -26, 'tree_oak'], [-14, -24, 'tree_tall'], [16, -25, 'tree_fat']]) b.obj(N + m, x, z, (x + z) % 6);
  for (const [x, z, m] of [[-25, 14, 'plant_bushDetailed'], [25, 14, 'plant_bushLarge'], [5, 14, 'flower_redA'], [5.6, 14.3, 'flower_yellowA'], [-5, 14, 'flower_purpleA'], [12, 13.6, 'plant_bush'], [-30, -27, 'rock_largeA'], [28, -27, 'stump_round']]) b.obj(N + m, x, z, 0.3);
  // clôture de la cour
  b.fenceLine('fence', -26, 30.5, 26, 30.5, [12, 13]);
  // parking et bus (ouest)
  b.slab(-36, -10, -27, 30, 0.02, 0.02, 'asphalt', { ghost: true });
  b.obj('bus', -31.5, 6, 0); b.obj(C + 'sedan', -31.5, -5, PI); b.obj(C + 'van', -31.5, 20, 0); b.obj(C + 'police', -31.5, 26, 0);
  for (const z of [-8, -2, 14, 18, 23]) b.slab(-35.9, z - 0.05, -27.1, z + 0.05, 0.03, 0.005, 'paint:f1f1f1', { ghost: true });
  // derrière (sud) : poubelles, bennes
  b.obj('dumpster', 4, -14, 0); b.obj('wheelieBin', 7, -13.4, 0); b.obj('wheelieBin', 7.8, -13.4, 0); b.obj('trashBag', 8.8, -13.6); b.obj('pallet', 11, -14); b.obj('crate', 11, -14, 0.3, 0.16); b.obj(K + 'cardboardBoxClosed', 12.2, -14, 0.4);
  b.light(0, 2.8, 13.0, 0xfff0d0, 4, 10);
  b.bounds(-36, 36, -32, 32);
  return {
    id: 'school', name: 'École', env: 'outdoor', sun: [20, 45, 25],
    sky: 0x9fd0f2, fog: [0xc7dff0, 50, 130], area: [-36, 36, -32, 32],
    solids: b.solids, deco: b.deco, objects: b.objects, lights: b.lights,
    spawns: {
      hunters: [[-8, 0.1, 27], [-6, 0.1, 27], [-10, 0.1, 27], [-7, 0.1, 28.5], [-9, 0.1, 28.5]],
      props: [[0, 0.2, 0], [-19, 0.2, 7], [5.4, 0.2, 5.6], [-16, 0.2, -7], [3, 0.2, -3.5], [20, 0.2, 0]],
    },
  };
}
