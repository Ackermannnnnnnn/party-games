/**
 * Avatars « en direct » : ce qui a été enregistré depuis l'admin est visible tout de suite,
 * sans attendre que Render ait reconstruit le site (3 à 5 minutes).
 *
 *  - la liste des personnages ajoutés (client/avatar-photos/characters.json) est relue sur GitHub au démarrage
 *  - les images enregistrées (photo recadrée) restent en mémoire et sont servies par /avatars/live/:id
 *  - après un redémarrage, l'image d'un personnage ajouté est relue sur GitHub
 * Une fois le site reconstruit, il contient tout cela de lui-même : ceci ne sert qu'à combler l'attente.
 */
import { githubEnabled, readText, readBinary, listDir } from '../utils/github.js';

export const CHARACTERS_FILE = 'client/avatar-photos/characters.json';
const PHOTOS_DIR = 'client/avatar-photos';
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', avif: 'image/avif' };

let characters = null; // [{ id, label, cat }] tels qu'enregistrés sur GitHub (null = pas encore lu)
const images = new Map(); // id → { buf, type, ver }
let loading = null;

/** Liste à jour des personnages ajoutés (lue une fois sur GitHub). */
async function ensureLoaded() {
  if (characters || !githubEnabled()) return;
  if (!loading) {
    loading = readText(CHARACTERS_FILE)
      .then((t) => { const list = JSON.parse(t || '[]'); characters = Array.isArray(list) ? list : []; })
      .catch(() => { characters = null; })
      .finally(() => { loading = null; });
  }
  await loading;
}

export function setLiveCharacters(list) {
  characters = list;
}

/** Image recadrée (ou à défaut l'originale) d'un personnage, enregistrée à l'instant. */
export function setLiveImage(id, buf, type) {
  images.set(id, { buf, type, ver: Date.now().toString(36) });
}

export function forgetLiveImage(id) {
  images.delete(id);
}

export async function liveState() {
  await ensureLoaded();
  return {
    enabled: githubEnabled() && !!characters,
    characters: characters || [],
    images: Object.fromEntries([...images].map(([id, im]) => [id, im.ver])),
  };
}

/** Image d'un personnage : celle en mémoire, sinon le fichier du dépôt (gardé en mémoire ensuite). */
export async function liveImage(id) {
  if (images.has(id)) return images.get(id);
  await ensureLoaded();
  if (!characters?.some((c) => c.id === id)) return null;
  const name = (await listDir(PHOTOS_DIR)).find((f) => f.replace(/\.[^.]+$/, '') === id);
  if (!name) return null;
  const buf = await readBinary(`${PHOTOS_DIR}/${name}`);
  if (!buf) return null;
  const im = { buf, type: TYPES[name.split('.').pop().toLowerCase()] || 'application/octet-stream', ver: 'repo' };
  images.set(id, im);
  return im;
}
