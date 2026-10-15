import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { playBonus, playSuccess } from '../../hooks/useSounds.js';
import Avatar from '../../components/Avatar.jsx';
import { formatTemp, scoreIcon, tempColor } from './scale.js';

function ProgressBar({ progress, compact = false }) {
  if (progress == null) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className={`relative flex-1 ${compact ? 'h-1.5' : 'h-2.5'} rounded-full bg-white/10 overflow-hidden`}>
        <span className="cx-bar absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress / 10}%` }} />
      </span>
      {!compact && <span className="text-xs tabular-nums text-slate-300 w-10 text-right">{progress}‰</span>}
    </span>
  );
}

/** Minuteur mm:ss quand la partie a une durée limitée. */
function Countdown({ endsAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  return <span className={`font-mono text-lg tabular-nums ${left <= 30 ? 'text-rose-300 animate-pulse' : 'text-slate-200'}`}>⏱ {m}:{s}</span>;
}

function GuessRow({ g, highlight, byPlayer }) {
  return (
    <motion.li
      layout="position"
      initial={highlight ? { opacity: 0, scale: 0.97 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className={`grid grid-cols-[2.25rem_minmax(0,1fr)_5.5rem_1.75rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem_2rem_minmax(0,9rem)] items-center gap-2 px-3 py-2 rounded-xl ${
        highlight ? 'bg-white/10 ring-1 ring-sky-300/50' : 'bg-white/[0.04]'
      }`}
    >
      <span className="text-xs text-slate-500 tabular-nums">{g.n}</span>
      <span className="font-semibold truncate flex items-center gap-1.5">
        {byPlayer && <Avatar id={byPlayer.avatar} size="xs" />}
        {g.word}
      </span>
      <span className="text-sm font-bold tabular-nums text-right" style={{ color: tempColor(g.temp) }}>{formatTemp(g.temp)}</span>
      <span className="text-lg text-center">{scoreIcon(g)}</span>
      <span className="hidden sm:block"><ProgressBar progress={g.progress === 1000 ? 1000 : g.progress} /></span>
    </motion.li>
  );
}

function PlayersPanel({ players, playerId, mode }) {
  const sorted = [...players].sort((a, b) =>
    (a.foundRank ?? 99) - (b.foundRank ?? 99) || (b.bestTemp ?? -99) - (a.bestTemp ?? -99));
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {sorted.map((p) => (
        <li key={p.id} className={`rounded-xl px-3 py-2 bg-white/[0.04] min-w-0 ${p.left ? 'opacity-40' : ''}`}>
          <div className="flex items-center gap-2">
            <Avatar id={p.avatar} size="sm" />
            <span className="flex-1 min-w-0 truncate text-sm font-semibold">
              {p.pseudo}{p.id === playerId && ' (toi)'}
            </span>
            <span className="text-lg">{p.found ? '🥳' : p.bestTemp != null ? scoreIcon({ progress: p.bestProgress, temp: p.bestTemp }) : '…'}</span>
          </div>
          {mode === 'course' && (
            <div className="mt-1.5 space-y-1">
              <ProgressBar progress={p.found ? 1000 : p.bestProgress} compact />
              <p className="text-[11px] text-slate-400 flex justify-between">
                <span>{p.count} mot{p.count > 1 ? 's' : ''}</span>
                <span style={{ color: p.found ? '#86efac' : tempColor(p.bestTemp) }}>
                  {p.found ? `trouvé ${['🥇', '🥈', '🥉'][p.foundRank - 1] || `#${p.foundRank}`}` : formatTemp(p.bestTemp)}
                </span>
              </p>
            </div>
          )}
          {mode === 'equipe' && <p className="text-[11px] text-slate-400 mt-1">{p.count} proposition{p.count > 1 ? 's' : ''}</p>}
        </li>
      ))}
    </ul>
  );
}

function Feed({ feed, players }) {
  if (!feed.length) return null;
  const name = (id) => players.find((p) => p.id === id)?.pseudo || '?';
  return (
    <ul className="space-y-1 text-xs">
      <AnimatePresence initial={false}>
        {feed.map((e) => (
          <motion.li key={e.seq} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-slate-300">
            {e.type === 'found'
              ? <>🥳 <strong className="text-white">{name(e.playerId)}</strong> a trouvé en {e.count} mot{e.count > 1 ? 's' : ''} !</>
              : <>{scoreIcon(e)} <strong className="text-white">{name(e.playerId)}</strong> brûle : {e.word ? <strong>{e.word}</strong> : null} {e.progress}‰</>}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Reveal({ state, playerId, isHost }) {
  const ranking = [...state.players].sort((a, b) =>
    (a.foundRank ?? 99) - (b.foundRank ?? 99) || (b.bestTemp ?? -99) - (a.bestTemp ?? -99));
  const reasons = { ALL_FOUND: 'Tout le monde a trouvé !', FOUND: "L'équipe a trouvé !", TIME: 'Temps écoulé.', HOST: "L'hôte a révélé le mot." };
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <p className="text-slate-400 text-sm">{reasons[state.reason] || ''} Le mot était</p>
        <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="cx-title text-6xl sm:text-7xl break-words">
          {state.secret}
        </motion.p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-left">
        <div>
          <h3 className="font-semibold mb-2 text-slate-200">🏆 Classement</h3>
          <ol className="space-y-1.5">
            {ranking.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/[0.04]">
                <span className="w-6 text-center">{p.found ? (['🥇', '🥈', '🥉'][p.foundRank - 1] || p.foundRank) : i + 1}</span>
                <Avatar id={p.avatar} size="sm" />
                <span className="flex-1 min-w-0 truncate font-semibold">{p.pseudo}{p.id === playerId && ' (toi)'}</span>
                <span className="text-xs text-slate-400 text-right">
                  {p.found ? `${p.count} mot${p.count > 1 ? 's' : ''}` : state.mode === 'course' ? formatTemp(p.bestTemp) : `${p.count} prop.`}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-semibold mb-2 text-slate-200">🔥 Les mots les plus proches</h3>
          <ol className="space-y-1">
            {state.top.map((t, i) => (
              <li key={t.word} className="flex justify-between gap-2 rounded-lg px-3 py-1.5 bg-white/[0.04] text-sm">
                <span className="truncate"><span className="text-slate-500 mr-2">{i + 1}</span>{t.word}</span>
                <span className="tabular-nums font-semibold" style={{ color: tempColor(t.temp) }}>{formatTemp(t.temp)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button className="cx-btn text-lg" onClick={() => api.gameAction('nextWord', {})}>🔁 Nouveau mot</button>
          <button className="cx-btn-ghost" onClick={() => api.gameAction('endGame', {})}>🏠 Retour au lobby</button>
        </div>
      ) : (
        <p className="text-slate-400 italic text-sm">En attente de l'hôte…</p>
      )}
    </div>
  );
}

export default function CemantixGame() {
  const { gameState, room, playerId } = useGameStore();
  const state = gameState?.public;
  const priv = gameState?.private || {};
  const isHost = playerId === room.hostId;
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const lastFeedbackAt = useRef(null);
  const lastFeedSeq = useRef(null);
  const team = state?.mode === 'equipe';

  const guesses = useMemo(() => (team ? state?.guesses : priv.guesses) || [], [team, state?.guesses, priv.guesses]);
  const sorted = useMemo(() => [...guesses].sort((a, b) => b.temp - a.temp), [guesses]);
  const last = useMemo(() => guesses.reduce((m, g) => (!m || g.n > m.n ? g : m), null), [guesses]);
  const me = state?.players.find((p) => p.id === playerId);
  const feedback = priv.feedback;

  // Retour sur ma dernière proposition : on vide le champ si le mot a été accepté, son si brûlant
  useEffect(() => {
    if (!feedback || feedback.at === lastFeedbackAt.current) return;
    lastFeedbackAt.current = feedback.at;
    if (feedback.type === 'ok') {
      setText('');
      const g = guesses.find((x) => x.index === feedback.index);
      if (g?.progress === 1000) playBonus();
      else if (g?.progress >= 990) playSuccess();
    }
    inputRef.current?.focus();
  }, [feedback?.at]);

  // Quelqu'un vient de trouver
  useEffect(() => {
    const e = state?.feed?.[0];
    if (!e || e.seq === lastFeedSeq.current) return;
    const first = lastFeedSeq.current === null;
    lastFeedSeq.current = e.seq;
    if (!first && e.type === 'found' && e.playerId !== playerId) playSuccess();
  }, [state?.feed?.[0]?.seq]);

  if (!state) return null;
  if (state.phase === 'REVEAL') {
    return (
      <div className="cx-shell"><div className="cx-inner"><Reveal state={state} playerId={playerId} isHost={isHost} /></div></div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const w = text.trim();
    if (w) api.gameAction('guess', { word: w });
  };

  const found = !team && me?.found;
  const byPlayer = (id) => state.players.find((p) => p.id === id);
  const highlightIndex = feedback && (feedback.type === 'duplicate' || feedback.type === 'ok') ? feedback.index : null;

  return (
    <div className="cx-shell">
      <div className="cx-inner space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-4xl sm:text-5xl leading-none flex items-center gap-2">
              <span aria-hidden="true">🌡️</span><span className="cx-title">Cémantix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {team ? '🤝 En équipe' : '🏁 Course'} · mot n°{state.round}
              {team ? ` · ${guesses.length} proposition${guesses.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>
          {state.endsAt && <Countdown endsAt={state.endsAt} />}
        </div>

        <div className="space-y-3">
          <PlayersPanel players={state.players} playerId={playerId} mode={state.mode} />
          <Feed feed={state.feed} players={state.players} />
        </div>

        <div>
          <div className="space-y-3 min-w-0">
            {found ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="rounded-2xl px-4 py-4 text-center bg-gradient-to-r from-emerald-500/20 to-sky-500/20 border border-emerald-400/40">
                <p className="text-3xl">🥳</p>
                <p className="font-bold text-lg">Trouvé : <span className="cx-title text-3xl">{priv.secret}</span></p>
                <p className="text-sm text-slate-300">en {me.count} mot{me.count > 1 ? 's' : ''} · {['1er', '2e', '3e'][me.foundRank - 1] || `${me.foundRank}e`} — chut, les autres cherchent encore !</p>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 40))}
                    placeholder="Propose un mot…"
                    aria-label="Ton mot"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    className="flex-1 min-w-0 rounded-2xl px-4 py-3 text-xl font-semibold bg-black/40 border-2 border-sky-400/40 focus:border-sky-300 outline-none text-white"
                  />
                  <button className="cx-btn px-5" disabled={!text.trim()} aria-label="Envoyer le mot">➜</button>
                </div>
                <p className="text-sm min-h-[1.25rem] px-1" role="status">
                  {feedback?.type === 'unknown' && <span className="text-rose-300">Je ne connais pas « {feedback.word} ».</span>}
                  {feedback?.type === 'duplicate' && <span className="text-amber-300">Déjà proposé.</span>}
                  {(!feedback || feedback.type === 'ok') && <span className="text-slate-500">Accents et majuscules facultatifs.</span>}
                </p>
              </form>
            )}

            {last && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 px-1">Dernier mot</p>
                <ul><GuessRow g={last} highlight byPlayer={team ? byPlayer(last.by) : null} /></ul>
              </div>
            )}

            {sorted.length > 0 ? (
              <ul className="space-y-1">
                {sorted.map((g) => (
                  <GuessRow key={g.index} g={g} highlight={g.index === highlightIndex && feedback?.type === 'duplicate'} byPlayer={team ? byPlayer(g.by) : null} />
                ))}
              </ul>
            ) : (
              <p className="text-center text-slate-400 py-6 text-sm">
                Propose un premier mot : plus il est proche du sens du mot secret, plus il fait chaud. 🌡️
              </p>
            )}
          </div>

          <aside className="pt-2">
            {isHost && (
              <button type="button" className="text-xs text-slate-500 hover:text-rose-300 w-full text-right" style={{ minHeight: 0 }}
                onClick={() => api.gameAction('reveal', {})}>
                🏳️ Révéler le mot
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
