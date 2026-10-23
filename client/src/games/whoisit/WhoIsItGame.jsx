import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar, { AvatarFace } from '../../components/Avatar.jsx';
import { getAvatar } from '../../data/avatars.js';
import { MODES, ANSWER_LABEL, ANSWER_STYLE } from './data.js';

const charName = (id) => getAvatar(id)?.label || id;
const send = (type, payload) => api.gameAction(type, payload);

export default function WhoIsItGame() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const room = useGameStore((s) => s.room);
  const p = gameState?.public;
  const priv = gameState?.private || {};
  if (!p) return null;
  const isHost = playerId === room?.hostId;
  const ctx = { p, priv, playerId, isHost, person: (id) => p.players.find((x) => x.id === id) || { pseudo: '?' } };
  const mode = MODES.find((m) => m.id === p.mode);

  return (
    <div className="card !p-3 sm:!p-5 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl" aria-hidden="true">{mode?.icon}</span>
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl text-slate-50 leading-tight">Qui est-ce ?</h2>
            <p className="text-xs text-slate-400 truncate">{mode?.label}{p.round && p.mode !== 'duel' && p.mode !== 'postit' ? ` · manche ${p.round}` : ''}</p>
          </div>
        </div>
        {isHost && ['PLAY', 'WAIT_ANSWER', 'PICK'].includes(p.phase) && (
          <button type="button" onClick={() => send('skip')} className="text-xs text-slate-400 hover:text-white underline" style={{ minHeight: 0 }} title="Si un joueur ne répond plus">
            Passer ce tour
          </button>
        )}
      </header>

      {p.phase === 'GAME_OVER' ? <GameOver {...ctx} />
        : p.mode === 'duel' ? <Duel {...ctx} />
          : p.mode === 'meneur' ? <Meneur {...ctx} />
            : p.mode === 'postit' ? <Postit {...ctx} />
              : <Akinator {...ctx} />}
    </div>
  );
}

// ───────────────────────── Briques communes ─────────────────────────

