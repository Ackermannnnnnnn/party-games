/**
 * Prop Hunt — l'arme du chasseur vue à la première personne (dessinée par-dessus la scène),
 * avec balancement à la marche, recul, rechargement et éclair au bout du canon.
 */
import * as THREE from 'three';
import { FLASH_TEXTURE } from './effects.jsx';

const std = (color, rough, metal) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

export function createViewmodel() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1, 2, 1.5); scene.add(key);

  const metal = std(0x23262b, 0.42, 0.75); const metalL = std(0x3c4047, 0.5, 0.6); const poly = std(0x2a2c2f, 0.75, 0.05);
  const tan = std(0x8a7a5a, 0.8, 0.05); const glove = std(0x1f2022, 0.85, 0); const sleeve = std(0x3b4a3a, 0.95, 0);
  const red = new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false });
  const B = (w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
  const C = (r, l, m, x, y, z, seg = 12) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); return o; };

  const root = new THREE.Group(); // suit la caméra
  const gun = new THREE.Group(); gun.scale.setScalar(0.5); root.add(gun);
  gun.add(
    B(0.062, 0.1, 0.36, metal, 0, 0, -0.05),            // carcasse
    B(0.04, 0.018, 0.34, metalL, 0, 0.06, -0.05),        // rail
    B(0.075, 0.075, 0.28, tan, 0, -0.005, -0.36),        // garde-main
    C(0.014, 0.26, metal, 0, 0.012, -0.62),              // canon
    C(0.022, 0.07, metalL, 0, 0.012, -0.77),             // cache-flamme
    B(0.048, 0.12, 0.055, poly, 0, -0.1, 0.07, 0.35),    // poignée
    B(0.055, 0.1, 0.24, tan, 0, -0.015, 0.25),           // crosse
    B(0.05, 0.13, 0.05, poly, 0, -0.04, 0.39),           // talon
    B(0.04, 0.05, 0.09, metal, 0, 0.095, -0.05),         // viseur
    B(0.006, 0.006, 0.002, red, 0, 0.1, -0.096),         // point rouge
    B(0.03, 0.02, 0.05, metalL, 0.035, 0.02, 0.0),       // levier
  );
  const mag = B(0.045, 0.17, 0.075, poly, 0, -0.12, -0.12, 0.18); gun.add(mag);
  // mains et manches
  gun.add(B(0.08, 0.09, 0.1, glove, 0.0, -0.08, 0.06, 0.3));
  gun.add(B(0.09, 0.09, 0.32, sleeve, 0.03, -0.14, 0.24, 0.35, 0.1));
  gun.add(B(0.085, 0.07, 0.1, glove, -0.01, -0.06, -0.38));
  gun.add(B(0.09, 0.09, 0.42, sleeve, -0.1, -0.12, -0.18, 0.15, -0.45));
  // éclair au bout du canon
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEXTURE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  flash.scale.setScalar(0.32); flash.position.set(0, 0.012, -0.86); flash.visible = false; gun.add(flash);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.012, -0.82); gun.add(muzzle);
  scene.add(root);
  scene.visible = false;

  const st = { recoil: 0, bob: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, flashAt: 0, reloadT: -1, reloadDur: 2000 };
  const tmp = new THREE.Vector3();
  return {
    scene, root, muzzle,
    kick() { st.recoil = Math.min(1.4, st.recoil + 0.55); st.flashAt = performance.now(); },
    reload(ms) { st.reloadT = performance.now(); st.reloadDur = ms; },
    muzzleWorld() { muzzle.getWorldPosition(tmp); return [tmp.x, tmp.y, tmp.z]; },
    /** À chaque image : place l'arme devant la caméra. moving = 0..1 (vitesse), aim = viseur serré. */
    update(camera, dt, { yaw, pitch, moving = 0, grounded = true, visible = true }) {
      scene.visible = visible;
      if (!visible) return;
      root.position.copy(camera.position); root.quaternion.copy(camera.quaternion);
      st.recoil *= Math.exp(-dt * 11);
      st.bob += dt * (grounded ? 7 + moving * 5 : 0) * Math.max(0.15, moving);
      let dy = yaw - st.lastYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      st.swayX += (Math.max(-0.05, Math.min(0.05, dy * 0.5)) - st.swayX) * Math.min(1, dt * 10);
      st.swayY += (Math.max(-0.05, Math.min(0.05, (pitch - st.lastPitch) * 0.5)) - st.swayY) * Math.min(1, dt * 10);
      st.lastYaw = yaw; st.lastPitch = pitch;
      const bx = Math.sin(st.bob) * 0.012 * moving; const by = Math.abs(Math.cos(st.bob)) * 0.012 * moving;
      gun.position.set(0.105 + bx + st.swayX * 0.6, -0.105 + by - st.swayY * 0.4 + st.recoil * 0.006, -0.17 + st.recoil * 0.03);
      gun.rotation.set(st.recoil * 0.07 + st.swayY, st.swayX, 0);
      // rechargement : l'arme bascule, le chargeur sort puis revient
      mag.position.set(0, -0.12, -0.12);
      if (st.reloadT >= 0) {
        const k = (performance.now() - st.reloadT) / st.reloadDur;
        if (k >= 1) st.reloadT = -1;
        else {
          const tilt = Math.sin(Math.min(1, k * 1.25) * Math.PI);
          gun.rotation.x -= tilt * 0.45; gun.rotation.z += tilt * 0.5; gun.position.y -= tilt * 0.06;
          if (k > 0.15 && k < 0.7) mag.position.y = -0.12 - Math.sin(((k - 0.15) / 0.55) * Math.PI) * 0.3;
        }
      }
      flash.visible = performance.now() - st.flashAt < 45;
      if (flash.visible) flash.material.rotation = Math.random() * Math.PI;
    },
  };
}
