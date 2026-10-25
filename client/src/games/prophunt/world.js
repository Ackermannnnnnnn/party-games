/**
 * Prop Hunt — moteur du monde.
 *  - Rendu : géométries fusionnées par matière (peu d'appels de dessin), coordonnées de texture
 *    calculées dans le repère de l'objet (les textures gardent leur taille réelle), couleurs par sommet.
 *  - Collisions : une boîte par pièce d'objet (on passe sous une table, on entre dans une armoire),
 *    boîtes alignées + grille, déplacement en petits pas (on ne traverse jamais un sol ou un mur).
 *  - Lancer de rayons au niveau des pièces (on vise le paquet de céréales, pas tout le rayon).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODELS, MATS, modelBounds, partHalf, partMat, resolveMat, PLAYER } from './shared.js';
import { getTexture, COLORED } from './textures.js';
import { loadedAsset, matKeyFor } from './assets3d.js';

const tmpColor = new THREE.Color();
const baseColor = new THREE.Color();

// ───────────────────────── Matériaux ─────────────────────────
let QUALITY = 'medium';
export function setQuality(q) { QUALITY = q; }
export function getQuality() { return QUALITY; }

const matCache = new Map();
/** Matériau three.js d'une clé de matière (selon la qualité). */
export function material(key) {
  const ck = `${key}@${QUALITY}`;
  if (matCache.has(ck)) return matCache.get(ck);
  const def = MATS[key] || MATS.paint;
  let m;
  if (def.e) {
    m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    m.color.setScalar(key === 'screen' ? 1 : def.e);
  } else if (def.glass) {
    m = QUALITY === 'low'
      ? new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: def.glass, depthWrite: false })
      : new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: def.glass, roughness: def.r ?? 0.05, metalness: 0.2, envMapIntensity: 2.2, depthWrite: false });
  } else {
    const tex = def.t ? getTexture(def.t, QUALITY === 'high' ? 512 : 256) : null;
    if (QUALITY === 'low') {
      m = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex?.map || null });
    } else {
      m = new THREE.MeshStandardMaterial({
        vertexColors: true, map: tex?.map || null, normalMap: tex?.normalMap || null,
        roughness: def.r ?? 0.7, metalness: def.m ?? 0, envMapIntensity: def.m ? 1.4 : 0.9,
      });
      if (tex?.normalMap) m.normalScale.set(0.8, 0.8);
    }
    if (def.em) { m.emissive = new THREE.Color().setScalar(def.em); if (m.map) m.emissiveMap = m.map; }
  }
  m.name = key;
  matCache.set(ck, m);
  return m;
}

// ───────────────────────── Géométrie ─────────────────────────

/** Ajoute uv (projection sur l'axe dominant de la normale, en mètres / échelle de la texture) et couleur. */
function finish(g, spec, { scale = 1, aoBottom = null } = {}) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  g.morphAttributes = {};
  const { key, color, def } = resolveMat(spec);
  const pos = g.attributes.position; const nor = g.attributes.normal;
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const col = new Float32Array(n * 3);
  const ts = (def.s || 1) / scale;
  tmpColor.setHex(color).convertSRGBToLinear();
  if (COLORED.has(def.t)) { baseColor.setHex(def.c).convertSRGBToLinear(); tmpColor.setRGB(tmpColor.r / Math.max(0.02, baseColor.r), tmpColor.g / Math.max(0.02, baseColor.g), tmpColor.b / Math.max(0.02, baseColor.b)); }
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)); const ay = Math.abs(nor.getY(i)); const az = Math.abs(nor.getZ(i));
    let u; let v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / ts; uv[i * 2 + 1] = v / ts;
    let k = 1;
    if (aoBottom) k = aoBottom[0] + (1 - aoBottom[0]) * Math.min(1, Math.max(0, (y - aoBottom[1]) / aoBottom[2]));
    col[i * 3] = tmpColor.r * k; col[i * 3 + 1] = tmpColor.g * k; col[i * 3 + 2] = tmpColor.b * k;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { g, key };
}

