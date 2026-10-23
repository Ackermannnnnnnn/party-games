import { useGameOptions } from '../../hooks/useGameOptions.js';
import { UNIVERSES, MODES } from './data.js';

const DEFAULT_OPTS = { mode: 'duel', universes: [], boardSize: 24, questions: 'both', wrongGuess: 'skip', meneur: 'app', rounds: 5, autoFlip: true };

export default function WhoIsItOptions({ playerCount, onStart }) {
  const [rawOpts, setOpts, isHost] = useGameOptions('whoisit', DEFAULT_OPTS);
  const opts = { ...DEFAULT_OPTS, ...rawOpts };
  if (!Array.isArray(opts.universes)) opts.universes = [];
  const set = (k, v) => isHost && setOpts((o) => ({ ...DEFAULT_OPTS, ...o, [k]: v }));
  const toggleUniverse = (id) => set('universes', opts.universes.includes(id) ? opts.universes.filter((u) => u !== id) : [...opts.universes, id]);
  const mode = MODES.find((m) => m.id === opts.mode) || MODES[0];
  const need = opts.mode === 'meneur' ? (opts.meneur === 'players' ? 2 : 1) : mode.min;
  const count = UNIVERSES.filter((u) => !opts.universes.length || opts.universes.includes(u.id)).reduce((n, u) => n + u.count, 0);
  const usesBoard = opts.mode === 'duel' || opts.mode === 'meneur';

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold text-slate-200 mb-2">Mode de jeu</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button key={m.id} type="button" disabled={!isHost} onClick={() => set('mode', m.id)} aria-pressed={opts.mode === m.id}
              className={`text-left rounded-xl p-3 transition ${opts.mode === m.id ? 'bg-teal-400/10 ring-2 ring-teal-300' : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]'} ${!isHost ? 'cursor-default' : ''}`}>
              <span className="flex items-center gap-2 font-semibold text-slate-50"><span className="text-xl" aria-hidden="true">{m.icon}</span>{m.label}</span>
              <span className="block text-xs text-slate-400 mt-1 leading-snug">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm font-semibold text-slate-200">Univers des personnages</p>
          <span className="text-xs text-slate-400">{count} personnages</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip on={!opts.universes.length} disabled={!isHost} onClick={() => set('universes', [])}>Tous</Chip>
          {UNIVERSES.map((u) => (
            <Chip key={u.id} on={opts.universes.includes(u.id)} disabled={!isHost} onClick={() => toggleUniverse(u.id)}>
              {u.icon} {u.label} <span className="opacity-60 text-[11px]">{u.count}</span>
            </Chip>
          ))}
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        {usesBoard && (
          <Field label="Visages sur le plateau">
            <Segmented value={opts.boardSize} disabled={!isHost} onChange={(v) => set('boardSize', v)} items={[[16, '16'], [24, '24'], [32, '32']]} />
          </Field>
        )}
        {opts.mode !== 'akinator' && (
          <Field label="Questions">
            <Segmented value={opts.questions} disabled={!isHost} onChange={(v) => set('questions', v)}
              items={[['both', 'Les deux'], ['ready', 'Toutes prêtes'], ['free', 'Libres']]} />
          </Field>
        )}
        {opts.mode === 'duel' && (
          <Field label="Mauvaise proposition">
            <Segmented value={opts.wrongGuess} disabled={!isHost} onChange={(v) => set('wrongGuess', v)} items={[['skip', 'Tour perdu'], ['lose', 'Partie perdue']]} />
          </Field>
        )}
        {opts.mode === 'meneur' && (
          <>
            <Field label="Qui cache le personnage ?">
              <Segmented value={opts.meneur} disabled={!isHost} onChange={(v) => set('meneur', v)} items={[['app', "L'app"], ['players', 'Chaque joueur à son tour']]} />
            </Field>
            {opts.meneur === 'app' && (
              <Field label="Manches">
                <Segmented value={opts.rounds} disabled={!isHost} onChange={(v) => set('rounds', v)} items={[[3, '3'], [5, '5'], [8, '8'], [10, '10']]} />
              </Field>
            )}
          </>
        )}
        {usesBoard && opts.questions !== 'free' && (
          <Field label="Abaisser les visages après une question toute prête">
            <Segmented value={opts.autoFlip} disabled={!isHost} onChange={(v) => set('autoFlip', v)} items={[[true, 'Automatique'], [false, 'À la main']]} />
          </Field>
        )}
      </div>

      {opts.mode === 'meneur' && opts.meneur === 'app' && opts.questions === 'free' && (
        <p className="text-xs text-amber-300">Quand l'app est meneur, elle ne répond qu'aux questions toutes prêtes : elles restent disponibles.</p>
      )}

      {isHost && (
        <button type="button" onClick={() => onStart(opts)} disabled={playerCount < need} className="btn btn-token w-full text-lg disabled:opacity-40">
          {mode.icon} Lancer {playerCount < need ? `(${need} joueurs minimum)` : ''}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, items, disabled }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
      {items.map(([v, label]) => (
        <button key={String(v)} type="button" disabled={disabled} onClick={() => onChange(v)} aria-pressed={value === v} style={{ minHeight: 0 }}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${value === v ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-white'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Chip({ on, onClick, disabled, children }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={on} style={{ minHeight: 0 }}
      className={`rounded-full px-3 py-1.5 text-sm transition ${on ? 'bg-teal-300 text-slate-900 font-semibold' : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'}`}>
      {children}
    </button>
  );
}