/** Un visage du plateau. `down` = abaissé (éliminé), `mark` = mis en avant (ton perso, le perso du meneur…). */
function Face({ id, down, onClick, mark, picking, size = 'md' }) {
  const box = size === 'sm' ? 'w-12 h-12 sm:w-14 sm:h-14' : size === 'lg' ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem]';
  return (
    <button type="button" onClick={onClick} disabled={!onClick} style={{ minHeight: 0 }}
      className={`group relative flex flex-col items-center gap-1 rounded-xl p-1.5 transition ${onClick ? 'cursor-pointer hover:bg-white/[0.06]' : 'cursor-default'} ${mark ? 'bg-teal-400/10 ring-2 ring-teal-300' : ''} ${picking && !down ? 'ring-1 ring-amber-300/40 hover:ring-amber-300' : ''}`}>
      <motion.span animate={{ rotateX: down ? 58 : 0, opacity: down ? 0.4 : 1, y: down ? 5 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{ transformPerspective: 400, transformOrigin: 'bottom' }} className="block">
        <AvatarFace id={id} className={`${box} text-2xl ${down ? 'grayscale' : ''}`} />
      </motion.span>
      <span className={`text-[10px] sm:text-[11px] leading-tight text-center line-clamp-1 max-w-[5.5rem] ${down ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{charName(id)}</span>
    </button>
  );
}

/** Plateau de visages : clic = abaisser / relever (ou choisir quand on propose un nom). */
function Board({ board, flips = [], onFlip, picking, onPick, mark }) {
  const down = new Set(flips);
  const left = board.filter((id) => !down.has(id)).length;
  return (
    <div>
      <div className="grid grid-cols-4 min-[420px]:grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-0.5 sm:gap-1">
        {board.map((id) => (
          <Face key={id} id={id} down={down.has(id)} mark={mark === id} picking={picking}
            onClick={picking ? (down.has(id) ? undefined : () => onPick(id)) : onFlip ? () => onFlip(id) : undefined} />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {picking ? 'Touche le personnage que tu proposes.' : onFlip ? `Touche un visage pour l'abaisser ou le relever · ${left} encore debout` : `${left} personnages`}
      </p>
    </div>
  );
}

/** Choix d'une question : liste toute prête (groupée) ou question libre. */
function AskPanel({ p, onGuess, guessLabel = 'Proposer un nom', allowFree = true, readyOnly = false }) {
  const style = p.options?.questions || 'both';
  const canReady = style !== 'free' || readyOnly;
  const canFree = allowFree && style !== 'ready' && !readyOnly;
  const [tab, setTab] = useState(canReady ? 'ready' : 'free');
  const [text, setText] = useState('');
  const groups = useMemo(() => {
    const g = {};
    for (const q of p.questions || []) (g[q.group] = g[q.group] || []).push(q);
    return Object.entries(g);
  }, [p.questions]);
  const asked = new Set((p.log || []).filter((e) => e.t === 'q' && e.qid && e.round === p.round).map((e) => e.qid));

  return (
    <section className="rounded-2xl bg-teal-400/[0.06] ring-1 ring-teal-300/25 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-teal-200">À toi : pose une question ou propose un nom</p>
        {onGuess && <button type="button" onClick={onGuess} className="btn btn-token !py-1.5 !px-3 !min-h-0 text-sm">{guessLabel}</button>}
      </div>
      {canReady && canFree && (
        <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 w-fit">
          {[['ready', 'Toutes prêtes'], ['free', 'Question libre']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setTab(v)} style={{ minHeight: 0 }}
              className={`rounded-lg px-3 py-1 text-sm ${tab === v ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-300'}`}>{l}</button>
          ))}
        </div>
      )}
      {tab === 'ready' && canReady ? (
        <div className="space-y-2 max-h-72 overflow-y-auto scrollable pr-1">
          {groups.map(([group, qs]) => (
            <div key={group}>
              <p className="text-[11px] text-slate-400 mb-1">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {qs.map((q) => (
                  <button key={q.id} type="button" onClick={() => send('ask', { qid: q.id })} disabled={asked.has(q.id)} style={{ minHeight: 0 }}
                    className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] text-slate-100 hover:bg-teal-300 hover:text-slate-900 transition disabled:opacity-30 disabled:hover:bg-white/[0.06] disabled:hover:text-slate-100">
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send('ask', { text }); setText(''); } }}>
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder="Ex : Est-ce qu'il sait voler ?"
            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none" aria-label="Ta question" />
          <button className="btn btn-primary !py-2" disabled={!text.trim()}>Demander</button>
        </form>
      )}
    </section>
  );
}

/** Réponse à une question libre. */
function AnswerPanel({ p, person, secretId, hint }) {
  const q = p.pending;
  if (!q) return null;
  return (
    <section className="rounded-2xl bg-amber-400/[0.08] ring-1 ring-amber-300/30 p-3 space-y-3">
      <div className="flex items-start gap-3">
        {secretId && <Face id={secretId} size="sm" />}
        <div className="min-w-0">
          <p className="text-xs text-amber-200/80">{person(q.by).pseudo} demande{hint ? ` ${hint}` : ''} :</p>
          <p className="text-lg font-semibold text-amber-50 leading-snug">« {q.text} »</p>
        </div>
      </div>
      <div className="flex gap-2">
        {['yes', 'no', 'idk'].map((a) => (
          <button key={a} type="button" onClick={() => send('answer', { answer: a })}
            className={`btn flex-1 !py-2 ${a === 'yes' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : a === 'no' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'btn-ghost'}`}>
            {ANSWER_LABEL[a]}
          </button>
        ))}
      </div>
    </section>
  );
}

function Waiting({ children }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300">
      <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse shrink-0" aria-hidden="true" />{children}
    </p>
  );
}

