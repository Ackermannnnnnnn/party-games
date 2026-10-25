/**
 * Prop Hunt — données partagées client / serveur (dossier copié tel quel dans server/src/games/prophunt/common).
 */
import { MODELS, modelBounds } from './models.js';

export { MODELS, MATS, modelBounds, modelHp, partHalf, partMat, resolveMat } from './models.js';
export { getMap, MAP_LIST } from './maps.js';
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

/** Arme des chasseurs : fusil automatique. */
export const WEAPON = { mag: 30, fireMs: 105, reloadMs: 2000, damage: 12, penalty: 3, range: 80, spread: 0.006 };
