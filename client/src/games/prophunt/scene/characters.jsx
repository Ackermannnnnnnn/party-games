/**
 * Prop Hunt — personnages : chasseur (soldat articulé qui marche, vise en haut / en bas)
 * et objet (le modèle du catalogue, avec ses matières).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { modelParts, material } from '../world.js';

const M = (color, rough = 0.8, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const mats = {
  suit: M(0x3b4a3a, 0.9), vest: M(0x24302a, 0.85), skin: M(0xd9a582, 0.7), helmet: M(0x2e3a2c, 0.6, 0.1),
  boot: M(0x1b1b1d, 0.8), glove: M(0x222225, 0.8), gun: M(0x1d1f23, 0.45, 0.6), gunL: M(0x3a3d42, 0.5, 0.5), lens: M(0x111a22, 0.1, 0.8),
  strap: M(0x4a3b2a, 0.9), pad: M(0x2a3426, 0.9),
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const G = {
  thigh: box(0.17, 0.46, 0.19), shin: box(0.15, 0.44, 0.16), boot: box(0.16, 0.11, 0.28),
  pelvis: box(0.38, 0.2, 0.22), chest: box(0.44, 0.5, 0.25), vest: box(0.47, 0.38, 0.29), pouch: box(0.1, 0.12, 0.06),
  neck: box(0.1, 0.08, 0.1), head: box(0.21, 0.24, 0.23), helmet: new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  goggles: box(0.2, 0.06, 0.03), upperArm: box(0.11, 0.3, 0.12), foreArm: box(0.1, 0.28, 0.1), hand: box(0.09, 0.09, 0.1),
  receiver: box(0.06, 0.1, 0.42), barrel: new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), mag: box(0.045, 0.16, 0.07), stock: box(0.05, 0.1, 0.22), sight: box(0.03, 0.04, 0.09),
  pad: box(0.13, 0.08, 0.12), radio: box(0.08, 0.14, 0.05),
};

function Mesh({ g, m, p = [0, 0, 0], r = [0, 0, 0] }) {
  return <mesh geometry={g} material={m} position={p} rotation={r} castShadow />;
}

/**
 * Chasseur. `state.current` = { speed (m/s), pitch (rad) } mis à jour par le parent à chaque image.
 * Le personnage regarde vers -z (comme la caméra).
 */