/** Journal des questions / réponses / propositions. */
function Log({ p, person, filter, title = 'Questions posées' }) {
  const items = (p.log || []).filter((e) => ['q', 'guess', 'aki_q', 'aki_guess'].includes(e.t)).filter(filter || (() => true));
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [items.length]);
  if (!items.length) return null;
  return (
    <section>
      <p className="text-sm font-semibold text-slate-200 mb-1.5">{title}</p>
      <ul className="space-y-1 max-h-60 overflow-y-auto scrollable pr-1">
        {items.map((e, i) => (
          <li key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm">
            {e.t === 'aki_q' || e.t === 'aki_guess' ? <span className="shrink-0" aria-hidden="true">🧞</span> : <Avatar id={person(e.by).avatar} size="xs" />}
            <span className="flex-1 min-w-0 text-slate-200">
              {e.t === 'guess' || e.t === 'aki_guess'
                ? <>{e.t === 'aki_guess' ? "L'app" : person(e.by).pseudo} propose <b className="text-slate-50">{charName(e.char)}</b></>
                : <>{e.text}{e.answeredBy && <span className="text-slate-500 text-xs"> · {person(e.answeredBy).pseudo} répond</span>}</>}
            </span>
            {e.answer && <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${ANSWER_STYLE[e.answer]}`}>{ANSWER_LABEL[e.answer]}</span>}
            {(e.t === 'guess' || e.t === 'aki_guess') && <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${e.ok ? ANSWER_STYLE.yes : ANSWER_STYLE.no}`}>{e.ok ? 'Trouvé !' : 'Raté'}</span>}
          </li>
        ))}
        <li ref={end} />
      </ul>
    </section>
  );
}

