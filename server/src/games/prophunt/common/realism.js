/**
 * Remplacement des objets « cartoon » des maps par des modèles photoréalistes (Poly Haven).
 * Appliqué au moment de construire la map (côté serveur ET client : mêmes collisions).
 * L'objet garde sa place et son orientation ; sa taille est ajustée pour occuper à peu près
 * la même emprise au sol que l'original (dans une limite raisonnable, pour rester crédible).
 */
import { modelBounds, MODELS } from './models.js';

/** original → modèle Poly Haven (par défaut), éventuellement redéfini par map. */
const SUBST = {
  'furniture/chair': ['dining_chair_02', 'painted_wooden_chair_01', 'gallinera_chair', 'painted_wooden_chair_02'], 'furniture/chairCushion': ['dining_chair_02', 'gallinera_chair'], 'furniture/chairRounded': ['painted_wooden_chair_02', 'plastic_monobloc_chair_01'],
  'furniture/desk': 'metal_office_desk', 'furniture/sideTable': ['side_table_01', 'side_table_tall_01', 'round_wooden_table_02'], 'furniture/pottedPlant': ['potted_plant_02', 'potted_plant_01', 'planter_pot_clay'],
  'furniture/books': ['book_encyclopedia_set_01', 'standing_picture_frame_01', 'alarm_clock_01', 'ceramic_vase_01'], 'furniture/table': ['wooden_table_02', 'WoodenTable_03', 'small_wooden_table_01'], 'furniture/bookcaseOpen': 'wooden_bookshelf_worn',
  'furniture/bookcaseClosedDoors': 'vintage_cabinet_01', 'furniture/bookcaseClosed': 'drawer_cabinet', 'furniture/bookcaseOpenLow': 'painted_wooden_shelves',
  'furniture/stoolBarSquare': ['bar_chair_round_01', 'metal_stool_01', 'wooden_stool_01'], 'furniture/stoolBar': ['bar_chair_round_01', 'wooden_stool_02'], 'furniture/cardboardBoxClosed': 'cardboard_box_01',
  'furniture/loungeChair': ['ArmChair_01', 'GreenChair_01', 'Rockingchair_01'], 'furniture/loungeChairRelax': 'mid_century_lounge_chair', 'furniture/loungeSofa': 'sofa_02', 'furniture/loungeSofaLong': 'sofa_03',
  'furniture/loungeDesignSofa': 'Sofa_01', 'furniture/loungeSofaOttoman': 'Ottoman_01', 'furniture/loungeDesignChair': 'modern_arm_chair_01',
  'furniture/tableCoffee': ['CoffeeTable_01', 'coffee_table_round_01', 'industrial_coffee_table'], 'furniture/tableCoffeeSquare': 'modern_coffee_table_02', 'furniture/tableCoffeeGlass': 'modern_coffee_table_01', 'furniture/tableRound': 'round_wooden_table_02',
  'furniture/radio': 'boombox', 'furniture/televisionModern': 'television_02', 'furniture/televisionVintage': 'Television_01', 'furniture/cabinetTelevision': 'modern_wooden_cabinet',
  'furniture/lampSquareTable': 'desk_lamp_arm_01', 'furniture/sideTableDrawers': 'ClassicNightstand_01', 'furniture/cabinetBedDrawer': 'ClassicNightstand_01', 'furniture/cabinetBed': 'painted_wooden_nightstand',
  'furniture/plantSmall1': 'potted_plant_04', 'furniture/plantSmall2': ['potted_plant_04', 'planter_pot_clay'], 'furniture/plantSmall3': ['potted_plant_04', 'brass_vase_01'], 'furniture/bench': 'painted_wooden_bench',
  'furniture/kitchenMicrowave': 'vintage_microwave', 'furniture/kitchenStove': 'electric_stove', 'furniture/speaker': 'boombox', 'furniture/laptop': 'classic_laptop',
  'food/apple': 'food_apple_01', 'food/banana': 'bananas', 'food/lemon': 'lemon', 'food/croissant': 'croissant', 'food/cakeBirthday': 'carrot_cake',
  'nature/plant_bushDetailed': 'shrub_04', 'nature/plant_bush': 'shrub_03', 'nature/plant_bushLarge': 'shrub_02', 'nature/stump_round': 'tree_stump_01', 'nature/stump_old': 'tree_stump_01',
  'nature/rock_largeA': 'boulder_01', 'nature/rock_largeB': 'boulder_01', 'nature/log': 'dead_tree_trunk_02',
  'graveyard/lightpostDouble': 'street_lamp_02', 'graveyard/trunk': 'treasure_chest', 'graveyard/trunkLong': 'treasure_chest',
  'cars/delivery': 'covered_car', 'cars/van': 'covered_car', 'cars/police': 'covered_car', 'cars/taxi': 'covered_car', 'cars/truckFlat': 'covered_car', 'cars/tractorShovel': null,
  carRed: 'covered_car', carWhite: 'covered_car', van: 'covered_car', bus: null,
  'cars/sedan': 'covered_car', 'cars/suv': 'covered_car', 'cars/hatchbackSports': 'covered_car', 'cars/sedanSports': 'covered_car', 'cars/suvLuxury': 'covered_car',
  crate: ['wooden_crate_01', 'wooden_crate_02', 'wooden_military_crate', 'old_military_crate'], tire: 'old_tyre', oilDrum: ['Barrel_01', 'Barrel_02', 'barrel_03'], barrel: 'wine_barrel_01', toolbox: ['metal_toolbox', 'metal_tool_chest'], trashBag: 'trashbag', box: ['cardboard_box_01', 'plastic_crate_02', 'plastic_crate_03'],
  boxSmall: ['cardboard_box_01', 'plastic_crate_01', 'wicker_basket_01'], flowerPot: 'planter_pot_clay', gnome: 'garden_gnome', streetlamp: 'street_lamp_01', hydrant: 'fire_hydrant', barrier: 'concrete_road_barrier',
  wetFloor: 'WetFloorSign_01', register: 'CashRegister_01', clock: 'wall_clock', chandelier: 'Chandelier_01', mirror: 'ornate_mirror_01', laundryBasket: 'wicker_basket_01',
  basket: 'wicker_basket_01', bench: 'painted_wooden_bench', benchPlain: 'painted_wooden_bench', picnic: 'wooden_picnic_table', microwave: 'vintage_microwave', stove: 'electric_stove',
  'nature/tree_oak': 'tree/oak', 'nature/tree_default': 'tree/oak', 'nature/tree_detailed': 'tree/ash', 'nature/tree_fat': 'tree/oakBig', 'nature/tree_tall': 'tree/aspen',
  'nature/tree_pineRoundA': 'tree/pine', 'nature/tree_pineRoundC': 'tree/pine', 'nature/tree_pineTallA_detailed': 'tree/pine', 'nature/tree_simple': 'tree/oak', 'nature/tree_small': 'tree/bushA',
  'graveyard/pine': 'tree/pine', 'graveyard/pineCrooked': 'tree/pine', tree: 'tree/oak',
  bush: 'shrub_01', plant: 'potted_plant_01', plantTall: 'potted_plant_01', bucket: ['wooden_bucket_01', 'wooden_bucket_02'], ball: ['football', 'american_football'], basketball: 'football', laptop: 'classic_laptop', guitar: 'Ukulele_01', watering: 'watering_can_metal_01', fireplace: 'scandinavian_masonry_heater',
};
/** Redéfinitions par map. */
const PER_MAP = {
  school: { 'furniture/chair': 'SchoolChair_01', chair: 'SchoolChair_01', 'furniture/desk': 'SchoolDesk_01' },
  manor: { 'furniture/bedDouble': 'GothicBed_01', 'furniture/bookcaseClosedDoors': 'GothicCabinet_01', 'furniture/sideTableDrawers': 'GothicCommode_01', 'furniture/table': 'painted_wooden_table', 'furniture/chair': 'painted_wooden_chair_01' },
  office: { 'furniture/bookcaseClosed': 'steel_frame_shelves_02' },
};
/** Agrandissement maximum de certains modèles (pour ne pas boucher un passage). */
const FIT_MAX = { concrete_road_barrier: 1 };
/** Rotation à ajouter (le « devant » du modèle Poly Haven n'est pas toujours du même côté). */
const ROT = {};

