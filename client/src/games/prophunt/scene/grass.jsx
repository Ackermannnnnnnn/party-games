/**
 * Prop Hunt — herbe en 3D sur les pelouses : des dizaines de milliers de brins (instanciés,
 * regroupés par zones de 8 m pour n'afficher que ce qui est visible), qui ondulent au vent.
 * Pas de brins sous les objets, les allées ou les murs posés sur la pelouse.
 */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODELS } from '../shared.js';
import { objectBox, obbToAabb } from '../world.js';
import { wind } from '../assets3d.js';

const CELL = 8;

/** Une touffe : 7 brins effilés (3 segments chacun), hauteur 1, légèrement courbés, orientés au hasard. */
function bladeGeometry() {
  const pos = []; const nor = []; const t = []; const idx = [];
  let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let b = 0; b < 7; b++) {
    const a = rnd() * Math.PI * 2; const r = b === 0 ? 0 : 0.04 + rnd() * 0.1;
    const ox = Math.cos(a) * r; const oz = Math.sin(a) * r; const rot = rnd() * Math.PI;
    const hb = 0.65 + rnd() * 0.45; const lean = (rnd() - 0.5) * 0.25;
    const c = Math.cos(rot); const sn = Math.sin(rot);
    const base = pos.length / 3;
    for (let i = 0; i <= 3; i++) {
      const y = i / 3; const w = 0.022 * (1 - y * 0.85); const bend = y * y * (0.1 + lean);
      const pts = i < 3 ? [[-w, bend], [w, bend]] : [[0, bend]];
      for (const [lx, lz] of pts) { pos.push(ox + lx * c - lz * sn, y * hb, oz + lx * sn + lz * c); nor.push(0, 1, 0); t.push(y * hb); }
    }
    idx.push(...[0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6].map((k) => k + base));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('h', new THREE.Float32BufferAttribute(t, 1));
  g.setIndex(idx);
  return g;
}

function grassMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; attribute float h; varying float vH; varying float vTint;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vH = h;
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vTint = fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5453);
        float gust = sin(uTime * 1.6 + ip.x * 0.18 + ip.z * 0.13) * 0.5 + 0.5;
        float sway = (sin(uTime * 2.3 + ip.x * 1.7 + ip.z * 1.3) * 0.35 + gust * 0.65) * h * h;
        transformed.z += sway * 0.28;
        transformed.x += sin(uTime * 1.9 + ip.z * 2.1) * 0.06 * h * h;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH; varying float vTint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 base = mix(vec3(0.02, 0.045, 0.01), vec3(0.04, 0.07, 0.015), vTint);
        vec3 tip = mix(vec3(0.11, 0.24, 0.04), vec3(0.2, 0.28, 0.06), vTint);
        diffuseColor.rgb = mix(base, tip, pow(vH, 0.8));`)
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''))
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n reflectedLight.indirectDiffuse *= mix(0.45, 1.0, vH);');
  };
  m.customProgramCacheKey = () => 'grass-blades';
  return m;
}

/** Positions des brins, par zone : Map(cellKey → Float32Array [x, y, z, rot, scale…]). */
function scatter(map, density) {
  const lawns = map.solids.filter((s) => !s.inv && String(s.mat).split(':')[0] === 'grass');
  if (!lawns.length) return [];
  // tout ce qui est posé sur la pelouse (allées, murs, objets) : boîtes au sol
  const blockers = [];
  for (const s of map.solids) {
    if (s.inv || lawns.includes(s)) continue;
    blockers.push({ minX: s.x - s.w / 2, maxX: s.x + s.w / 2, minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2, minY: s.y - s.h / 2, maxY: s.y + s.h / 2 });
  }
  for (const d of map.deco || []) {
    if (d[0] !== 'box') continue;
    const r = Math.max(d[4], d[6]) / 2;
    blockers.push({ minX: d[1] - r, maxX: d[1] + r, minZ: d[3] - r, maxZ: d[3] + r, minY: d[2] - d[5] / 2, maxY: d[2] + d[5] / 2 });
  }
  for (const o of map.objects) {
    if (!MODELS[o.m]) continue;
    const b = obbToAabb(objectBox(o));
    if (o.m.startsWith('tree/')) { const r = 0.5 * (o.s || 1); blockers.push({ minX: o.x - r, maxX: o.x + r, minZ: o.z - r, maxZ: o.z + r, minY: o.y, maxY: o.y + 3 }); continue; }
    blockers.push(b);
  }
  const hash = new Map();
  const hk = (x, z) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
  for (const b of blockers) for (let x = Math.floor(b.minX / 4); x <= Math.floor(b.maxX / 4); x++) for (let z = Math.floor(b.minZ / 4); z <= Math.floor(b.maxZ / 4); z++) {
    const k = `${x},${z}`; if (!hash.has(k)) hash.set(k, []); hash.get(k).push(b);
  }
  let seed = 1234567;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cells = new Map();
  const step = 1 / Math.sqrt(density);
  for (const s of lawns) {
    const top = s.y + s.h / 2;
    const x0 = s.x - s.w / 2; const z0 = s.z - s.d / 2;
    for (let gx = x0 + step / 2; gx < x0 + s.w; gx += step) {
      for (let gz = z0 + step / 2; gz < z0 + s.d; gz += step) {
        const x = gx + (rnd() - 0.5) * step; const z = gz + (rnd() - 0.5) * step;
        const bl = hash.get(hk(x, z));
        if (bl && bl.some((b) => x > b.minX - 0.05 && x < b.maxX + 0.05 && z > b.minZ - 0.05 && z < b.maxZ + 0.05 && b.maxY > top + 0.002 && b.minY < top + 0.6)) continue;
        const ck = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
        if (!cells.has(ck)) cells.set(ck, []);
        cells.get(ck).push(x, top, z, rnd() * Math.PI * 2, 0.16 + rnd() * rnd() * 0.24);
      }
    }
  }
  return [...cells.values()];
}

export function GrassField({ map, quality }) {
  const density = quality === 'high' ? 16 : quality === 'medium' ? 10 : 0;
  const geo = useMemo(() => bladeGeometry(), []);
  const mat = useMemo(() => grassMaterial(), []);
  const meshes = useMemo(() => {
    if (!density) return [];
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const p = new THREE.Vector3(); const sc = new THREE.Vector3();
    return scatter(map, density).map((arr) => {
      const n = arr.length / 5;
      const im = new THREE.InstancedMesh(geo, mat, n);
      for (let i = 0; i < n; i++) {
        const s = arr[i * 5 + 4];
        m4.compose(p.set(arr[i * 5], arr[i * 5 + 1], arr[i * 5 + 2]), q.setFromAxisAngle(up, arr[i * 5 + 3]), sc.set(0.8 + s, s, 0.8 + s));
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.receiveShadow = true; im.castShadow = false; im.userData.n = n;
      return im;
    });
  }, [map, density, geo, mat]);
  useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes]);
  // loin de la caméra : moins de touffes, puis plus du tout
  let frame = 0;
  useFrame(({ camera }) => {
    frame += 1; if (frame % 6) return;
    for (const m of meshes) {
      const d = m.boundingSphere.center.distanceTo(camera.position) - m.boundingSphere.radius;
      m.visible = d < 48;
      m.count = Math.max(1, Math.floor(m.userData.n * Math.max(0.12, Math.min(1, 1 - (d - 10) / 34))));
    }
  });
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
}
