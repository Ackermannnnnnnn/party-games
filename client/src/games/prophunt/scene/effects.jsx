/**
 * Prop Hunt — effets : traînées de balles, étincelles, impacts sur les murs, éclair du canon,
 * notes de musique des moqueries, explosion de confettis quand un caché est trouvé.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_SPARKS = 400;
const MAX_DECALS = 120;

/** File d'effets partagée entre la logique de jeu et le rendu. */
export function createFx() {
  return {
    tracers: [], // { from, to, at }
    sparks: [],  // { p:[x,y,z], v:[x,y,z], life, max, color }
    decals: [],  // { p, n }
    sprites: [], // { kind: 'note'|'poof', p, at }
    flash: null, // { p, at }
    decalDirty: true,
    tracer(from, to) { this.tracers.push({ from, to, at: performance.now() }); },
    impact(p, n, { decal = true, color = 0xffd27a, count = 8 } = {}) {
      const nn = n || [0, 1, 0];
      for (let i = 0; i < count; i++) {
        const v = [nn[0] * 2 + (Math.random() - 0.5) * 3, nn[1] * 2 + Math.random() * 2, nn[2] * 2 + (Math.random() - 0.5) * 3];
        this.sparks.push({ p: [...p], v, life: 0, max: 0.25 + Math.random() * 0.25, color });
      }
      // petite poussière grise
      for (let i = 0; i < 4; i++) this.sparks.push({ p: [...p], v: [nn[0] * 0.6 + (Math.random() - 0.5), nn[1] * 0.6 + Math.random() * 0.6, nn[2] * 0.6 + (Math.random() - 0.5)], life: 0, max: 0.5, color: 0x9a9a9a, dust: true });
      if (decal && n) { this.decals.push({ p, n }); if (this.decals.length > MAX_DECALS) this.decals.shift(); this.decalDirty = true; }
    },
    confetti(p) {
      const cols = [0xff4d6d, 0xffd23f, 0x3ec1d3, 0x8ac926, 0xb388eb, 0xffffff];
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2; const s = 2 + Math.random() * 4;
        this.sparks.push({ p: [p[0], p[1] + 0.5, p[2]], v: [Math.cos(a) * s, 3 + Math.random() * 5, Math.sin(a) * s], life: 0, max: 1.2 + Math.random() * 0.8, color: cols[i % cols.length], heavy: true });
      }
      this.sprites.push({ kind: 'poof', p, at: performance.now() });
    },
    note(p, forced) { this.sprites.push({ kind: 'note', p, at: performance.now(), forced }); },
    muzzle(p, sprite = true) { this.flash = { p, at: performance.now(), sprite }; },
    clear() { this.tracers = []; this.sparks = []; this.decals = []; this.sprites = []; this.decalDirty = true; },
  };
}

function holeTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(10,10,10,1)'); gr.addColorStop(0.35, 'rgba(25,22,20,0.95)'); gr.addColorStop(0.6, 'rgba(60,55,50,0.5)'); gr.addColorStop(1, 'rgba(60,55,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function emojiTexture(ch) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d'); g.font = '100px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function flashTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.2, 'rgba(255,210,120,0.9)'); gr.addColorStop(0.5, 'rgba(255,140,40,0.35)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,230,160,0.8)'; g.lineWidth = 6;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
export const FLASH_TEXTURE = typeof document !== 'undefined' ? flashTexture() : null;

export function Effects({ fx, quality }) {
  const lineGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), []);
  const sparkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const sparkMat = useMemo(() => new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, fog: false, map: dotTexture(), alphaTest: 0.05 }), []);
  const decals = useRef();
  const decalGeo = useMemo(() => new THREE.PlaneGeometry(0.1, 0.1), []);
  const decalMat = useMemo(() => new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), []);
  const noteMat = useMemo(() => new THREE.SpriteMaterial({ map: emojiTexture('🎵'), transparent: true, depthWrite: false, fog: false }), []);
  const poofMat = useMemo(() => new THREE.SpriteMaterial({ map: emojiTexture('💥'), transparent: true, depthWrite: false, fog: false }), []);
  const spriteGroup = useRef();
  const sprites = useRef([]);
  const light = useRef();
  const flashSprite = useRef();
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color(), n: new THREE.Vector3() }), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const now = performance.now();
    // traînées
    fx.tracers = fx.tracers.filter((t) => now - t.at < 90);
    const pts = [];
    for (const t of fx.tracers) pts.push(...t.from, ...t.to);
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    // étincelles, poussière, confettis
    const pos = sparkGeo.attributes.position.array; const col = sparkGeo.attributes.color.array;
    fx.sparks = fx.sparks.filter((s) => (s.life += dt) < s.max).slice(-MAX_SPARKS);
    fx.sparks.forEach((s, i) => {
      s.v[1] -= (s.heavy ? 6 : s.dust ? 1 : 12) * dt;
      if (s.heavy) { s.v[0] *= 0.98; s.v[2] *= 0.98; }
      s.p[0] += s.v[0] * dt; s.p[1] += s.v[1] * dt; s.p[2] += s.v[2] * dt;
      pos[i * 3] = s.p[0]; pos[i * 3 + 1] = s.p[1]; pos[i * 3 + 2] = s.p[2];
      tmp.c.setHex(s.color); const k = s.heavy ? 1 : 1 - s.life / s.max;
      col[i * 3] = tmp.c.r * k; col[i * 3 + 1] = tmp.c.g * k; col[i * 3 + 2] = tmp.c.b * k;
    });
    sparkGeo.setDrawRange(0, fx.sparks.length);
    sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
    // impacts
    if (fx.decalDirty && decals.current) {
      fx.decalDirty = false;
      const im = decals.current;
      fx.decals.forEach((d, i) => {
        tmp.n.set(...d.n);
        tmp.o.position.set(d.p[0] + d.n[0] * 0.004, d.p[1] + d.n[1] * 0.004, d.p[2] + d.n[2] * 0.004);
        tmp.o.lookAt(tmp.o.position.x + d.n[0], tmp.o.position.y + d.n[1], tmp.o.position.z + d.n[2]);
        tmp.o.rotateZ(i * 1.7); tmp.o.scale.setScalar(0.8 + ((i * 37) % 10) / 20);
        tmp.o.updateMatrix(); im.setMatrixAt(i, tmp.o.matrix);
      });
      im.count = fx.decals.length; im.instanceMatrix.needsUpdate = true;
    }
    // éclair du canon
    const f = fx.flash; const on = f && now - f.at < 55;
    if (light.current) { light.current.intensity = on ? 6 : 0; if (on) light.current.position.set(...f.p); }
    if (flashSprite.current) { flashSprite.current.visible = !!on && f.sprite; if (on && f.sprite) { flashSprite.current.position.set(...f.p); flashSprite.current.material.rotation = Math.random() * 6; } }
    // notes de moquerie, explosions
    fx.sprites = fx.sprites.filter((s) => now - s.at < 1600);
    while (sprites.current.length < fx.sprites.length) { const s = new THREE.Sprite(noteMat.clone()); spriteGroup.current.add(s); sprites.current.push(s); }
    sprites.current.forEach((s, i) => {
      const e = fx.sprites[i]; s.visible = !!e;
      if (!e) return;
      const k = (now - e.at) / 1600;
      s.material.map = e.kind === 'poof' ? poofMat.map : noteMat.map;
      s.material.opacity = 1 - k;
      if (e.kind === 'poof') { s.position.set(e.p[0], e.p[1] + 0.8, e.p[2]); s.scale.setScalar(0.6 + k * 2.6); } else { s.scale.setScalar(e.forced ? 0.8 : 0.6); s.position.set(e.p[0] + Math.sin(k * 9) * 0.25, e.p[1] + 1 + k * 1.6, e.p[2]); }
    });
  });

  return (
    <>
      <lineSegments geometry={lineGeo} material={lineMat} frustumCulled={false} />
      <points geometry={sparkGeo} material={sparkMat} frustumCulled={false} />
      <instancedMesh ref={decals} args={[decalGeo, decalMat, MAX_DECALS]} frustumCulled={false} />
      <group ref={spriteGroup} />
      {quality !== 'low' && <pointLight ref={light} color={0xffc070} distance={7} decay={2} intensity={0} />}
      <sprite ref={flashSprite} scale={[0.5, 0.5, 1]} visible={false}><spriteMaterial map={FLASH_TEXTURE} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} /></sprite>
    </>
  );
}
