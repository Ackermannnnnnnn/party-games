import { role, ROLE_ORDER } from './roles.js';

const r = (id) => (id ? ` (${role(id).icon} ${role(id).short})` : '');

/** Une ligne de la chronique publique. */
export function publicLine(e, name) {
  switch (e.k) {
    case 'dawn':
      if (!e.deaths.length) return { icon: '🕊️', text: 'Personne n\'est mort cette nuit.' };
      return { icon: '🪦', text: e.deaths.map((d) => `${name(d.id)}${r(d.role)}${d.cause === 'love' ? ' meurt de chagrin' : ''}`).join(', ') + (e.deaths.length > 1 ? ' sont morts.' : ' est mort.') };
    case 'mayor':
      if (e.how === 'succession') return { icon: '👑', text: `${name(e.id)} devient maire${e.from ? ` (choisi par ${name(e.from)})` : ''}.` };
      return { icon: '👑', text: `${name(e.id)} est élu maire${e.how === 'draw' ? ' (tirage au sort entre ex-æquo)' : ''}.` };
    case 'vote':
      if (!e.id) return { icon: '⚖️', text: e.tie ? 'Égalité : personne n\'est éliminé.' : 'Personne n\'est éliminé.' };
      return { icon: '⚖️', text: `Le village élimine ${name(e.id)}${r(e.role)}.${(e.also || []).map((d) => ` ${name(d.id)} meurt de chagrin.`).join('')}` };
    case 'hunter':
      if (!e.id) return { icon: '🏹', text: `${name(e.by)} n'a pas tiré.` };
      return { icon: '🏹', text: `${name(e.by)} abat ${name(e.id)}${r(e.role)}.${(e.also || []).map((d) => ` ${name(d.id)} meurt de chagrin.`).join('')}` };
    case 'left':
      return { icon: '🚪', text: `${name(e.id)} a quitté la partie${r(e.role)}.` };
    default:
      return null;
  }
}

export function secretLine(e, name) {
  switch (e.k) {
    case 'cupid': return { icon: '💘', text: `Cupidon unit ${name(e.ids[0])} et ${name(e.ids[1])}.` };
    case 'guard': return { icon: '🛡️', text: `Le garde protège ${name(e.id)}.` };
    case 'wolves': return { icon: '🐺', text: e.id ? `Les loups attaquent ${name(e.id)}.` : 'Les loups n\'attaquent personne.' };
    case 'guarded': return { icon: '🛡️', text: `…mais ${name(e.id)} était protégé par le garde !` };
    case 'ww': return { icon: '🐺', text: `Le loup blanc dévore ${name(e.id)}.` };
    case 'seer': return { icon: '🔮', text: `La voyante sonde ${name(e.id)} : ${role(e.role).short}.` };
    case 'heal': return { icon: '💚', text: `La sorcière sauve ${name(e.id)}.` };
    case 'poison': return { icon: '☠️', text: `La sorcière empoisonne ${name(e.id)}.` };
    case 'spy': return { icon: '👀', text: 'La petite fille espionne la meute.' };
    default: return null;
  }
}

/** Regroupe la chronique par nuit / jour (avec les secrets si fournis). */
export function groupLog(log, secret = []) {
  const groups = [];
  let g = null;
  for (const e of log) {
    if (e.k === 'night') {
      g = { n: e.n, night: secret.filter((x) => x.n === e.n), dawn: null, day: [] };
      groups.push(g);
    } else if (e.k === 'dawn' && g) g.dawn = e;
    else if (g) g.day.push(e);
  }
  return groups;
}

/** Chronique publique (pendant la partie), la plus récente en haut. */
export default function Chronicle({ s, name, secret }) {
  const groups = groupLog(s.log || [], secret || []).reverse();
  return (
    <details className="lg-glass px-4 py-3 group">
      <summary className="cursor-pointer select-none lg-title text-sm text-amber-100/90 flex items-center justify-between">
        <span>📜 Chronique du village</span>
        <Composition s={s} />
      </summary>
      <div className="mt-3 space-y-3 text-sm lg-scroll max-h-72 overflow-y-auto pr-1">
        {groups.length === 0 && <p className="text-slate-400 italic text-xs">L'histoire commence à peine…</p>}
        {groups.map((g) => (
          <div key={g.n} className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-indigo-200/80">🌙 Nuit {g.n}</p>
            {g.night.map((e, i) => { const l = secretLine(e, name); return l && <Line key={`s${i}`} l={l} secret />; })}
            {g.dawn && <Line l={publicLine(g.dawn, name)} />}
            {g.day.length > 0 && <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/80 pt-1">☀️ Jour {g.n}</p>}
            {g.day.map((e, i) => { const l = publicLine(e, name); return l && <Line key={i} l={l} />; })}
          </div>
        ))}
      </div>
    </details>
  );
}

function Line({ l, secret }) {
  return (
    <p className={`flex gap-2 leading-snug ${secret ? 'text-violet-200/90 italic' : 'text-slate-100'}`}>
      <span aria-hidden="true">{l.icon}</span><span>{l.text}</span>
    </p>
  );
}

/** Les cartes en jeu : 🐺×2 🔮 🧪… */
export function Composition({ s, className = '' }) {
  const c = s.composition || {};
  return (
    <span className={`flex flex-wrap gap-1 text-xs font-sans normal-case tracking-normal ${className}`}>
      {ROLE_ORDER.filter((id) => c[id]).map((id) => (
        <span key={id} title={role(id).label} className="rounded-full bg-black/40 border border-white/10 px-1.5 py-0.5">
          <span style={{ filter: id === 'loup_blanc' ? 'grayscale(1) brightness(1.6)' : undefined }}>{role(id).icon}</span>{c[id] > 1 ? `×${c[id]}` : ''}
        </span>
      ))}
    </span>
  );
}
