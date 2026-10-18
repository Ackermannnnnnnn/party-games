import { useState } from 'react';
import { getAvatar, isPhoto, photoUrl } from '../data/avatars.js';

const SIZES = {
  xs: { box: 'w-6 h-6',   text: 'text-sm' },
  sm: { box: 'w-8 h-8',   text: 'text-lg' },
  md: { box: 'w-12 h-12', text: 'text-2xl' },
  lg: { box: 'w-20 h-20', text: 'text-4xl' },
  xl: { box: 'w-32 h-32', text: 'text-6xl' },
};

/** Rond avec la photo du joueur (si possible), sinon l'emoji de son avatar. */
export function AvatarFace({ id, className = '', style, emojiStyle }) {
  const [broken, setBroken] = useState(null);
  const url = isPhoto(id) ? photoUrl(id) : null;
  if (url && broken !== url) {
    return (
      <img src={url} alt="" draggable="false" onError={() => setBroken(url)}
        className={`rounded-full object-cover bg-slate-700 select-none ${className}`} style={style} />
    );
  }
  const a = getAvatar(isPhoto(id) ? null : id);
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${a.bg} select-none ${className}`} style={{ ...style, ...emojiStyle }}
      title={a.label} aria-label={a.label}>
      {a.emoji}
    </span>
  );
}

/**
 * Affiche un avatar rond : photo du joueur, ou gradient + emoji.
 *
 * @param {string} id  identifiant de l'avatar (ex: 'ironman', 'photo:abc123')
 * @param {string} size 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} ring  ajoute un ring (utile pour highlight)
 * @param {string} className  classes Tailwind supplémentaires
 */
export default function Avatar({ id, size = 'sm', ring = false, className = '' }) {
  const s = SIZES[size] || SIZES.sm;
  return (
    <AvatarFace id={id}
      className={`${s.box} ${s.text} shrink-0 ${ring ? 'ring-2 ring-brand ring-offset-2 ring-offset-slate-900' : ''} ${className}`} />
  );
}