/** Fenêtre de choix d'un perso parmi une grande liste (avec recherche). */
function Picker({ ids, title, onPick, onClose, randomLabel }) {
  const [q, setQ] = useState('');
  const list = ids.filter((id) => charName(id).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 ring-1 ring-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="p-4 space-y-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-2xl text-slate-50">{title}</h3>
            {onClose && <button type="button" onClick={onClose} className="w-9 h-9 !min-h-0 rounded-full bg-white/[0.06] text-slate-300" aria-label="Fermer">✕</button>}
          </div>
          <div className="flex gap-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un personnage"
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 outline-none" />
            {randomLabel && <button type="button" onClick={() => onPick(null)} className="btn btn-ghost !py-2 text-sm">{randomLabel}</button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollable p-3 grid grid-cols-4 sm:grid-cols-6 gap-1">
          {list.map((id) => <Face key={id} id={id} onClick={() => onPick(id)} />)}
          {!list.length && <p className="col-span-full text-center text-sm text-slate-400 py-6">Aucun personnage ne correspond.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────────────────────── Duel ─────────────────────────
function Duel({ p, priv, playerId, person }) {
  const [picking, setPicking] = useState(false);
  useEffect(() => setPicking(false), [p.turnId, p.phase]);
  const mySide = priv.side;
  const other = mySide === 'A' ? 'B' : 'A';
  const sideName = (s) => (p.sides[s].members.length === 1 ? person(p.sides[s].members[0]).pseudo : s === 'A' ? 'Équipe bleue' : 'Équipe rouge');
  const myTurn = p.turnId === mySide;
  const lastQ = [...(p.log || [])].reverse().find((e) => e.t === 'q');
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-[auto_1fr] gap-3 items-center">
        {priv.mySecret && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-2.5 pr-4">
            <Face id={priv.mySecret} size="sm" />
            <div><p className="text-[11px] text-slate-400">Ton personnage secret</p><p className="font-semibold text-slate-50">{charName(priv.mySecret)}</p></div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['A', 'B'].map((s) => (
            <span key={s} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${p.turnId === s ? 'bg-teal-300 text-slate-900 font-semibold' : 'bg-white/[0.05] text-slate-300'}`}>
              {p.sides[s].members.slice(0, 4).map((id) => <Avatar key={id} id={person(id).avatar} size="xs" />)}
              {sideName(s)}{s === mySide ? ' (toi)' : ''}
            </span>
          ))}
        </div>
      </div>

      {p.phase === 'WAIT_ANSWER' && priv.canAnswer && <AnswerPanel p={p} person={person} secretId={priv.mySecret} hint="à propos de ton personnage" />}
      {p.phase === 'WAIT_ANSWER' && !priv.canAnswer && <Waiting>{sideName(other === mySide ? mySide : other)} réfléchit à la réponse…</Waiting>}
      {p.phase === 'PLAY' && myTurn && !picking && <AskPanel p={p} onGuess={() => setPicking(true)} />}
      {p.phase === 'PLAY' && myTurn && picking && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/30 px-3 py-2">
          <p className="text-sm text-amber-100">Qui est le personnage de {sideName(other)} ? Touche-le sur le plateau.</p>
          <button type="button" onClick={() => setPicking(false)} className="text-sm underline text-amber-200" style={{ minHeight: 0 }}>Annuler</button>
        </div>
      )}
      {p.phase === 'PLAY' && !myTurn && <Waiting>Au tour de {sideName(p.turnId)}{lastQ ? '' : ' de poser la première question'}…</Waiting>}

      {lastQ && <LastAnswer e={lastQ} person={person} />}

      <Board board={p.board} flips={priv.flips} onFlip={mySide ? (id) => send('flip', { charId: id }) : undefined}
        picking={picking} onPick={(id) => { send('guess', { charId: id }); setPicking(false); }} />
      <Log p={p} person={person} />
    </div>
  );
}

function LastAnswer({ e, person }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div key={e.at} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2">
        <Avatar id={person(e.by).avatar} size="sm" />
        <p className="flex-1 min-w-0 text-sm text-slate-200">{e.text}</p>
        <span className={`rounded-lg px-3 py-1 text-base font-bold ring-1 ${ANSWER_STYLE[e.answer]}`}>{ANSWER_LABEL[e.answer]}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// ───────────────────────── Un meneur, tous devinent ─────────────────────────
function Meneur({ p, priv, playerId, person, isHost }) {
  const [picking, setPicking] = useState(false);
  useEffect(() => setPicking(false), [p.turnId, p.phase, p.round]);
  const meneur = p.meneurId ? person(p.meneurId).pseudo : "L'app";
  const myTurn = p.turnId === playerId && p.phase === 'PLAY';
  const out = new Set(p.out);
  const lastQ = [...(p.log || [])].reverse().find((e) => e.t === 'q' && e.round === p.round);

  if (p.phase === 'PICK') {
    return priv.isMeneur
      ? <Picker ids={p.board} title="Choisis le personnage à faire deviner" onPick={(id) => send('pick', id ? { charId: id } : { random: true })} randomLabel="Au hasard" />
      : <Waiting>{meneur} choisit le personnage à faire deviner…</Waiting>;
  }
  if (p.phase === 'RESULT') return <RoundResult p={p} person={person} isHost={isHost} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-slate-300">🎩 Meneur : <b className="text-slate-100">{meneur}</b></span>
        {priv.isMeneur && priv.secret && <span className="flex items-center gap-2 rounded-full bg-teal-400/10 ring-1 ring-teal-300/40 px-2 py-0.5 text-teal-100"><AvatarFace id={priv.secret} className="w-7 h-7" />Ton perso : <b>{charName(priv.secret)}</b></span>}
        {out.has(playerId) && <span className="rounded-full bg-rose-500/15 px-3 py-1 text-rose-200">Tu t'es trompé : éliminé pour cette manche</span>}
      </div>
      <Scores p={p} person={person} />

      {p.phase === 'WAIT_ANSWER' && priv.canAnswer && <AnswerPanel p={p} person={person} secretId={priv.secret} />}
      {p.phase === 'WAIT_ANSWER' && !priv.canAnswer && <Waiting>{meneur} réfléchit à la réponse…</Waiting>}
      {myTurn && !picking && <AskPanel p={p} onGuess={() => setPicking(true)} readyOnly={!p.meneurId} />}
      {myTurn && picking && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/30 px-3 py-2">
          <p className="text-sm text-amber-100">Attention : si tu te trompes, tu es éliminé pour la manche.</p>
          <button type="button" onClick={() => setPicking(false)} className="text-sm underline text-amber-200" style={{ minHeight: 0 }}>Annuler</button>
        </div>
      )}
      {p.phase === 'PLAY' && !myTurn && <Waiting>Au tour de {person(p.turnId).pseudo}…</Waiting>}
      {lastQ && <LastAnswer e={lastQ} person={person} />}

      <Board board={p.board} flips={priv.flips} onFlip={!priv.isMeneur ? (id) => send('flip', { charId: id }) : undefined} mark={priv.secret}
        picking={picking} onPick={(id) => { send('guess', { charId: id }); setPicking(false); }} />
      <Log p={p} person={person} filter={(e) => e.round === p.round} />
    </div>
  );
}

function Scores({ p, person }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...p.players].sort((a, b) => b.score - a.score).map((pl) => (
        <span key={pl.id} className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${p.turnId === pl.id ? 'bg-teal-300 text-slate-900 font-semibold' : 'bg-white/[0.05] text-slate-300'} ${pl.present ? '' : 'opacity-40'}`}>
          <Avatar id={pl.avatar} size="xs" />{pl.pseudo} · {pl.score}
        </span>
      ))}
    </div>
  );
}

function RoundResult({ p, person, isHost }) {
  const r = p.result || {};
  const secret = r.secret || p.secretRevealed;
  return (
    <div className="text-center space-y-3 py-4">
      <p className="text-sm text-slate-400">C'était…</p>
      {secret && <motion.div initial={{ scale: 0.6, rotateY: 90 }} animate={{ scale: 1, rotateY: 0 }} className="flex justify-center"><Face id={secret} size="lg" /></motion.div>}
      <p className="font-display text-3xl text-slate-50">{charName(secret)}</p>
      <p className="text-slate-200">
        {r.winnerId ? <><b>{person(r.winnerId).pseudo}</b> l'a trouvé ! +3 points</> : r.meneurId ? <>Personne n'a trouvé : <b>{person(r.meneurId).pseudo}</b> marque 2 points</> : 'Personne ne l\'a trouvé.'}
      </p>
      <Scores p={p} person={person} />
      {isHost && <button type="button" onClick={() => send('next')} className="btn btn-primary">Manche suivante</button>}
    </div>
  );
}

// ───────────────────────── Qui suis-je ? (post-it) ─────────────────────────
function Postit({ p, priv, playerId, person }) {
  const [picking, setPicking] = useState(false);
  useEffect(() => setPicking(false), [p.turnId, p.phase]);
  const myTurn = p.turnId === playerId && p.phase === 'PLAY';
  const meFound = p.found?.[playerId];
  const lastQ = [...(p.log || [])].reverse().find((e) => e.t === 'q');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {p.players.map((pl) => {
          const mine = pl.id === playerId;
          const c = priv.secrets?.[pl.id];
          const f = p.found?.[pl.id];
          return (
            <div key={pl.id} className={`relative rounded-2xl p-2.5 text-center ${p.turnId === pl.id ? 'ring-2 ring-teal-300 bg-teal-400/10' : 'bg-white/[0.04] ring-1 ring-white/[0.06]'} ${pl.present ? '' : 'opacity-40'}`}>
              <div className="mx-auto w-fit -rotate-3 rounded-md bg-amber-200 px-2 pt-2 pb-1 shadow-lg">
                {c && (!mine || f) ? <AvatarFace id={c} className="w-14 h-14 sm:w-16 sm:h-16 text-2xl" /> : <span className="flex w-14 h-14 sm:w-16 sm:h-16 items-center justify-center text-4xl text-amber-900/60 font-display">?</span>}
                <p className="text-[11px] font-semibold text-amber-950 mt-1 max-w-[4.5rem] truncate">{c && (!mine || f) ? charName(c) : 'Toi ?'}</p>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1 text-sm text-slate-100 truncate"><Avatar id={pl.avatar} size="xs" />{pl.pseudo}{mine ? ' (toi)' : ''}</p>
              <p className="text-[11px] text-slate-400">{f ? `✅ trouvé ${f.rank === 1 ? 'en premier' : `(${f.rank}ᵉ)`}` : `${p.qcount?.[pl.id] || 0} question(s)`}</p>
            </div>
          );
        })}
      </div>

      {p.phase === 'WAIT_ANSWER' && priv.canAnswer && <AnswerPanel p={p} person={person} secretId={priv.secrets?.[p.pending.by]} hint="à propos de son personnage" />}
      {p.phase === 'WAIT_ANSWER' && !priv.canAnswer && <Waiting>Les autres répondent à ta question…</Waiting>}
      {myTurn && <AskPanel p={p} onGuess={() => setPicking(true)} guessLabel="Je sais qui je suis !" />}
      {p.phase === 'PLAY' && !myTurn && <Waiting>{meFound ? 'Tu as trouvé ! ' : ''}Au tour de {person(p.turnId).pseudo}…</Waiting>}
      {lastQ && <LastAnswer e={lastQ} person={person} />}
      <Log p={p} person={person} filter={(e) => e.by === playerId} title="Tes questions" />
      <AnimatePresence>
        {picking && <Picker ids={p.pool} title="Qui es-tu ?" onPick={(id) => { if (id) send('guess', { charId: id }); setPicking(false); }} onClose={() => setPicking(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── L'app devine (Akinator) ─────────────────────────
function Akinator({ p, playerId, person, isHost }) {
  const a = p.aki || {};
  const thinker = a.thinker === playerId;
  const q = (p.questions || []).find((x) => x.id === a.current);
  if (p.phase === 'PICK') {
    return thinker
      ? <Picker ids={p.pool} title="Choisis un personnage : l'app va essayer de le deviner" onPick={(id) => send('pick', id ? { charId: id } : { random: true })} randomLabel="Au hasard" />
      : <Waiting>{person(a.thinker).pseudo} choisit un personnage en secret…</Waiting>;
  }
  if (p.phase === 'RESULT') {
    const r = p.result || {};
    return (
      <div className="text-center space-y-3 py-4">
        <motion.p initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-4xl text-slate-50">
          {r.appWon ? "🧞 L'app a trouvé !" : `🎉 ${person(r.thinker).pseudo} a battu l'app !`}
        </motion.p>
        {r.secret && <div className="flex justify-center"><Face id={r.secret} size="lg" /></div>}
        <p className="text-slate-300">{charName(r.secret)} · {r.questions} question(s)</p>
        <p className="text-sm text-slate-400">App {p.akiStats.app} – {p.akiStats.players} Joueurs</p>
        {isHost && <button type="button" onClick={() => send('next')} className="btn btn-primary">Au suivant</button>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 text-slate-300"><Avatar id={person(a.thinker).avatar} size="xs" />{person(a.thinker).pseudo} pense à un personnage</span>
        <span className="text-slate-400">Question {a.count} · App {p.akiStats.app} – {p.akiStats.players} Joueurs</span>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center rounded-3xl bg-gradient-to-br from-indigo-500/15 via-teal-400/10 to-transparent ring-1 ring-white/10 p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <motion.span key={a.count} initial={{ rotate: -12, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} className="text-5xl" aria-hidden="true">🧞</motion.span>
            <AnimatePresence mode="wait">
              <motion.p key={`${p.phase}-${a.current}-${a.guess}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className="relative rounded-2xl rounded-tl-sm bg-slate-100 text-slate-900 px-4 py-3 text-lg sm:text-xl font-semibold leading-snug">
                {p.phase === 'AKI_GUESS' ? <>Je pense à… <b>{charName(a.guess)}</b> !</> : q?.text || '…'}
              </motion.p>
            </AnimatePresence>
          </div>
          {thinker && p.phase === 'AKI' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {['yes', 'probably', 'idk', 'probably_not', 'no'].map((ans) => (
                <button key={ans} type="button" onClick={() => send('akiAnswer', { answer: ans })}
                  className={`btn !py-2 text-sm ${ans === 'yes' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ans === 'no' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'btn-ghost'}`}>
                  {ANSWER_LABEL[ans]}
                </button>
              ))}
            </div>
          )}
          {thinker && p.phase === 'AKI_GUESS' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => send('akiConfirm', { yes: true })} className="btn flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">Oui, bravo !</button>
              <button type="button" onClick={() => send('akiConfirm', { yes: false })} className="btn flex-1 bg-rose-500 hover:bg-rose-600 text-white">Non, raté</button>
            </div>
          )}
          {!thinker && <p className="text-sm text-slate-400">{person(a.thinker).pseudo} répond aux questions de l'app.</p>}
        </div>
        {p.phase === 'AKI_GUESS'
          ? <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Face id={a.guess} size="lg" /></motion.div>
          : a.secret && !thinker && <div className="text-center"><p className="text-[11px] text-slate-400 mb-1">Le perso choisi</p><Face id={a.secret} size="md" /></div>}
        {thinker && a.secret && p.phase === 'AKI' && <div className="text-center"><p className="text-[11px] text-slate-400 mb-1">Ton perso</p><Face id={a.secret} size="md" /></div>}
      </div>
      <Log p={p} person={person} filter={(e) => e.round === p.round} title="Les questions de l'app" />
    </div>
  );
}

// ───────────────────────── Fin de partie ─────────────────────────
function GameOver({ p, playerId, person, isHost }) {
  const r = p.result || {};
  const duel = p.mode === 'duel';
  const winners = duel && r.winnerSide ? p.sides[r.winnerSide].members : [];
  return (
    <div className="space-y-5 text-center py-2">
      {duel ? (
        <>
          <p className="font-display text-4xl text-slate-50">{winners.includes(playerId) ? '🎉 Gagné !' : 'Perdu…'}</p>
          <p className="text-slate-300">{r.text}</p>
          <div className="flex justify-center gap-6">
            {['A', 'B'].map((s) => (
              <div key={s} className="text-center">
                <Face id={r.secrets?.[s]} size="lg" />
                <p className="text-xs text-slate-400">Perso de {p.sides[s].members.map((id) => person(id).pseudo).join(', ')}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-4xl text-slate-50">Fin de la partie</p>
          {p.mode === 'akinator' && <p className="text-slate-300">Score final : l'app {p.akiStats.app} – {p.akiStats.players} les joueurs</p>}
          <ol className="max-w-sm mx-auto space-y-1 text-left">
            {(p.ranking || []).map((row, i) => (
              <li key={row.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${row.id === playerId ? 'bg-teal-400/15' : 'bg-white/[0.04]'}`}>
                <span className="w-5 text-center font-bold text-teal-200">{i + 1}</span>
                <Avatar id={row.avatar} size="xs" />
                <span className="flex-1 truncate">{row.pseudo}</span>
                <span className="text-sm text-slate-300">
                  {p.mode === 'postit' ? (row.found ? `trouvé en ${row.questions} question(s)` : 'pas trouvé') : `${row.score} pt${row.score > 1 ? 's' : ''}`}
                </span>
                {p.mode === 'postit' && p.result?.secrets?.[row.id] && <AvatarFace id={p.result.secrets[row.id]} className="w-7 h-7" />}
              </li>
            ))}
          </ol>
        </>
      )}
      {isHost && (
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => send('restart')} className="btn btn-token">Rejouer</button>
          <button type="button" onClick={() => send('endGame')} className="btn btn-ghost">Retour au salon</button>
        </div>
      )}
    </div>
  );
}
