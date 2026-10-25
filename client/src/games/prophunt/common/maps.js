/**
 * Prop Hunt — les maps (partagé client / serveur, copié tel quel côté serveur).
 */
import { builder, local, PI } from './build.js';
import { manor } from './map-manor.js';
import { school } from './map-school.js';
import { MAP_LIST } from './mapList.js';

const K = 'furniture/'; const F = 'food/'; const N = 'nature/'; const C = 'cars/'; const G = 'graveyard/';

// ───────────────────────── Lotissement ─────────────────────────
/**
 * Deux maisons à étage face à face de part et d'autre d'une rue, garages, jardins à l'arrière
 * (piscine vide d'un côté, aire de jeux de l'autre), chantier à l'ouest, rond-point à l'est.
 */
function suburb() {
  const b = builder();
  const holes = [];

  /** Une maison. Repère local : façade en lz = 0 (la rue est en lz < 0), maison de lx -6 à 6, lz 0 à 11, garage de lx 6 à 12. */
  const house = (cx, cz, flip, look) => {
    const L = local(b, cx, cz, flip);
    const F0 = 0.3; const F1 = 3.3; const TOP = 6.1;
    const OUT = look.wall; const LOW = look.low || look.wall; const IN = 'plaster:efeae0';
    // sols et plafonds
    L.slab(-6, 0, 6, 11, F0, 0.45, 'plank');
    L.slab(-6, 0, 6, 9.55, F1, 0.3, 'plank:a77c52');
    L.slab(-6, 10.75, 6, 11, F1, 0.3, 'plank:a77c52');
    L.slab(0.6, 9.55, 6, 10.75, F1, 0.3, 'plank:a77c52');
    L.slab(-6, 9.55, -5.45, 10.75, F1, 0.3, 'plank:a77c52');
    L.slab(-6.05, -0.05, 6.05, 11.05, TOP + 0.2, 0.2, 'plaster:f4f1ea', { ns: true });
    L.slab(-5.87, 0.13, 5.87, 9.55, F1 - 0.3, 0.02, 'ceiling', { ghost: true, ns: true });
    L.slab(0.6, 9.55, 5.87, 10.87, F1 - 0.3, 0.02, 'ceiling', { ghost: true, ns: true });
    L.slab(-5.87, 0.13, 5.87, 10.87, TOP, 0.02, 'ceiling', { ghost: true, ns: true });
    // perron et balcon
    L.slab(-2.6, -2.2, 2.6, 0, 0.15, 0.4, 'concrete');
    L.slab(-2.6, -2.2, 2.6, 0, F1, 0.25, 'plank:8a6a4a', { ns: true });
    for (const x of [-2.4, 2.4]) L.box(x, (0.15 + F1 - 0.25) / 2, -2.0, 0.2, F1 - 0.25 - 0.15, 0.2, 'paint:f4f4f0');
    L.wx(-2.6, 2.6, -2.15, F1, F1 + 1.0, 'paint:f4f4f0', { t: 0.08 });
    L.wz(-2.2, 0, -2.55, F1, F1 + 1.0, 'paint:f4f4f0', { t: 0.08 });
    L.wz(-2.2, 0, 2.55, F1, F1 + 1.0, 'paint:f4f4f0', { t: 0.08 });
    // murs extérieurs (rez-de-chaussée puis étage)
    const T = 0.26;
    L.wx(-6, 6, 0, 0, F1, LOW, { t: T, inner: IN, side: 1, gaps: [[-0.6, 0.6, F0, 2.55, false], [-4.6, -2.4, 1.2, 2.5], [2.4, 4.6, 1.2, 2.5]] });
    L.wx(-6, 6, 0, F1, TOP, OUT, { t: T, inner: IN, side: 1, gaps: [[-1.6, -0.5, F1, F1 + 2.2], [-4.6, -2.8, F1 + 0.9, F1 + 2.1], [2.4, 4.6, F1 + 0.9, F1 + 2.1]] });
    L.wx(-6, 6, 11, 0, F1, LOW, { t: T, inner: IN, side: -1, gaps: [[2.0, 3.2, F0, 2.55, false], [-4.2, -2.2, 1.2, 2.5]] });
    L.wx(-6, 6, 11, F1, TOP, OUT, { t: T, inner: IN, side: -1, gaps: [[-4.2, -2.2, F1 + 0.9, F1 + 2.1], [3.2, 4.8, F1 + 0.9, F1 + 2.1]] });
    L.wz(0, 11, -6, 0, F1, LOW, { t: T, inner: IN, side: 1, gaps: [[3.5, 5.5, 1.2, 2.5]] });
    L.wz(0, 11, -6, F1, TOP, OUT, { t: T, inner: IN, side: 1, gaps: [[2.2, 4.0, F1 + 0.9, F1 + 2.1], [7.0, 8.2, F1 + 0.9, F1 + 2.1]] });
    L.wz(0, 11, 6, 0, F1, LOW, { t: T, inner: IN, side: -1, gaps: [[7.6, 8.6, F0, 2.55, false]] });
    L.wz(0, 11, 6, F1, TOP, OUT, { t: T, inner: IN, side: -1, gaps: [[2.0, 3.8, F1 + 0.9, F1 + 2.1]] });
    // rez-de-chaussée : cloison salon / cuisine, escalier
    L.wz(0.13, 4.6, 0.5, F0, F1 - 0.3, IN, { t: 0.14 });
    L.stairs(-5.4, 10.15, 1, 0, F0, 20, 0.15, 0.3, 1.2, 'plank:8a6a4a');
    L.wx(-5.45, 0.6, 9.5, F1, F1 + 1.0, 'wood:6b4526', { t: 0.06 });
    // étage : chambres, salle de bain
    L.wx(-5.87, 5.87, 5.5, F1, TOP, IN, { t: 0.14, gaps: [[-2.2, -1.2], [2.6, 3.6]] });
    L.wz(0.13, 5.5, 0.8, F1, TOP, IN, { t: 0.14 });
    L.wz(5.5, 10.87, 2.2, F1, TOP, 'tileS:dbeaea', { t: 0.14, gaps: [[6.2, 7.2]] });
    L.slab(2.27, 5.57, 5.87, 10.87, F1 + 0.01, 0.01, 'tileS', { ghost: true });
    // toit à deux pans + pignons
    const ang = 0.55; const half = 6.1; const len = half / Math.cos(ang) + 0.1;
    const rise = Math.tan(ang) * 5.5;
    L.prism(0, TOP + 0.2, 5.5, 12.0, rise, 11.0, OUT);
    const ry0 = TOP + 0.2 + rise - (Math.tan(ang) * half) / 2 + 0.1;
    L.decoBox(0, ry0, 2.45, 12.8, 0.16, len, look.roof, -ang);
    L.decoBox(0, ry0, 8.55, 12.8, 0.16, len, look.roof, ang);
    L.decoBox(0, TOP + 0.2 + rise + 0.08, 5.5, 12.9, 0.18, 0.3, look.roof);
    L.box(4, TOP + rise * 0.55, 7.2, 0.7, rise, 0.7, 'brick:b07060', { ns: true });
    L.clip(-6.8, -0.8, 6.8, 11.8, TOP + 0.2);
    L.clip(-2.8, -2.6, 2.8, -0.1, F1 + 1.0); // au-dessus du balcon : pas d'escalade sur le toit
    // garage
    L.slab(6, 0.3, 12, 11, 0.16, 0.5, 'concrete:9c9a96');
    L.wx(6.13, 12, 11, 0.16, 3.0, 'brick:d6cfc4', { t: 0.25, gaps: [[8.2, 9.8, 1.4, 2.3]] });
    L.wz(0.3, 11, 12, 0.16, 3.0, 'brick:d6cfc4', { t: 0.25, gaps: [[4.0, 5.0, 0.16, 2.3]] });
    L.wx(6.13, 12, 0.3, 2.5, 3.0, 'brick:d6cfc4', { t: 0.25 });
    L.slab(5.9, 0.0, 12.3, 11.2, 3.25, 0.25, 'concrete:7a7c80', { ns: true });
    L.slab(6.13, 0.3, 11.87, 10.87, 3.0, 0.02, 'ceiling', { ghost: true, ns: true });
    L.clip(5.9, -0.2, 12.5, 11.4, 3.0);
    L.box(9, 2.75, 0.3, 5.6, 0.3, 0.18, 'paint:f0f0ea');
    // allée et chemin
    L.slab(6.3, -7, 11.7, 0.3, 0.02, 0.02, 'concrete:a8a59c', { ghost: true });
    L.slab(-1, -5.1, 1, -2.2, 0.02, 0.02, 'concrete:b8b4aa', { ghost: true });
    L.light(-3, F1 - 0.38, 3.5); L.light(3.2, F1 - 0.38, 5.0); L.light(-2, TOP - 0.08, 7.6, 0xfff0d6, 5, 8); L.light(9, 2.92, 6, 0xf4f8ff, 4, 8);
    // ─── mobilier : rez-de-chaussée (y = 0.3)
    const y = F0;
    L.obj(K + 'cabinetTelevision', -3, 0.42, 0, y); L.obj(K + 'televisionModern', -3, 0.35, 0, y + 0.7); L.obj(K + 'rugRectangle', -3, 2.6, 0, y);
    L.obj(K + 'speaker', -4.3, 0.3, 0, y); L.obj(K + 'speaker', -1.7, 0.3, 0, y);
    L.obj(K + 'loungeSofa', -3, 4.05, PI, y, 1, look.sofa); L.obj(K + 'tableCoffee', -3, 2.45, 0, y); L.obj(K + 'pillowBlue', -3.6, 4.15, 0.2, y + 0.45);
    L.obj(K + 'loungeChair', -5.1, 2.4, PI / 2, y, 1, look.sofa); L.obj(K + 'lampRoundFloor', -5.55, 0.55, 0, y); L.obj(K + 'pottedPlant', -0.1, 0.5, 0, y);
    L.obj(K + 'bookcaseClosedDoors', -5.58, 6.6, PI / 2, y); L.obj(K + 'bookcaseOpen', -5.58, 7.55, PI / 2, y); L.obj(K + 'coatRackStanding', -1.2, 0.55, 0, y);
    L.obj('wardrobeWhite', -1.4, 8.9, PI, y); L.obj(K + 'books', -2.6, 2.4, 0.4, y + 0.52); L.obj(F + 'mug', -3.4, 2.3, 0, y + 0.52); L.obj(K + 'radio', -3.5, 0.4, 0.2, y + 1.72);
    L.obj(K + 'bear', -4.9, 4.4, 0.4, y); L.obj('clock', -3, 0.18, 0, y + 2.2);
    // cuisine
    L.obj(K + 'kitchenCabinet', 5.36, 1.0, -PI / 2, y); L.obj(K + 'kitchenSink', 5.36, 2.0, -PI / 2, y); L.obj(K + 'kitchenStove', 5.36, 3.0, -PI / 2, y);
    L.obj(K + 'kitchenCabinetDrawer', 5.36, 4.0, -PI / 2, y); L.obj(K + 'kitchenFridgeLarge', 5.41, 5.25, -PI / 2, y); L.obj('cabinetOpen', 5.56, 6.4, -PI / 2, y);
    L.obj(K + 'kitchenCabinetUpper', 5.62, 1.0, -PI / 2, y + 1.6); L.obj(K + 'hoodModern', 5.55, 3.0, -PI / 2, y + 1.5); L.obj(K + 'kitchenCabinetUpperDouble', 5.62, 4.0, -PI / 2, y + 1.6);
    L.obj(K + 'kitchenCoffeeMachine', 5.5, 0.75, -PI / 2, y + 1.01); L.obj(K + 'toaster', 5.5, 1.3, -PI / 2, y + 1.01); L.obj(K + 'kitchenMicrowave', 5.5, 4.0, -PI / 2, y + 1.01); L.obj(K + 'kitchenBlender', 5.5, 3.6, 0, y + 1.01);
    L.obj(F + 'knifeBlock', 5.5, 4.4, 0, y + 1.01); L.obj(F + 'cuttingBoard', 5.4, 1.0, 0.2, y + 1.01); L.obj(F + 'fryingPan', 5.4, 2.85, 0.4, y + 1.01); L.obj(F + 'pot', 5.4, 3.2, 0, y + 1.01);
    L.obj(K + 'table', 3, 3.6, PI / 2, y);
    for (const dz of [-0.5, 0.5]) { L.obj(K + 'chairCushion', 2.25, 3.6 + dz, PI / 2, y); L.obj(K + 'chairCushion', 3.75, 3.6 + dz, -PI / 2, y); }
    L.obj(F + 'plateDinner', 2.75, 3.1, 0, y + 0.73); L.obj(F + 'plateDinner', 3.25, 4.1, 0, y + 0.73); L.obj(F + 'bowlCereal', 2.8, 4.0, 0, y + 0.73); L.obj(F + 'loafBaguette', 3.1, 3.5, 0.7, y + 0.73);
    L.obj(F + 'bottleKetchup', 3.2, 3.2, 0, y + 0.73); L.obj(F + 'cupSaucer', 2.9, 3.6, 0, y + 0.73); L.obj(F + 'grapes', 3.05, 3.85, 0, y + 0.73);
    L.obj(K + 'trashcan', 1.0, 10.45, 0, y); L.obj(K + 'washerDryerStacked', 4.6, 10.42, PI, y); L.obj('laundryBasket', 3.6, 10.4, 0, y);
    L.obj(K + 'pottedPlant', 1.0, 0.55, 0, y); L.obj('waterPack', 1.6, 8.9, 0.3, y); L.obj(F + 'cartonSmall', 5.45, 4.35, 0.3, y + 1.01);
    // ─── étage (y = 3.3)
    const u = F1;
    L.obj(K + 'bedDouble', -4.6, 2.75, PI / 2, u); L.obj(K + 'cabinetBedDrawer', -5.57, 1.05, PI / 2, u); L.obj(K + 'cabinetBedDrawer', -5.57, 4.45, PI / 2, u);
    L.obj(K + 'lampRoundTable', -5.57, 1.05, 0.4, u + 0.59); L.obj(K + 'books', -5.57, 4.45, 0.2, u + 0.59);
    L.obj('wardrobe', -2.6, 5.06, PI, u); L.obj(K + 'desk', -3.7, 0.57, 0, u); L.obj(K + 'chairDesk', -3.7, 1.4, PI, u); L.obj(K + 'laptop', -3.7, 0.5, 0, u + 0.86);
    L.obj(K + 'rugRound', -2.6, 2.8, 0, u); L.obj('laundryBasket', -0.3, 4.8, 0, u); L.obj(K + 'sideTableDrawers', 0.48, 2.6, -PI / 2, u);
    // chambre d'enfant (lits superposés)
    L.obj(K + 'bedBunk', 4.64, 2.8, -PI / 2, u); L.obj('wardrobeWhite', 1.6, 5.06, PI, u); L.obj(K + 'bear', 2.0, 0.6, 0.6, u);
    L.obj('ball', 2.6, 1.6, 0, u); L.obj('skateboard', 2.0, 3.6, 1.2, u); L.obj(K + 'books', 3.1, 0.5, 0, u); L.obj('guitar', 1.2, 0.4, 0.3, u);
    L.obj(K + 'rugSquare', 3.0, 2.8, 0, u); L.obj(K + 'pillowBlue', 3.2, 3.6, 0.4, u); L.obj(K + 'speakerSmall', 1.2, 4.6, 0.3, u);
    // salle de bain
    L.obj(K + 'bathtub', 4.4, 10.22, PI, u); L.obj(K + 'toilet', 5.33, 6.4, -PI / 2, u); L.obj(K + 'bathroomSink', 2.6, 8.2, PI / 2, u);
    L.obj(K + 'bathroomCabinetDrawer', 2.65, 7.0, PI / 2, u); L.obj('shampoo', 3.3, 9.7, 0, u + 0.6); L.obj('toiletPaper', 5.55, 7.3, 0, u); L.obj(K + 'trashcan', 5.6, 8.0, 0, u);
    // couloir
    L.obj(K + 'sideTable', -2.5, 5.82, 0, u); L.obj(K + 'pottedPlant', -5.4, 6.0, 0, u); L.obj(K + 'plantSmall2', -2.2, 5.85, 0, u + 0.86); L.obj(K + 'lampSquareTable', -2.9, 5.85, 0, u + 0.86); L.obj('fan', -0.4, 9.0, 0, u);
    // balcon
    L.obj(K + 'loungeChairRelax', -1.2, -1.1, PI, u, 1, look.sofa); L.obj('flowerPot', 2.1, -1.8, 0, u); L.obj('flowerPot', -2.2, -1.8, 0, u);
    // garage
    L.obj(look.car, 9.1, 5.2, PI, 0.16);
    L.obj('toolbox', 11.4, 9.9, -PI / 2, 0.16); L.obj('lockerClosed', 11.6, 8.8, -PI / 2, 0.16); L.obj('locker', 11.6, 8.25, -PI / 2, 0.16);
    L.obj(K + 'cardboardBoxClosed', 7.0, 10.3, 0.2, 0.16); L.obj(K + 'cardboardBoxClosed', 7.05, 10.3, 0.5, 0.79); L.obj(K + 'cardboardBoxOpen', 7.9, 10.4, 0.1, 0.16); L.obj('boxLong', 9.0, 10.5, 0, 0.16);
    L.obj('paintCan', 10.2, 10.5, 0, 0.16); L.obj('paintCan', 10.45, 10.4, 0, 0.16); L.obj('lawnmower', 6.9, 8.5, PI / 2, 0.16); L.obj(K + 'kitchenFridgeSmall', 11.5, 3.0, -PI / 2, 0.16);
    L.obj('tire', 11.3, 1.4, 0, 0.16); L.obj('tire', 11.3, 1.4, 0, 0.4); L.obj('oilDrum', 6.8, 1.3, 0, 0.16); L.obj('wheelbarrow', 6.9, 3.2, 0.3, 0.16);
    L.obj('bucket', 10.4, 9.6, 0, 0.16); L.obj('ball', 7.3, 6.2, 0, 0.16); L.obj(G + 'shovel', 8.2, 9.8, 0.3, 0.16);
    // devant : boîte aux lettres, buissons, poubelles
    L.obj('mailbox', -3.6, -4.6, 0, 0.15); L.obj(N + 'plant_bush', -5.0, -1.0); L.obj(N + 'plant_bushDetailed', 3.6, -1.2); L.obj(N + 'flower_redA', -4.2, -1.6); L.obj(N + 'flower_yellowC', 4.6, -1.8); L.obj('flowerPot', -1.2, -2.4, 0, 0.15); L.obj('flowerPot', 1.2, -2.4, 0, 0.15);
    L.obj('wheelieBin', 12.6, -1.4, -PI / 2); L.obj('wheelieBin', 12.6, -0.5, -PI / 2); L.obj('trashBag', 12.7, 0.6);
    L.obj('hedge', -7.2, -1.0, PI / 2); L.obj('hedge', -7.2, -3.0, PI / 2);
    // jardin : palissades
    L.fenceLine('fenceWood', -7, 11.2, -7, 21, []);
    L.fenceLine('fenceWood', 13, 11.2, 13, 21, [2]);
    L.fenceLine('fenceWood', -7, 21, 13, 21, []);
    L.slab(-2, 11, 4, 13, 0.18, 0.2, 'plank:8a6a4a');
    if (look.pool) {
      // piscine vide (on peut s'y cacher) : 6 × 5 m, 1,6 m de profondeur, marches dans un coin
      holes.push(L.rect(-5, 14, 1, 19));
      L.slab(-5, 14, 1, 19, -1.6, 0.4, 'tileS:9fd2e0');
      L.box(-2, -0.79, 14.05, 6, 1.62, 0.1, 'tileS:bfe3ec'); L.box(-2, -0.79, 18.95, 6, 1.62, 0.1, 'tileS:bfe3ec');
      L.box(-4.95, -0.79, 16.5, 0.1, 1.62, 5, 'tileS:bfe3ec'); L.box(0.95, -0.79, 16.5, 0.1, 1.62, 5, 'tileS:bfe3ec');
      L.stairs(-0.9, 17.6, 1, 0, -1.6, 4, 0.4, 0.45, 1.6, 'tileS:dff1f5');
      L.slab(-5.4, 13.6, 1.4, 14.0, 0.06, 0.06, 'concrete:e8e4da'); L.slab(-5.4, 19, 1.4, 19.4, 0.06, 0.06, 'concrete:e8e4da');
      L.slab(-5.4, 14, -5, 19, 0.06, 0.06, 'concrete:e8e4da'); L.slab(1, 14, 1.4, 19, 0.06, 0.06, 'concrete:e8e4da');
      L.obj('deckChair', 3.0, 15.2, -PI / 2); L.obj('deckChair', 3.0, 16.6, -PI / 2); L.obj('parasol', 4.2, 15.9);
      L.obj('cooler', 3.2, 17.8, 0.4); L.obj('ball', -2.2, 17.0, 0, -1.6); L.obj('bucket', -4.3, 18.4, 0, -1.6);
      L.obj('bbq', 8.0, 13.5, PI); L.obj('picnic', 8.5, 16.5, PI / 2); L.obj('shed', 10.4, 19.6, PI);
      L.obj('gnome', -6.2, 12.4, 0.6); L.obj('bush', -6.2, 20.1); L.obj('bush', 12.0, 12.2); L.obj('flowerPot', 1.6, 12.6, 0, 0.18);
    } else {
      L.obj('trampoline', -2.6, 16.5); L.obj('swing', 6.8, 18.6); L.obj('sandbox', 2.6, 15.0); L.obj('bucket', 2.3, 15.2, 0, 0.11);
      L.obj('slide', 10.6, 15.0, PI); L.obj('doghouse', -5.8, 12.4, PI / 2); L.obj('ball', 0.8, 18.0); L.obj('basketball', 5.0, 13.0);
      L.obj('picnic', 4.5, 12.0, 0, 0.18); L.obj('gnome', -6.1, 20.2, 0.6); L.obj('gnome', 12.2, 20.2, -0.6); L.obj('bush', -6.0, 18.4); L.obj('bush', 12.0, 12.4);
      L.obj('lawnmower', 11.4, 19.8, 0.4); L.obj('wheelbarrow', -5.4, 15.4, 1.2); L.obj('pumpkin', -5.8, 16.6);
    }
    L.obj(N + 'tree_oak', -5.8, 19.9, 0.5); L.obj(N + 'plant_bushDetailed', 11.6, 12.4); L.obj(N + 'flower_redB', -6.2, 15); L.obj(N + 'flower_yellowA', -6.3, 15.6); L.obj(N + 'flower_purpleB', -6.1, 16.2);
  };

  house(-10, -10, true, { wall: 'siding:a9c6dc', low: 'brick:d39a80', roof: 'roof:3d4f6b', car: C + 'suv', pool: true, sofa: { tint: 0x5b74b8 } });
  house(10, 10, false, { wall: 'siding:eadcb4', low: 'brick:cf8064', roof: 'roof:8c3a2f', car: C + 'hatchbackSports', pool: false, sofa: { tint: 0x6f9a5a } });

  // ─── rue, trottoirs, sols
  b.ground(-38, -32, 38, 32, 'grass', holes);
  b.slab(-38, -5, 38, 5, 0.01, 0.01, 'asphalt', { ghost: true });
  for (let x = -34; x <= 34; x += 5) b.slab(x - 1.2, -0.08, x + 1.2, 0.08, 0.015, 0.005, 'paint:f1e9c9', { ghost: true });
  b.slab(-38, 5, 38, 7, 0.15, 0.15, 'concrete:c2bfb6'); b.slab(-38, -7, 38, -5, 0.15, 0.15, 'concrete:c2bfb6');
  b.slab(-38, 4.85, 38, 5.0, 0.16, 0.16, 'concrete:9c9a94'); b.slab(-38, -5, 38, -4.85, 0.16, 0.16, 'concrete:9c9a94');
  // bus en travers, voitures
  b.obj('bus', -1.0, 0.6, PI / 2 + 0.0);
  b.obj(C + 'police', 15, -2.4, -PI / 2); b.obj(C + 'delivery', -16, 2.5, PI / 2); b.obj(C + 'taxi', 28, 2.4, PI / 2); b.obj(C + 'sedan', 21, -2.5, -PI / 2);
  [-30, -20, 20, 30].forEach((x, i) => { b.obj(N + ['tree_oak', 'tree_default', 'tree_fat', 'tree_detailed'][i], x, 6.2, i); b.obj(N + ['tree_detailed', 'tree_oak', 'tree_default', 'tree_fat'][i], x + 4, -6.2, i * 2); });
  for (const x of [-24, -6, 12, 30]) { b.obj('streetlamp', x, 5.6, PI); b.obj('streetlamp', x + 6, -5.6, 0); }
  b.obj('hydrant', -12, 5.7); b.obj('hydrant', 16, -5.7);
  b.obj('bench', -28, -6.2, 0, 0.15); b.obj('bench', 22, 6.2, PI, 0.15);
  b.obj('trashcan', -26, -5.6, 0, 0.15); b.obj('trashcan', 24, 5.6, 0, 0.15);
  b.obj('cone', 4.5, 1.6); b.obj('cone', 5.4, 2.6); b.obj('cone', -7.4, -2.8); b.obj('cone', -6.6, -3.6);
  b.obj('trashBag', 2.5, -5.4, 0, 0.15); b.obj('bin', -8.5, 5.6, 0, 0.15);
  // ─── chantier à l'ouest
  b.slab(-38, -16, -27, 16, 0.02, 0.02, 'dirt', { ghost: true });
  b.obj('container', -33.5, -9, 0); b.obj('container', -33.5, 9.5, PI);
  b.obj('dumpster', -29.5, -13, PI / 2); b.obj('barrier', -26.5, -1.5, PI / 2); b.obj('barrier', -26.5, 1.5, PI / 2);
  b.obj('pallet', -30, 2.5); b.obj('crate', -30, 2.5, 0.2, 0.16); b.obj('crate', -29.9, 2.4, 0.5, 0.96);
  b.obj('pallet', -31.5, -2.5, 0.4); b.obj('box', -31.5, -2.6, 0.3, 0.16); b.obj('boxLong', -31.3, -2.2, 1.0, 0.16);
  b.obj('oilDrum', -36.6, 1.0); b.obj('oilDrum', -36.6, 1.8); b.obj('oilDrum', -35.9, 1.4); b.obj('cone', -28.5, 6.0); b.obj('cone', -28, -6.5);
  b.obj(C + 'tractorShovel', -31.5, 13.5, -PI / 2); b.obj(C + 'truckFlat', -35, -1, 0); b.obj(N + 'rock_largeA', -36.5, -6.5, 0.4); b.obj(N + 'log_stack', -29, -15, PI / 2);
  b.obj('wheelbarrow', -30.5, 6.4, 2.0); b.obj('tire', -36.5, -14.5); b.obj('tire', -36.5, -14.5, 0, 0.24); b.obj('toolbox', -33.4, -11.5, 0.6, 0.1);
  b.obj('crate', -33.2, 12.0, 0.1, 0.1); b.obj('paintCan', -33.0, 11.0, 0, 0.1); b.obj('trashBag', -29, -11);
  // ─── rond-point à l'est
  b.box(34, 0.25, 0, 7, 0.5, 7, 'concrete:a8a59c'); b.slab(30.8, -3.2, 37.2, 3.2, 0.52, 0.04, 'grass', { ghost: true });
  b.obj('tree', 34, 0, 0, 0.5); b.obj('flowerPot', 31.6, -2.6, 0, 0.5); b.obj('flowerPot', 36.4, 2.6, 0, 0.5); b.obj('bush', 32.0, 2.4, 0, 0.5);
  b.obj('bench', 36.8, 9.5, PI); b.obj('bench', 36.8, -9.5, 0); b.obj('pingpong', 34, 12.5, PI / 2); b.obj('arcade', 31, -13, 0);
  b.obj(N + 'tree_pineRoundA', 36.5, 14.5); b.obj(N + 'tree_pineTallA_detailed', 36.5, -14.5); b.obj(N + 'tree_pineRoundC', 30.5, 16); b.obj(N + 'tree_tall', -36, 25); b.obj(N + 'tree_pineRoundA', 36, -26);
  b.obj(N + 'plant_bushDetailed', 30, -16.5); b.obj(N + 'plant_bushLarge', 33, -17); b.obj(N + 'rock_largeB', 35.5, 20, 1); b.obj(N + 'stump_round', 32, 20.5); b.obj(N + 'flower_redA', 33.5, 18.8); b.obj(N + 'flower_yellowB', 34.2, 18.5); b.obj(N + 'flower_purpleA', 32.6, 18.3);
  b.obj(N + 'log', 30.5, 22, 0.6); b.obj(N + 'mushroom_redGroup', 31.4, 22.6); b.obj(N + 'campfire_stones', 34, 24.5); b.obj(N + 'tent_detailedOpen', 36, 27, -PI / 2); b.obj(N + 'log', 32.5, 24.3, 1.3); b.obj('hedge', 32, -10, 0); b.obj('vending', 31.0, 9.5, -PI / 2);
  // haies le long des terrains
  for (const x of [-24, -27]) { b.obj('hedge', x, -9, PI / 2); b.obj('hedge', x, 9, PI / 2); }
  b.obj('hedge', 7.2, -12, PI / 2); b.obj('hedge', 7.2, -16, PI / 2); b.obj('hedge', -7.2, 12, PI / 2); b.obj('hedge', -7.2, 16, PI / 2);
  b.bounds(-38, 38, -32, 32);
  return {
    id: 'suburb', name: 'Lotissement', env: 'outdoor', sun: [-30, 45, 20],
    sky: 0x9fd0f2, fog: [0xc7dff0, 45, 120], area: [-38, 38, -32, 32],
    solids: b.solids, deco: b.deco, objects: b.objects, lights: b.lights,
    spawns: {
      hunters: [[-28, 0.3, 0], [-28, 0.3, 2], [-28, 0.3, -2], [-27, 0.3, 1], [-27, 0.3, -1]],
      props: [[0, 0.3, -7.5], [0, 0.3, 7.5], [-12, 0.3, -3.5], [12, 0.3, 3.5], [20, 0.3, 0], [8, 0.3, -6]],
    },
  };
}

