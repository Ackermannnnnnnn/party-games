import { getAvatar } from '../data/avatars.js';

/**
 * Affiche un avatar rond avec gradient + emoji.
 *
 * @param {string} id  identifiant de l'avatar (ex: 'ironman')
 * @param {string} size 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} ring  ajoute un ring (utile pour highlight)
 * @param {string} className  classes Tailwind supplémentaires
 */
export default function Avatar({ id, size = 'sm', ring = false, className = '' }) {
  const a = getAvatar(id);
  const sizes = {
    xs: { box: 'w-6 h-6',   text: 'text-sm' },
    sm: { box: 'w-8 h-8',   text: 'text-lg' },
    md: { box: 'w-12 h-12', text: 'text-2xl' },
    lg: { box: 'w-20 h-20', text: 'text-4xl' },
    xl: { box: 'w-32 h-32', text: 'text-6xl' },
  };
  const s = sizes[size] || sizes.sm;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${a.bg} ${s.box} ${s.text} shrink-0 select-none ${ring ? 'ring-2 ring-brand ring-offset-2 ring-offset-slate-900' : ''} ${className}`}
      title={a.label}
      aria-label={a.label}
    >
      {a.emoji}
    </span>
  );
}