function partGeo(p) {
  let g;
  const hi = QUALITY === 'low' ? 0.6 : 1;
  if (p[0] === 'b') g = new THREE.BoxGeometry(p[4], p[5], p[6]);
  else if (p[0] === 'c') g = new THREE.CylinderGeometry(p[8] ?? p[4], p[4], p[5], Math.max(6, Math.round((p[7] || 14) * hi)));
  else if (p[0] === 's') g = new THREE.SphereGeometry(p[4], Math.round(16 * hi), Math.round(11 * hi));
  else g = new THREE.ConeGeometry(p[4], p[5], Math.max(6, Math.round((p[7] || 12) * hi)));
  if (p[0] === 'b' && p[8]) g.rotateY(p[8]);
  g.translate(p[1], p[2], p[3]);
  return g;
}

/** Géométries d'un modèle groupées par matière : [{ key, geometry }]. */
const modelCache = new Map();
export function modelParts(id) {
  const ck = `${id}@${QUALITY}`;
  if (modelCache.has(ck)) return modelCache.get(ck);
  const m = MODELS[id];
  const buckets = new Map();
  const b = modelBounds(id);
  const h = b ? b.size[1] : 1;
  if (m?.glb) {
    // modèle Kenney : seulement une fois le fichier chargé (sinon rien à dessiner pour l'instant)
    const raw = loadedAsset(m.glb);
    if (!raw) return [];
    for (const r of raw) {
      const { key, color } = matKeyFor(r.name, r.kit, r.color, r.id);
      const { g } = finish(r.geometry.clone(), `${key}:${color.toString(16).padStart(6, '0')}`, { aoBottom: [0.75, 0, Math.min(0.5, h * 0.5) || 0.3] });
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(g);
    }
    const out = [...buckets].map(([key, gs]) => { const geometry = mergeGeometries(gs); geometry.computeBoundingSphere(); return { key, geometry }; });
    modelCache.set(ck, out);
    return out;
  }
  for (const p of m ? m.parts : [['b', 0, 0.25, 0, 0.5, 0.5, 0.5, 0xff00ff]]) {
    const { g, key } = finish(partGeo(p), partMat(p), { aoBottom: [0.7, b ? b.min[1] : 0, Math.min(0.5, h * 0.5) || 0.3] });
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(g);
  }
  const out = [...buckets].map(([key, gs]) => { const geometry = mergeGeometries(gs); geometry.computeBoundingSphere(); return { key, geometry }; });
  modelCache.set(ck, out);
  return out;
}

/** Recolore une géométrie (canapé bleu, vert…) en gardant ses ombres douces. */
export function tintGeometry(g, hex) {
  const c = g.attributes.color; if (!c) return;
  const t = new THREE.Color(hex).convertSRGBToLinear();
  let max = 0.001; for (let i = 0; i < c.count; i++) max = Math.max(max, c.getX(i) + c.getY(i) + c.getZ(i));
  for (let i = 0; i < c.count; i++) { const k = (c.getX(i) + c.getY(i) + c.getZ(i)) / max; c.setXYZ(i, t.r * k, t.g * k, t.b * k); }
  c.needsUpdate = true;
}

