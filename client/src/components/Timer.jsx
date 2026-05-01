import { useEffect, useState } from 'react';

/**
 * Timer synchronisé sur un timestamp absolu serveur (`endsAt`).
 * Affichage local dérivé -> pas de désync entre clients.
 */
export default function Timer({ endsAt, onEnd }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, endsAt - Date.now());
      setRemaining(r);
      if (r === 0 && onEnd) onEnd();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const sec = Math.ceil(remaining / 1000);
  return (
    <span className={`font-mono text-2xl ${sec <= 5 ? 'text-rose-400 animate-pulse' : 'text-brand-light'}`}>
      {sec}s
    </span>
  );
}
