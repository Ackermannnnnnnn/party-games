/**
 * Prop Hunt — textures procédurales (aucun fichier à télécharger) : bois, parquet, brique, carrelage,
 * herbe, bitume, tissu… Chaque texture a sa carte de relief (normal map) calculée à partir d'une hauteur.
 * La plupart sont en niveaux de gris et multipliées par la couleur de l'objet.
 */
import * as THREE from 'three';

// bruit de valeur déterministe
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y, period) {
  const xi = Math.floor(x); const yi = Math.floor(y); const xf = x - xi; const yf = y - yi;
  const w = (i) => ((i % period) + period) % period;
  const a = hash(w(xi), w(yi)); const b = hash(w(xi + 1), w(yi)); const c = hash(w(xi), w(yi + 1)); const d = hash(w(xi + 1), w(yi + 1));
  const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** fbm périodique sur [0,1]² (pour que la texture se répète sans couture). */
function fbm(u, v, base = 4, oct = 4) {
  let s = 0; let amp = 0.5; let f = base;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(u * f, v * f, f); f *= 2; amp *= 0.5; }
  return s;
}
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Chaque générateur renvoie [r, g, b, hauteur] pour (u, v) ∈ [0,1]². */
const GEN = {
  wood: (u, v) => {
    const n = fbm(u, v, 4, 4);
    const g = 0.5 + 0.5 * Math.sin((v * 22 + n * 5 + Math.sin(u * 6.283) * 0.6) * 3.1);
    const l = 0.84 + 0.08 * g + 0.06 * (fbm(u, v * 4, 32, 2) - 0.5);
    return [l, l, l, g * 0.4];
  },
  plank: (u, v) => {
    const row = Math.floor(v * 6); const off = hash(row, 7) * 0.7; const pu = (u + off) % 1;
    const n = fbm(pu, v, 4, 3);
    const g = 0.5 + 0.5 * Math.sin((pu * 40 + n * 6 + row * 3) * 1.4);
    const seamV = smooth(0.0, 0.025, Math.min(v * 6 - row, row + 1 - v * 6));
    const seamU = smooth(0.0, 0.01, Math.min(Math.abs(pu - 0.5) * 2, 1));
    const tint = 0.88 + hash(row, Math.floor(pu * 2) + 3) * 0.16;
    const l = (0.74 + 0.16 * g) * tint * (0.55 + 0.45 * seamV * seamU);
    return [l, l, l, seamV * seamU * 0.8 + g * 0.1];
  },
  metal: (u, v) => {
    const s = 0.88 + 0.08 * vnoise(u * 4, v * 256, 256) + 0.04 * fbm(u, v, 4, 3);
    return [s, s, s, s * 0.2];
  },
  fabric: (u, v) => {
    const w = 0.5 + 0.25 * Math.sin(u * 6.283 * 64) * Math.sin(v * 6.283 * 64 + Math.PI / 2);
    const l = 0.82 + 0.1 * w + 0.08 * (fbm(u, v, 8, 3) - 0.5);
    return [l, l, l, w * 0.5];
  },
  leaf: (u, v) => {
    const n = fbm(u, v, 8, 4); const spots = vnoise(u * 32, v * 32, 32);
    const l = 0.62 + 0.45 * n + 0.15 * (spots > 0.7 ? 1 : 0);
    return [l * 0.95, l, l * 0.85, n];
  },
  grass: (u, v) => {
    const n = fbm(u, v, 4, 5); const blade = vnoise(u * 128, v * 128, 128);
    const l = 0.7 + 0.25 * n + 0.15 * (blade - 0.5);
    return [l * 0.95, l * 1.02, l * 0.85, blade * 0.6 + n * 0.4];
  },
  asphalt: (u, v) => {
    const n = fbm(u, v, 4, 3); const sp = hash(Math.floor(u * 256), Math.floor(v * 256));
    const l = 0.82 + 0.12 * n + (sp > 0.93 ? 0.18 : sp < 0.05 ? -0.15 : 0) + 0.05 * (vnoise(u * 64, v * 64, 64) - 0.5);
    return [l, l, l, sp * 0.3 + n * 0.3];
  },
  concrete: (u, v) => {
    const n = fbm(u, v, 3, 5); const sp = hash(Math.floor(u * 200), Math.floor(v * 200));
    const l = 0.84 + 0.14 * (n - 0.5) + (sp > 0.97 ? -0.12 : 0) + 0.04 * (vnoise(u * 50, v * 50, 50) - 0.5);
    return [l, l, l, n * 0.4];
  },
  tile: (u, v) => {
    const N = 4; const fu = (u * N) % 1; const fv = (v * N) % 1;
    const g = Math.min(fu, 1 - fu, fv, 1 - fv);
    const grout = smooth(0.012, 0.03, g);
    const tint = 0.93 + 0.07 * hash(Math.floor(u * N), Math.floor(v * N));
    const l = (0.6 + 0.4 * grout) * tint * (0.97 + 0.03 * fbm(u, v, 8, 2));
    return [l, l, l, grout];
  },
  tileS: (u, v) => {
    const N = 8; const fu = (u * N) % 1; const fv = (v * N) % 1;
    const g = Math.min(fu, 1 - fu, fv, 1 - fv);
    const grout = smooth(0.02, 0.05, g);
    const l = (0.72 + 0.28 * grout) * (0.95 + 0.05 * hash(Math.floor(u * N), Math.floor(v * N)));
    return [l, l, l, grout];
  },
  brick: (u, v) => {
    const rows = 8; const r = Math.floor(v * rows); const off = (r % 2) * 0.5; const bu = (u * 4 + off) % 1; const bv = v * rows - r;
    const mortar = smooth(0.02, 0.06, Math.min(Math.min(bu, 1 - bu) * 2.2, Math.min(bv, 1 - bv)));
    const id = hash(Math.floor(u * 4 + off), r);
    const n = fbm(u, v, 8, 3);
    const l = mortar * (0.62 + id * 0.18) * (0.9 + 0.2 * n) + (1 - mortar) * 1.0;
    return [l, l, l, mortar * 0.9 + n * 0.1];
  },
  plaster: (u, v) => {
    const n = fbm(u, v, 6, 5);
    const l = 0.92 + 0.08 * n;
    return [l, l, l, n * 0.6];
  },
  siding: (u, v) => {
    const N = 8; const fv = (v * N) % 1;
    const shade = 0.78 + 0.22 * smooth(0, 0.18, fv);
    const n = fbm(u, v, 4, 3);
    const l = shade * (0.95 + 0.05 * n);
    return [l, l, l, fv * 0.8];
  },
  roof: (u, v) => {
    const rows = 10; const r = Math.floor(v * rows); const off = (r % 2) * 0.5; const fu = (u * 6 + off) % 1; const fv = v * rows - r;
    const edge = smooth(0, 0.06, Math.min(fu, 1 - fu)) * (0.55 + 0.45 * smooth(0, 0.5, fv));
    const id = hash(Math.floor(u * 6 + off), r);
    const l = (0.7 + 0.3 * edge) * (0.85 + 0.25 * id) * (0.93 + 0.07 * fbm(u, v, 8, 2));
    return [l, l, l, edge * 0.9];
  },
  carpet: (u, v) => {
    const n = fbm(u, v, 16, 3); const f = hash(Math.floor(u * 256), Math.floor(v * 256));
    const l = 0.84 + 0.1 * n + 0.06 * (f - 0.5);
    return [l, l, l, f * 0.5];
  },
  card: (u, v) => {
    const n = fbm(u, v, 6, 3); const fib = vnoise(u * 8, v * 128, 128);
    const l = 0.85 + 0.1 * n + 0.05 * (fib - 0.5);
    return [l, l, l, fib * 0.3];
  },
};

