import { useGameOptions } from '../../hooks/useGameOptions.js';
import { MAP_LIST } from './common/mapList.js';

const DEFAULT_OPTS = { map: 'rotate', rounds: 0, huntSec: 240, hideSec: 45, hunters: 'auto', tauntSec: 45, decoys: 2 };

export default function PropHuntOptions({ playerCount, onStart }) {
  const [rawOpts, setOpts, isHost] = useGameOptions('prophunt', DEFAULT_OPTS);
  const opts = { ...DEFAULT_OPTS, ...rawOpts };
  const set = (k, v) => isHost && setOpts((o) => ({ ...DEFAULT_OPTS, ...o, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3 text-sm text-slate-300 space-y-1">
        <p><b className="text-slate-100">Les cachés</b> se transforment en objets du décor et se cachent. <b className="text-slate-100">Les chasseurs</b>, aveuglés pendant ce temps, tirent ensuite sur ce qui leur paraît suspect… mais chaque tir sur un vrai objet leur coûte de la vie.</p>
        <p className="text-xs text-slate-400">PC : ZQSD/WASD + souris. Téléphone et tablette : joystick et boutons à l'écran, à jouer en paysage.</p>
      </div>

      <section>
        <p className="text-sm font-semibold text-slate-200 mb-2">Map</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[{ id: 'rotate', icon: '🔁', name: 'Chacune son tour', desc: 'Une map différente à chaque manche.' }, { id: 'random', icon: '🎲', name: 'Au hasard', desc: 'Surprise à chaque manche.' }, ...MAP_LIST].map((m) => (
            <button key={m.id} type="button" disabled={!isHost} onClick={() => set('map', m.id)} aria-pressed={opts.map === m.id}
              className={`text-left rounded-xl p-3 transition ${opts.map === m.id ? 'bg-teal-400/10 ring-2 ring-teal-300' : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]'}`}>
              <span className="block font-semibold text-slate-50"><span aria-hidden="true">{m.icon}</span> {m.name}</span>
              <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Manches"><Seg value={opts.rounds} disabled={!isHost} onChange={(v) => set('rounds', v)} items={[[0, 'Auto'], [2, '2'], [4, '4'], [6, '6'], [8, '8']]} /></Field>
        <Field label="Chasseurs"><Seg value={opts.hunters} disabled={!isHost} onChange={(v) => set('hunters', v)} items={[['auto', 'Auto'], [1, '1'], [2, '2'], [3, '3']]} /></Field>
        <Field label="Temps pour se cacher"><Seg value={opts.hideSec} disabled={!isHost} onChange={(v) => set('hideSec', v)} items={[[20, '20 s'], [30, '30 s'], [45, '45 s'], [60, '1 min']]} /></Field>
        <Field label="Durée de la chasse"><Seg value={opts.huntSec} disabled={!isHost} onChange={(v) => set('huntSec', v)} items={[[120, '2'], [180, '3'], [240, '4'], [300, '5'], [420, '7 min']]} /></Field>
        <Field label="Moquerie obligatoire si silencieux"><Seg value={opts.tauntSec} disabled={!isHost} onChange={(v) => set('tauntSec', v)} items={[[0, 'Jamais'], [30, '30 s'], [45, '45 s'], [60, '1 min'], [90, '1:30']]} /></Field>
        <Field label="Leurres par caché"><Seg value={opts.decoys} disabled={!isHost} onChange={(v) => set('decoys', v)} items={[[0, 'Aucun'], [1, '1'], [2, '2'], [3, '3']]} /></Field>
      </div>
      <p className="text-xs text-slate-400">Auto : autant de manches que de joueurs (2 à 8), et environ 1 chasseur pour 3 joueurs. Les rôles tournent à chaque manche.</p>

      {isHost && (
        <button type="button" onClick={() => onStart(opts)} disabled={playerCount < 2} className="btn btn-token w-full text-lg disabled:opacity-40">
          🫥 Lancer {playerCount < 2 ? '(2 joueurs minimum)' : ''}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><p className="text-xs text-slate-400 mb-1.5">{label}</p>{children}</div>;
}
function Seg({ value, onChange, items, disabled }) {
  return (
    <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
      {items.map(([v, l]) => (
        <button key={String(v)} type="button" disabled={disabled} onClick={() => onChange(v)} aria-pressed={value === v} style={{ minHeight: 0 }}
          className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium whitespace-nowrap ${value === v ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-white'}`}>{l}</button>
      ))}
    </div>
  );
}
