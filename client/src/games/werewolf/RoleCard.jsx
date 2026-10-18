import { role } from './roles.js';

const TEAM_LABEL = { village: 'Village', wolves: 'Meute', solo: 'Solitaire' };
const SIZES = {
  xs: { w: 'w-14', icon: 'text-2xl', name: 'text-[8px]', pad: 'p-1' },
  sm: { w: 'w-20 sm:w-24', icon: 'text-3xl sm:text-4xl', name: 'text-[9px] sm:text-[10px]', pad: 'p-1.5' },
  md: { w: 'w-36 sm:w-40', icon: 'text-6xl', name: 'text-sm', pad: 'p-3' },
  lg: { w: 'w-52 sm:w-60', icon: 'text-7xl sm:text-8xl', name: 'text-lg sm:text-xl', pad: 'p-4' },
};

/** Face visible d'une carte de rôle. */
export function CardFront({ roleId, size = 'md', desc = false }) {
  const r = role(roleId);
  const s = SIZES[size];
  return (
    <div className="lg-card flex flex-col items-center justify-between text-center" style={{ '--a': r.art[0], '--b': r.art[1], '--glow': r.glow }}>
      <span className={`mt-2 text-[8px] uppercase tracking-[0.25em] text-white/70 ${size === 'xs' || size === 'sm' ? 'hidden' : ''}`}>{TEAM_LABEL[r.team]}</span>
      <span className={`${s.icon} drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)] ${roleId === 'loup_blanc' ? 'grayscale brightness-150' : ''}`} aria-hidden="true">{r.icon}</span>
      <div className={`w-full ${s.pad}`}>
        <p className={`lg-title font-bold leading-tight ${s.name}`}>{r.label}</p>
        {desc && <p className="mt-1.5 text-[11px] leading-snug text-white/85 font-sans">{r.desc}</p>}
      </div>
    </div>
  );
}

export function CardBack({ label }) {
  return (
    <div className="lg-card-back flex flex-col items-center justify-center">
      <span className="text-4xl sm:text-5xl drop-shadow-[0_0_14px_rgba(253,230,138,0.6)]" aria-hidden="true">🌕</span>
      {label && <span className="lg-title mt-3 px-3 text-center text-[11px] sm:text-xs text-amber-100/90">{label}</span>}
    </div>
  );
}

/** Carte retournable (dos → face). */
export default function RoleCard({ roleId, size = 'md', flipped = true, desc = false, backLabel, onClick, className = '' }) {
  const s = SIZES[size];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`lg-flip ${s.w} aspect-[5/7] block shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ minHeight: 0 }} aria-label={flipped ? role(roleId).label : 'Carte face cachée'}>
      <div className={`lg-flip-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="lg-face"><CardBack label={backLabel} /></div>
        <div className="lg-face lg-face-front"><CardFront roleId={roleId} size={size} desc={desc} /></div>
      </div>
    </Tag>
  );
}