/** Prisme triangulaire (pignon d'un toit) : base w × d, hauteur h, faîte le long de X. */
function prismGeo(w, h, d) {
  const x0 = -w / 2; const x1 = w / 2; const z0 = -d / 2; const z1 = d / 2;
  const v = [
    // pignons
    x0, 0, z1, x0, h, 0, x0, 0, z0,
    x1, 0, z0, x1, h, 0, x1, 0, z1,
    // pans
    x0, 0, z1, x1, 0, z1, x1, h, 0, x0, 0, z1, x1, h, 0, x0, h, 0,
    x1, 0, z0, x0, 0, z0, x0, h, 0, x1, 0, z0, x0, h, 0, x1, h, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Maillages de toute la map : [{ key, geometry, shadow }] (une entrée par matière).
 * Les objets sont fusionnés aussi : une map entière = une vingtaine d'appels de dessin.
 */
export function buildMapMeshes(map) {
  const buckets = new Map();
  const add = (key, g, shadow = true) => {
    const k = `${key}|${shadow ? 1 : 0}`;
    if (!buckets.has(k)) buckets.set(k, { key, shadow, list: [] });
    buckets.get(k).list.push(g);
  };
  for (const s of map.solids) {
    if (s.inv) continue;
    const g0 = new THREE.BoxGeometry(s.w, s.h, s.d).translate(s.x, s.y, s.z);
    const tall = s.h > 1.2 && s.y - s.h / 2 < 0.5;
    const { g, key } = finish(g0, s.mat, { aoBottom: tall ? [0.72, s.y - s.h / 2, 1.4] : null });
    add(key, g, !s.ns && key !== 'glass' && !MATS[key]?.e);
  }
  const e = new THREE.Euler();
  for (const d of map.deco) {
    let g0;
    if (d[0] === 'box') { g0 = new THREE.BoxGeometry(d[4], d[5], d[6]); g0.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e.set(d[8], d[9], d[10], 'YXZ'))); g0.translate(d[1], d[2], d[3]); }
    else { g0 = prismGeo(d[4], d[5], d[6]); g0.rotateY(d[8] || 0); g0.translate(d[1], d[2], d[3]); }
    const { g, key } = finish(g0, d[7]);
    add(key, g, true);
  }
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const v3 = new THREE.Vector3(); const sc = new THREE.Vector3();
  for (const o of map.objects) {
    m4.compose(v3.set(o.x, o.y, o.z), q.setFromAxisAngle(up, o.ry || 0), sc.setScalar(o.s || 1));
    for (const { key, geometry } of modelParts(o.m)) {
      const g = geometry.clone().applyMatrix4(m4);
      if (o.t && (key === 'fabric' || key === 'leather')) tintGeometry(g, o.t);
      add(key, g, key !== 'glass' && !MATS[key]?.e);
    }
  }
  return [...buckets.values()].map(({ key, shadow, list }) => {
    const geometry = mergeGeometries(list);
    geometry.computeBoundingSphere();
    return { key, geometry, shadow };
  });
}

// ───────────────────────── Collisions ─────────────────────────

/** Boîte orientée (rotation Y) d'une pièce d'objet posé. */
function partObb(o, p) {
  const s = o.s || 1; const h = partHalf(p);
  const c = Math.cos(o.ry || 0); const sn = Math.sin(o.ry || 0);
  const lx = p[1] * s; const lz = p[3] * s;
  return { cx: o.x + lx * c + lz * sn, cy: o.y + p[2] * s, cz: o.z - lx * sn + lz * c, hx: h[0] * s, hy: h[1] * s, hz: h[2] * s, ry: o.ry || 0 };
}

/** Boîte orientée d'un objet posé (englobe toutes ses pièces). */
export function objectBox(o) {
  const b = modelBounds(o.m);
  const s = o.s || 1;
  const lc = [(b.min[0] + b.max[0]) / 2 * s, (b.min[1] + b.max[1]) / 2 * s, (b.min[2] + b.max[2]) / 2 * s];
  const c = Math.cos(o.ry || 0); const sn = Math.sin(o.ry || 0);
  return {
    cx: o.x + lc[0] * c + lc[2] * sn, cy: o.y + lc[1], cz: o.z - lc[0] * sn + lc[2] * c,
    hx: b.size[0] * s / 2, hy: b.size[1] * s / 2, hz: b.size[2] * s / 2, ry: o.ry || 0,
  };
}

