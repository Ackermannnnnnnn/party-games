/**
 * Prop Hunt — interface par-dessus la 3D : annonce des rôles, chrono, vie, munitions, soundboard,
 * fil des éliminations, tableau des scores, fin de manche, menu, commandes tactiles.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../../lib/socket.js';
import { MODELS, WEAPON } from './shared.js';
import { setVolume, getVolume } from './sfx.js';

const panel = 'rounded-2xl bg-black/45 backdrop-blur-md ring-1 ring-white/10';
export const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** Annonce du rôle au début de chaque manche. */
export function RoleIntro({ role, map, round, total, isTouch }) {
  const hunter = role === 'hunter';
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70" />
      <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        className={`relative w-[min(92vw,520px)] overflow-hidden rounded-3xl ring-1 ${hunter ? 'ring-rose-400/40 bg-gradient-to-br from-rose-950/90 to-slate-950/90' : 'ring-teal-300/40 bg-gradient-to-br from-teal-950/90 to-slate-950/90'} p-6 text-center shadow-2xl`}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">Manche {round}/{total} · {map}</p>
        <p className="mt-3 text-6xl">{hunter ? '🔫' : '🫥'}</p>
        <p className={`mt-2 font-display text-4xl sm:text-5xl ${hunter ? 'text-rose-300' : 'text-teal-200'}`}>{hunter ? 'Tu es chasseur' : 'Tu es caché'}</p>
        <p className="mt-3 text-sm text-slate-200/90">
          {hunter ? 'Les cachés se transforment en objets. Trouve-les et tire — mais chaque tir sur un vrai objet te coûte de la vie.'
            : 'Transforme-toi en objet de la map et fonds-toi dans le décor. Survis jusqu\'à la fin du chrono.'}
        </p>
        {!isTouch && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-300">
            {(hunter ? [['Clic', 'tirer (maintenir)'], ['R', 'recharger'], ['Maj', 'courir'], ['Tab', 'scores']]
              : [['E / clic', 'devenir l\'objet visé'], ['R', 'bloquer la rotation'], ['T', 'soundboard'], ['F', 'moquerie'], ['G', 'leurre']]).map(([k, v]) => (
              <span key={k} className="rounded-lg bg-white/[0.07] px-2 py-1"><b className="text-white">{k}</b> {v}</span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Chasseur pendant la cachette : écran noir et compte à rebours. */
export function HunterBlind({ secLeft }) {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1020_0%,_#000_70%)] flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">Les cachés se cachent</p>
      <motion.p key={secLeft} initial={{ scale: 1.4, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-8xl sm:text-9xl text-white tabular-nums mt-2">{Math.max(0, secLeft)}</motion.p>
      <p className="mt-4 text-sm text-slate-400 max-w-sm">Écoute bien : les cachés font du bruit malgré eux. Un objet qui bouge, qui tourne ou qui n'est pas à sa place… c'est sûrement un joueur.</p>
    </div>
  );
}

export function TopBar({ p, left, mapName }) {
  const props = p.players.filter((x) => x.role === 'prop');
  const hunters = p.players.filter((x) => x.role === 'hunter');
  const hiding = p.phase === 'HIDE';
  const urgent = p.phase === 'HUNT' && left < 30000;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
      <div className={`flex items-center gap-3 ${panel} px-3 py-1.5`}>
        <div className="flex items-center gap-1" title="Cachés">
          {props.map((x) => <span key={x.id} className={`h-2.5 w-2.5 rounded-full ${x.alive ? 'bg-teal-300 shadow-[0_0_6px_#5eead4]' : 'bg-white/15'}`} />)}
        </div>
        <span className={`font-display text-2xl tabular-nums min-w-[64px] text-center ${urgent ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{fmt(left)}</span>
        <div className="flex items-center gap-1" title="Chasseurs">
          {hunters.map((x) => <span key={x.id} className={`h-2.5 w-2.5 rotate-45 ${x.alive ? 'bg-rose-400 shadow-[0_0_6px_#fb7185]' : 'bg-white/15'}`} />)}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-100/90 drop-shadow">{hiding ? '🙈 Cachez-vous !' : p.phase === 'HUNT' ? '🔎 La chasse est ouverte' : ''} · Manche {p.round}/{p.totalRounds} · {mapName}</p>
    </div>
  );
}

export function KillFeed({ p, person }) {
  return (
    <div className="absolute top-2 right-2 space-y-1 max-w-[46%]">
      <AnimatePresence initial={false}>
        {(p.feed || []).slice(-5).map((f) => (
          <motion.p key={f.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className={`${panel} !rounded-xl px-2.5 py-1 text-[11px] sm:text-xs text-slate-100 text-right`}>
            {f.kind === 'kill'
              ? <><b className="text-rose-300">{person(f.by).pseudo}</b> <span className="opacity-70">🔫</span> <b className="text-teal-200">{person(f.target).pseudo}</b>{f.model ? <span className="opacity-60"> ({MODELS[f.model]?.name})</span> : null}</>
              : <><b className="text-rose-300">{person(f.target).pseudo}</b> <span className="opacity-70">s'est épuisé à tirer partout 💀</span></>}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Crosshair({ role, spread = 0, hitMark, target }) {
  if (role !== 'hunter') {
    return <span className={`block rounded-full transition-all ${target ? 'w-3 h-3 bg-teal-300 shadow-[0_0_10px_#5eead4]' : 'w-1.5 h-1.5 bg-white/80'}`} />;
  }
  const g = 4 + spread * 900;
  const c = hitMark ? 'bg-rose-400' : 'bg-white';
  return (
    <div className="relative w-0 h-0">
      <span className={`absolute h-[2px] w-2.5 ${c} shadow`} style={{ left: g, top: -1 }} />
      <span className={`absolute h-[2px] w-2.5 ${c} shadow`} style={{ right: g, top: -1 }} />
      <span className={`absolute w-[2px] h-2.5 ${c} shadow`} style={{ top: g, left: -1 }} />
      <span className={`absolute w-[2px] h-2.5 ${c} shadow`} style={{ bottom: g, left: -1 }} />
      <span className="absolute w-[2px] h-[2px] bg-white/80" style={{ left: -1, top: -1 }} />
      {hitMark && <span className="absolute -left-3 -top-3 w-6 h-6 text-rose-400 text-lg leading-6 text-center font-bold">✕</span>}
    </div>
  );
}

export function HealthCard({ self, role, hud, isTouch }) {
  const pct = Math.max(0, (self.hp / self.maxHp) * 100);
  const low = pct < 30;
  return (
    <div className={`absolute ${isTouch ? 'top-14 left-2 w-44' : 'bottom-3 left-3 w-60'} ${panel} px-3 py-2`}>
      <div className="flex items-center justify-between text-xs">
        <span className={role === 'hunter' ? 'text-rose-300' : 'text-teal-200'}>{role === 'hunter' ? '🔫 Chasseur' : '🫥 Caché'}{role === 'prop' && hud.locked ? ' · 🔒' : ''}</span>
        {role === 'prop' && self.disguise && <span className="truncate text-slate-300 ml-2">{MODELS[self.disguise.m]?.name}</span>}
      </div>
      <div className="mt-1.5 flex items-end gap-2">
        <span className={`font-display text-3xl leading-none tabular-nums ${low ? 'text-rose-400' : 'text-white'}`}>{self.hp}</span>
        <div className="flex-1 mb-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div className={`h-full rounded-full ${low ? 'bg-rose-500' : role === 'hunter' ? 'bg-gradient-to-r from-rose-500 to-amber-400' : 'bg-gradient-to-r from-teal-400 to-emerald-300'}`} animate={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AmmoCard({ hud, isTouch }) {
  const ammo = hud.ammo ?? WEAPON.mag;
  return (
    <div className={`absolute ${isTouch ? 'top-14 right-2' : 'bottom-3 right-3'} ${panel} px-3 py-2 text-right min-w-[150px]`}>
      {hud.reloading ? (
        <>
          <p className="text-xs text-amber-300">Rechargement…</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber-300" style={{ width: `${(hud.reloadPct || 0) * 100}%` }} /></div>
        </>
      ) : (
        <>
          <p className="leading-none"><span className={`font-display text-3xl tabular-nums ${ammo <= 5 ? 'text-rose-400' : 'text-white'}`}>{ammo}</span><span className="text-slate-400 text-sm"> / {WEAPON.mag}</span></p>
          <div className="mt-1.5 flex justify-end gap-[2px]">{Array.from({ length: WEAPON.mag }, (_, i) => <span key={i} className={`h-2.5 w-[3px] rounded-sm ${i < ammo ? 'bg-amber-200' : 'bg-white/10'}`} />)}</div>
          {ammo === 0 && !isTouch && <p className="mt-1 text-[11px] text-amber-300">R pour recharger</p>}
        </>
      )}
    </div>
  );
}

export function PropCard({ hud, decoysLeft, tauntLeft, isTouch }) {
  if (isTouch) return null;
  return (
    <div className={`absolute bottom-3 right-3 ${panel} px-3 py-2 text-[11px] text-slate-300 space-y-1 min-w-[190px]`}>
      <p className="flex justify-between gap-3"><span><b className="text-white">T</b> soundboard · <b className="text-white">F</b> au hasard</span><span className={tauntLeft > 0 ? 'text-slate-500' : 'text-teal-300'}>{tauntLeft > 0 ? `${Math.ceil(tauntLeft / 1000)} s` : 'prêt'}</span></p>
      <p className="flex justify-between gap-3"><span><b className="text-white">G</b> leurre</span><span className={decoysLeft > 0 ? 'text-teal-300' : 'text-slate-500'}>{decoysLeft} restant{decoysLeft > 1 ? 's' : ''}</span></p>
      <p className="flex justify-between gap-3"><span><b className="text-white">R</b> rotation</span><span>{hud.locked ? '🔒 bloquée' : 'libre'}</span></p>
      <p><b className="text-white">E</b> / clic : devenir l'objet visé · <b className="text-white">Tab</b> scores</p>
    </div>
  );
}

/** Soundboard des cachés : sons intégrés + sons ajoutés depuis l'admin. Touches 1 à 9 et 0. */
export function Soundboard({ sounds, onPick, onClose, cooldown, isTouch }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex items-center justify-center px-3 pointer-events-auto" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${panel} !bg-slate-950/85 w-[min(94vw,560px)] p-3`}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-xl text-white">🔊 Soundboard</p>
          <p className="text-[11px] text-slate-400">{cooldown > 0 ? `Prêt dans ${Math.ceil(cooldown / 1000)} s` : isTouch ? 'Touche un son' : 'Touche 1-9 / 0 ou clique · T pour fermer'}</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[60vh] overflow-y-auto">
          {sounds.map((s, i) => (
            <button key={s.id} type="button" disabled={cooldown > 0} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onPick(s.id); }}
              className="relative rounded-xl bg-white/[0.06] hover:bg-teal-400/20 ring-1 ring-white/10 px-2 py-2.5 text-left disabled:opacity-40 transition-colors">
              {i < 10 && !isTouch && <span className="absolute top-1 right-1.5 text-[10px] text-slate-500">{(i + 1) % 10}</span>}
              <span className="text-xl">{s.emoji}</span>
              <span className="block text-xs text-slate-100 truncate mt-0.5">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function DamageIndicator({ angle, at }) {
  const k = Math.max(0, 1 - (performance.now() - at) / 900);
  if (k <= 0 || angle == null) return null;
  return (
    <div className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transform: `rotate(${angle}rad)` }}>
      <div className="absolute -left-14 -top-[150px] w-28 h-10 rounded-[50%] border-t-4 border-rose-500" style={{ opacity: k }} />
    </div>
  );
}

export function RoundEnd({ p, person, left }) {
  const r = p.result;
  const hunters = r.winner === 'hunters';
  const top = [...p.players].sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`w-full max-w-md rounded-3xl ring-1 p-6 text-center ${hunters ? 'ring-rose-400/40 bg-gradient-to-br from-rose-950/95 to-slate-950/95' : 'ring-teal-300/40 bg-gradient-to-br from-teal-950/95 to-slate-950/95'}`}>
        <p className="text-5xl">{hunters ? '🔫' : '🫥'}</p>
        <p className={`mt-2 font-display text-3xl sm:text-4xl ${hunters ? 'text-rose-300' : 'text-teal-200'}`}>{hunters ? 'Les chasseurs gagnent' : 'Les cachés gagnent'}</p>
        {r.survivors?.length > 0 && <p className="mt-2 text-slate-200">Survivants : {r.survivors.map((id) => person(id).pseudo).join(', ')} <span className="text-teal-300">(+4)</span></p>}
        <div className="mt-4 space-y-1">
          {top.map((x, i) => (
            <p key={x.id} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-1.5 text-sm"><span>{['🥇', '🥈', '🥉'][i]} {x.pseudo}</span><b className="tabular-nums">{x.score}</b></p>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">{p.round >= p.totalRounds ? 'Dernière manche terminée…' : `Les rôles changent · manche suivante dans ${Math.max(0, Math.ceil(left / 1000))} s`}</p>
      </motion.div>
    </div>
  );
}

export function Scoreboard({ p, playerId }) {
  const team = (role) => [...p.players].filter((x) => x.role === role).sort((a, b) => b.score - a.score);
  const watchers = p.players.filter((x) => !x.role);
  const Row = ({ x }) => (
    <li className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${x.id === playerId ? 'bg-white/[0.08]' : ''} ${x.alive ? '' : 'opacity-45'}`}>
      <span className="flex-1 truncate text-slate-100">{x.pseudo}{!x.alive && x.role ? ' 💀' : ''}</span>
      <span className="tabular-nums text-slate-300 font-semibold">{x.score}</span>
    </li>
  );
  return (
    <div className={`absolute left-1/2 top-16 -translate-x-1/2 w-[min(94vw,560px)] ${panel} !bg-slate-950/85 p-3`}>
      <p className="text-sm font-semibold text-slate-200 mb-2">Scores · manche {p.round}/{p.totalRounds}</p>
      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-xs text-rose-300 mb-1">🔫 Chasseurs</p><ul className="space-y-0.5">{team('hunter').map((x) => <Row key={x.id} x={x} />)}</ul></div>
        <div><p className="text-xs text-teal-200 mb-1">🫥 Cachés</p><ul className="space-y-0.5">{team('prop').map((x) => <Row key={x.id} x={x} />)}</ul></div>
      </div>
      {watchers.length > 0 && <p className="mt-2 text-[11px] text-slate-400">👀 Prochaine manche : {watchers.map((x) => x.pseudo).join(', ')}</p>}
    </div>
  );
}

export function Menu({ isHost, onClose, input, quality, setQuality }) {
  const [vol, setVol] = useState(getVolume());
  const [sens, setSens] = useState(input.sensitivity);
  const full = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    else document.exitFullscreen?.();
  };
  return (
    <div className={`absolute left-2 top-14 w-72 ${panel} !bg-slate-950/90 p-3 space-y-3 text-sm`}>
      <label className="block text-slate-300">Volume
        <input type="range" min="0" max="1" step="0.05" value={vol} onChange={(e) => { setVol(Number(e.target.value)); setVolume(Number(e.target.value)); }} className="w-full accent-teal-300" />
      </label>
      <label className="block text-slate-300">Sensibilité
        <input type="range" min="0.3" max="2.5" step="0.1" value={sens} onChange={(e) => { setSens(Number(e.target.value)); input.setSensitivity(Number(e.target.value)); }} className="w-full accent-teal-300" />
      </label>
      <div>
        <p className="text-slate-300 mb-1">Graphismes</p>
        <div className="grid grid-cols-3 gap-1">
          {[['low', 'Léger'], ['medium', 'Moyen'], ['high', 'Élevé']].map(([q, l]) => (
            <button key={q} type="button" onClick={() => setQuality(q)} className={`rounded-lg px-2 py-1.5 text-xs ${quality === q ? 'bg-teal-400 text-slate-900 font-semibold' : 'bg-white/[0.07] text-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>
      <button type="button" className="btn btn-ghost w-full !py-2" onClick={full}>⛶ Plein écran</button>
      {isHost && <button type="button" className="btn btn-ghost w-full !py-2" onClick={() => { socket.emit('game:action', { type: 'skipRound', payload: {} }); onClose(); }}>Terminer la manche</button>}
      {isHost && <button type="button" className="btn btn-ghost w-full !py-2 text-rose-300" onClick={() => { socket.emit('game:stop'); onClose(); }}>Arrêter la partie</button>}
      <button type="button" className="btn btn-primary w-full !py-2" onClick={onClose}>Reprendre</button>
    </div>
  );
}

export function TouchControls({ input, role, alive, stick, decoysLeft, hud, phase, onBoard }) {
  const btn = (label, action, extra = '') => (
    <button type="button" className={`ph-btn ${extra}`} onPointerDown={(e) => { e.preventDefault(); input.push(action); }}>{label}</button>
  );
  const hold = (label, set, extra = '') => (
    <button type="button" className={`ph-btn ${extra}`} onPointerDown={(e) => { e.preventDefault(); set(true); }} onPointerUp={() => set(false)} onPointerLeave={() => set(false)} onPointerCancel={() => set(false)}>{label}</button>
  );
  if (phase === 'ROUND_END') return null;
  return (
    <>
      {stick.active && (
        <div className="pointer-events-none absolute" style={{ left: stick.ox - 60, top: stick.oy - 60 }}>
          <div className="w-[120px] h-[120px] rounded-full border-2 border-white/30 bg-white/5" />
          <div className="absolute w-12 h-12 rounded-full bg-white/40" style={{ left: 36 + (stick.dx || 0), top: 36 + (stick.dy || 0) }} />
        </div>
      )}
      {!stick.active && alive && <p className="pointer-events-none absolute left-6 bottom-6 text-[11px] text-white/50">Pose ton pouce ici<br />pour te déplacer</p>}
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
        {alive ? (
          <>
            <div className="flex gap-2">
              {role === 'prop' && <button type="button" className="ph-btn !w-12 !h-12" onPointerDown={(e) => { e.preventDefault(); onBoard(); }}>🔊</button>}
              {role === 'prop' && decoysLeft > 0 && btn(`👥${decoysLeft}`, 'decoy', '!w-12 !h-12 text-sm')}
              {role === 'prop' && btn(hud.locked ? '🔒' : '🔓', 'lock', '!w-12 !h-12')}
              {role === 'hunter' && btn('⟳', 'lock', '!w-12 !h-12 text-xl')}
            </div>
            <div className="flex items-end gap-2">
              {hold('⤒', (v) => { input.jump = v; }, '!w-14 !h-14 text-xl')}
              {role === 'hunter'
                ? hold('🔫', (v) => { input.fire = v; }, '!w-20 !h-20 text-3xl !bg-rose-500/80')
                : <button type="button" className={`ph-btn !w-20 !h-20 !text-xs font-bold ${hud.target ? '!bg-teal-400/90 text-slate-900' : 'opacity-60'}`} onPointerDown={(e) => { e.preventDefault(); input.push('action'); }}>Devenir</button>}
            </div>
          </>
        ) : btn('Suivant', 'next', '!w-20 !h-12 !text-sm')}
      </div>
    </>
  );
}

/** Téléphone tenu droit : on conseille de le tourner (le jeu se joue en paysage). */
export function PortraitHint() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (!portrait) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 text-center px-8">
      <span className="text-6xl" style={{ display: 'inline-block', transform: 'rotate(90deg)' }} aria-hidden="true">📱</span>
      <p className="font-display text-2xl text-slate-50">Tourne ton téléphone</p>
      <p className="text-sm text-slate-300">Prop Hunt se joue à l'horizontale. Astuce : le menu ☰ propose le plein écran.</p>
    </div>
  );
}
