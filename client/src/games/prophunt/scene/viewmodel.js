/**
 * Prop Hunt — l'arme du chasseur vue à la première personne (dessinée par-dessus la scène) :
 * modèles 3D Kenney (mitraillette, fusil à pompe, grenade, couteau), balancement à la marche,
 * recul, rechargement, coup de couteau, lancer de grenade, éclair au bout du canon.
 */
import * as THREE from 'three';
import { FLASH_TEXTURE } from './effects.jsx';
import { weaponInstance } from './rigs.js';

const std = (color, rough, metal) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

/** Position de l'arme devant la caméra (x droite, y haut, z avant négatif) et bout du canon. */
const POSE = {
  smg: { pos: [0.15, -0.16, -0.36], muzzle: [0, 0.02, -0.52], scale: 0.44 },
  shotgun: { pos: [0.15, -0.16, -0.34], muzzle: [0, 0.02, -0.55], scale: 0.42 },
  grenade: { pos: [0.19, -0.19, -0.38], muzzle: [0, 0, 0], scale: 0.55 },
  knife: { pos: [0.2, -0.19, -0.36], muzzle: [0, 0, -0.2], scale: 0.55, rot: [0.2, 0.2, 0] },
};

export function createViewmodel() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1, 2, 1.5); scene.add(key);
  const glove = std(0x1f2022, 0.85, 0); const sleeve = std(0x3b4a3a, 0.95, 0);
  const B = (w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };

  const root = new THREE.Group(); // suit la caméra
  const gun = new THREE.Group(); root.add(gun);
  const holder = new THREE.Group(); gun.add(holder);
  // mains et manches (communes à toutes les armes)
  const handR = new THREE.Group(); handR.add(B(0.08, 0.09, 0.1, glove, 0, 0, 0), B(0.09, 0.09, 0.34, sleeve, 0.02, -0.04, 0.2, 0.35, 0.05)); gun.add(handR);
  const handL = new THREE.Group(); handL.add(B(0.085, 0.07, 0.1, glove, 0, 0, 0), B(0.09, 0.09, 0.42, sleeve, -0.08, -0.05, 0.2, 0.15, -0.45)); gun.add(handL);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEXTURE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  flash.scale.setScalar(0.3); flash.visible = false; gun.add(flash);
  const muzzle = new THREE.Object3D(); gun.add(muzzle);
  scene.add(root);
  scene.visible = false;

  const st = { recoil: 0, bob: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, flashAt: 0, reloadT: -1, reloadDur: 2000, swingT: -1, throwT: -1, drawT: 0, weapon: null, aim: 0 };
  const tmp = new THREE.Vector3();
  let wanted = null;
  const setWeapon = async (id) => {
    if (wanted === id) return; wanted = id; st.drawT = performance.now();
    const w = await weaponInstance(id).catch(() => null);
    if (wanted !== id || !w) return;
    holder.clear(); holder.add(w); st.weapon = id;
    const p = POSE[id];
    holder.scale.setScalar(p.scale); holder.rotation.set(...(p.rot || [0, 0, 0]));
    muzzle.position.set(...p.muzzle).multiplyScalar(p.scale / 0.62);
    flash.position.copy(muzzle.position).add(new THREE.Vector3(0, 0, -0.04));
    // mains : poignée et garde-main
    const two = id === 'smg' || id === 'shotgun';
    handR.position.set(0, -0.07, 0.05); handL.visible = two; handL.position.set(-0.01, -0.05, -0.25);
  };
  return {
    scene, root, muzzle, setWeapon,
    kick(amount = 1) { st.recoil = Math.min(1.6, st.recoil + 0.55 * amount); st.flashAt = performance.now(); },
    reload(ms) { st.reloadT = performance.now(); st.reloadDur = ms; },
    swing() { st.swingT = performance.now(); },
    throwAnim() { st.throwT = performance.now(); },
    muzzleWorld() { muzzle.getWorldPosition(tmp); return [tmp.x, tmp.y, tmp.z]; },
    /** À chaque image : place l'arme devant la caméra. moving = 0..1 (vitesse). */
    update(camera, dt, { yaw, pitch, moving = 0, grounded = true, visible = true, aim = false }) {
      scene.visible = visible;
      if (!visible) return;
      root.position.copy(camera.position); root.quaternion.copy(camera.quaternion);
      st.recoil *= Math.exp(-dt * 11);
      st.aim += ((aim ? 1 : 0) - st.aim) * Math.min(1, dt * 12);
      st.bob += dt * (grounded ? 7 + moving * 5 : 0) * Math.max(0.15, moving);
      let dy = yaw - st.lastYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      st.swayX += (Math.max(-0.05, Math.min(0.05, dy * 0.5)) - st.swayX) * Math.min(1, dt * 10);
      st.swayY += (Math.max(-0.05, Math.min(0.05, (pitch - st.lastPitch) * 0.5)) - st.swayY) * Math.min(1, dt * 10);
      st.lastYaw = yaw; st.lastPitch = pitch;
      const p = POSE[st.weapon || wanted] || POSE.smg;
      const m = moving * (1 - st.aim * 0.8);
      const bx = Math.sin(st.bob) * 0.012 * m; const by = Math.abs(Math.cos(st.bob)) * 0.012 * m;
      // en visant : l'arme se recentre sous l'œil
      const ax = p.pos[0] * (1 - st.aim * 0.95); const ay = p.pos[1] * (1 - st.aim * 0.35);
      const draw = Math.max(0, 1 - (performance.now() - st.drawT) / 300);
      gun.position.set(ax + bx + st.swayX * 0.6, ay + by - st.swayY * 0.4 + st.recoil * 0.008 - draw * 0.25, p.pos[2] + st.recoil * 0.035);
      gun.rotation.set(st.recoil * 0.07 + st.swayY - draw * 0.6, st.swayX, 0);
      const now = performance.now();
      if (st.reloadT >= 0) {
        const k = (now - st.reloadT) / st.reloadDur;
        if (k >= 1) st.reloadT = -1;
        else { const tilt = Math.sin(Math.min(1, k * 1.25) * Math.PI); gun.rotation.x -= tilt * 0.45; gun.rotation.z += tilt * 0.5; gun.position.y -= tilt * 0.06; }
      }
      if (st.swingT >= 0) {
        const k = (now - st.swingT) / 380;
        if (k >= 1) st.swingT = -1;
        else { const s = Math.sin(k * Math.PI); gun.position.x -= s * 0.22; gun.position.z -= s * 0.18; gun.rotation.y += s * 1.1; gun.rotation.z -= s * 0.6; }
      }
      if (st.throwT >= 0) {
        const k = (now - st.throwT) / 500;
        if (k >= 1) st.throwT = -1;
        else { const s = Math.sin(k * Math.PI); gun.position.y += s * 0.15; gun.position.z -= s * 0.3; gun.rotation.x += s * 1.2; holder.visible = k < 0.45; }
      } else holder.visible = true;
      flash.visible = now - st.flashAt < 45 && (st.weapon === 'smg' || st.weapon === 'shotgun');
      if (flash.visible) flash.material.rotation = Math.random() * Math.PI;
    },
  };
}
