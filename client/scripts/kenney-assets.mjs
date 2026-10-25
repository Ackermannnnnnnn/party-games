/**
 * Prop Hunt — import des modèles 3D libres de droits (CC0) de Kenney (https://kenney.nl).
 * À lancer à la main quand on change la sélection :
 *
 *   node client/scripts/kenney-assets.mjs <dossier du dépôt ETdoFresh/kenney.nl>
 *
 * Copie les modèles choisis dans client/public/ph-assets/ et écrit
 * client/src/games/prophunt/common/assets.js : pour chaque modèle, son échelle, son recentrage
 * et ses boîtes de collision (une par « morceau » du modèle : pieds de table, plateau, dossier…),
 * partagées avec le serveur.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2];
if (!SRC) { console.error('Usage : node kenney-assets.mjs <dossier kenney.nl>'); process.exit(1); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/ph-assets');
const MANIFEST = path.join(ROOT, 'src/games/prophunt/common/assets.js');

/** Ajustements d'échelle par modèle (certains objets Kenney sont disproportionnés). */
const PER = {
  'food/plate': 0.55, 'food/plateDeep': 0.55, 'food/plateDinner': 0.55, 'food/plateRectangle': 0.6, 'food/plateSauerkraut': 0.55, 'food/pan': 0.75, 'food/panStew': 0.75, 'food/pot': 0.8, 'food/potStew': 0.8,
  'food/carrot': 0.55, 'food/leek': 0.6, 'food/radish': 0.5, 'food/can': 0.65, 'food/canOpen': 0.65, 'food/canSmall': 0.65, 'food/honey': 0.7, 'food/peanutButter': 0.75, 'food/pizza': 0.75, 'food/pizzaBox': 0.75,
  'food/pie': 0.6, 'food/styrofoam': 0.55, 'food/styrofoamDinner': 0.55, 'food/cheese': 0.6, 'food/turkey': 0.8, 'food/cuttingBoard': 0.85, 'food/cuttingBoardRound': 0.8, 'food/tajine': 0.7, 'food/tajineLid': 0.7,
  'food/fryingPan': 0.8, 'food/barrel': 1.4, 'food/cake': 0.85, 'food/cakeBirthday': 0.85, 'food/mug': 0.7, 'food/bowl': 0.6, 'food/bowlCereal': 0.6, 'food/bowlSoup': 0.6, 'food/bowlBroth': 0.6, 'food/salad': 0.7,
  'food/chinese': 0.6, 'food/steamer': 0.7, 'food/knifeBlock': 0.8, 'food/sundae': 0.6, 'food/watermelon': 1.3, 'food/pumpkin': 1.3, 'food/pumpkinBasic': 1.3,
};

/** Kits : dossier source, échelle (unités Kenney → mètres), sélection. */
const KITS = {
  furniture: { dir: 'furniturekit_updated/Models/GLTF format', scale: 2.25, pick: () => true },
  food: { dir: 'foodKit_v1.2/Models/GLTF format', scale: 0.55, pick: (n) => !/^(chopstick|skewer|popsicleStick|plateBroken|utensil|cookingFork|cookingSpoon|cookingSpatula)/.test(n) },
  nature: {
    dir: 'kenney_natureKit_2.1/Models/GLTF format', scale: 3.2,
    pick: (n) => /^(tree_(oak|default|detailed|fat|tall|simple|small|cone|pineRoundA|pineRoundC|pineTallA_detailed|pineDefaultA|palmTall|thin|blocks)(_dark|_fall)?$|plant_|flower_|grass|log|rock_(large|small|tall)[A-E]$|stone_(large|tall)[A-C]$|stump_|mushroom_|fence_(simple|planks|gate|corner|planksDouble)$|tent_|statue_|pot_|campfire_|crop_|canoe$|sign$|bed$|lily_)/.test(n),
  },
  cars: { dir: 'carkit_v1.4/Models/GLTF format', scale: 1.6, pick: (n) => !/^wheel/.test(n) },
  graveyard: { dir: 'kenney_graveyardkit_3/Models/GLTF format', scale: 2.2, pick: (n) => /^(pumpkin|pumpkinCarved|pumpkinTall|pumpkinTallCarved|lanternCandle|lanternGlass|lightpostSingle|lightpostDouble|bench|urn|trunk|trunkLong|shovel|coffin|cross|gravestoneCross|gravestoneRound|gravestoneBevel|ironFence|ironFenceBorderGate|fireBasket|altarWood|detailChalice|rocks|pine|pineCrooked|debrisWood|skeleton)$/.test(n) },
};