/** Boîte alignée qui contient une boîte orientée. */
export function obbToAabb(ob) {
  const c = Math.abs(Math.cos(ob.ry)); const s = Math.abs(Math.sin(ob.ry));
  const hx = ob.hx * c + ob.hz * s; const hz = ob.hx * s + ob.hz * c;
  return { minX: ob.cx - hx, maxX: ob.cx + hx, minY: ob.cy - ob.hy, maxY: ob.cy + ob.hy, minZ: ob.cz - hz, maxZ: ob.cz + hz };
}

const CELL = 4;
const isGlass = (spec) => { const k = resolveMat(spec).key; return k === 'glass' || k === 'water'; };

export class World {
  constructor(map) {
    this.map = map;
    this.boxes = []; // boîtes de déplacement { minX..maxZ, kind, index, inv }
    this.solidRays = []; // solides visibles, pour les rayons
    map.solids.forEach((s, i) => {
      if (s.ghost) return;
      const bx = { minX: s.x - s.w / 2, maxX: s.x + s.w / 2, minY: s.y - s.h / 2, maxY: s.y + s.h / 2, minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2, kind: 'solid', index: i, inv: s.inv };
      this.boxes.push(bx);
      if (!s.inv) this.solidRays.push({ ...bx, glass: s.mat === 'glass' });
    });
    // objets : une boîte par pièce
    this.objects = map.objects.map((o, i) => {
      const m = MODELS[o.m];
      const box = objectBox(o);
      const parts = m.parts.map((p) => ({ ...partObb(o, p), glass: isGlass(partMat(p)), nc: !!MATS[resolveMat(partMat(p)).key]?.nc }));
      const big = Math.max(...modelBounds(o.m).size) * (o.s || 1);
      const r = Math.hypot(box.hx, box.hy, box.hz);
      const entry = { o, index: i, box, parts, static: !!m.static, sphere: [box.cx, box.cy, box.cz, r] };
      if (big >= 0.32) {
        for (const p of parts) {
          if (p.nc || (p.hx < 0.012 && p.hz < 0.012)) continue;
          this.boxes.push({ ...obbToAabb(p), kind: 'object', index: i });
        }
      }
      return entry;
    });
    this.grid = new Map();
    this.boxes.forEach((b, i) => {
      for (let x = Math.floor(b.minX / CELL); x <= Math.floor(b.maxX / CELL); x++) {
        for (let z = Math.floor(b.minZ / CELL); z <= Math.floor(b.maxZ / CELL); z++) {
          const k = x * 100003 + z;
          if (!this.grid.has(k)) this.grid.set(k, []);
          this.grid.get(k).push(i);
        }
      }
    });
    this.extraBoxes = []; // leurres (ajoutés en jeu)
    this.dynBoxes = [];   // les autres joueurs (mis à jour à chaque image)
    const a = map.area || [-50, 50, -50, 50];
    this.area = { x1: a[0], x2: a[1], z1: a[2], z2: a[3] };
    this._seen = new Set();
  }

