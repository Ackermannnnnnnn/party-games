/**
 * Prop Hunt — import des modèles et textures photoréalistes de Poly Haven (CC0, https://polyhaven.com).
 * À lancer à la main quand on change la sélection :
 *
 *   node client/scripts/polyhaven-assets.mjs <dossier extrait> [id…]
 *
 * Le dossier contient models/<id>/<id>.gltf (+ .bin, textures/) et textures/<id>/{Diffuse,nor_gl,arm}.jpg.
 * Pour chaque modèle : recentrage (posé au sol), allègement si trop détaillé, textures en WebP
 * (512 ou 1024 px selon la taille de l'objet), compression meshopt → public/ph-assets/ph/<id>.glb,
 * et boîtes de collision par voxels → src/games/prophunt/common/assetsPh.js (partagé avec le serveur).
 * Les textures de surfaces (sols, murs…) → public/ph-assets/tex/<id>_{c,n,arm}.webp.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { center, dedup, flatten, join, weld, prune, simplify, textureCompress, meshopt, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const SRC = process.argv[2];
const ONLY = new Set(process.argv.slice(3));
if (!SRC) { console.error('Usage : node polyhaven-assets.mjs <dossier> [id…]'); process.exit(1); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/ph-assets/ph');
const TEX = path.join(ROOT, 'public/ph-assets/tex');
const MANIFEST = path.join(ROOT, 'src/games/prophunt/common/assetsPh.js');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TEX, { recursive: true });

await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

/** Budget de triangles selon la taille de l'objet (le relief fin est porté par les normal maps). */
const budget = (maxDim) => (maxDim < 0.5 ? 2500 : maxDim < 1.2 ? 7000 : maxDim < 3 ? 14000 : 22000);

/** Boîtes de collision par voxels (même méthode que pour Kenney). */
function voxelBoxes(tris, min, max, maxBoxes = 28) {
  const size = [0, 1, 2].map((k) => max[k] - min[k]);
  for (let res = 20; res >= 4; res -= 2) {
    const vox = Math.max(...size) / res;
    const n = size.map((v) => Math.max(1, Math.ceil(v / vox - 1e-6)));
    const N = n.map((v) => v + 2);
    const grid = new Uint8Array(N[0] * N[1] * N[2]);
    const at = (x, y, z) => (x * N[1] + y) * N[2] + z;
    const cell = (p, k) => Math.min(n[k] - 1, Math.max(0, Math.floor((p[k] - min[k]) / vox))) + 1;
    for (const [a, b, c] of tris) {
      const l = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
      const steps = Math.max(1, Math.ceil((l / vox) * 2.5));
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps - i; j++) {
          const u = i / steps; const v = j / steps; const w = 1 - u - v;
          grid[at(cell([a[0] * w + b[0] * u + c[0] * v], 0), cell([0, a[1] * w + b[1] * u + c[1] * v], 1), cell([0, 0, a[2] * w + b[2] * u + c[2] * v], 2))] = 1;
        }
      }
    }
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

/** Triangles du document dans le repère de la scène. */
function triangles(doc) {
  const tris = [];
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  scene.traverse((node) => {
    const mesh = node.getMesh(); if (!mesh) return;
    const m = node.getWorldMatrix();
    const ap = (x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const idx = prim.getIndices();
      const P = []; const e = [];
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, e); P.push(ap(e[0], e[1], e[2])); }
      const count = idx ? idx.getCount() : P.length;
      for (let i = 0; i + 2 < count; i += 3) {
        const a = idx ? idx.getScalar(i) : i; const b = idx ? idx.getScalar(i + 1) : i + 1; const c = idx ? idx.getScalar(i + 2) : i + 2;
        tris.push([P[a], P[b], P[c]]);
      }
    }
  });
  return tris;
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const prev = fs.existsSync(MANIFEST) ? (await import(`${MANIFEST}?t=${Date.now()}`)).PH_ASSETS : {};
const manifest = ONLY.size ? { ...prev } : {};
let bytes = 0;

