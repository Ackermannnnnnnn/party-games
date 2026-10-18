import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getAvatar } from '../../data/avatars.js';
import { role } from './roles.js';

const R = 40; // rayon du cercle, en % de la largeur

function seatPos(i, n) {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
}

/**
 * Le village assis en cercle autour du feu.
 * - canPick(p) / onPick(id) : sélection d'une cible
 * - picked : ids mis en avant (ma sélection)
 * - arrows : [{ from, to, color }] (votes, désignations)
 * - counts : { id: nombre de voix }
 * - known : { id: roleId } rôles que je connais (meute, visions, fantôme…)
 * - tags : { id: ['❤️', …] } petits signes en bas à gauche
 */
export default function Village({ players, meId, canPick, onPick, picked = [], pickTone = 'gold', arrows = [], counts = {}, known = {}, tags = {}, voted = [], center, dimmed = false }) {
  const ref = useRef(null);
  const [w, setW] = useState(360);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const update = () => setW(el.clientWidth || 360);
    update();
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = players.length || 1;
  const spacing = (2 * Math.PI * (R / 100) * w) / n;
  const size = Math.round(Math.max(30, Math.min(68, spacing * 0.6, w * 0.16)));
  const rPct = (size / w) * 50;
  const index = Object.fromEntries(players.map((p, i) => [p.id, i]));

  const arrowPath = (from, to) => {
    const a = seatPos(index[from], n); const b = seatPos(index[to], n);
    const dx = b.x - a.x; const dy = b.y - a.y; const len = Math.hypot(dx, dy) || 1;
    const sx = a.x + (dx / len) * (rPct + 0.8); const sy = a.y + (dy / len) * (rPct + 0.8);
    const ex = b.x - (dx / len) * (rPct + 2.2); const ey = b.y - (dy / len) * (rPct + 2.2);
    const mx = (sx + ex) / 2; const my = (sy + ey) / 2;
    const cx = mx + (50 - mx) * 0.35; const cy = my + (50 - my) * 0.35;
    return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
  };

  return (
    <div ref={ref} className={`relative mx-auto w-full max-w-[560px] aspect-square transition-opacity duration-700 ${dimmed ? 'opacity-40' : ''}`}>
      {/* sol du village */}
      <div className="absolute inset-[9%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.14) 0%, rgba(15,23,42,0.35) 45%, rgba(2,6,23,0.0) 70%)' }} />
      <div className="absolute inset-[18%] rounded-full border border-white/5" />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          {['#fde68a', '#ef4444', '#a78bfa', '#f472b6'].map((c) => (
            <marker key={c} id={`lg-head-${c.slice(1)}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
            </marker>
          ))}
        </defs>
        {arrows.filter((a) => index[a.from] !== undefined && index[a.to] !== undefined && a.from !== a.to).map((a) => (
          <path key={`${a.from}-${a.to}`} d={arrowPath(a.from, a.to)} className="lg-arrow" stroke={a.color || '#fde68a'} strokeWidth="0.55" strokeOpacity="0.85"
            strokeDasharray="400" markerEnd={`url(#lg-head-${(a.color || '#fde68a').slice(1)})`} />
        ))}
      </svg>

      {center && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}

      {players.map((p, i) => {
        const { x, y } = seatPos(i, n);
        const a = getAvatar(p.avatar);
        const pickable = !!canPick?.(p);
        const isPicked = picked.includes(p.id);
        const roleId = p.role || known[p.id];
        const count = counts[p.id];
        return (
          <div key={p.id} className="lg-seat" style={{ left: `${x}%`, top: `${y}%`, zIndex: isPicked ? 5 : 2 }}>
            <motion.button
              type="button"
              whileTap={pickable ? { scale: 0.92 } : undefined}
              onClick={() => pickable && onPick?.(p.id)}
              disabled={!pickable}
              aria-label={`${p.pseudo}${p.alive ? '' : ' (mort)'}`}
              aria-pressed={isPicked}
              className={`lg-seat-btn ${pickable ? 'can-pick' : 'cursor-default'} ${isPicked ? (pickTone === 'blood' ? 'is-picked is-wolfpick' : 'is-picked') : ''} ${p.alive ? '' : 'is-dead'}`}
              style={{ width: size, height: size }}
            >
              <span className={`flex w-full h-full items-center justify-center rounded-full bg-gradient-to-br ${a.bg} ring-2 ${p.id === meId ? 'ring-amber-200' : 'ring-black/50'}`}
                style={{ fontSize: size * 0.5 }}>
                {a.emoji}
              </span>
              {!p.alive && <span className="absolute inset-0 flex items-center justify-center text-[0.9em]" style={{ fontSize: size * 0.45 }}>💀</span>}
              {p.mayor && <span className="lg-badge -top-1.5 -left-1.5 bg-amber-400 text-black" title="Maire">👑</span>}
              {roleId && (
                <span className="lg-badge -top-1.5 -right-1.5 bg-slate-950/90 border border-white/20" title={role(roleId).label}
                  style={{ filter: roleId === 'loup_blanc' ? 'grayscale(1) brightness(1.6)' : undefined }}>{role(roleId).icon}</span>
              )}
              {tags[p.id]?.length > 0 && <span className="lg-badge -bottom-1.5 -left-1.5 bg-slate-950/90 border border-white/20">{tags[p.id].join('')}</span>}
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 1.6 }} animate={{ scale: 1 }}
                  className={`lg-badge -bottom-1.5 -right-1.5 font-bold ${pickTone === 'blood' ? 'bg-red-500 text-white' : 'bg-amber-300 text-black'}`}>{count}</motion.span>
              )}
              {voted.includes(p.id) && !count && <span className="lg-badge -bottom-1.5 -right-1.5 bg-emerald-500 text-white" title="A voté">✓</span>}
            </motion.button>
            <span className={`lg-seat-name ${p.id === meId ? 'text-amber-200' : p.alive ? 'text-white' : 'text-slate-400 line-through'} ${p.left ? 'italic' : ''}`}
              style={{ maxWidth: Math.max(56, spacing * 0.95), fontSize: size < 40 ? 10 : 12 }}>
              {p.pseudo}{p.id === meId ? ' (toi)' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Le feu de camp au centre (ou une icône de l'étape). */
export function Campfire({ icon = '🔥', label, sub }) {
  const [k, setK] = useState(0);
  useEffect(() => setK((x) => x + 1), [icon]);
  return (
    <>
      <motion.span key={k} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`text-4xl sm:text-6xl ${icon === '🔥' ? 'lg-fire' : ''}`} aria-hidden="true">{icon}</motion.span>
      {label && <p className="lg-title mt-1 text-[11px] sm:text-sm text-amber-100/90 leading-tight rounded-md bg-black/35 px-1.5 py-0.5">{label}</p>}
      {sub && <p className="text-[10px] sm:text-xs text-slate-200/90 leading-tight mt-0.5 rounded-md bg-black/35 px-1.5 py-0.5">{sub}</p>}
    </>
  );
}
