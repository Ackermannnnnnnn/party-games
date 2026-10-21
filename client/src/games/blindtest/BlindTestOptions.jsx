import { useEffect, useState } from 'react';
import { socket } from '../../lib/socket.js';
import { useGameOptions } from '../../hooks/useGameOptions.js';
import { unlockAudio } from './audio.js';

const DEFAULT_OPTS = {
  universes: [],
  formats: ['audio'],
  popularity: 'mix',
  playMode: 'online',
  answerMode: 'free',
  gameMaster: false,
  nbRounds: 15,
  roundSec: 25,
};

const POPULARITY = [
  { id: 'mainstream', label: '🌟 Grand public' },
  { id: 'mix', label: '⚖️ Mélange 60/40' },
  { id: 'niche', label: '💎 Niche' },
];

const PLAY_MODES = [
  { id: 'online', label: '🌐 En ligne', desc: 'Chacun entend l’extrait sur son appareil, au même moment.' },
  { id: 'local', label: '🏠 Local', desc: 'Seul l’appareil de l’hôte diffuse (TV, enceinte…). Les téléphones servent de buzzers.' },
];

const ANSWER_MODES = [
  { id: 'free', label: '⌨️ Saisie libre', desc: 'On tape ses propositions, autant de fois qu’on veut.' },
  { id: 'qcm', label: '🔢 QCM', desc: '4 choix, un seul essai.' },
  { id: 'buzzer', label: '🔔 Buzzer', desc: 'Le premier qui buzze met en pause et répond.' },
];

export default function BlindTestOptions({ playerCount, onStart }) {
  const [manifest, setManifest] = useState(null);
  const [rawOpts, setOpts, isHost] = useGameOptions('blindtest', DEFAULT_OPTS);

  useEffect(() => {
    const onOptions = ({ gameId, manifest: m }) => { if (gameId === 'blindtest' && m) setManifest(m); };
    socket.on('game:options', onOptions);
    socket.emit('game:options', { gameId: 'blindtest' });
    return () => socket.off('game:options', onOptions);
  }, []);

  if (!manifest) return <p className="text-slate-400 text-sm">Chargement des options…</p>;

  const opts = { ...DEFAULT_OPTS, ...rawOpts };
  if (!Array.isArray(opts.universes)) opts.universes = [];
  const set = (k, v) => isHost && setOpts((o) => ({ ...DEFAULT_OPTS, ...o, [k]: v }));
  const toggleUniverse = (id) => set('universes', opts.universes.includes(id) ? opts.universes.filter((u) => u !== id) : [...opts.universes, id]);

  const forcedBuzzer = opts.playMode === 'local' || opts.gameMaster;
  const answerMode = forcedBuzzer ? 'buzzer' : opts.answerMode;
  const chosen = manifest.universes.filter((u) => !opts.universes.length || opts.universes.includes(u.id));
  const available = chosen.reduce((n, u) => n + (opts.popularity === 'mainstream' ? u.mainstream : opts.popularity === 'niche' ? u.niche : u.count), 0);
  const needsTwo = opts.gameMaster && playerCount < 2;

  const start = () => {
    unlockAudio(); // le clic de l'hôte débloque le son sur son appareil
    onStart({ ...opts, answerMode });
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-slate-400">Univers</p>
          {isHost && opts.universes.length > 0 && (
            <button type="button" className="text-xs text-brand-light underline" style={{ minHeight: 0 }} onClick={() => set('universes', [])}>Tous</button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {manifest.universes.map((u) => {
            const on = !opts.universes.length || opts.universes.includes(u.id);
            return (
              <button key={u.id} type="button" disabled={!isHost} onClick={() => toggleUniverse(u.id)} aria-pressed={opts.universes.includes(u.id)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition text-left ${on ? 'bg-brand/25 border-brand text-white' : 'bg-slate-900/60 border-slate-700 text-slate-400'} ${isHost ? '' : 'cursor-default'}`}>
                <span className="block">{u.label}</span>
                <span className="block text-[10px] font-normal opacity-70">{u.count} extraits</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Rien de coché = tout. Films, séries et anime : trouve l'œuvre. Musique : le titre et l'artiste.</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Format</p>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-xl px-3 py-2.5 text-sm font-semibold border bg-brand/25 border-brand">🎵 Extrait musical</div>
          <div className="rounded-xl px-3 py-2.5 text-sm font-semibold border bg-slate-900/40 border-slate-800 text-slate-500">🖼️ Image <span className="text-[10px] font-normal">· bientôt</span></div>
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Références</p>
        <div className="grid grid-cols-3 gap-1.5">
          {POPULARITY.map((p) => (
            <button key={p.id} type="button" disabled={!isHost} onClick={() => set('popularity', p.id)} aria-pressed={opts.popularity === p.id}
              className={`rounded-xl px-2 py-2 text-xs sm:text-sm font-semibold border transition ${opts.popularity === p.id ? 'bg-brand/25 border-brand' : 'bg-slate-900/60 border-slate-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{available} extraits disponibles · jamais les mêmes que lors des 5 dernières parties.</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Où joue-t-on ?</p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {PLAY_MODES.map((m) => (
            <Choice key={m.id} on={opts.playMode === m.id} disabled={!isHost} onClick={() => set('playMode', m.id)} title={m.label} desc={m.desc} />
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Comment répondre ?</p>
        <div className="grid sm:grid-cols-3 gap-1.5">
          {ANSWER_MODES.map((m) => (
            <Choice key={m.id} on={answerMode === m.id} disabled={!isHost || (forcedBuzzer && m.id !== 'buzzer')} onClick={() => set('answerMode', m.id)} title={m.label} desc={m.desc} />
          ))}
        </div>
        {forcedBuzzer && <p className="text-[11px] text-amber-300/80 mt-1">{opts.playMode === 'local' ? 'En local' : 'Avec un maître du jeu'}, on joue au buzzer.</p>}
      </section>

      <Toggle on={opts.gameMaster} disabled={!isHost} onChange={(v) => set('gameMaster', v)}
        title="🎙️ Maître du jeu" desc="L'hôte ne joue pas : il voit la réponse, contrôle l'extrait et valide les buzz à l'oral." />

      <section className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">🎧 Nombre d'extraits
          <select disabled={!isHost} value={opts.nbRounds} onChange={(e) => set('nbRounds', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {manifest.roundCounts.map((n) => <option key={n} value={n}>{n} extraits</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">⏱ Temps d'écoute
          <select disabled={!isHost} value={opts.roundSec} onChange={(e) => set('roundSec', Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {manifest.roundSecs.map((n) => <option key={n} value={n}>{n} secondes</option>)}
          </select>
        </label>
      </section>

      <p className="text-[11px] text-slate-500 text-center">Extraits de 30 s fournis par Deezer · plus tu trouves vite, plus tu marques.</p>

      {isHost && (
        <>
          {needsTwo && <p className="text-center text-xs text-amber-300">Avec un maître du jeu, il faut au moins un autre joueur.</p>}
          <button type="button" onClick={start} disabled={available === 0 || needsTwo} className="btn btn-token w-full text-lg disabled:opacity-50">
            🎧 Lancer le blind test {playerCount === 1 ? '(en solo)' : ''}
          </button>
        </>
      )}
    </div>
  );
}

function Choice({ on, onClick, disabled, title, desc }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={on}
      className={`rounded-xl px-3 py-2 text-left border transition ${on ? 'bg-brand/20 border-brand' : 'bg-slate-900/50 border-slate-700'} ${disabled && !on ? 'opacity-40' : ''} ${disabled ? 'cursor-default' : ''}`}>
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
