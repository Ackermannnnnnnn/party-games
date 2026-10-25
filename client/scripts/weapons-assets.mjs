/**
 * Prop Hunt — armes photoréalistes (Poly Haven, CC0) : on garde un seul pistolet du lot,
 * on oriente chaque arme canon vers -z (comme la caméra), poignée à l'origine, textures WebP.
 * Usage : node client/scripts/weapons-assets.mjs <dossier models Poly Haven>
 */
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, weld, prune, textureCompress, getBounds } from '@gltf-transform/functions';

const SRC = process.argv[2];
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/ph-assets/weapons3');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/** Garde les morceaux (composantes connexes) dont le centre vérifie keep(x, y, z) (repère de la scène). */
function filterTris(doc, keep) {
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); const idx = prim.getIndices(); const e = [];
      const n = pos.getCount();
      const parent = Int32Array.from({ length: n }, (_, i) => i);
      const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      const tris = idx.getCount() / 3;
      for (let t = 0; t < tris; t++) { const a = find(idx.getScalar(t * 3)); for (let k = 1; k < 3; k++) { const b = find(idx.getScalar(t * 3 + k)); if (a !== b) parent[b] = a; } }
      const box = new Map();
      for (let i = 0; i < n; i++) {
        pos.getElement(i, e);
        const w = [m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12], m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13], m[2] * e[0] + m[6] * e[1] + m[10] * e[2] + m[14]];
        const r = find(i); const b = box.get(r) || [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], w[k]); b[k + 3] = Math.max(b[k + 3], w[k]); }
        box.set(r, b);
      }
      const ok = new Set([...box].filter(([, b]) => keep((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2)).map(([r]) => r));
      const out = [];
      for (let t = 0; t < tris; t++) if (ok.has(find(idx.getScalar(t * 3)))) out.push(idx.getScalar(t * 3), idx.getScalar(t * 3 + 1), idx.getScalar(t * 3 + 2));
      if (!out.length) { prim.dispose(); continue; }
      idx.setArray(new Uint32Array(out));
    }
  }
}

/** Applique une matrice (rotation + translation) à toute la scène (nouveau nœud parent). */
function reorient(doc, rotY, rotZ, center) {
  const scene = doc.getRoot().listScenes()[0];
  const root = doc.createNode('root');
  for (const n of scene.listChildren()) { scene.removeChild(n); root.addChild(n); }
  scene.addChild(root);
  const q = (ax, a) => [ax[0] * Math.sin(a / 2), ax[1] * Math.sin(a / 2), ax[2] * Math.sin(a / 2), Math.cos(a / 2)];
  const mulq = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  root.setRotation(mulq(q([0, 1, 0], rotY), q([0, 0, 1], rotZ)));
  const wrap = doc.createNode('weapon'); scene.removeChild(root); wrap.addChild(root); scene.addChild(wrap);
  const b = getBounds(scene);
  const c = center(b);
  wrap.setTranslation([-c[0], -c[1], -c[2]]);
  return getBounds(scene);
}

const JOBS = [
  // pistolet : celui du haut du lot, sans les chargeurs ; canon +x → -z ; poignée (bas arrière) à l'origine
  { id: 'service_pistol', out: 'pistol', keep: (x, y) => y > 0.085 && x > -0.065, rotY: Math.PI / 2, grip: (b) => [(b.min[0] + b.max[0]) / 2, b.min[1] + 0.035, b.max[2] - 0.045] },
  { id: 'bolt_action_rifle_7_62', out: 'rifle', rotY: Math.PI / 2, grip: (b) => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2 - 0.03, b.max[2] - 0.42] },
  { id: 'stick_grenade', out: 'grenade', rotY: 0, grip: (b) => [0, b.min[1] + 0.1, 0] },
  { id: 'machete', out: 'machete', rotY: 0, grip: (b) => [(b.min[0] + b.max[0]) / 2, b.min[1] + 0.07, (b.min[2] + b.max[2]) / 2] },
];
for (const j of JOBS) {
  const doc = await io.read(path.join(SRC, j.id, `${j.id}.gltf`));
  await doc.transform(dedup(), flatten(), join(), weld());
  if (j.keep) filterTris(doc, j.keep);
  const b = reorient(doc, j.rotY, 0, j.grip);
  await doc.transform(prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 85 }));
  await io.write(path.join(OUT, `${j.out}.glb`), doc);
  console.log(j.out, b.min.map((v) => v.toFixed(3)), b.max.map((v) => v.toFixed(3)));
}
