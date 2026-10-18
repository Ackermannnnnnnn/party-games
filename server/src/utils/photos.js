import crypto from 'crypto';

/**
 * Photos de profil envoyées par les joueurs (déjà recadrées / réduites côté client).
 * Stockées en mémoire, adressées par leur empreinte : `photo:<hash>`.
 * Servies en HTTP par GET /photos/:hash (cache navigateur longue durée).
 */
const MAX_BYTES = 90 * 1024;
const MAX_PHOTOS = 3000;
const TYPES = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' };
const store = new Map(); // hash -> { buf, type }

function looksLike(type, buf) {
  if (type === 'png') return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (type === 'jpeg') return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'webp') return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

/** Enregistre une photo (data URL). Renvoie l'identifiant d'avatar `photo:<hash>`, ou null si invalide. */
export function storePhoto(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const type = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_BYTES || !looksLike(type, buf)) return null;
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
  if (store.has(hash)) store.delete(hash); // remet en fin (plus récent)
  store.set(hash, { buf, type: TYPES[type] });
  while (store.size > MAX_PHOTOS) store.delete(store.keys().next().value);
  return `photo:${hash}`;
}

export function getPhoto(hash) {
  return store.get(String(hash).replace(/\.\w+$/, '')) || null;
}
