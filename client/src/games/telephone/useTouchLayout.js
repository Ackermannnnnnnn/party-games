import { useEffect, useState } from 'react';

/** Téléphones et tablettes : écran tactile de taille moyenne, ou tout petit écran. */
const QUERY = '(pointer: coarse) and (max-width: 1100px), (max-width: 640px)';

/** Vrai si on doit utiliser l'atelier de dessin plein écran pensé pour le tactile. */
export function useTouchLayout() {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return matches;
}