  /** Boîtes proches d'une zone. */
  near(minX, maxX, minZ, maxZ) {
    const out = []; const seen = this._seen; seen.clear();
    for (let x = Math.floor(minX / CELL); x <= Math.floor(maxX / CELL); x++) {
      for (let z = Math.floor(minZ / CELL); z <= Math.floor(maxZ / CELL); z++) {
        const l = this.grid.get(x * 100003 + z);
        if (l) for (const i of l) if (!seen.has(i)) { seen.add(i); out.push(this.boxes[i]); }
      }
    }
    for (const b of this.extraBoxes) if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) out.push(b);
    for (const b of this.dynBoxes) if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) out.push(b);
    return out;
  }

  _hits(pos, rx, h, b, eps = 0.0005) {
    return pos.x + rx > b.minX + eps && pos.x - rx < b.maxX - eps && pos.z + rx > b.minZ + eps && pos.z - rx < b.maxZ - eps && pos.y + h > b.minY + eps && pos.y < b.maxY - eps;
  }

  /** La place est-elle libre pour une boîte (rx, h) posée en pos ? */
  fits(pos, rx, h, { players = false } = {}) {
    for (const b of this.near(pos.x - rx, pos.x + rx, pos.z - rx, pos.z + rx)) {
      if (!players && b.kind === 'player') continue;
      if (this._hits(pos, rx, h, b, 0.002)) return false;
    }
    return true;
  }

  /**
   * Sort le personnage d'un volume dans lequel il serait coincé (déguisement plus gros, joueur qui
   * s'est collé à lui…) en cherchant la position libre la plus proche. Renvoie false si rien trouvé.
   */
  unstuck(pos, rx, h) {
    if (this.fits(pos, rx, h)) return true;
    const p = pos.clone();
    for (let r = 0.1; r <= 2.4; r += 0.1) {
      for (const dy of [0, 0.3, 0.6]) {
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2;
          p.set(pos.x + Math.cos(ang) * r, pos.y + dy, pos.z + Math.sin(ang) * r);
          if (this.fits(p, rx, h)) { pos.copy(p); return true; }
        }
      }
    }
    return false;
  }

  /**
   * Déplace un personnage (boîte de demi-largeur rx, hauteur h, pieds en pos.y) : petits pas
   * (≤ 8 cm), marches jusqu'à `step`, gravité, sol, plafond. Modifie pos et vel. Renvoie onGround.
   */
  move(pos, vel, dt, rx, h, step = PLAYER.step, wasGrounded = true) {
    const maxStep = Math.min(0.08, rx * 0.5);
    const disp = Math.max(Math.abs(vel.x), Math.abs(vel.z), Math.abs(vel.y) + PLAYER.gravity * dt) * dt;
    const sub = Math.min(48, Math.max(1, Math.ceil(disp / maxStep)));
    let onGround = false;
    const d = dt / sub;
    for (let i = 0; i < sub; i++) {
      const canStep = wasGrounded || onGround;
      this._axis(pos, 'x', vel.x * d, rx, h, canStep ? step : 0.05, vel);
      this._axis(pos, 'z', vel.z * d, rx, h, canStep ? step : 0.05, vel);
      vel.y -= PLAYER.gravity * d;
      const hit = this._vertical(pos, vel.y * d, rx, h);
      if (hit === 'ground') { onGround = true; vel.y = 0; } else if (hit === 'ceiling') vel.y = Math.min(0, vel.y);
    }
    // jamais hors de la zone de jeu
    const A = this.area;
    pos.x = Math.max(A.x1 + rx, Math.min(A.x2 - rx, pos.x));
    pos.z = Math.max(A.z1 + rx, Math.min(A.z2 - rx, pos.z));
    return onGround;
  }

  _axis(pos, axis, delta, rx, h, step, vel) {
    if (!delta) return;
    pos[axis] += delta;
    const list = this.near(pos.x - rx - 0.05, pos.x + rx + 0.05, pos.z - rx - 0.05, pos.z + rx + 0.05);
    for (const b of list) {
      if (!this._hits(pos, rx, h, b)) continue;
      // petite marche : on monte dessus si la place est libre (pas sur les autres joueurs ni les murs invisibles)
      const rise = b.maxY - pos.y;
      if (rise > 0 && rise <= step && b.kind !== 'player' && !b.inv) {
        const y0 = pos.y; pos.y = b.maxY + 0.001;
        if (!list.some((o) => o !== b && this._hits(pos, rx, h, o))) continue;
        pos.y = y0;
      }
      if (axis === 'x') pos.x = delta > 0 ? b.minX - rx : b.maxX + rx;
      else pos.z = delta > 0 ? b.minZ - rx : b.maxZ + rx;
      vel[axis] = 0;
    }
  }

  _vertical(pos, dy, rx, h) {
    pos.y += dy;
    const list = this.near(pos.x - rx, pos.x + rx, pos.z - rx, pos.z + rx);
    let res = null;
    for (const b of list) {
      if (!this._hits(pos, rx, h, b)) continue;
      if (dy <= 0) { pos.y = b.maxY; res = 'ground'; } else { pos.y = b.minY - h; res = 'ceiling'; }
    }
    if (dy <= 0 && !res) {
      for (const b of list) {
        if (pos.x + rx > b.minX && pos.x - rx < b.maxX && pos.z + rx > b.minZ && pos.z - rx < b.maxZ && pos.y - b.maxY >= -0.0001 && pos.y - b.maxY < 0.01) { res = 'ground'; break; }
      }
    }
    return res;
  }

  /**
   * Rayon contre la map. Renvoie { t, kind: 'solid'|'object', index, static, glass } ou null.
   * opts.glass = false : on vise à travers les vitres (pour choisir un déguisement derrière une porte vitrée).
   */
  raycast(origin, dir, maxDist = 200, { objects = true, solids = true, glass = true } = {}) {
    let best = null;
    if (solids) {
      for (const b of this.solidRays) {
        if (!glass && b.glass) continue;
        const t = rayAabb(origin, dir, b);
        if (t !== null && t < maxDist && (!best || t < best.t)) best = { t, kind: 'solid', index: b.index, static: true, glass: b.glass, aabb: b };
      }
    }
    if (objects) {
      const lim = best ? best.t : maxDist;
      for (const ob of this.objects) {
        const [sx, sy, sz, r] = ob.sphere;
        const ox = sx - origin.x; const oy = sy - origin.y; const oz = sz - origin.z;
        const tc = ox * dir.x + oy * dir.y + oz * dir.z;
        if (tc < -r || tc - r > (best ? best.t : lim)) continue;
        if (ox * ox + oy * oy + oz * oz - tc * tc > r * r) continue;
        for (const p of ob.parts) {
          if (!glass && p.glass) continue;
          const t = rayObb(origin, dir, p);
          if (t !== null && t < maxDist && (!best || t < best.t)) best = { t, kind: 'object', index: ob.index, static: ob.static, glass: p.glass, obb: p };
        }
      }
    }
    return best;
  }
}

