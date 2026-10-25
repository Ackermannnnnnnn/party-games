/**
 * Prop Hunt — chasseurs réalistes : soldat animé (modèle « Vanguard » de Mixamo, exemple three.js)
 * et armes photoréalistes (Poly Haven, CC0). Les bras sont placés par cinématique inverse sur la
 * poignée et le garde-main de l'arme : l'arme suit le regard pendant que les jambes courent.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env?.BASE_URL || '/'}ph-assets/`;
/** Tenues : teinte de l'armure (les identifiants restent ceux des profils déjà enregistrés). */
export const SKINS = [
  { id: 'survivorMaleB', name: 'Désert', level: 1, tint: 0xffffff }, { id: 'survivorFemaleA', name: 'Forêt', level: 1, tint: 0x9db08a },
  { id: 'skaterMaleA', name: 'Urbain', level: 3, tint: 0xa7adb5 }, { id: 'skaterFemaleA', name: 'Arctique', level: 5, tint: 0xeef3ff, light: 0.25 },
  { id: 'criminalMaleA', name: 'Commando', level: 8, tint: 0x4f5763 }, { id: 'cyborgFemaleA', name: 'Cobalt', level: 12, tint: 0x7d9bd8 },
  { id: 'zombieA', name: 'Rouille', level: 16, tint: 0xc58a68 }, { id: 'zombieC', name: 'Or', level: 20, tint: 0xffd56b, metal: 0.65 },
];
const SKIN = Object.fromEntries(SKINS.map((k) => [k.id, k]));

const gltfLoader = new GLTFLoader();

// ───── armes
/** Armes : fichier, poignée (main droite) et garde-main (main gauche) dans le repère de l'arme (avant = -z), bout du canon. */
export const WEAPON_MODELS = {
  smg: { file: 'pistol', grip: [0, 0.0, 0.03], fore: [-0.035, -0.005, 0.03], muzzle: [0, 0.075, -0.18] },
  shotgun: { file: 'rifle', grip: [0, -0.02, 0.06], fore: [0, -0.01, -0.34], muzzle: [0, 0.05, -0.81] },
  grenade: { file: 'grenade', grip: [0, 0.02, 0], fore: null, muzzle: [0, 0.2, 0] },
  knife: { file: 'machete', grip: [0, 0.02, 0], fore: null, muzzle: [0, 0.5, 0] },
};
const weaponCache = new Map();
export function loadWeapon(id) {
  if (weaponCache.has(id)) return weaponCache.get(id);
  const w = WEAPON_MODELS[id];
  const p = gltfLoader.loadAsync(`${BASE}weapons3/${w.file}.glb`).then((g) => {
    g.scene.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = true;
      for (const t of [m.material.map, m.material.normalMap]) if (t) t.anisotropy = 8;
    });
    const grp = new THREE.Group(); grp.add(g.scene);
    return grp;
  });
  weaponCache.set(id, p);
  return p;
}
/** Copie d'une arme (chaque joueur a la sienne). */
export async function weaponInstance(id) { return (await loadWeapon(id)).clone(true); }