/** Textures dont la couleur est portée par la texture (la couleur de l'objet est alors une teinte relative). */
export const COLORED = new Set();
const NORMAL_STRENGTH = { wood: 1.2, plank: 2.5, metal: 0.6, fabric: 1.5, leaf: 2, grass: 2, asphalt: 1.6, concrete: 1.4, tile: 3, tileS: 3, brick: 4, plaster: 1.2, siding: 4, roof: 4, carpet: 1.5, card: 1 };

const cache = new Map();
/** { map, normalMap } d'une texture (taille 256 ou 512 px selon la qualité). */
export function getTexture(name, size = 256) {
  const key = `${name}@${size}`;
  if (cache.has(key)) return cache.get(key);
  const gen = GEN[name];
  if (!gen || typeof document === 'undefined') return null;
  const N = size;
  const col = new Uint8ClampedArray(N * N * 4);
  const hgt = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [r, g, b, h] = gen(x / N, y / N);
      const i = (y * N + x);
      col[i * 4] = clamp(r) * 255; col[i * 4 + 1] = clamp(g) * 255; col[i * 4 + 2] = clamp(b) * 255; col[i * 4 + 3] = 255;
      hgt[i] = h;
    }
  }
  const nor = new Uint8ClampedArray(N * N * 4);
  const s = NORMAL_STRENGTH[name] || 1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const h = (xx, yy) => hgt[(((yy + N) % N) * N) + ((xx + N) % N)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * s; const dy = (h(x, y + 1) - h(x, y - 1)) * s;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      nor[i] = (-dx / l * 0.5 + 0.5) * 255; nor[i + 1] = (dy / l * 0.5 + 0.5) * 255; nor[i + 2] = (1 / l * 0.5 + 0.5) * 255; nor[i + 3] = 255;
    }
  }
  const mk = (data, srgb) => {
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const out = { map: mk(col, true), normalMap: mk(nor, false) };
  cache.set(key, out);
  return out;
}

export const TEXTURE_NAMES = Object.keys(GEN);
