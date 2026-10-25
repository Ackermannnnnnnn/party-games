/**
 * Profil de progression : une clé secrète propre à ce navigateur (pas de compte).
 * Elle est envoyée au serveur après chaque arrivée dans une room.
 */
import { SERVER_URL } from './socket.js';

const KEY = 'profileKey';
export function getProfileKey() {
  try {
    let k = localStorage.getItem(KEY);
    if (!k || !/^[a-z0-9-]{16,64}$/.test(k)) {
      k = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`).toLowerCase();
      localStorage.setItem(KEY, k);
    }
    return k;
  } catch { return null; }
}

export async function fetchProfile() {
  const k = getProfileKey();
  if (!k) return null;
  const r = await fetch(`${SERVER_URL}/profiles/${k}`);
  if (!r.ok) throw new Error('Profil indisponible');
  return r.json();
}
