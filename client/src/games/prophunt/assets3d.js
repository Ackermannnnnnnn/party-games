/**
 * Prop Hunt — chargement des modèles 3D Kenney (GLB) : chaque modèle est converti en
 * géométries « maison » (couleur par sommet, matière déduite du nom : bois, métal, verre, tissu…)
 * pour être fusionné avec le reste de la map et profiter des mêmes textures et lumières.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ASSETS } from './shared.js';

const BASE = `${import.meta.env?.BASE_URL || '/'}ph-assets/`;
const loader = new GLTFLoader();
const raw = new Map(); // id → Promise<[{ geometry (monde du modèle), color, name, opacity }]>
const done = new Map(); // id → résultat (accès immédiat une fois chargé)

/** Matière « maison » d'après le nom de la matière Kenney (et le kit). */
export function matKeyFor(name, kit, color, id = '') {
  const n = (name || '').toLowerCase();
  if (/cardboard|pizzaBox|bag/.test(id) && /wood|brown/.test(n)) return { key: 'card', color };
  if (/window/.test(n)) return { key: 'window', color: 0x26333e };
  if (/glass/.test(n)) return { key: 'glass', color };
  if (/water/.test(n)) return { key: 'water', color };
  if (/light|lamp|bulb|candle/.test(n) && !/lightpost/.test(n)) return { key: 'light', color };
  if (/screen|display|monitor/.test(n)) return { key: 'screen', color };
  if (/tire|rubber/.test(n)) return { key: 'rubber', color };
  if (/paint/.test(n) || (kit === 'cars' && /body|car/.test(n))) return { key: 'metal', color };
  if (/chrome|steel|iron|metal|silver|gold/.test(n)) return { key: 'metal', color };
  if (/wood|bark|log|trunk|plank|stump/.test(n)) return { key: 'wood', color };
  if (/leaf|leafs|grass|plant|bush|moss|hedge/.test(n)) return { key: 'leaf', color };
  if (/stone|rock|cliff|concrete|brick/.test(n)) return { key: 'concrete', color };
  if (/dirt|soil|sand|mud/.test(n)) return { key: 'dirt', color };
  if (/fabric|cloth|carpet|cushion|pillow|blanket|bed|sheet|rug|towel|sofa|leather|cover/.test(n)) return { key: 'fabric', color };
  if (/plastic/.test(n)) return { key: 'plastic', color };
  if (/ceramic|porcelain|white|toilet|sink/.test(n) && kit === 'furniture') return { key: 'ceramic', color };
  return { key: 'paint', color };
}

/** Charge un modèle (une seule fois) : géométries normalisées (posées au sol, centrées, en mètres). */
export function loadAsset(id) {
  if (raw.has(id)) return raw.get(id);
  const a = ASSETS[id];
  const kit = id.split('/')[0];
  const p = new Promise((resolve) => {
    if (!a) { resolve([]); return; }
    loader.load(`${BASE}${id}.glb`, (gltf) => {
      const out = [];
      gltf.scene.updateMatrixWorld(true);
      const norm = new THREE.Matrix4().makeScale(a.s, a.s, a.s).multiply(new THREE.Matrix4().makeTranslation(a.o[0], a.o[1], a.o[2]));
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const g0 = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(norm, o.matrixWorld));
        const groups = g0.groups.length ? g0.groups : [{ start: 0, count: (g0.index ? g0.index.count : g0.attributes.position.count), materialIndex: 0 }];
        for (const gr of groups) {
          const m = mats[gr.materialIndex] || mats[0];
          let g = g0;
          if (g0.groups.length > 1) {
            g = new THREE.BufferGeometry();
            for (const k of Object.keys(g0.attributes)) g.setAttribute(k, g0.attributes[k]);
            if (g0.index) g.setIndex(Array.from(g0.index.array.slice(gr.start, gr.start + gr.count)));
          }
          // un miroir (échelle négative) inverse les faces : on les remet dans le bon sens
          if (o.matrixWorld.determinant() < 0 && g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } }
          if (!g.attributes.normal) g.computeVertexNormals();
          out.push({ geometry: g, name: m?.name || '', color: m?.color ? m.color.getHex() : 0xcccccc, opacity: m?.opacity ?? 1, kit, id });
        }
      });
      done.set(id, out);
      resolve(out);
    }, undefined, () => { done.set(id, []); resolve([]); });
  });
  raw.set(id, p);
  return p;
}

/** Résultat du chargement s'il est terminé (sinon undefined). */
export const loadedAsset = (id) => done.get(id);

/** Précharge une liste de modèles ; onProgress(fait, total). */
export async function preloadAssets(ids, onProgress) {
  const list = [...new Set(ids)].filter((id) => ASSETS[id]);
  let done = 0;
  await Promise.all(list.map((id) => loadAsset(id).then((r) => { done += 1; onProgress?.(done, list.length); return r; })));
  return list.length;
}