/** Normale de la face touchée par un rayon (point = origine + dir × t). */
export function hitNormal(hit, point) {
  if (!hit) return null;
  if (hit.aabb) {
    const b = hit.aabb;
    const c = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2];
    const h = [(b.maxX - b.minX) / 2, (b.maxY - b.minY) / 2, (b.maxZ - b.minZ) / 2];
    const d = [(point.x - c[0]) / h[0], (point.y - c[1]) / h[1], (point.z - c[2]) / h[2]];
    const i = Math.abs(d[0]) > Math.abs(d[1]) ? (Math.abs(d[0]) > Math.abs(d[2]) ? 0 : 2) : (Math.abs(d[1]) > Math.abs(d[2]) ? 1 : 2);
    const n = [0, 0, 0]; n[i] = Math.sign(d[i]) || 1; return n;
  }
  if (hit.obb) {
    const o = hit.obb; const c = Math.cos(-o.ry); const s = Math.sin(-o.ry);
    const px = point.x - o.cx; const pz = point.z - o.cz;
    const l = [(px * c + pz * s) / o.hx, (point.y - o.cy) / o.hy, (-px * s + pz * c) / o.hz];
    const i = Math.abs(l[0]) > Math.abs(l[1]) ? (Math.abs(l[0]) > Math.abs(l[2]) ? 0 : 2) : (Math.abs(l[1]) > Math.abs(l[2]) ? 1 : 2);
    const ln = [0, 0, 0]; ln[i] = Math.sign(l[i]) || 1;
    const cc = Math.cos(o.ry); const ss = Math.sin(o.ry);
    return [ln[0] * cc + ln[2] * ss, ln[1], -ln[0] * ss + ln[2] * cc];
  }
  return null;
}

