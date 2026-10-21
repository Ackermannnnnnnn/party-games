import { useGameOptions } from '../../hooks/useGameOptions.js';
import { unlockSound } from './sfx.js';

const DEFAULT_OPTS = { accuseMode: 'next', devilCard: false, turnSec: 30, view: '2d' };
const TURN_SECS = [0, 15, 20, 30, 45, 60];

export default function LiarsBarOptions({ playerCount, onStart }) {
  const [rawOpts, setOpts, isHost] = useGameOptions('liarsbar', DEFAULT_OPTS);
  const opts = { ...DEFAULT_OPTS, ...rawOpts };
  const set = (k, v) => isHost && setOpts((o) => ({ ...DEFAULT_OPTS, ...o, [k]: v }));
  const tooMany = playerCount > 6;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100 space-y-1">
        <p><strong>Le principe :</strong> une carte de table est tirée (Rois, Dames ou As). À ton tour, pose 1 à 3 cartes <em>face cachée</em> en prétendant que ce sont des cartes de table. Les Jokers valent tout.</p>
        <p>Quelqu'un crie <strong>« Menteur ! »</strong> : on retourne. Mensonge → le menteur tire. Vérité → l'accusateur tire. Revolver à 6 chambres, 1 balle. Dernier en vie gagne.</p>
      </div>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Qui peut crier « Menteur ! » ?</p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          <Choice on={opts.accuseMode === 'next'} disabled={!isHost} onClick={() => set('accuseMode', 'next')} title="👉 Le joueur suivant" desc="Comme l'original : le suivant choisit entre accuser ou poser." />
          <Choice on={opts.accuseMode === 'anyone'} disabled={!isHost} onClick={() => set('accuseMode', 'anyone')} title="🗣️ N'importe qui" desc="Tout le monde peut accuser la dernière pose, tant que le suivant n'a pas joué." />
        </div>
      </section>

      <Toggle on={opts.devilCard} disabled={!isHost} onChange={(v) => set('devilCard', v)}
        title="😈 Carte du Diable" desc="Une carte piégée dans le paquet : si elle est retournée après une accusation, tous les autres joueurs tirent." />

      <section className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">⏱ Temps par tour
          <select disabled={!isHost} value={opts.turnSec} onChange={(e) => set('turnSec', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {TURN_SECS.map((n) => <option key={n} value={n}>{n ? `${n} secondes` : 'Pas de limite'}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs text-slate-400">🎥 Affichage
          <div className="grid grid-cols-2 gap-1">
            <span className="rounded-lg px-3 py-2 text-sm text-center border bg-brand/25 border-brand text-white">2D</span>
            <span className="rounded-lg px-3 py-2 text-sm text-center border border-slate-800 text-slate-500" title="Bientôt">3D · bientôt</span>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-slate-500 text-center">2 à 6 joueurs · le paquet s'adapte au nombre de joueurs (5 cartes chacun).</p>

      {isHost && (
        <>
          {tooMany && <p className="text-center text-xs text-amber-300">6 joueurs maximum à la table : les autres regarderont.</p>}
          <button type="button" onClick={() => { unlockSound(); onStart(opts); }} disabled={playerCount < 2} className="btn btn-primary w-full text-lg disabled:opacity-50">
            🃏 Ouvrir le bar {playerCount < 2 ? '(2 joueurs minimum)' : ''}
          </button>
        </>
      )}
    </div>
  );
}

function Choice({ on, onClick, disabled, title, desc }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={on}
      className={`rounded-xl px-3 py-2 text-left border transition ${on ? 'bg-brand/20 border-brand' : 'bg-slate-900/50 border-slate-700'} ${disabled ? 'cursor-default' : ''}`}>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
    </button>
  );
}

function Toggle({ on, onChange, disabled, title, desc }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on}
      className={`w-full flex items-start gap-2.5 rounded-xl px-3 py-2 text-left border transition ${on ? 'bg-brand/15 border-brand/50' : 'bg-slate-900/50 border-slate-700'} ${disabled ? 'cursor-default' : ''}`}>
      <span className={`mt-0.5 w-9 h-5 rounded-full relative shrink-0 transition ${on ? 'bg-brand' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
      </span>
    </button>
  );
}
