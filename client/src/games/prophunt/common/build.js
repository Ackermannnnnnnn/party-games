/**
 * Prop Hunt — les maps (partagé client / serveur, copié tel quel côté serveur).
 *
 * Une map = des volumes fixes (sols, murs, plafonds : boîtes alignées), du décor sans collision
 * (toits en pente…), des objets posés (modèles du catalogue) et des points de départ.
 * Les volumes « clip » sont invisibles : ils empêchent de monter sur les toits ou de sortir.
 */
import { MODELS } from './models.js';

export const PI = Math.PI;


export function builder() {
  const solids = []; // { x, y, z, w, h, d, mat, inv, ghost, ns }
  const deco = [];   // ['box', x, y, z, w, h, d, mat, rx, ry, rz] | ['prism', x, y, z, w, h, d, mat, ry]
  const objects = []; // { m, x, y, z, ry, s }
  const lights = []; // [x, y, z, couleur, intensité, portée] lampes intérieures
  const b = {
    solids, deco, objects, lights,
    light(x, y, z, color = 0xffe2b8, intensity = 6, dist = 9) { lights.push([x, y, z, color, intensity, dist]); b.box(x, y + 0.05, z, 0.5, 0.04, 0.5, 'light', { ghost: true }); },
    box(x, y, z, w, h, d, mat, o = {}) { if (w > 0.001 && h > 0.001 && d > 0.001) solids.push({ x, y, z, w, h, d, mat, inv: !!o.inv, ghost: !!o.ghost, ns: !!o.ns }); },
    /** Dalle définie par ses bords, dessus à `top`. */
    slab(x1, z1, x2, z2, top, t, mat, o) { b.box((x1 + x2) / 2, top - t / 2, (z1 + z2) / 2, Math.abs(x2 - x1), t, Math.abs(z2 - z1), mat, o); },
    /** Volume invisible (on ne peut pas y entrer) de y0 à y1. */
    clip(x1, z1, x2, z2, y0, y1 = 40) { b.box((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2, Math.abs(x2 - x1), y1 - y0, Math.abs(z2 - z1), 0, { inv: true }); },
    /**
     * Mur le long de X (à z), de y0 à y1. gaps : [[début, fin, basY, hautY]] en hauteurs absolues.
     * Une ouverture qui ne touche pas le sol est une fenêtre : vitre + rebord.
     * inner : matière de la face intérieure, côté `side` (+1 = côté z positif).
     */
    wx(x1, x2, z, y0, y1, mat, { gaps = [], t = 0.2, inner = null, side = 1, glass = true } = {}) {
      const layers = inner ? [[mat, z - side * t / 4, t / 2], [inner, z + side * t / 4, t / 2]] : [[mat, z, t]];
      const gs = [...gaps].sort((a, c) => a[0] - c[0]);
      for (const [m, zz, tt] of layers) {
        let x = x1;
        for (const g of gs) { b.box((x + g[0]) / 2, (y0 + y1) / 2, zz, g[0] - x, y1 - y0, tt, m); x = g[1]; }
        b.box((x + x2) / 2, (y0 + y1) / 2, zz, x2 - x, y1 - y0, tt, m);
        for (const g of gs) {
          const lo = g[2] ?? y0; const hi = g[3] ?? Math.min(y1, y0 + 2.2);
          if (lo > y0) b.box((g[0] + g[1]) / 2, (y0 + lo) / 2, zz, g[1] - g[0], lo - y0, tt, m);
          if (hi < y1) b.box((g[0] + g[1]) / 2, (hi + y1) / 2, zz, g[1] - g[0], y1 - hi, tt, m);
        }
      }
      for (const g of gs) {
        if ((g[2] ?? y0) > y0 + 0.05 && glass && g[4] !== false) {
          b.box((g[0] + g[1]) / 2, (g[2] + g[3]) / 2, z, g[1] - g[0], g[3] - g[2], 0.03, 'glass');
          b.box((g[0] + g[1]) / 2, g[2] + 0.02, z, g[1] - g[0] + 0.1, 0.04, t + 0.12, 'paint:f4f4f0');
        }
      }
    },
    /** Mur le long de Z (à x). Mêmes options que wx (side +1 = côté x positif). */
    wz(z1, z2, x, y0, y1, mat, { gaps = [], t = 0.2, inner = null, side = 1, glass = true } = {}) {
      const layers = inner ? [[mat, x - side * t / 4, t / 2], [inner, x + side * t / 4, t / 2]] : [[mat, x, t]];
      const gs = [...gaps].sort((a, c) => a[0] - c[0]);
      for (const [m, xx, tt] of layers) {
        let z = z1;
        for (const g of gs) { b.box(xx, (y0 + y1) / 2, (z + g[0]) / 2, tt, y1 - y0, g[0] - z, m); z = g[1]; }
        b.box(xx, (y0 + y1) / 2, (z + z2) / 2, tt, y1 - y0, z2 - z, m);
        for (const g of gs) {
          const lo = g[2] ?? y0; const hi = g[3] ?? Math.min(y1, y0 + 2.2);
          if (lo > y0) b.box(xx, (y0 + lo) / 2, (g[0] + g[1]) / 2, tt, lo - y0, g[1] - g[0], m);
          if (hi < y1) b.box(xx, (hi + y1) / 2, (g[0] + g[1]) / 2, tt, y1 - hi, g[1] - g[0], m);
        }
      }
      for (const g of gs) {
        if ((g[2] ?? y0) > y0 + 0.05 && glass && g[4] !== false) {
          b.box(x, (g[2] + g[3]) / 2, (g[0] + g[1]) / 2, 0.03, g[3] - g[2], g[1] - g[0], 'glass');
          b.box(x, g[2] + 0.02, (g[0] + g[1]) / 2, t + 0.12, 0.04, g[1] - g[0] + 0.1, 'paint:f4f4f0');
        }
      }
    },
    obj(m, x, z, ry = 0, y = 0, s = 1, o = null) {
      if (!MODELS[m]) throw new Error(`modèle inconnu : ${m}`);
      const e = { m, x, y, z, ry, s };
      if (o?.tint) e.t = o.tint;
      objects.push(e);
    },
    decoBox(x, y, z, w, h, d, mat, rx = 0, ry = 0, rz = 0) { deco.push(['box', x, y, z, w, h, d, mat, rx, ry, rz]); },
    prism(x, y, z, w, h, d, mat, ry = 0) { deco.push(['prism', x, y, z, w, h, d, mat, ry]); },
    /** Murs invisibles autour de la zone de jeu. */
    bounds(x1, x2, z1, z2, h = 40) {
      b.box((x1 + x2) / 2, h / 2 - 2, z1 - 1, x2 - x1 + 4, h, 2, 0, { inv: true });
      b.box((x1 + x2) / 2, h / 2 - 2, z2 + 1, x2 - x1 + 4, h, 2, 0, { inv: true });
      b.box(x1 - 1, h / 2 - 2, (z1 + z2) / 2, 2, h, z2 - z1 + 4, 0, { inv: true });
      b.box(x2 + 1, h / 2 - 2, (z1 + z2) / 2, 2, h, z2 - z1 + 4, 0, { inv: true });
    },
    /** Sol épais (1 m) avec des trous rectangulaires [[x1, z1, x2, z2]]. */
    ground(x1, z1, x2, z2, mat, holes = []) {
      const rects = [[x1, z1, x2, z2]];
      for (const h of holes) {
        for (let i = rects.length - 1; i >= 0; i--) {
          const [a, c, e, f] = rects[i];
          if (h[0] >= e || h[2] <= a || h[1] >= f || h[3] <= c) continue;
          rects.splice(i, 1);
          if (h[1] > c) rects.push([a, c, e, h[1]]);
          if (h[3] < f) rects.push([a, h[3], e, f]);
          const zc = Math.max(c, h[1]); const zf = Math.min(f, h[3]);
          if (h[0] > a) rects.push([a, zc, h[0], zf]);
          if (h[2] < e) rects.push([h[2], zc, e, zf]);
        }
      }
      for (const [a, c, e, f] of rects) b.slab(a, c, e, f, 0, 1, mat);
    },
    /** Escalier qui monte de (x, z) dans la direction (dx, dz) : n marches de `rise` × `run`, largeur w. */
    stairs(x, z, dx, dz, y0, n, rise, run, w, mat) {
      for (let i = 0; i < n; i++) {
        const top = y0 + rise * (i + 1);
        const cx = x + dx * run * (i + 0.5); const cz = z + dz * run * (i + 0.5);
        b.box(cx, (y0 + top) / 2, cz, dx ? run : w, top - y0, dz ? run : w, mat);
      }
    },
    /** Clôture faite de segments de 2 m entre deux points (alignés sur X ou Z), avec trous. */
    fenceLine(m, x1, z1, x2, z2, skip = []) {
      const len = Math.hypot(x2 - x1, z2 - z1); const n = Math.round(len / 2);
      const ry = Math.abs(x2 - x1) > Math.abs(z2 - z1) ? 0 : PI / 2;
      for (let i = 0; i < n; i++) {
        if (skip.includes(i)) continue;
        const k = (i + 0.5) / n;
        b.obj(m, x1 + (x2 - x1) * k, z1 + (z2 - z1) * k, ry);
      }
    },
  };
  return b;
}

/** Repère local tourné de 0 ou 180° (maisons face à face) : x = cx ± lx, z = cz ± lz. */
export function local(b, cx, cz, flip) {
  const s = flip ? -1 : 1;
  const X = (v) => cx + s * v; const Z = (v) => cz + s * v;
  const rng = (f, a, c) => (flip ? [f(c), f(a)] : [f(a), f(c)]);
  const gapsX = (gaps) => gaps.map((g) => { const [a, c] = rng(X, g[0], g[1]); return [a, c, g[2], g[3], g[4]]; });
  const gapsZ = (gaps) => gaps.map((g) => { const [a, c] = rng(Z, g[0], g[1]); return [a, c, g[2], g[3], g[4]]; });
  return {
    X, Z,
    box: (x, y, z, w, h, d, mat, o) => b.box(X(x), y, Z(z), w, h, d, mat, o),
    light: (x, y, z, c, i, d) => b.light(X(x), y, Z(z), c, i, d),
    slab: (x1, z1, x2, z2, top, t, mat, o) => b.slab(X(x1), Z(z1), X(x2), Z(z2), top, t, mat, o),
    clip: (x1, z1, x2, z2, y0, y1) => b.clip(X(x1), Z(z1), X(x2), Z(z2), y0, y1),
    wx: (x1, x2, z, y0, y1, mat, o = {}) => { const [a, c] = rng(X, x1, x2); b.wx(a, c, Z(z), y0, y1, mat, { ...o, gaps: gapsX(o.gaps || []), side: (o.side ?? 1) * s }); },
    wz: (z1, z2, x, y0, y1, mat, o = {}) => { const [a, c] = rng(Z, z1, z2); b.wz(a, c, X(x), y0, y1, mat, { ...o, gaps: gapsZ(o.gaps || []), side: (o.side ?? 1) * s }); },
    obj: (m, x, z, ry = 0, y = 0, sc = 1, o = null) => b.obj(m, X(x), Z(z), ry + (flip ? PI : 0), y, sc, o),
    decoBox: (x, y, z, w, h, d, mat, rx = 0, ry = 0, rz = 0) => b.decoBox(X(x), y, Z(z), w, h, d, mat, rx, ry + (flip ? PI : 0), rz),
    prism: (x, y, z, w, h, d, mat, ry = 0) => b.prism(X(x), y, Z(z), w, h, d, mat, ry + (flip ? PI : 0)),
    stairs: (x, z, dx, dz, y0, n, rise, run, w, mat) => b.stairs(X(x), Z(z), dx * s, dz * s, y0, n, rise, run, w, mat),
    fenceLine: (m, x1, z1, x2, z2, skip) => b.fenceLine(m, X(x1), Z(z1), X(x2), Z(z2), skip),
    /** Rectangle local → rectangle monde [x1, z1, x2, z2] trié. */
    rect: (x1, z1, x2, z2) => { const [a, c] = rng(X, x1, x2); const [e, f] = rng(Z, z1, z2); return [a, e, c, f]; },
  };
}