// ───────────────────────── Supérette ─────────────────────────
/** Rayons et caisses devant ; salle du personnel avec casiers, toilettes, bureau et entrepôt derrière. */
function store() {
  const b = builder();
  const H = 5.5; const WALL = 'plaster:e7e4dc';
  b.ground(-24, -26, 24, 34, 'asphalt');
  b.slab(-20, -24, 20, 22, 0.02, 0.02, 'tile', { ghost: true });
  b.slab(-20, -24, 20, -6, 0.025, 0.02, 'concrete:a5a39d', { ghost: true });
  // murs
  b.wx(-20, 20, 22, 0, H, 'glass', { t: 0.08, gaps: [[-3, 3, 0, 3]] });
  for (let x = -20; x <= 20; x += 4) b.box(x, H / 2, 22, 0.25, H, 0.25, 'steel:5c636b');
  b.box(0, 4.0, 22, 40, 3.0, 0.3, 'paint:c8232c');
  b.wx(-20, 20, -24, 0, H, WALL, { t: 0.3, gaps: [[8, 12, 0, 3.8]] });
  b.box(10, 1.9, -24.3, 4, 3.8, 0.2, 'steel:7c838b');
  b.wz(-24, 22, -20, 0, H, WALL, { t: 0.3 }); b.wz(-24, 22, 20, 0, H, WALL, { t: 0.3 });
  b.wx(-20, 20, -6, 0, H, 'plaster:d6d1c4', { t: 0.25, gaps: [[-16.4, -14.6, 0, 2.4], [11, 15, 0, 3.6]] });
  b.slab(-20.2, -24.2, 20.2, 22.2, H + 0.3, 0.3, 'ceiling', { ns: true });
  b.clip(-21, -25, 21, 23, H);
  for (let x = -14; x <= 14; x += 7) for (let z = -2; z <= 18; z += 5) b.box(x, H - 0.03, z, 0.5, 0.05, 2.4, 'light', { ghost: true });
  for (let x = -14; x <= 14; x += 7) for (let z = -20; z <= -10; z += 6) b.box(x, H - 0.03, z, 0.4, 0.05, 1.6, 'light', { ghost: true });
  // ─── rayons : 5 allées (produits sur 3 niveaux, des deux côtés)
  const themes = [
    ['cereal', 'cerealBlue', 'chips', 'pasta', 'flour', F + 'chocolateWrapper', F + 'candyBarWrapper', F + 'bag', F + 'cookieChocolate'],
    ['can', 'canGreen', 'jar', F + 'can', F + 'canSmall', F + 'honey', F + 'peanutButter', F + 'canOpen'],
    ['detergent', 'shampoo', 'toiletPaper', 'detergent', 'shampoo', 'paintCan'],
    ['waterPack', 'sodaPack', 'juice', F + 'sodaBottle', F + 'sodaCan', F + 'carton', F + 'soda'],
    ['rice', F + 'wineRed', F + 'wineWhite', F + 'bottleOil', F + 'bottleKetchup', F + 'bottleMusterd', 'eggs', F + 'shakerSalt', F + 'pepperMill'],
  ];
  let k = 0;
  const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  [-13, -7, -1, 5, 11].forEach((ax, ai) => {
    for (let z = -2; z < 12; z += 2) {
      b.obj('shelf', ax - 0.32, z + 1, -PI / 2); b.obj('shelf', ax + 0.32, z + 1, PI / 2);
      for (const side of [-1, 1]) {
        for (const [lvl, y] of [[0, 0.13], [1, 0.73], [2, 1.33]]) {
          for (let i = 0; i < 4; i++) {
            const m = themes[ai][Math.floor(rnd(k++) * themes[ai].length)];
            if ((m === 'waterPack' || m === 'rice') && lvl === 2) continue;
            b.obj(m, ax + side * (0.3 + rnd(k) * 0.08), z + 0.3 + i * 0.47 + (rnd(k + 7) - 0.5) * 0.1, side > 0 ? PI / 2 + (rnd(k + 3) - 0.5) * 0.3 : -PI / 2 + (rnd(k + 3) - 0.5) * 0.3, y);
          }
        }
      }
    }
    b.obj('shelfEnd', ax, 12.3, 0); b.obj('shelfEnd', ax, -2.3, PI);
    b.obj(themes[ai][0], ax - 0.2, 12.4, 0, 0.13); b.obj(themes[ai][1], ax + 0.25, 12.4, 0.3, 0.13); b.obj(themes[ai][2], ax, 12.4, 0, 0.71);
  });
  // vitrines réfrigérées (mur gauche), congélateurs
  for (let z = -3.5; z <= 12; z += 1.45) {
    b.obj('fridgeDisplay', -19.45, z, PI / 2);
    [0.17, 0.62, 1.07, 1.52].forEach((y, lvl) => { for (const dz of [-0.4, 0, 0.4]) b.obj(['milk', F + 'carton', F + 'cheese', F + 'cartonSmall', 'juice', F + 'wholeHam', F + 'pudding', F + 'sodaCan'][(((lvl * 3 + Math.round(z * 2) + Math.round(dz * 5)) % 8) + 8) % 8], -19.5, z + dz, PI / 2, y); });
  }
  for (const z of [0, 4, 8]) { b.obj('freezer', 16.5, z, PI / 2); for (let i = 0; i < 3; i++) b.obj([F + 'pizzaBox', F + 'iceCreamCup', F + 'popsicle'][(i + z) % 3], 16.5, z - 0.5 + i * 0.5, i, 0.86); }
  b.obj('vending', 19.4, 18.5, -PI / 2); b.obj('arcade', 19.4, 16.8, -PI / 2);
  // fruits et légumes
  const produce = [['watermelon', F + 'pumpkinBasic'], [F + 'apple', F + 'pear'], [F + 'orange', F + 'lemon'], [F + 'tomato', F + 'paprika'], [F + 'cabbage', F + 'broccoli'], [F + 'carrot', F + 'leek'], [F + 'onion', F + 'eggplant'], [F + 'banana', F + 'pineapple'], [F + 'avocado', F + 'coconut'], [F + 'corn', F + 'cauliflower']];
  produce.forEach(([a, c], i) => {
    const x = -17.4 + (i % 5) * 1.0; const z = 14.4 + Math.floor(i / 5) * 2.4;
    b.obj('crate', x, z, 0, 0, 1);
    for (let j = 0; j < 5; j++) b.obj(j % 2 ? c : a, x - 0.22 + (j % 3) * 0.22, z - 0.18 + Math.floor(j / 3) * 0.32, j * 0.7, 0.8);
  });
  // boulangerie
  for (const [x, z] of [[9.5, 14.5], [12, 14.5]]) b.obj(K + 'sideTable', x, z, PI);
  [[F + 'loafBaguette', 0.5], [F + 'loafRound', 0], [F + 'croissant', 0.3], [F + 'loaf', 0], [F + 'cakeBirthday', 0], [F + 'donutSprinkles', 0], [F + 'donutChocolate', 1], [F + 'muffin', 0], [F + 'cupcake', 0], [F + 'pie', 0]].forEach(([m, r], i) => {
    b.obj(m, 9.0 + (i % 5) * 0.75, 14.35 + Math.floor(i / 5) * 0.25, r, 0.86);
  });
  // caisses
  for (const x of [-9, -3, 3]) { b.obj('register', x, 16.2, 0); b.obj('officeChair', x + 0.5, 17.1, PI); b.obj('basket', x - 1.3, 17.3, 0.2); }
  b.obj('shelfEnd', 8.5, 16.4, 0); b.obj('chips', 8.3, 16.5, 0, 0.13); b.obj('soda', 8.7, 16.4, 0, 0.71); b.obj('chips', 8.6, 16.5, 0.4, 0.13);
  for (const [x, z, r] of [[13, 20, PI / 2], [13.7, 20.1, PI / 2], [14.4, 20.2, PI / 2], [-12, 19, 0.4], [16, 13.5, 1.0]]) b.obj('cart', x, z, r);
  b.obj('plantTall', 4, 21.2); b.obj('plantTall', -4, 21.2); b.obj('bin', 5, 21.3); b.obj('wetFloor', -6, 19.4, 0.3);
  b.obj('basket', -4.5, 20.5); b.obj('basket', -4.5, 20.5, 0.1, 0.24);
  // ─── salle du personnel (x -20 → -8, z -14 → -6)
  b.wx(-20, -8, -14, 0, H, WALL, { t: 0.18, gaps: [[-11, -9.8, 0, 2.3]] });
  b.wz(-14, -6, -8, 0, H, WALL, { t: 0.18, gaps: [[-12.5, -11.3, 0, 2.3]] });
  b.slab(-19.85, -13.9, -8.1, -6.15, 0.035, 0.01, 'tileS:d8d2c4', { ghost: true });
  for (let i = 0; i < 8; i++) b.obj(i % 3 === 1 ? 'lockerClosed' : 'locker', -19.6, -13.3 + i * 0.52, PI / 2);
  b.obj('benchPlain', -18.6, -11.4, PI / 2);
  b.obj(K + 'table', -14, -10, 0); b.obj(K + 'chair', -14.5, -10.85, 0); b.obj(K + 'chair', -13.5, -10.85, 0); b.obj(K + 'chair', -14.5, -9.15, PI); b.obj(K + 'chair', -13.5, -9.15, PI);
  b.obj(F + 'mug', -14.2, -10, 0, 0.73); b.obj(F + 'pizzaBox', -13.6, -10.05, 0.2, 0.73); b.obj(F + 'sodaCan', -14.6, -9.8, 0, 0.73);
  b.obj(K + 'kitchenCabinet', -12.6, -6.65, PI); b.obj('cabinetOpen', -11.4, -6.45, PI); b.obj(K + 'kitchenCoffeeMachine', -12.6, -6.7, PI, 1.01); b.obj(K + 'kitchenMicrowave', -11.4, -6.6, PI, 0.92);
  b.obj(K + 'kitchenFridge', -10.1, -6.5, PI); b.obj(K + 'loungeSofa', -16.2, -6.75, PI, 0, 1, { tint: 0x5f6b7a }); b.obj(K + 'cabinetTelevision', -13.4, -13.6, 0); b.obj(K + 'televisionModern', -13.4, -13.65, 0, 0.7); b.obj(K + 'tableCoffee', -16.2, -8.4, 0); b.obj('vending', -8.6, -12.9, -PI / 2); b.obj('wardrobe', -16.2, -13.5, 0); b.obj('plant', -8.6, -7.0);
  b.obj('trashBag', -10.0, -13.5); b.obj('box', -17.6, -6.5, 0.2);
  // toilettes (x -20 → -12, z -24 → -14)
  b.wz(-24, -14, -12, 0, H, 'tileS:dbeaea', { t: 0.18, gaps: [[-16, -15, 0, 2.3]] });
  b.slab(-19.85, -23.85, -12.1, -14.1, 0.035, 0.01, 'tileS', { ghost: true });
  for (const z of [-22.8, -21.0, -19.2]) { b.obj('stall', -18.6, z, PI / 2); b.obj('toilet', -19.6, z, PI / 2); }
  b.obj('sink', -12.4, -21.5, -PI / 2); b.obj('sink', -12.4, -20.3, -PI / 2); b.obj('mirror', -12.15, -20.9, -PI / 2); b.obj('bin', -13, -23.4); b.obj('toiletPaper', -16.6, -23.5);
  // bureau du gérant (x -12 → -6, z -24 → -14)
  b.wz(-24, -14, -6, 0, H, WALL, { t: 0.18, gaps: [[-16, -14.9, 0, 2.3], [-21, -18.5, 1.0, 2.2]] });
  b.wx(-12, -6, -14, 0, H, WALL, { t: 0.18 });
  b.slab(-11.9, -23.9, -6.1, -14.1, 0.035, 0.01, 'carpet:5c6b7d', { ghost: true });
  b.obj(K + 'desk', -9, -21.4, PI); b.obj(K + 'chairDesk', -9, -22.4, 0); b.obj(K + 'computerScreen', -9, -21.15, PI, 0.86); b.obj(K + 'computerKeyboard', -9, -21.6, PI, 0.86); b.obj(K + 'computerMouse', -8.5, -21.6, PI, 0.86); b.obj('phone', -9.6, -21.3, 0.3, 0.86);
  b.obj(K + 'bookcaseClosedDoors', -6.4, -18, -PI / 2); b.obj(K + 'loungeChair', -7.3, -15.2, PI);
  b.obj('filing', -11.6, -18, PI / 2); b.obj('filing', -11.6, -17.4, PI / 2); b.obj('wardrobeWhite', -7.1, -23.5, 0); b.obj('plantTall', -11.4, -23.4); b.obj('printer', -11.5, -15.2, PI / 2);
  b.obj('boxSmall', -6.8, -14.8, 0.3); b.obj('books', -9.4, -21.3, 0.3, 0.75);
  // ─── entrepôt (x -6 → 20)
  for (const z of [-21.5, -16.5]) for (const x of [-3, 2]) {
    b.obj('palletRack', x, z, 0);
    for (const y of [0.0, 1.58, 3.08]) for (const dx of [-0.8, 0.8]) {
      if (y === 0) { b.obj('pallet', x + dx, z); b.obj('box', x + dx, z, 0.1, 0.16); } else { b.obj('box', x + dx - 0.2, z + 0.1, 0.2, y); b.obj('boxSmall', x + dx + 0.35, z - 0.1, 0.5, y); }
    }
  }
  b.obj('forklift', 7.5, -12.5, PI / 2);
  for (const [x, z] of [[18.6, -9], [18.6, -9.8], [17.9, -9.4], [18.6, -14], [17.8, -14.2]]) b.obj('barrel', x, z);
  for (const [x, z, r] of [[-4.5, -9, 0.3], [-3.6, -8.2, 1], [5.5, -8.3, 2], [14, -8.0, 0], [3, -10, 0.6], [6.4, -7.6, 1.2]]) b.obj('box', x, z, r);
  b.obj('pallet', 9.5, -17); b.obj('crate', 9.3, -17.1, 0, 0.16); b.obj('crate', 9.4, -17.0, 0.3, 0.96); b.obj('pallet', 9.5, -20.5); b.obj('rice', 9.5, -20.5, 0, 0.16); b.obj('rice', 9.6, -20.4, 0.3, 0.4);
  b.obj('oilDrum', -5.2, -23.2); b.obj('tire', 13, -23.2); b.obj('cone', 10, -22.5); b.obj('cone', 11.2, -22.6); b.obj('trashBag', -5, -12); b.obj('toolbox', 14.5, -12.5, 0.2);
  // chambre froide (x 14 → 20, z -24 → -17)
  b.wx(14, 20, -17, 0, 3.4, 'steel:c9d1d6', { t: 0.2, gaps: [[15, 16.4, 0, 2.3]] }); b.wz(-24, -17, 14, 0, 3.4, 'steel:c9d1d6', { t: 0.2 });
  b.slab(13.9, -24.1, 20.1, -16.9, 3.6, 0.2, 'steel:c9d1d6');
  b.clip(13.9, -24.1, 20.1, -16.9, 3.6, H);
  b.obj('crate', 18.8, -22.8); b.obj('crate', 18.8, -21.8); b.obj('box', 16, -23.3, 0.2); b.obj('watermelon', 18.8, -22.8, 0, 0.8); b.obj('milk', 15.2, -23.4); b.obj('pallet', 17.4, -19.5);
  // parking
  for (let x = -16; x <= 16; x += 4) b.slab(x - 0.06, 25, x + 0.06, 30, 0.015, 0.005, 'paint:f1f1f1', { ghost: true });
  b.obj('carRed', -10, 27.8, 0); b.obj('carWhite', 6, 27.6, PI); b.obj('van', 14, 28.2, 0);
  b.obj('cart', 6.5, 25.0, 0.4); b.obj('cart', -3.5, 29, 2.1); b.obj('cone', 3, 24.6); b.obj('trashcan', -6, 23.2); b.obj('trashcan', 6, 23.2);
  b.obj('streetlamp', -19, 31, 0); b.obj('streetlamp', 19, 31, 0); b.obj('bush', -21.5, 25); b.obj('bush', 21.5, 25); b.obj('wheelieBin', -21.6, 22.8, PI / 2); b.obj('wheelieBin', -21.6, 23.6, PI / 2);
  b.bounds(-23, 23, -25, 33);
  return {
    id: 'store', name: 'Supérette', env: 'indoor', sun: [12, 40, 30],
    sky: 0x2d3440, fog: [0x2d3440, 45, 110], area: [-23, 23, -25, 33],
    solids: b.solids, deco: b.deco, objects: b.objects, lights: b.lights,
    spawns: {
      hunters: [[0, 0.2, 27], [-2, 0.2, 27], [2, 0.2, 27], [-4, 0.2, 27], [4, 0.2, 27]],
      props: [[0, 0.2, 2], [-10, 0.2, 5], [8, 0.2, 5], [-12, 0.2, -12], [4, 0.2, -14], [0, 0.2, 14]],
    },
  };
}