// ───── lecture GLB ─────
function readGlb(file) {
  const b = fs.readFileSync(file);
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jl).toString());
  const bin = b.subarray(20 + jl + 8);
  return { json, bin };
}
const NC = { 5126: 1, 5123: 1, 5125: 1, 5121: 1 };
function accessor(g, i) {
  const a = g.json.accessors[i]; const v = g.json.bufferViews[a.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const size = { 5126: 4, 5123: 2, 5125: 4, 5121: 1 }[a.componentType];
  const stride = v.byteStride || comps * size;
  const base = (v.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float64Array(a.count * comps);
  void NC;
  for (let k = 0; k < a.count; k++) {
    for (let c = 0; c < comps; c++) {
      const off = base + k * stride + c * size;
      out[k * comps + c] = a.componentType === 5126 ? g.bin.readFloatLE(off) : a.componentType === 5123 ? g.bin.readUInt16LE(off) : a.componentType === 5125 ? g.bin.readUInt32LE(off) : g.bin.readUInt8(off);
    }
  }
  return out;
}
// matrices 4×4 colonne majeure
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
function trs(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1]; const [sx, sy, sz] = n.scale || [1, 1, 1]; const [tx, ty, tz] = n.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const apply = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

/** Triangles du modèle dans son repère : [{ mat, tris: [[x,y,z]×3]… }] */
function primitives(g) {
  const out = [];
  const scene = g.json.scenes[g.json.scene || 0];
  const walk = (ni, parent) => {
    const n = g.json.nodes[ni]; const m = mul(parent, trs(n));
    if (n.mesh !== undefined) {
      for (const pr of g.json.meshes[n.mesh].primitives) {
        const pos = accessor(g, pr.attributes.POSITION);
        const idx = pr.indices !== undefined ? accessor(g, pr.indices) : Float64Array.from({ length: pos.length / 3 }, (_, i) => i);
        const P = []; for (let i = 0; i < pos.length; i += 3) P.push(apply(m, pos[i], pos[i + 1], pos[i + 2]));
        out.push({ mat: pr.material, P, idx });
      }
    }
    for (const c of n.children || []) walk(c, m);
  };
  for (const r of scene.nodes) walk(r, ident());
  return out;
}

/**
 * Boîtes de collision par voxels : on « peint » les triangles dans une grille, on remplit
 * l'intérieur des volumes fermés (tout ce qu'on n'atteint pas depuis l'extérieur), puis on
 * regroupe les cases pleines en grandes boîtes. Une table donne un plateau + 4 pieds, une
 * étagère ouverte reste creuse.
 */
function voxelBoxes(tris, min, max, maxBoxes = 28) {
  const size = [0, 1, 2].map((k) => max[k] - min[k]);
  for (let res = 18; res >= 4; res -= 2) {
    const vox = Math.max(...size) / res;
    const n = size.map((v) => Math.max(1, Math.ceil(v / vox - 1e-6)));
    const N = n.map((v) => v + 2); // bordure vide pour le remplissage
    const grid = new Uint8Array(N[0] * N[1] * N[2]);
    const at = (x, y, z) => (x * N[1] + y) * N[2] + z;
    const cell = (p, k) => Math.min(n[k] - 1, Math.max(0, Math.floor((p[k] - min[k]) / vox))) + 1;
    for (const [a, b, c] of tris) {
      const l = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
      const steps = Math.max(1, Math.ceil((l / vox) * 2.5));
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps - i; j++) {
          const u = i / steps; const v = j / steps; const w = 1 - u - v;
          const p = [0, 1, 2].map((k) => a[k] * w + b[k] * u + c[k] * v);
          grid[at(cell(p, 0), cell(p, 1), cell(p, 2))] = 1;
        }
      }
    }
    // extérieur atteignable depuis le bord
    const out = new Uint8Array(grid.length); const stack = [at(0, 0, 0)]; out[stack[0]] = 1;
    while (stack.length) {
      const i = stack.pop(); const z = i % N[2]; const y = ((i - z) / N[2]) % N[1]; const x = (i - z - y * N[2]) / (N[1] * N[2]);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const X = x + dx; const Y = y + dy; const Z = z + dz;
        if (X < 0 || Y < 0 || Z < 0 || X >= N[0] || Y >= N[1] || Z >= N[2]) continue;
        const j = at(X, Y, Z); if (out[j] || grid[j]) continue; out[j] = 1; stack.push(j);
      }
    }
    const full = (x, y, z) => x >= 1 && y >= 1 && z >= 1 && x <= n[0] && y <= n[1] && z <= n[2] && !out[at(x, y, z)];
    const used = new Uint8Array(grid.length); const boxes = [];
    for (let x = 1; x <= n[0]; x++) for (let y = 1; y <= n[1]; y++) for (let z = 1; z <= n[2]; z++) {
      if (!full(x, y, z) || used[at(x, y, z)]) continue;
      let x2 = x; while (full(x2 + 1, y, z) && !used[at(x2 + 1, y, z)]) x2++;
      let z2 = z; const rowX = (zz) => { for (let xx = x; xx <= x2; xx++) if (!full(xx, y, zz) || used[at(xx, y, zz)]) return false; return true; };
      while (rowX(z2 + 1)) z2++;
      let y2 = y; const layer = (yy) => { for (let xx = x; xx <= x2; xx++) for (let zz = z; zz <= z2; zz++) if (!full(xx, yy, zz) || used[at(xx, yy, zz)]) return false; return true; };
      while (layer(y2 + 1)) y2++;
      for (let xx = x; xx <= x2; xx++) for (let yy = y; yy <= y2; yy++) for (let zz = z; zz <= z2; zz++) used[at(xx, yy, zz)] = 1;
      boxes.push([min[0] + (x - 1) * vox, min[1] + (y - 1) * vox, min[2] + (z - 1) * vox, Math.min(max[0], min[0] + x2 * vox), Math.min(max[1], min[1] + y2 * vox), Math.min(max[2], min[2] + z2 * vox)]);
    }
    if (boxes.length <= maxBoxes) return boxes;
  }
  return [[...min, ...max]];
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const manifest = {};
let bytes = 0;
for (const [kit, cfg] of Object.entries(KITS)) {
  const dir = path.join(SRC, cfg.dir);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).filter((f) => cfg.pick(f.replace('.glb', '')));
  fs.mkdirSync(path.join(OUT, kit), { recursive: true });
  for (const f of files) {
    const name = f.replace('.glb', '');
    const g = readGlb(path.join(dir, f));
    const prims = primitives(g);
    const all = prims.flatMap((p) => p.P);
    if (!all.length) continue;
    const min = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]))); const max = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k])));
    const s = cfg.scale * (PER[`${kit}/${name}`] || 1);
    const off = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]; // recentrage : posé au sol, centré
    const size = [0, 1, 2].map((k) => (max[k] - min[k]) * s);
    const total = Math.max(...size);
    const tris = prims.flatMap((p) => { const t = []; for (let i = 0; i < p.idx.length; i += 3) t.push([p.P[p.idx[i]], p.P[p.idx[i + 1]], p.P[p.idx[i + 2]]]); return t; });
    void total;
    const boxes = (total < 0.45 ? [[...min, ...max]] : voxelBoxes(tris, min, max)).map((b) => [(b[0] + off[0]) * s, (b[1] + off[1]) * s, (b[2] + off[2]) * s, (b[3] + off[0]) * s, (b[4] + off[1]) * s, (b[5] + off[2]) * s]);
    const mats = [...new Set(prims.map((p) => g.json.materials?.[p.mat]?.name || ''))];
    const id = `${kit}/${name}`;
    manifest[id] = {
      s, o: off.map(r3), size: size.map(r3),
      b: boxes.map((b) => [r3((b[0] + b[3]) / 2), r3((b[1] + b[4]) / 2), r3((b[2] + b[5]) / 2), r3(Math.max(0.005, (b[3] - b[0]) / 2)), r3(Math.max(0.005, (b[4] - b[1]) / 2)), r3(Math.max(0.005, (b[5] - b[2]) / 2))]),
      m: mats,
    };
    fs.copyFileSync(path.join(dir, f), path.join(OUT, kit, f));
    bytes += fs.statSync(path.join(dir, f)).size;
  }
  console.log(kit, files.length);
}

