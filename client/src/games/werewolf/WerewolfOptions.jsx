import { useEffect, useState } from 'react';
import '@fontsource/cinzel/600.css';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';
import { CardFront } from './RoleCard.jsx';
import { role } from './roles.js';

const DEFAULT_OPTS = {
  wolves: 2,
  roles: ['voyante', 'sorciere', 'chasseur', 'garde'],
  mayor: true,
  debateSec: 180,
  pace: 'normal',
  revealRoles: true,
  deadSeeAll: true,
  publicVotes: true,
};
const SPECIALS = ['voyante', 'sorciere', 'chasseur', 'garde', 'cupidon', 'petite_fille', 'loup_blanc'];
const fmtDuration = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}` : ''}`);

export default function WerewolfOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [opts, setOpts, isHost] = useGameOptions('werewolf', DEFAULT_OPTS);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => { if (gameId === 'werewolf' && m) setManifest(m); };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'werewolf' });
    return () => socket.off('game:options', onOptions);
  }, []);

  const o = { ...DEFAULT_OPTS, ...opts, roles: Array.isArray(opts.roles) ? opts.roles : DEFAULT_OPTS.roles, wolves: Number(opts.wolves) || DEFAULT_OPTS.wolves };
  const set = (k, v) => isHost && setOpts((cur) => ({ ...DEFAULT_OPTS, ...cur, [k]: v }));
  const toggleRole = (id) => set('roles', o.roles.includes(id) ? o.roles.filter((r) => r !== id) : [...o.roles, id]);

  const n = playerCount;
  const wolfCards = o.wolves + (o.roles.includes('loup_blanc') ? 1 : 0);
  const others = o.roles.filter((r) => r !== 'loup_blanc').length;
  const villagers = n - wolfCards - others;
  let problem = null;
  if (n < 5) problem = 'Il faut au moins 5 joueurs.';
  else if (villagers < 0) problem = `Trop de cartes : ${wolfCards + others} cartes pour ${n} joueurs.`;
  else if (wolfCards >= n - wolfCards) problem = 'Trop de loups : ils gagneraient dès le début.';
  const suggestion = manifest?.suggestions?.[Math.max(5, Math.min(18, n))];
  const applySuggestion = () => { if (suggestion && isHost) setOpts((cur) => ({ ...DEFAULT_OPTS, ...cur, wolves: suggestion.wolves, roles: suggestion.roles })); };

  const deck = [...Array(o.wolves).fill('loup_garou'), ...SPECIALS.filter((r) => o.roles.includes(r)), ...Array(Math.max(0, villagers)).fill('villageois')];

  return (
    <div className="space-y-4 rounded-2xl p-3 sm:p-4 text-slate-100" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #1e1b4b 0%, #0b1026 55%, #05060f 100%)' }}>
      {/* Le paquet */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="lg-title text-sm text-amber-100">🃏 Le paquet ({deck.length} cartes)</p>
          {isHost && suggestion && (
            <button type="button" onClick={applySuggestion} className="text-xs rounded-full px-3 py-1.5 bg-amber-300/15 border border-amber-200/40 text-amber-100 hover:bg-amber-300/25" style={{ minHeight: 0 }}>
              ✨ Conseillé pour {n}
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 lg-scroll">
          {deck.map((r, i) => (
            <div key={i} className="w-12 sm:w-14 aspect-[5/7] shrink-0"><CardFront roleId={r} size="xs" /></div>
          ))}
        </div>
        <p className={`text-xs mt-1 ${problem ? 'text-rose-300' : 'text-slate-400'}`}>
          {problem || `🐺 ${wolfCards} loup${wolfCards > 1 ? 's' : ''} · ⭐ ${others} rôle${others > 1 ? 's' : ''} spécia${others > 1 ? 'ux' : 'l'} · 🧑‍🌾 ${villagers} villageois`}
        </p>
      </div>

      {/* Loups */}
      <div className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-400/25 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🐺</span>
          <div>
            <p className="font-semibold">Loups-garous</p>
            <p className="text-[11px] text-slate-400">Conseil : 1 loup pour 4 à 5 joueurs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost && <button type="button" aria-label="Un loup de moins" className="w-9 h-9 rounded-full bg-white/10 text-lg font-bold disabled:opacity-30" disabled={o.wolves <= 1} onClick={() => set('wolves', o.wolves - 1)}>−</button>}
          <span className="lg-title text-2xl w-7 text-center">{o.wolves}</span>
          {isHost && <button type="button" aria-label="Un loup de plus" className="w-9 h-9 rounded-full bg-white/10 text-lg font-bold disabled:opacity-30" disabled={o.wolves >= 5} onClick={() => set('wolves', o.wolves + 1)}>+</button>}
        </div>
      </div>

      {/* Rôles spéciaux */}
      <div>
        <p className="lg-title text-sm text-amber-100 mb-2">⭐ Rôles spéciaux</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SPECIALS.map((id) => {
            const r = role(id);
            const on = o.roles.includes(id);
            return (
              <div key={id} className={`relative rounded-xl border-2 transition ${on ? 'border-amber-300/80 bg-white/10 shadow-[0_0_18px_-4px_rgba(253,230,138,0.6)]' : 'border-white/10 bg-black/30 opacity-70'}`}>
                <button type="button" disabled={!isHost} onClick={() => toggleRole(id)} aria-pressed={on}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 text-left ${isHost ? '' : 'cursor-default'}`}>
                  <span className="text-2xl" style={{ filter: id === 'loup_blanc' ? 'grayscale(1) brightness(1.6)' : undefined }} aria-hidden="true">{r.icon}</span>
                  <span className="text-sm font-semibold leading-tight">{r.label}</span>
                  <span className="ml-auto text-xs">{on ? '✅' : ''}</span>
                </button>
                <button type="button" onClick={() => setInfo(info === id ? null : id)} aria-label={`À propos : ${r.label}`}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 border border-white/20 text-[10px]" style={{ minHeight: 0 }}>?</button>
              </div>
            );
          })}
        </div>
        {info && (
          <div className="mt-2 rounded-xl bg-black/40 border border-white/10 p-3 text-sm flex gap-3 items-start">
            <span className="text-2xl" aria-hidden="true">{role(info).icon}</span>
            <p><strong>{role(info).label} :</strong> {role(info).desc}</p>
          </div>
        )}
      </div>

      {/* Réglages */}
      <div className="grid sm:grid-cols-2 gap-2">
        <Toggle on={o.mayor} disabled={!isHost} onChange={(v) => set('mayor', v)} icon="👑" title="Élection du maire" desc="Élu le 1er jour, sa voix compte double et il tranche les égalités." />
        <Toggle on={o.revealRoles} disabled={!isHost} onChange={(v) => set('revealRoles', v)} icon="🃏" title="Révéler le rôle des morts" desc="Sinon, les cartes restent cachées jusqu'à la fin." />
        <Toggle on={o.publicVotes} disabled={!isHost} onChange={(v) => set('publicVotes', v)} icon="👉" title="Votes visibles" desc="On voit qui accuse qui pendant le vote, en direct." />
        <Toggle on={o.deadSeeAll} disabled={!isHost} onChange={(v) => set('deadSeeAll', v)} icon="👻" title="Les morts voient tout" desc="Rôles et actions de nuit visibles par les morts (qui se taisent !)." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          ⏱️ Durée du débat
          <select disabled={!isHost} value={o.debateSec} onChange={(e) => set('debateSec', Number(e.target.value))}
            className="rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-sm text-white">
            {(manifest?.debateChoices || [60, 120, 180, 240, 300, 420, 600]).map((s) => <option key={s} value={s}>{fmtDuration(s)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          🌙 Rythme des nuits
          <select disabled={!isHost} value={o.pace} onChange={(e) => set('pace', e.target.value)}
            className="rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-sm text-white">
            {(manifest?.paces || [{ id: 'rapide', label: '⚡ Rapide' }, { id: 'normal', label: '🌙 Normal' }, { id: 'tranquille', label: '🕯️ Tranquille' }]).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
      </div>

      <p className="text-[11px] text-slate-400 leading-snug">
        🗣️ L'appli fait le meneur de jeu : un narrateur vocal annonce chaque étape sur le téléphone de l'hôte (activable sur chaque appareil avec 🤐/🗣️).
        Jouez dans la même pièce ou en vocal : la nuit, chacun garde les yeux sur son écran… ou fermés !
      </p>

      {isHost && (
        <button type="button" onClick={() => onStart({ ...o })} disabled={!!problem} className="lg-btn w-full text-base sm:text-lg">
          🌕 Que la nuit tombe sur Thiercelieux
        </button>
      )}
    </div>
  );
}

function Toggle({ on, onChange, disabled, icon, title, desc }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on}
      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-left border transition ${on ? 'bg-white/10 border-amber-200/40' : 'bg-black/25 border-white/10'} ${disabled ? 'cursor-default' : ''}`}>
      <span className={`mt-0.5 w-9 h-5 rounded-full relative shrink-0 transition ${on ? 'bg-amber-400' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{icon} {title}</span>
        <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
      </span>
    </button>
  );
}
