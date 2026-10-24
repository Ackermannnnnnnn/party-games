/**
 * Prop Hunt — moteur du monde : géométrie fusionnée (peu d'appels de dessin, léger sur téléphone),
 * collisions (boîtes alignées + grille), déplacement du personnage, lancer de rayons.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODELS, modelBounds, PLAYER } from './shared.js';

const tmpColor = new THREE.Color();

/** Géométrie d'une pièce de modèle, déjà colorée (attribut `color`). */
function partGeometry(p) {
  let g;
  if (p[0] === 'b') g = new THREE.BoxGeometry(p[4], p[5], p[6]);
  else if (p[0] === 'c') g = new THREE.CylinderGeometry(p[8] ?? p[4], p[4], p[5], p[7] || 12);
  else if (p[0] === 's') g = new THREE.SphereGeometry(p[4], 10, 7);
  else g = new THREE.ConeGeometry(p[4], p[5], p[7] || 10);
  const color = p[0] === 'b' ? p[7] : p[0] === 'c' ? p[6] : p[0] === 's' ? p[5] : p[6];
  if (p[0] === 'b' && p[8]) g.rotateY(p[8]);
  g.translate(p[1], p[2], p[3]);
  return colorize(g, color);
}

function colorize(g, color) {
  g = g.index ? g.toNonIndexed() : g;
  g.deleteAttribute('uv');
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  tmpColor.setHex(color).convertSRGBToLinear();
  // légère variation par face pour le rendu « low-poly »
  for (let i = 0; i < n; i += 3) {
    const k = 0.94 + ((i * 7919) % 13) / 100;
    for (let j = 0; j < 3; j++) { col[(i + j) * 3] = tmpColor.r * k; col[(i + j) * 3 + 1] = tmpColor.g * k; col[(i + j) * 3 + 2] = tmpColor.b * k; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const modelGeoCache = new Map();
/** Géométrie fusionnée d'un modèle (origine au sol, au centre). */
export function modelGeometry(id) {
  if (modelGeoCache.has(id)) return modelGeoCache.get(id);
  const m = MODELS[id];
  const g = m ? mergeGeometries(m.parts.map(partGeometry)) : colorize(new THREE.BoxGeometry(0.5, 0.5, 0.5).translate(0, 0.25, 0), 0xff00ff);
  g.computeBoundingSphere();
  modelGeoCache.set(id, g);
  return g;
}

export const mapMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/** Maillage unique de toute la map (murs + objets). */
export function buildMapGeometry(map) {
  const geos = [];
  for (const s of map.solids) {
    if (s[7]) continue; // invisible
    geos.push(colorize(new THREE.BoxGeometry(s[3], s[4], s[5]).translate(s[0], s[1], s[2]), s[6]));
  }
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0);
  for (const o of map.objects) {
    const g = modelGeometry(o.m).clone();
    m4.compose(new THREE.Vector3(o.x, o.y, o.z), q.setFromAxisAngle(up, o.ry || 0), new THREE.Vector3(o.s, o.s, o.s));
    g.applyMatrix4(m4);
    geos.push(g);
  }
  const merged = mergeGeometries(geos);
  merged.computeBoundingSphere();
  return merged;
}

// ───────────────────────── Collisions ─────────────────────────

/** Boîte orientée d'un objet posé : centre, demi-tailles, rotation Y. */
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
export class World {
  constructor(map) {
    this.map = map;
    this.boxes = []; // { minX..maxZ, kind: 'solid'|'object', index }
    map.solids.forEach((s, i) => {
      if (s[8]) return; // décor sans collision
      this.boxes.push({ minX: s[0] - s[3] / 2, maxX: s[0] + s[3] / 2, minY: s[1] - s[4] / 2, maxY: s[1] + s[4] / 2, minZ: s[2] - s[5] / 2, maxZ: s[2] + s[5] / 2, kind: 'solid', index: i, invisible: s[7] });
    });
    this.objectBoxes = map.objects.map((o) => objectBox(o));
    this.objectBoxes.forEach((ob, i) => this.boxes.push({ ...obbToAabb(ob), kind: 'object', index: i }));
    this.grid = new Map();
    this.boxes.forEach((b, i) => {
      for (let x = Math.floor(b.minX / CELL); x <= Math.floor(b.maxX / CELL); x++) {
        for (let z = Math.floor(b.minZ / CELL); z <= Math.floor(b.maxZ / CELL); z++) {
          const k = `${x},${z}`;
          if (!this.grid.has(k)) this.grid.set(k, []);
          this.grid.get(k).push(i);
        }
      }
    });
    this.extraBoxes = []; // leurres (ajoutés en jeu)
    this.dynBoxes = [];   // les autres joueurs (mis à jour à chaque image)
  }

  /** Boîtes proches d'une zone. */
  near(minX, maxX, minZ, maxZ) {
    const out = new Set();
    for (let x = Math.floor(minX / CELL); x <= Math.floor(maxX / CELL); x++) {
      for (let z = Math.floor(minZ / CELL); z <= Math.floor(maxZ / CELL); z++) {
        for (const i of this.grid.get(`${x},${z}`) || []) out.add(this.boxes[i]);
      }
    }
    for (const b of this.extraBoxes) out.add(b);
    for (const b of this.dynBoxes) if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) out.add(b);
    return [...out];
  }

  /**
   * Déplace un personnage (boîte de demi-largeur rx, hauteur h, pieds en pos.y).
   * Gère les marches (jusqu'à `step` de haut), la gravité et le sol. Modifie pos et vel.
   */
  move(pos, vel, dt, rx, h, step = 0.45) {
    const sub = Math.max(1, Math.ceil((Math.hypot(vel.x, vel.z) * dt) / (rx * 0.8)));
    let onGround = false;
    for (let i = 0; i < sub; i++) {
      const d = dt / sub;
      this._axis(pos, 'x', vel.x * d, rx, h, step);
      this._axis(pos, 'z', vel.z * d, rx, h, step);
      vel.y -= PLAYER.gravity * d;
      const dy = vel.y * d;
      const hit = this._vertical(pos, dy, rx, h);
      if (hit === 'ground') { onGround = true; vel.y = 0; } else if (hit === 'ceiling') vel.y = Math.min(0, vel.y);
    }
    if (pos.y < -20) { pos.y = 2; vel.y = 0; } // tombé hors de la map
    return onGround;
  }

  _overlaps(pos, rx, h, b, eps = 0) {
    return pos.x + rx > b.minX + eps && pos.x - rx < b.maxX - eps && pos.z + rx > b.minZ + eps && pos.z - rx < b.maxZ - eps && pos.y + h > b.minY + eps && pos.y < b.maxY - eps;
  }

  _axis(pos, axis, delta, rx, h, step) {
    if (!delta) return;
    pos[axis] += delta;
    const list = this.near(pos.x - rx - 0.1, pos.x + rx + 0.1, pos.z - rx - 0.1, pos.z + rx + 0.1);
    for (const b of list) {
      if (!this._overlaps(pos, rx, h, b, 0.001)) continue;
      // petite marche : on monte dessus si la place est libre
      const rise = b.maxY - pos.y;
      if (rise > 0 && rise <= step) {
        const y0 = pos.y; pos.y = b.maxY + 0.001;
        if (!list.some((o) => o !== b && this._overlaps(pos, rx, h, o, 0.001))) continue;
        pos.y = y0;
      }
      if (axis === 'x') pos.x = delta > 0 ? b.minX - rx - 0.0005 : b.maxX + rx + 0.0005;
      else pos.z = delta > 0 ? b.minZ - rx - 0.0005 : b.maxZ + rx + 0.0005;
    }
  }

  _vertical(pos, dy, rx, h) {
    pos.y += dy;
    const list = this.near(pos.x - rx, pos.x + rx, pos.z - rx, pos.z + rx);
    let res = null;
    for (const b of list) {
      if (!this._overlaps(pos, rx, h, b, 0.0005)) continue;
      if (dy <= 0) { pos.y = b.maxY; res = 'ground'; } else { pos.y = b.minY - h - 0.0005; res = 'ceiling'; }
    }
    if (dy <= 0 && !res) {
      // collé au sol si on est juste au-dessus (évite de « flotter » en descendant une marche)
      for (const b of list) {
        if (pos.x + rx > b.minX && pos.x - rx < b.maxX && pos.z + rx > b.minZ && pos.z - rx < b.maxZ && pos.y - b.maxY >= 0 && pos.y - b.maxY < 0.02) { res = 'ground'; break; }
      }
    }
    return res;
  }

  /** Rayon contre la map. Renvoie { t, kind, index } du premier obstacle touché (ou null). */
  raycast(origin, dir, maxDist = 200, { objects = true, solids = true, skipInvisible = true } = {}) {
    let best = null;
    if (solids) {
      for (const b of this.boxes) {
        if (b.kind !== 'solid' || (skipInvisible && b.invisible)) continue;
        const t = rayAabb(origin, dir, b);
        if (t !== null && t < maxDist && (!best || t < best.t)) best = { t, kind: 'solid', index: b.index };
      }
    }
    if (objects) {
      this.objectBoxes.forEach((ob, i) => {
        const t = rayObb(origin, dir, ob);
        if (t !== null && t < maxDist && (!best || t < best.t)) best = { t, kind: 'object', index: i };
      });
    }
    return best;
  }
}

/** Intersection rayon / boîte alignée (méthode des « slabs »). */
export function rayAabb(o, d, b) {
  let tmin = -Infinity; let tmax = Infinity;
  for (const [oa, da, mn, mx] of [[o.x, d.x, b.minX, b.maxX], [o.y, d.y, b.minY, b.maxY], [o.z, d.z, b.minZ, b.maxZ]]) {
    if (Math.abs(da) < 1e-9) { if (oa < mn || oa > mx) return null; continue; }
    let t1 = (mn - oa) / da; let t2 = (mx - oa) / da;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
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

/** Boîte orientée d'un joueur déguisé (ou d'un chasseur). */
export function playerBox(pl) {
  if (pl.model) return objectBox({ m: pl.model, s: pl.scale || 1, x: pl.p[0], y: pl.p[1], z: pl.p[2], ry: pl.ry || 0 });
  return { cx: pl.p[0], cy: pl.p[1] + PLAYER.height / 2, cz: pl.p[2], hx: PLAYER.radius + 0.05, hy: PLAYER.height / 2, hz: PLAYER.radius + 0.05, ry: 0 };
}

/** Taille de collision d'un déguisement : demi-largeur (≥ 0.15) et hauteur. */
export function disguiseCollider(model, scale = 1) {
  const b = modelBounds(model);
  if (!b) return { rx: PLAYER.radius, h: PLAYER.height };
  return { rx: Math.max(0.15, Math.min(b.size[0], b.size[2]) * scale / 2 * 0.9), h: Math.max(0.15, b.size[1] * scale) };
}
