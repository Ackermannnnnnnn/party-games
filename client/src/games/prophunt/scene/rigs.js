/**
 * Prop Hunt — personnages animés (Kenney Animated Characters, CC0) et armes (Kenney Weapon Pack, CC0).
 * Les bras sont placés par cinématique inverse sur la poignée et le garde-main de l'arme :
 * le fusil suit le regard du joueur (haut / bas) pendant que les jambes courent.
 */
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env?.BASE_URL || '/'}ph-assets/`;
export const SKINS = [
  { id: 'survivorMaleB', name: 'Survivant', level: 1 }, { id: 'survivorFemaleA', name: 'Survivante', level: 1 },
  { id: 'skaterMaleA', name: 'Skateur', level: 3 }, { id: 'skaterFemaleA', name: 'Skateuse', level: 5 },
  { id: 'criminalMaleA', name: 'Truand', level: 8 }, { id: 'cyborgFemaleA', name: 'Cyborg', level: 12 },
  { id: 'zombieA', name: 'Zombie', level: 16 }, { id: 'zombieC', name: 'Zombie vert', level: 20 },
];

// ───── armes
/** Armes : modèle, échelle, poignée (main droite) et garde-main (main gauche) dans le repère de l'arme (avant = -z). */
export const WEAPON_MODELS = {
  smg: { file: 'machinegun', scale: 9, grip: [0, -0.06, 0.12], fore: [0, -0.04, -0.2] },
  shotgun: { file: 'shotgun', scale: 10, grip: [0, -0.04, 0.12], fore: [0, -0.03, -0.18] },
  grenade: { file: 'grenade', scale: 9, grip: [0, 0, 0], fore: null },
  knife: { file: 'knife_sharp', scale: 7, grip: [0, 0, 0], fore: null },
};
const weaponCache = new Map();
export function loadWeapon(id) {
  if (weaponCache.has(id)) return weaponCache.get(id);
  const w = WEAPON_MODELS[id];
  const p = (async () => {
    const mtl = await new MTLLoader().setPath(`${BASE}weapons/`).loadAsync(`${w.file}.mtl`);
    mtl.preload();
    const o = await new OBJLoader().setMaterials(mtl).setPath(`${BASE}weapons/`).loadAsync(`${w.file}.obj`);
    o.traverse((m) => {
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => new THREE.MeshStandardMaterial({ color: x.color, roughness: 0.45, metalness: x.color.getHSL({}).l < 0.4 ? 0.6 : 0.2 }));
      m.material = Array.isArray(m.material) ? mats : mats[0];
      m.castShadow = true;
    });
    o.scale.setScalar(w.scale);
    if (id === 'knife') o.rotation.x = -Math.PI / 2;
    const g = new THREE.Group(); g.add(o);
    return g;
  })();
  weaponCache.set(id, p);
  return p;
}
/** Copie d'une arme (chaque joueur a la sienne). */
export async function weaponInstance(id) { return (await loadWeapon(id)).clone(true); }

// ───── personnage
let basePromise = null;
export function loadCharacterBase() {
  if (basePromise) return basePromise;
  basePromise = (async () => {
    const l = new FBXLoader();
    const [model, idle, run, jump] = await Promise.all(['character', 'idle', 'run', 'jump'].map((n) => l.loadAsync(`${BASE}characters/${n}.fbx`)));
    const clip = (g) => g.animations.find((a) => !a.name.includes('Targeting')) || g.animations[0];
    return { model, clips: { idle: clip(idle), run: clip(run), jump: clip(jump) } };
  })();
  return basePromise;
}
const skinCache = new Map();
function skinTexture(id) {
  if (!skinCache.has(id)) {
    const t = new THREE.TextureLoader().load(`${BASE}characters/${id}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    skinCache.set(id, t);
  }
  return skinCache.get(id);
}