// ───────────────────────── Open-space ─────────────────────────
function office() {
  const b = builder();
  const H = 3.2; const WALL = 'plaster:eeece6'; const G = 'glass';
  b.ground(-18, -18, 18, 22, 'concrete:8a8f96');
  b.slab(-16, -16, 16, 16, 0.02, 0.02, 'carpet:5c6b7d', { ghost: true });
  b.wx(-16, 16, -16, 0, H, WALL, { t: 0.25, gaps: [[-12, -8, 0.9, 2.4], [8, 12, 0.9, 2.4]] });
  b.wx(-16, 16, 16, 0, H, WALL, { t: 0.25, gaps: [[-2, 2, 0, 2.4]] });
  b.wz(-16, 16, -16, 0, H, WALL, { t: 0.25, gaps: [[-4, 0, 0.9, 2.4]] });
  b.wz(-16, 16, 16, 0, H, WALL, { t: 0.25, gaps: [[6, 10, 0.9, 2.4]] });
  b.slab(-16.2, -16.2, 16.2, 16.2, H + 0.3, 0.3, 'ceiling', { ns: true });
  b.clip(-17, -17, 17, 17, H);
  for (let x = -12; x <= 12; x += 4) for (let z = -12; z <= 12; z += 4) b.box(x, H - 0.02, z, 1.2, 0.03, 1.2, 'light', { ghost: true });
  // salle de réunion (nord-ouest), cloisons vitrées
  b.wx(-16, -6, -6, 0, H, G, { t: 0.06, gaps: [[-9, -7.6, 0, 2.3]] }); b.wz(-16, -6, -6, 0, H, G, { t: 0.06 });
  for (let x = -16; x <= -6; x += 2) b.box(x, H / 2, -6, 0.06, H, 0.1, 'steel'); for (let z = -16; z <= -6; z += 2) b.box(-6, H / 2, z, 0.1, H, 0.06, 'steel');
  b.slab(-15.9, -15.9, -6.05, -6.05, 0.03, 0.01, 'plank:b48a5e', { ghost: true });
  b.obj(K + 'tableGlass', -11, -11, 0, 0, 1.3);
  for (const x of [-12.2, -11, -9.8]) { b.obj(K + 'chairModernCushion', x, -12.15, 0); b.obj(K + 'chairModernCushion', x, -9.85, PI); }
  b.obj('whiteboard', -11, -15.6, 0); b.obj('plantTall', -15.2, -6.8); b.obj('mug', -11.4, -11, 0, 1.06); b.obj('laptop', -10.4, -10.9, 0.4, 1.06); b.obj('phone', -11.9, -11, 0, 1.06);
  b.obj('wardrobeWhite', -15.4, -9, PI / 2);
  // cafétéria (nord-est)
  b.wx(6, 16, -6, 0, H, WALL, { t: 0.15, gaps: [[7, 8.6, 0, 2.3]] }); b.wz(-16, -6, 6, 0, H, WALL, { t: 0.15 });
  b.slab(6.08, -15.9, 15.9, -6.08, 0.03, 0.01, 'tile', { ghost: true });
  b.obj(K + 'kitchenFridgeLarge', 15.4, -15.2, -PI / 2); b.obj(K + 'kitchenCabinet', 15.4, -13.7, -PI / 2); b.obj('cabinetOpen', 15.55, -12.6, -PI / 2); b.obj(K + 'kitchenSink', 15.4, -11.5, -PI / 2);
  b.obj(K + 'kitchenCoffeeMachine', 15.5, -13.7, -PI / 2, 1.01); b.obj(K + 'kitchenMicrowave', 15.55, -12.5, -PI / 2, 0.92); b.obj('kettle', 15.5, -11.1, 0, 1.01);
  for (const [x, z] of [[9, -9.5], [12, -9.5]]) { b.obj(K + 'tableRound', x, z, 0, 0, 0.8); for (const a of [0, 2.1, 4.2]) b.obj(K + 'chairRounded', x + Math.sin(a) * 0.9, z + Math.cos(a) * 0.9, a + PI); }
  b.obj(F + 'donutSprinkles', 9.1, -9.5, 0, 0.66); b.obj(F + 'cupTea', 12.1, -9.4, 0, 0.66); b.obj(F + 'croissant', 11.8, -9.6, 0.5, 0.66);
  b.obj('waterCooler', 6.6, -15.4); b.obj(K + 'loungeSofa', 10, -15.3, 0, 0, 1, { tint: 0xb35c3c }); b.obj('plant', 6.6, -6.7); b.obj('bin', 15.3, -6.7); b.obj('vending', 13, -6.6, PI);
 b.obj('wallCabinet', 15.66, -13.6, -PI / 2, 1.5); b.obj('wallCabinet', 15.66, -12.6, -PI / 2, 1.5);
  // toilettes (sud-est)
  b.wx(8, 16, 7, 0, H, 'tileS:cfe3e0', { t: 0.15, gaps: [[8.6, 9.8, 0, 2.3]] }); b.wz(7, 16, 8, 0, H, 'tileS:cfe3e0', { t: 0.15 });
  b.slab(8.08, 7.08, 15.9, 15.9, 0.03, 0.01, 'tileS', { ghost: true });
  for (const z of [9.5, 11.5, 13.5]) { b.obj('stall', 14.8, z, PI / 2); b.obj('toilet', 15.45, z, -PI / 2); }
  b.obj('sink', 8.55, 13, PI / 2); b.obj('sink', 8.55, 14.5, PI / 2); b.obj('mirror', 8.3, 13.75, PI / 2); b.obj('bin', 9, 15.4); b.obj('toiletPaper', 13.4, 15.5);
  // salle serveur (ouest) : baies où l'on peut se glisser
  b.wx(-16, -10, -1, 0, H, WALL, { t: 0.15 }); b.wx(-16, -10, 6, 0, H, WALL, { t: 0.15 }); b.wz(-1, 6, -10, 0, H, G, { t: 0.06, gaps: [[3.6, 4.8, 0, 2.3]] });
  b.slab(-15.9, -0.95, -10.05, 5.95, 0.03, 0.01, 'concrete:9aa0a6', { ghost: true });
  for (const z of [0.2, 1.0, 1.8, 2.6]) b.obj('serverRack', -15.4, z, PI / 2);
  b.obj('serverRack', -12.4, 0.0, 0); b.obj('serverRack', -11.6, 0.0, 0); b.obj('boxSmall', -11, 5.4, 0.4); b.obj('fan', -14.8, 5.2, 0.5); b.obj('toolbox', -13, 5.5, 0);
  // réserve (sud-ouest) : armoires
  b.wx(-16, -9, 9, 0, H, WALL, { t: 0.15, gaps: [[-10.6, -9.4, 0, 2.3]] });
  b.wz(9, 16, -9, 0, H, WALL, { t: 0.15 });
  b.obj('wardrobe', -15.35, 11, PI / 2); b.obj('wardrobe', -15.35, 12.4, PI / 2); b.obj('wardrobeWhite', -12.3, 15.4, PI); b.obj('printer', -15.2, 14.6, PI / 2);
  b.obj('box', -10.2, 15.2, 0.2); b.obj('boxSmall', -10.6, 14.6, 0.6); b.obj('box', -10.2, 15.2, 0.6, 0.5); b.obj('paintCan', -13.2, 10, 0); b.obj('wetFloor', -11.6, 10.6, 0.4);
  // coin photocopie
  b.obj('printer', -8.4, 15.3, PI); b.obj('filing', -6.8, 15.5, PI); b.obj('filing', -6.2, 15.5, PI); b.obj('waterCooler', -5.2, 15.6);
  // îlots de bureaux
  for (const [cx, cz] of [[-4, 1.5], [2, 1.5], [8, 1.5], [-4, 8.5], [2, 8.5], [3, -10]]) {
    for (const [dx, dz, ry] of [[-0.85, -0.47, PI], [0.85, -0.47, PI], [-0.85, 0.47, 0], [0.85, 0.47, 0]]) {
      // bureau Kenney : face avant (+z) tournée vers la personne assise, côté extérieur de l'îlot
      b.obj(K + 'desk', cx + dx, cz + dz, ry);
      b.obj(K + 'computerScreen', cx + dx, cz + dz * 0.45, ry, 0.86);
      b.obj(K + 'computerKeyboard', cx + dx, cz + dz * 1.4, ry, 0.86);
      b.obj(K + 'computerMouse', cx + dx + 0.42, cz + dz * 1.4, ry, 0.86);
      b.obj(K + 'chairDesk', cx + dx, cz + dz * 2.55, ry + PI);
      const r = Math.abs(Math.sin(cx * 3.1 + dx * 7.7 + dz * 1.3));
      if (r > 0.6) b.obj(F + 'mug', cx + dx - 0.55, cz + dz * 1.1, 0.4, 0.86);
      else if (r > 0.3) b.obj(K + 'books', cx + dx - 0.55, cz + dz * 1.0, 0.6, 0.86);
      else b.obj(K + 'plantSmall1', cx + dx - 0.6, cz + dz * 1.0, 0.3, 0.86);
    }
    b.obj(K + 'pottedPlant', cx + 2.2, cz, 0);
  }
  b.obj('bookshelf', -4, -15.7); b.obj('bookshelf', -3, -15.7); b.obj('clock', 0, -15.85, 0, 2.2); b.obj('bin', 2, -15.4);
  b.obj(K + 'loungeDesignSofa', 15.3, 2.6, -PI / 2, 0, 1, { tint: 0x2f6f73 }); b.obj(K + 'loungeDesignChair', 12.6, 0.6, 0, 0, 1, { tint: 0x2f6f73 }); b.obj(K + 'tableCoffeeGlass', 13.2, 2.6, PI / 2); b.obj(K + 'lampSquareFloor', 15.4, 5.0); b.obj(K + 'pottedPlant', 15.3, -0.6);
  b.obj(K + 'rugRectangle', 13.6, 2.6, PI / 2); b.obj(K + 'speaker', 15.5, 0.6); b.obj(K + 'radio', 13.2, 2.4, 0.2, 0.52);
  b.obj('pingpong', 12.4, -2.6, PI / 2);
  // accueil
  b.box(0, 0.55, 12.8, 4, 1.1, 0.6, 'woodL:d9cfb8'); b.box(0, 1.12, 12.8, 4.2, 0.05, 0.7, 'plastic:2b2d33');
  b.obj('officeChair', 0, 12.0, 0); b.obj('monitor', 0.6, 12.75, PI, 1.15); b.obj('plantTall', -2.8, 13.0); b.obj('plantTall', 2.8, 13.0);
  b.bounds(-16, 16, -16, 21);
  b.slab(-18, 16, 18, 21, 0.03, 0.03, 'tile:9a9a96', { ghost: true });
  return {
    id: 'office', name: 'Open-space', env: 'indoor', sun: [20, 40, -15],
    sky: 0x1f2329, fog: [0x1f2329, 40, 90], area: [-16, 16, -16, 21],
    solids: b.solids, deco: b.deco, objects: b.objects, lights: b.lights,
    spawns: {
      hunters: [[0, 0.2, 18.5], [-1.5, 0.2, 19], [1.5, 0.2, 19], [-2.5, 0.2, 18], [2.5, 0.2, 18]],
      props: [[0, 0.2, -2], [-11, 0.2, -8], [11, 0.2, -12], [-12, 0.2, 12], [12, 0.2, 3], [0, 0.2, -6]],
    },
  };
}

