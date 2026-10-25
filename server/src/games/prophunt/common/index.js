/**
 * Prop Hunt — données partagées client / serveur (dossier copié tel quel dans server/src/games/prophunt/common).
 */
import { MODELS, modelBounds } from './models.js';

export { MODELS, MATS, modelBounds, modelHp, partHalf, partMat, resolveMat } from './models.js';
export { getMap, hasMap, MAP_LIST } from './maps.js';
export { ASSETS } from './assets.js';

const MAX_DISGUISE = 3.2;

/** Un objet de la map peut-il servir de déguisement ? (pas les gros objets fixes : bus, rayons…) */
export function canDisguiseAs(o) {
  const m = MODELS[o.m];
  if (!m || m.static) return false;
  return Math.max(...modelBounds(o.m).size) * (o.s || 1) <= MAX_DISGUISE;
}

/** Déguisements autorisés sur une map : « modèle@échelle ». */
export function disguisableModels(map) {
  return [...new Set(map.objects.filter(canDisguiseAs).map((o) => `${o.m}@${o.s}`))];
}

/** Moqueries intégrées (synthétisées par le navigateur). Les sons ajoutés depuis l'admin ont l'id « c:<id> ». */
export const TAUNTS = [
  { id: 'whistle', label: 'Sifflet', emoji: '😗' }, { id: 'boing', label: 'Boing', emoji: '🤪' }, { id: 'honk', label: 'Klaxon', emoji: '📯' },
  { id: 'quack', label: 'Coin coin', emoji: '🦆' }, { id: 'cuckoo', label: 'Coucou', emoji: '🐦' }, { id: 'laugh', label: 'Rire', emoji: '😂' },
  { id: 'fart', label: 'Prout', emoji: '💨' }, { id: 'trumpet', label: 'Trompette', emoji: '🎺' }, { id: 'meow', label: 'Miaou', emoji: '🐱' },
];

export const PLAYER = { radius: 0.32, height: 1.8, eye: 1.62, speed: 5.2, sprint: 7.6, jump: 5.6, gravity: 16, step: 0.45 };

/**
 * Armes des chasseurs. penalty = vie perdue par plomb/balle qui touche un vrai objet ou un leurre.
 * grenade : dégâts au centre, décroissants jusqu'au rayon ; 2 par manche.
 */
export const WEAPONS = {
  smg: { id: 'smg', name: 'Mitraillette', slot: 1, mag: 30, fireMs: 105, reloadMs: 2000, damage: 12, pellets: 1, spread: 0.006, range: 80, auto: true, penalty: 3, icon: '🔫' },
  shotgun: { id: 'shotgun', name: 'Fusil à pompe', slot: 2, mag: 6, fireMs: 850, reloadMs: 2500, damage: 10, pellets: 8, spread: 0.05, range: 35, auto: false, penalty: 1, icon: '💥' },
  grenade: { id: 'grenade', name: 'Grenade', slot: 3, mag: 2, fireMs: 1000, damage: 95, radius: 4.5, fuseMs: 2000, speed: 14, perRound: true, icon: '💣' },
  knife: { id: 'knife', name: 'Couteau', slot: 4, mag: 0, fireMs: 450, damage: 40, range: 2.3, penalty: 2, icon: '🔪' },
};
export const WEAPON_ORDER = ['smg', 'shotgun', 'grenade', 'knife'];
/** Compatibilité : l'arme par défaut. */
export const WEAPON = WEAPONS.smg;
/** Capacités des cachés. */
export const ABILITIES = { ventriloquistMs: 15000, ventriloquistRange: 30, radarFromMs: 60000, radarEveryMs: 15000 };