// personnages animés (FBX) et armes (OBJ)
fs.mkdirSync(path.join(OUT, 'characters'), { recursive: true });
for (const pack of ['animated-characters-1', 'animated-characters-2']) {
  for (const f of fs.readdirSync(path.join(SRC, pack, 'Skins')).filter((x) => x.endsWith('.png'))) fs.copyFileSync(path.join(SRC, pack, 'Skins', f), path.join(OUT, 'characters', f));
}
fs.copyFileSync(path.join(SRC, 'animated-characters-1/Model/characterMedium.fbx'), path.join(OUT, 'characters/character.fbx'));
for (const a of ['idle', 'run', 'jump']) fs.copyFileSync(path.join(SRC, `animated-characters-1/Animations/${a}.fbx`), path.join(OUT, `characters/${a}.fbx`));
fs.mkdirSync(path.join(OUT, 'weapons'), { recursive: true });
for (const w of ['machinegun', 'shotgun', 'uzi', 'pistol', 'grenade', 'knife_sharp', 'sniper', 'ammo_machinegun', 'ammo_shotgun', 'ammo_pistol']) {
  for (const ext of ['obj', 'mtl']) fs.copyFileSync(path.join(SRC, 'weaponpack_assets/Models', `${w}.${ext}`), path.join(OUT, 'weapons', `${w}.${ext}`));
}

const header = `/**
 * Modèles 3D libres de droits (CC0) de Kenney — https://kenney.nl
 * Fichier GÉNÉRÉ par client/scripts/kenney-assets.mjs (ne pas modifier à la main), copié côté serveur.
 * Pour chaque modèle : s = échelle, o = recentrage (avant échelle), size = taille en mètres,
 * b = boîtes de collision [cx, cy, cz, demi-x, demi-y, demi-z] (posé au sol, centré), m = matières.
 */
export const ASSETS = ${JSON.stringify(manifest)};
`;
fs.writeFileSync(MANIFEST, header);
console.log('modèles', Object.keys(manifest).length, 'poids', (bytes / 1e6).toFixed(1), 'Mo', 'manifest', (fs.statSync(MANIFEST).size / 1e3).toFixed(0), 'ko');