/** Intersection rayon / boîte alignée (méthode des « slabs »). */
export function rayAabb(o, d, b) {
  let tmin = -Infinity; let tmax = Infinity;
  const ax = [[o.x, d.x, b.minX, b.maxX], [o.y, d.y, b.minY, b.maxY], [o.z, d.z, b.minZ, b.maxZ]];
  for (let i = 0; i < 3; i++) {
    const [oa, da, mn, mx] = ax[i];
    if (Math.abs(da) < 1e-9) { if (oa < mn || oa > mx) return null; continue; }
    let t1 = (mn - oa) / da; let t2 = (mx - oa) / da;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : 0;
}

/** Intersection rayon / boîte orientée autour de Y. */
export function rayObb(o, d, ob) {
  const c = Math.cos(-ob.ry); const s = Math.sin(-ob.ry);
  const px = o.x - ob.cx; const pz = o.z - ob.cz;
  const lo = { x: px * c + pz * s, y: o.y - ob.cy, z: -px * s + pz * c };
  const ld = { x: d.x * c + d.z * s, y: d.y, z: -d.x * s + d.z * c };
  return rayAabb(lo, ld, { minX: -ob.hx, maxX: ob.hx, minY: -ob.hy, maxY: ob.hy, minZ: -ob.hz, maxZ: ob.hz });
}

/** Rayon contre un modèle posé, pièce par pièce (tirs sur un joueur déguisé ou un leurre). */
export function rayModel(origin, dir, m, s, p, ry) {
  const model = MODELS[m];
  if (!model) return null;
  const o = { m, s, x: p[0], y: p[1], z: p[2], ry };
  if (rayObb(origin, dir, objectBox(o)) === null) return null;
  let best = null;
  for (const part of model.parts) {
    const t = rayObb(origin, dir, partObb(o, part));
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** Boîte orientée d'un joueur déguisé (ou d'un chasseur). */
export function playerBox(pl) {
  if (pl.model) return objectBox({ m: pl.model, s: pl.scale || 1, x: pl.p[0], y: pl.p[1], z: pl.p[2], ry: pl.ry || 0 });
  return { cx: pl.p[0], cy: pl.p[1] + PLAYER.height / 2, cz: pl.p[2], hx: PLAYER.radius + 0.05, hy: PLAYER.height / 2, hz: PLAYER.radius + 0.05, ry: 0 };
}

/** Taille de collision d'un déguisement : demi-largeur et hauteur. */
export function disguiseCollider(model, scale = 1) {
  const b = modelBounds(model);
  if (!b) return { rx: PLAYER.radius, h: PLAYER.height };
  return { rx: Math.max(0.1, Math.min(0.9, Math.min(b.size[0], b.size[2]) * scale / 2 * 0.92)), h: Math.max(0.12, Math.min(2.6, b.size[1] * scale)) };
}

/**
 * Trajectoire d'une grenade (identique chez tous les joueurs) : gravité, rebonds amortis sur les murs
 * et le sol. Renvoie les positions toutes les 1/60 s pendant `ms` millisecondes.
 */
export function grenadePath(world, p0, v0, ms) {
  const pts = [];
  const p = new THREE.Vector3(...p0); const v = new THREE.Vector3(...v0);
  const d = new THREE.Vector3(); const dt = 1 / 60;
  const steps = Math.ceil(ms / 1000 / dt);
  for (let i = 0; i < steps; i++) {
    v.y -= 9.8 * dt;
    const len = v.length() * dt;
    if (len > 1e-5) {
      d.copy(v).normalize();
      const hit = world.raycast(p, d, len + 0.08, { objects: true, glass: true });
      if (hit) {
        const n = hitNormal(hit, p.clone().addScaledVector(d, hit.t)) || [0, 1, 0];
        const nv = new THREE.Vector3(...n);
        p.addScaledVector(d, Math.max(0, hit.t - 0.08));
        v.addScaledVector(nv, -2 * v.dot(nv)).multiplyScalar(0.42);
        if (nv.y > 0.6 && Math.abs(v.y) < 0.8) { v.y = 0; v.x *= 0.85; v.z *= 0.85; }
      } else p.addScaledVector(v, dt);
    }
    pts.push([p.x, p.y, p.z]);
  }
  return pts;
}