// ───────────────────────── Cuisine géante ─────────────────────────
/** Tout est ×6 : tu es minuscule. */
function kitchen() {
  const b = builder();
  const S = 6;
  b.ground(-24, -24, 24, 24, 'tile:eee7d8');
  const W = 'plaster:f0d9a8'; const H = 18;
  b.wx(-22, 22, -22, 0, H, W, { t: 0.4, gaps: [[-6, 6, 7, 14]] }); b.wx(-22, 22, 22, 0, H, W, { t: 0.4 });
  b.wz(-22, 22, -22, 0, H, 'plaster:e9c98f', { t: 0.4 }); b.wz(-22, 22, 22, 0, H, 'plaster:e9c98f', { t: 0.4 });
  b.slab(-22.2, -22.2, 22.2, 22.2, H + 0.4, 0.4, 'ceiling:f6f1e4', { ns: true });
  b.clip(-23, -23, 23, 23, H);
  b.box(0, 0.4, -21.75, 44, 0.8, 0.1, 'paint:ffffff', { ghost: true });
  b.box(0, H - 0.05, 0, 3, 0.1, 3, 'light', { ghost: true }); b.box(-12, H - 0.05, 8, 2, 0.1, 2, 'light', { ghost: true }); b.box(12, H - 0.05, 8, 2, 0.1, 2, 'light', { ghost: true });
  // grande table et chaises
  b.obj('table', 0, 0, 0, 0, S);
  b.obj('chair', -2.2, -3.6, 0, 0, S); b.obj('chair', 2.2, -3.6, 0, 0, S); b.obj('chair', 2.2, 3.6, PI, 0, S); b.obj('chair', -2.2, 3.6, PI, 0, S);
  const T = 0.765 * S;
  b.obj('mug', -3, -1, 0.5, T, S); b.obj('plates', 2.5, 0.8, 0, T, S); b.obj('fruitbowl', 0, 0, 0, T, S); b.obj('bottle', 3.5, -1.5, 0, T, S);
  b.obj('cereal', -1.5, 1.5, 0.3, T, S); b.obj('book', 1.5, -1.6, 0.6, T, S); b.obj('kettle', -4, 1, 0, T, S); b.obj('toaster', 4, 1.5, 0.2, T, S);
  b.obj('apple', -2.4, 0.6, 0, T, S); b.obj('jar', 0.9, 1.9, 0, T, S); b.obj('milk', -0.8, -1.8, 0.2, T, S);
  b.obj(F + 'cakeBirthday', -4.2, -1.6, 0, T, S * 0.8); b.obj(F + 'burgerCheeseDouble', 2.0, -0.6, 0.4, T, S); b.obj(F + 'fries', 2.6, -0.2, 0, T, S); b.obj(F + 'donutSprinkles', -2.2, -1.3, 0, T, S);
  b.obj(F + 'cupSaucer', -3.3, 1.2, 0, T, S); b.obj(F + 'sodaBottle', 4.3, -0.6, 0, T, S); b.obj(F + 'pizza', 0.6, -1.1, 0.3, T, S * 0.7); b.obj(F + 'croissant', -0.6, 1.0, 1, T, S);
  // sous la table et par terre : miettes géantes
  b.obj(F + 'cookieChocolate', -1, 3, 0.4, 0, S); b.obj(F + 'sodaCanCrushed', 7, -3, 0.3, 0, S); b.obj(F + 'banana', -8, 6, 0.7, 0, S); b.obj(F + 'candyBarWrapper', 3.5, 5.5, 1.1, 0, S);
  b.obj(F + 'egg', -7.6, -4, 0, 0, S); b.obj(F + 'lemon', 11, 4, 0, 0, S); b.obj(F + 'orange', 11.8, 4.6, 0, 0, S); b.obj(F + 'peanutButter', 14, -7, 0, 0, S); b.obj(F + 'honey', -13, -14, 0, 0, S);
  b.obj(K + 'speakerSmall', -19, 14, 0.5, 0, S * 0.7); b.obj(K + 'radio', 19, -8, -PI / 2, 0, S * 0.6); b.obj(K + 'books', 8, 15, 0.3, 0, S); b.obj(K + 'trashcan', 19.5, -15, 0, 0, S * 0.6);
  // escalier de livres jusqu'à la table
  const colors = [0x7b3fa0, 0xc0392b, 0x2e86c1, 0x27ae60, 0xd68910, 0x884ea0, 0x1f618d, 0xb03a2e, 0x117a65, 0xca6f1e, 0x6c3483, 0x2874a6, 0x1e8449, 0xb9770e, 0x5b2c6f];
  for (let i = 0; i < 15; i++) b.box(-11.2 + i * 0.45, (0.3 * (i + 1)) / 2, -2.2, 0.45, 0.3 * (i + 1), 2.4, colors[i]);
  b.box(-4.25, 2.25, -2.2, 0.9, 4.5, 2.4, 0x7b3fa0);
  // plan de travail (mur nord), placards ouverts
  b.obj('cabinetOpen', -18, -19.8, 0, 0, S); b.obj('cabinet', -12, -19.8, 0, 0, S); b.obj('sinkCounter', -5.4, -19.8, 0, 0, S); b.obj('cabinetOpen', 1.8, -19.8, 0, 0, S);
  b.obj('fridge', 14.5, -19.4, 0, 0, S); b.obj('stove', 8.4, -19.6, 0, 0, S);
  b.obj('microwave', -12, -19.6, 0, 0.92 * S, S); b.obj('coffeeMachine', 1.8, -19.6, 0, 0.92 * S, S); b.obj('toaster', -17, -19.7, 0.1, 0.92 * S, S);
  b.obj('plates', -19, -19.6, 0, 0.92 * S, S);
  // au sol
  b.obj('bin', 18, 0, 0, 0, S); b.obj('ball', -14, 10, 0, 0, S); b.obj('box', 12, 14, 0.4, 0, S); b.obj('boxSmall', 15, 9, 0.9, 0, S);
  b.obj('washer', -18.4, 8, PI / 2, 0, S); b.obj('book', -10, 16, 0.4, 0, S); b.obj('book', -10, 16, 0.9, 0.3, S); b.obj('laundryBasket', -17, 17, 0, 0, S * 0.8);
  b.obj('mug', 8, 8, 0, 0, S); b.obj('bottle', 9, 7, 0, 0, S); b.obj('can', -6, 12, 0, 0, S); b.obj('can', -5.4, 12.6, 0, 0, S); b.obj('soda', -4.8, 11.6, 0, 0, S);
  b.obj('plant', 18.5, 18.5, 0, 0, S); b.obj('gnome', 4, 16, 0.5, 0, S); b.obj('watermelon', -16, -10, 0, 0, S); b.obj('teddy', 6, 18, -0.4, 0, S);
  b.obj('skateboard', -6, 4.5, 1.2, 0, S * 0.8); b.obj('pillow', 10, 18.4, 0.3, 0, S * 0.8); b.obj('apple', 6.5, -6, 0, 0, S); b.obj('toolbox', 16, 16, 0.5, 0, S * 0.8);
  b.bounds(-22, 22, -22, 22, 22);
  return {
    id: 'kitchen', name: 'Cuisine géante', env: 'indoor', sun: [-14, 40, 24],
    sky: 0xf6f1e4, fog: [0xf6efe0, 60, 140], area: [-22, 22, -22, 22],
    solids: b.solids, deco: b.deco, objects: b.objects, lights: b.lights,
    spawns: {
      hunters: [[0, 0.2, 18], [-2, 0.2, 18], [2, 0.2, 18], [-4, 0.2, 18], [4, 0.2, 18]],
      props: [[0, 0.2, -10], [-12, 0.2, -6], [12, 0.2, -6], [-14, 0.2, 4], [14, 0.2, 4], [0, 0.2, 8]],
    },
  };
}

const BUILDERS = { suburb, store, office, kitchen, manor, school };
export { MAP_LIST };

const cache = new Map();
/** Map construite (mise en cache). */
/** Ce client connaît-il cette map ? (sinon : ancienne version → rechargement) */
export const hasMap = (id) => !!BUILDERS[id];

export function getMap(id) {
  if (!BUILDERS[id]) id = 'suburb';
  if (!cache.has(id)) cache.set(id, BUILDERS[id]());
  return cache.get(id);
}