const v1 = new THREE.Vector3(); const v2 = new THREE.Vector3(); const v3 = new THREE.Vector3(); const v4 = new THREE.Vector3();
const q1 = new THREE.Quaternion(); const q2 = new THREE.Quaternion(); const q3 = new THREE.Quaternion();
/** Fait tourner `bone` (dans le monde) pour que la direction `from` devienne `to`. */
function rotateBoneWorld(bone, from, to) {
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  q1.setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  bone.getWorldQuaternion(q2);
  q2.premultiply(q1);
  bone.parent.getWorldQuaternion(q3).invert();
  bone.quaternion.copy(q3.multiply(q2));
  bone.updateMatrixWorld(true);
}
/** Cinématique inverse à deux os (épaule → coude → main) vers une cible, coude orienté vers `pole`. */
function twoBoneIK(upper, lower, hand, target, pole) {
  const s = upper.getWorldPosition(v1.clone()); const e = lower.getWorldPosition(v2.clone()); const h = hand.getWorldPosition(v3.clone());
  const a = s.distanceTo(e); const bl = e.distanceTo(h);
  const toT = target.clone().sub(s); let d = toT.length();
  d = Math.min(d, (a + bl) * 0.999); d = Math.max(d, Math.abs(a - bl) + 0.001);
  const dir = toT.normalize();
  const cosA = (a * a + d * d - bl * bl) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const p = pole.clone().sub(s); const perp = p.sub(dir.clone().multiplyScalar(p.dot(dir))).normalize();
  const elbow = s.clone().add(dir.clone().multiplyScalar(a * cosA)).add(perp.multiplyScalar(a * sinA));
  rotateBoneWorld(upper, e.clone().sub(s), elbow.clone().sub(s));
  const e2 = lower.getWorldPosition(v4.clone()); const h2 = hand.getWorldPosition(v1.clone());
  rotateBoneWorld(lower, h2.sub(e2), target.clone().sub(e2));
}

/**
 * Crée un chasseur : { root, setWeapon(id), update(dt, { speed, pitch, air }), muzzleWorld() }.
 * root regarde vers -z, pieds en y = 0.
 */
export function createHunterRig(base, skinId) {
  const root = new THREE.Group();
  const body = SkeletonUtils.clone(base.model);
  body.scale.setScalar(1.8 / 376);
  body.rotation.y = Math.PI; // le modèle regarde +z, nos joueurs -z
  const mat = new THREE.MeshStandardMaterial({ map: skinTexture(skinId), roughness: 0.8 });
  body.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.frustumCulled = false; } });
  root.add(body);
  const bones = {};
  body.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const mixer = new THREE.AnimationMixer(body);
  const actions = Object.fromEntries(Object.entries(base.clips).map(([k, c]) => [k, mixer.clipAction(c)]));
  for (const a of Object.values(actions)) { a.play(); a.setEffectiveWeight(0); }
  actions.idle.setEffectiveWeight(1);
  const weights = { idle: 1, run: 0, jump: 0 };
  // arme tenue devant la poitrine, pivote avec le regard
  const aim = new THREE.Group(); aim.position.set(0, 1.32, 0); root.add(aim);
  const gunHolder = new THREE.Group(); gunHolder.position.set(0.16, -0.12, -0.32); aim.add(gunHolder);
  let weapon = null; let weaponId = null;
  const pole = new THREE.Vector3(); const tR = new THREE.Vector3(); const tL = new THREE.Vector3();
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, -0.55); gunHolder.add(muzzle);
  return {
    root,
    async setWeapon(id) {
      if (id === weaponId) return; weaponId = id;
      const w = await weaponInstance(id);
      if (weaponId !== id) return;
      if (weapon) gunHolder.remove(weapon);
      weapon = w; gunHolder.add(w);
    },
    muzzleWorld() { muzzle.updateMatrixWorld(true); return muzzle.getWorldPosition(new THREE.Vector3()).toArray(); },
    update(dt, { speed = 0, pitch = 0, air = false } = {}) {
      const want = air ? 'jump' : speed > 0.8 ? 'run' : 'idle';
      for (const k of Object.keys(weights)) {
        weights[k] += ((k === want ? 1 : 0) - weights[k]) * Math.min(1, dt * 10);
        actions[k].setEffectiveWeight(weights[k]);
      }
      actions.run.setEffectiveTimeScale(Math.max(0.6, Math.min(1.6, speed / 5)));
      mixer.update(dt);
      root.updateMatrixWorld(true);
      // buste et tête suivent le regard
      if (bones.Spine) { bones.Spine.rotateX(-pitch * 0.25); }
      if (bones.Chest) { bones.Chest.rotateX(-pitch * 0.25); }
      if (bones.Neck) bones.Neck.rotateX(-pitch * 0.3);
      aim.rotation.x = pitch;
      root.updateMatrixWorld(true);
      // bras sur l'arme
      const wm = WEAPON_MODELS[weaponId];
      if (!wm || !bones.RightArm) return;
      gunHolder.localToWorld(tR.set(...wm.grip));
      root.localToWorld(pole.set(0.6, 0.6, 0.4));
      twoBoneIK(bones.RightArm, bones.RightForeArm, bones.RightHand, tR, pole);
      if (wm.fore) {
        gunHolder.localToWorld(tL.set(...wm.fore));
        root.localToWorld(pole.set(-0.6, 0.5, 0.2));
        twoBoneIK(bones.LeftArm, bones.LeftForeArm, bones.LeftHand, tL, pole);
      }
    },
  };
}
