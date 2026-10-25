/**
 * Prop Hunt — vue à la première personne du chasseur (dessinée par-dessus la scène) :
 * arme photoréaliste, balancement à la marche, recul, rechargement, coup de machette,
 * lancer de grenade, éclair au bout du canon.
 */
import * as THREE from 'three';
import { FLASH_TEXTURE } from './effects.jsx';
import { weaponInstance, WEAPON_MODELS } from './rigs.js';

/** Position de l'arme devant la caméra (x droite, y haut, z avant négatif), et en visée. */
const POSE = {
  smg: { pos: [0.1, -0.115, -0.26], aim: [0, -0.078, -0.2], rot: [0, -0.1, 0] },
  shotgun: { pos: [0.13, -0.16, -0.2], aim: [0, -0.1, -0.05], rot: [0, -0.03, 0] },
  grenade: { pos: [0.17, -0.2, -0.42], aim: [0.17, -0.2, -0.42], rot: [-0.25, 0, 0] },
  knife: { pos: [0.18, -0.2, -0.36], aim: [0.18, -0.2, -0.36], rot: [-1.05, 0.25, 0.3] },
};

export function createViewmodel() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(1, 2, 1.5); scene.add(key);

  const root = new THREE.Group(); // suit la caméra
  const gun = new THREE.Group(); root.add(gun);
  const holder = new THREE.Group(); gun.add(holder);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEXTURE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  flash.scale.setScalar(0.22); flash.visible = false; holder.add(flash);
  const muzzle = new THREE.Object3D(); holder.add(muzzle);
  scene.add(root);
  scene.visible = false;


  const st = { recoil: 0, bob: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, flashAt: 0, reloadT: -1, reloadDur: 2000, swingT: -1, throwT: -1, drawT: 0, weapon: null, aim: 0 };
  const tmp = new THREE.Vector3();
  let wanted = null;
  const setWeapon = async (id) => {
    if (wanted === id) return; wanted = id; st.drawT = performance.now();
    const w = await weaponInstance(id).catch(() => null);
    if (wanted !== id || !w) return;
    holder.clear(); holder.add(w, flash, muzzle); st.weapon = id;
    muzzle.position.set(...WEAPON_MODELS[id].muzzle);
    flash.position.copy(muzzle.position).add(new THREE.Vector3(0, 0, -0.03));
  };
  return {
    scene, root, muzzle, setWeapon,
    setSkin() {},
    kick(amount = 1) { st.recoil = Math.min(1.6, st.recoil + 0.55 * amount); st.flashAt = performance.now(); },
    reload(ms) { st.reloadT = performance.now(); st.reloadDur = ms; },
    swing() { st.swingT = performance.now(); },
    throwAnim() { st.throwT = performance.now(); },
    muzzleWorld() { muzzle.getWorldPosition(tmp); return [tmp.x, tmp.y, tmp.z]; },
    /** À chaque image : place l'arme devant la caméra. moving = 0..1 (vitesse). */
    update(camera, dt, { yaw, pitch, moving = 0, grounded = true, visible = true, aim = false, speed = 0 }) {
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
      const ax = p.pos[0] + (p.aim[0] - p.pos[0]) * st.aim; const ay = p.pos[1] + (p.aim[1] - p.pos[1]) * st.aim; const az = p.pos[2] + (p.aim[2] - p.pos[2]) * st.aim;
      const draw = Math.max(0, 1 - (performance.now() - st.drawT) / 300);
      gun.position.set(ax + bx + st.swayX * 0.6 * (1 - st.aim * 0.7), ay + by - st.swayY * 0.4 + st.recoil * 0.008 - draw * 0.25, az + st.recoil * 0.035);
      gun.rotation.set(st.recoil * 0.07 + st.swayY - draw * 0.6, st.swayX, 0);
      holder.rotation.set(...p.rot);
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