const footprint = (b) => Math.max(b.size[0], b.size[2]);

/** Remplace les objets de la map (en place) ; renvoie la map. */
export function realize(map) {
  if (map.id === 'kitchen') return map; // la cuisine géante garde ses objets démesurés
  const table = { ...SUBST, ...(PER_MAP[map.id] || {}) };
  map.objects = map.objects.filter((o) => table[o.m] !== null); // objets retirés (trop « jouet »)
  // hauteur d'origine de chaque objet (pour garder les piles d'objets posées les unes sur les autres)
  const top = (o) => { const b = modelBounds(o.m); return b ? o.y + b.max[1] * (o.s || 1) : o.y; };
  const before = new Map(map.objects.map((o) => [o, { top: top(o), y: o.y, r: (modelBounds(o.m) ? footprint(modelBounds(o.m)) * (o.s || 1) / 2 : 0.3) }]));
  for (const o of map.objects) {
    let ph = table[o.m];
    if (!ph) continue;
    // plusieurs variantes : choix déterministe selon la position (identique serveur / client)
    if (Array.isArray(ph)) ph = ph[Math.abs(Math.round(o.x * 7.31 + o.z * 3.17 + (o.y || 0) * 11)) % ph.length];
    const id = ph.includes('/') ? ph : `ph/${ph}`;
    if (!MODELS[id]) continue;
    const a = modelBounds(o.m); const b = modelBounds(id);
    if (!a || !b) continue;
    // même emprise au sol, dans une limite crédible
    const tree = id.startsWith('tree/');
    const k = tree ? a.size[1] / b.size[1] : footprint(a) / footprint(b);
    const fit = tree ? Math.max(0.6, Math.min(1.5, k)) : Math.max(0.7, Math.min(1.35, k));
    o.m = id; o.s = Math.round((o.s || 1) * Math.min(fit, FIT_MAX[ph] ?? 9) * 1000) / 1000;
    if (ROT[ph]) o.ry = (o.ry || 0) + ROT[ph];
  }
  // objets empilés : on les repose sur le nouvel objet du dessous
  const sorted = [...map.objects].sort((a, b) => a.y - b.y);
  for (const o of sorted) {
    if (o.y < 0.05) continue;
    const y0 = before.get(o)?.y ?? o.y;
    let support = null;
    for (const u of sorted) {
      if (u === o) break;
      const bu = before.get(u); if (!bu) continue;
      if (Math.abs(bu.top - y0) < 0.12 && Math.hypot(u.x - o.x, u.z - o.z) < bu.r) support = u;
    }
    if (support) o.y = Math.round(top(support) * 1000) / 1000;
  }
  return map;
}