const modelDir = path.join(SRC, 'models');
const ids = fs.existsSync(modelDir) ? fs.readdirSync(modelDir).filter((d) => !ONLY.size || ONLY.has(d)).sort() : [];
for (const id of ids) {
  const file = path.join(modelDir, id, `${id}.gltf`);
  if (!fs.existsSync(file)) { console.warn('absent', id); continue; }
  try {
    const doc = await io.read(file);
    await doc.transform(dedup(), flatten(), join(), weld(), center({ pivot: 'below' }));
    let tris = triangles(doc);
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const b0 = getBounds(scene);
    const maxTris = budget(Math.max(...[0, 1, 2].map((k) => b0.max[k] - b0.min[k])));
    for (const err of [0.004, 0.012, 0.03]) {
      if (tris.length <= maxTris * 1.15) break;
      await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: maxTris / tris.length, error: err, lockBorder: false }));
      tris = triangles(doc);
    }
    const bb = getBounds(scene);
    const min = bb.min; const max = bb.max;
    const size = [0, 1, 2].map((k) => max[k] - min[k]);
    const big = Math.max(...size) >= 1.0;
    await doc.transform(
      prune(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: big ? [1024, 1024] : [512, 512], quality: 82 }),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
    const outFile = path.join(OUT, `${id}.glb`);
    await io.write(outFile, doc);
    bytes += fs.statSync(outFile).size;
    const boxes = Math.max(...size) < 0.3 ? [[...min, ...max]] : voxelBoxes(tris, min, max);
    manifest[id] = {
      size: size.map(r3), tris: tris.length,
      b: boxes.map((b) => [r3((b[0] + b[3]) / 2), r3((b[1] + b[4]) / 2), r3((b[2] + b[5]) / 2), r3(Math.max(0.005, (b[3] - b[0]) / 2)), r3(Math.max(0.005, (b[4] - b[1]) / 2)), r3(Math.max(0.005, (b[5] - b[2]) / 2))]),
    };
    console.log(id, size.map((v) => v.toFixed(2)).join('×'), tris.length, 'tri', (fs.statSync(outFile).size / 1e3).toFixed(0), 'ko', manifest[id].b.length, 'boîtes');
  } catch (e) {
    console.warn('ÉCHEC', id, e.message);
  }
}

// textures de surfaces
const texDir = path.join(SRC, 'textures');
const surfaces = [];
if (fs.existsSync(texDir)) {
  for (const id of fs.readdirSync(texDir).filter((d) => !ONLY.size || ONLY.has(d)).sort()) {
    const maps = { c: 'Diffuse.jpg', n: 'nor_gl.jpg', arm: 'arm.jpg' };
    for (const [k, f] of Object.entries(maps)) {
      const src = path.join(texDir, id, f);
      if (!fs.existsSync(src)) continue;
      const dst = path.join(TEX, `${id}_${k}.webp`);
      await sharp(src).resize(1024, 1024, { fit: 'fill' }).webp({ quality: k === 'n' ? 90 : 82 }).toFile(dst);
      bytes += fs.statSync(dst).size;
    }
    surfaces.push(id);
  }
}

const allSurfaces = ONLY.size && fs.existsSync(TEX) ? [...new Set(fs.readdirSync(TEX).filter((f) => f.endsWith('_c.webp')).map((f) => f.replace('_c.webp', '')))].sort() : surfaces;
const header = `/**
 * Modèles et textures photoréalistes de Poly Haven (CC0) — https://polyhaven.com
 * Fichier GÉNÉRÉ par client/scripts/polyhaven-assets.mjs (ne pas modifier à la main), copié côté serveur.
 * Pour chaque modèle (en mètres, posé au sol et centré) : size, tris = triangles,
 * b = boîtes de collision [cx, cy, cz, demi-x, demi-y, demi-z].
 */
export const PH_ASSETS = ${JSON.stringify(manifest)};

/** Textures de surfaces disponibles (public/ph-assets/tex/<id>_{c,n,arm}.webp). */
export const PH_SURFACES = ${JSON.stringify(allSurfaces)};
`;
fs.writeFileSync(MANIFEST, header);
console.log('modèles', Object.keys(manifest).length, 'surfaces', allSurfaces.length, 'poids ajouté', (bytes / 1e6).toFixed(1), 'Mo');