export function HunterModel({ state, color = 0x3b4a3a }) {
  const legL = useRef(); const legR = useRef(); const kneeL = useRef(); const kneeR = useRef();
  const upper = useRef(); const head = useRef(); const root = useRef();
  const phase = useRef(0);
  const suit = useMemo(() => { const m = mats.suit.clone(); m.color.setHex(color); return m; }, [color]);
  useFrame((_, dt) => {
    const s = state.current || {};
    const sp = Math.min(1.4, (s.speed || 0) / 5.2);
    phase.current += dt * (4 + sp * 6) * (sp > 0.05 ? 1 : 0);
    const a = Math.sin(phase.current) * 0.65 * sp;
    if (legL.current) { legL.current.rotation.x = a; legR.current.rotation.x = -a; }
    if (kneeL.current) { kneeL.current.rotation.x = Math.max(0, -Math.sin(phase.current - 0.6)) * 0.9 * sp; kneeR.current.rotation.x = Math.max(0, Math.sin(phase.current - 0.6)) * 0.9 * sp; }
    if (root.current) root.current.position.y = Math.abs(Math.cos(phase.current)) * 0.05 * sp;
    const pitch = s.pitch || 0;
    if (upper.current) upper.current.rotation.x = pitch * 0.55;
    if (head.current) head.current.rotation.x = pitch * 0.45;
  });
  return (
    <group ref={root}>
      {/* jambes */}
      {[[-0.11, legL, kneeL], [0.11, legR, kneeR]].map(([x, leg, knee]) => (
        <group key={x} ref={leg} position={[x, 0.95, 0]}>
          <Mesh g={G.thigh} m={suit} p={[0, -0.23, 0]} />
          <Mesh g={G.pad} m={mats.pad} p={[0, -0.47, -0.07]} />
          <group ref={knee} position={[0, -0.47, 0]}>
            <Mesh g={G.shin} m={suit} p={[0, -0.22, 0]} />
            <Mesh g={G.boot} m={mats.boot} p={[0, -0.44, -0.04]} />
          </group>
        </group>
      ))}
      <Mesh g={G.pelvis} m={suit} p={[0, 0.98, 0]} />
      {/* haut du corps (se penche avec le regard) */}
      <group ref={upper} position={[0, 1.08, 0]}>
        <Mesh g={G.chest} m={suit} p={[0, 0.24, 0]} />
        <Mesh g={G.vest} m={mats.vest} p={[0, 0.27, 0]} />
        <Mesh g={G.pouch} m={mats.strap} p={[-0.13, 0.12, -0.16]} />
        <Mesh g={G.pouch} m={mats.strap} p={[0.0, 0.12, -0.16]} />
        <Mesh g={G.pouch} m={mats.strap} p={[0.13, 0.12, -0.16]} />
        <Mesh g={G.radio} m={mats.gunL} p={[0.16, 0.33, 0.16]} />
        <group ref={head} position={[0, 0.54, 0]}>
          <Mesh g={G.neck} m={mats.skin} p={[0, -0.02, 0]} />
          <Mesh g={G.head} m={mats.skin} p={[0, 0.12, 0]} />
          <Mesh g={G.helmet} m={mats.helmet} p={[0, 0.19, 0.0]} />
          <Mesh g={G.goggles} m={mats.lens} p={[0, 0.17, -0.12]} />
        </group>
        {/* bras + fusil, tenus devant */}
        <group position={[0, 0.36, 0]}>
          <Mesh g={G.upperArm} m={suit} p={[0.27, -0.08, -0.08]} r={[0.9, 0, -0.15]} />
          <Mesh g={G.foreArm} m={suit} p={[0.2, -0.16, -0.3]} r={[1.45, 0, 0.5]} />
          <Mesh g={G.hand} m={mats.glove} p={[0.1, -0.16, -0.38]} />
          <Mesh g={G.upperArm} m={suit} p={[-0.27, -0.08, -0.1]} r={[1.0, 0, 0.2]} />
          <Mesh g={G.foreArm} m={suit} p={[-0.14, -0.12, -0.38]} r={[1.5, 0, -0.6]} />
          <Mesh g={G.hand} m={mats.glove} p={[-0.02, -0.1, -0.56]} />
          <group position={[0.04, -0.06, -0.42]}>
            <Mesh g={G.receiver} m={mats.gun} p={[0, 0, 0]} />
            <Mesh g={G.barrel} m={mats.gunL} p={[0, 0.02, -0.38]} r={[Math.PI / 2, 0, 0]} />
            <Mesh g={G.mag} m={mats.gun} p={[0, -0.11, -0.05]} r={[0.2, 0, 0]} />
            <Mesh g={G.stock} m={mats.gun} p={[0, -0.02, 0.3]} />
            <Mesh g={G.sight} m={mats.gunL} p={[0, 0.07, 0.02]} />
          </group>
        </group>
      </group>
    </group>
  );
}

/** Objet du catalogue (déguisement, leurre). */
export function PropModel({ m, s = 1, castShadow = true }) {
  const parts = useMemo(() => modelParts(m), [m]);
  return (
    <group scale={s}>
      {parts.map(({ key, geometry }) => <mesh key={key} geometry={geometry} material={material(key)} castShadow={castShadow} receiveShadow />)}
    </group>
  );
}

/** Étiquette de nom au-dessus d'un joueur. */
export function NameTag({ name, color = '#fecaca', y = 2.2 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 30px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.min(250, g.measureText(name).width + 28);
    g.fillStyle = 'rgba(10,10,20,0.55)'; g.beginPath(); g.roundRect?.(128 - w / 2, 10, w, 44, 22); g.fill();
    g.fillStyle = color; g.fillText(name.slice(0, 16), 128, 33);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [name, color]);
  return <sprite position={[0, y, 0]} scale={[1.1, 0.28, 1]}><spriteMaterial map={tex} depthWrite={false} transparent fog={false} /></sprite>;
}