// ───── personnage
let basePromise = null;
export function loadCharacterBase() {
  if (basePromise) return basePromise;
  basePromise = gltfLoader.loadAsync(`${BASE}characters/soldier.glb`).then((g) => {
    const clip = (n) => g.animations.find((a) => a.name === n);
    // pas d'animation de saut : la pose de repos suffit en l'air
    return { model: g.scene, clips: { idle: clip('Idle'), run: clip('Run'), walk: clip('Walk') } };
  });
  return basePromise;
}
const skinMats = new Map();
function skinMaterials(src, skinId) {
  const key = `${src.uuid}:${skinId}`;
  if (!skinMats.has(key)) {
    const k = SKIN[skinId] || SKINS[0];
    const m = src.clone();
    if (!/visor/i.test(src.name)) { m.color = new THREE.Color(k.tint); if (k.metal) { m.metalness = k.metal; m.roughness = 0.35; } if (k.light) m.emissive = new THREE.Color(k.tint).multiplyScalar(k.light * 0.15); }
    m.envMapIntensity = 1.1;
    skinMats.set(key, m);
  }
  return skinMats.get(key);
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
 * Crée un chasseur : { root, setWeapon(id), update(dt, { speed, pitch, air }), muzzleWorld(), armsTo(grip, fore) }.
 * root regarde vers -z, pieds en y = 0. firstPerson : tête masquée (vue à la première personne).
 */
export function createHunterRig(base, skinId, { firstPerson = false } = {}) {
  const root = new THREE.Group();
  const body = SkeletonUtils.clone(base.model);
  body.traverse((o) => {
    if (!o.isMesh) return;
    o.material = skinMaterials(o.material, skinId);
    o.castShadow = !firstPerson; o.receiveShadow = true; o.frustumCulled = false;
  });
  root.add(body);
  const bones = {};
  body.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o; });
  const mixer = new THREE.AnimationMixer(body);
  const actions = Object.fromEntries(Object.entries(base.clips).filter(([, c]) => c).map(([k, c]) => [k, mixer.clipAction(c)]));
  for (const a of Object.values(actions)) { a.play(); a.setEffectiveWeight(0); }
  actions.idle.setEffectiveWeight(1);
  const weights = Object.fromEntries(Object.keys(actions).map((k) => [k, k === 'idle' ? 1 : 0]));
  // arme tenue devant la poitrine, pivote avec le regard
  const aim = new THREE.Group(); aim.position.set(0, 1.42, 0); root.add(aim);
  const gunHolder = new THREE.Group(); gunHolder.position.set(0.12, -0.08, -0.38); aim.add(gunHolder);
  let weapon = null; let weaponId = null;
  const pole = new THREE.Vector3(); const tR = new THREE.Vector3(); const tL = new THREE.Vector3();
  const muzzle = new THREE.Object3D(); gunHolder.add(muzzle);
  // doigts repliés autour de la poignée
  const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
  const curl = (side, amount) => {
    for (const f of FINGERS) for (let i = 1; i <= 3; i++) { const b = bones[`${side}Hand${f}${i}`]; if (b) b.rotateZ(side === 'Right' ? -amount : amount); }
    const t = bones[`${side}HandThumb2`]; if (t) t.rotateZ(side === 'Right' ? -amount * 0.4 : amount * 0.4);
  };
  const arms = (gripW, foreW) => {
    root.localToWorld(pole.set(0.7, 0.5, 0.6));
    twoBoneIK(bones.RightArm, bones.RightForeArm, bones.RightHand, gripW, pole);
    curl('Right', 1.1);
    if (foreW) { root.localToWorld(pole.set(-0.7, 0.4, 0.4)); twoBoneIK(bones.LeftArm, bones.LeftForeArm, bones.LeftHand, foreW, pole); curl('Left', 0.9); }
    root.updateMatrixWorld(true);
  };
  return {
    root, bones,
    async setWeapon(id) {
      if (id === weaponId) return; weaponId = id;
      const w = await weaponInstance(id);
      if (weaponId !== id) return;
      if (weapon) gunHolder.remove(weapon);
      weapon = w; gunHolder.add(w);
      muzzle.position.set(...WEAPON_MODELS[id].muzzle);
      gunHolder.rotation.set(id === 'knife' ? -1.2 : id === 'grenade' ? -0.3 : 0, 0, 0);
    },
    muzzleWorld() { muzzle.updateMatrixWorld(true); return muzzle.getWorldPosition(new THREE.Vector3()).toArray(); },
    /** Place les mains (coordonnées monde) — utilisé par la vue à la première personne. */
    armsTo(gripW, foreW) { if (bones.RightArm) arms(gripW, foreW); },
    update(dt, { speed = 0, pitch = 0, air = false, hands = true } = {}) {
      const want = air ? 'idle' : speed > 3.2 ? 'run' : speed > 0.6 ? 'walk' : 'idle';
      for (const k of Object.keys(weights)) {
        weights[k] += ((k === want ? 1 : 0) - weights[k]) * Math.min(1, dt * 8);
        actions[k].setEffectiveWeight(weights[k]);
      }
      if (actions.run) actions.run.setEffectiveTimeScale(Math.max(0.7, Math.min(1.4, speed / 6)));
      if (actions.walk) actions.walk.setEffectiveTimeScale(Math.max(0.7, Math.min(1.5, speed / 2.5)));
      mixer.update(dt);
      if (firstPerson && bones.Head) bones.Head.scale.setScalar(0.001);
      root.updateMatrixWorld(true);
      // buste et tête suivent le regard
      if (bones.Spine1) bones.Spine1.rotateX(pitch * 0.3);
      if (bones.Spine2) bones.Spine2.rotateX(pitch * 0.3);
      if (bones.Neck) bones.Neck.rotateX(pitch * 0.3);
      aim.rotation.x = pitch;
      root.updateMatrixWorld(true);
      const wm = WEAPON_MODELS[weaponId];
      if (!hands || !wm || !bones.RightArm || !weapon) return;
      gunHolder.localToWorld(tR.set(...wm.grip));
      if (wm.fore) gunHolder.localToWorld(tL.set(...wm.fore));
      arms(tR, wm.fore ? tL : null);
    },
  };
}
