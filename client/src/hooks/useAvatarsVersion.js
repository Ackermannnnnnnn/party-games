import { useSyncExternalStore } from 'react';
import { onAvatarsChange, avatarsVersion } from '../data/avatars.js';

/** Re-rend le composant quand la liste des avatars change (personnage ajouté depuis l'admin…). */
export function useAvatarsVersion() {
  return useSyncExternalStore(onAvatarsChange, avatarsVersion);
}
