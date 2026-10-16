import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { playBonus, playExplosion, playFail, playSuccess, playTurnChime } from '../../hooks/useSounds.js';
import Avatar from '../../components/Avatar.jsx';

const TEAM = {
  red:  { name: 'Rouges', short: 'Rouge', text: 'text-rose-300', bg: 'bg-rose-500', soft: 'bg-rose-500/15 border-rose-400/40', ring: 'ring-rose-400', dot: '🔴' },
  blue: { name: 'Bleus',  short: 'Bleu',  text: 'text-sky-300',  bg: 'bg-sky-500',  soft: 'bg-sky-500/15 border-sky-400/40',  ring: 'ring-sky-400',  dot: '🔵' },
};

/** Minuteur de l'étape (si l'hôte en a choisi un). */
function StepTimer({ endsAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  if (!endsAt) return null;
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return <span className={`font-mono tabular-nums ${left <= 10 ? 'text-rose-300 animate-pulse' : 'text-slate-300'}`}>⏱ {left}s</span>;
}

// ───────── Choix des équipes ─────────
function TeamColumn({ team, state, playerId }) {
  const t = TEAM[team];
  const members = state.players.filter((p) => p.team === team);
  const spy = members.find((p) => p.role === 'spy');
  const agents = members.filter((p) => p.role !== 'spy');
  const me = state.players.find((p) => p.id === playerId);
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${t.soft}`}>
      <h3 className={`font-display text-3xl tracking-wider ${t.text}`}>{t.dot} {t.name}</h3>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">🕵️ Maître-espion</p>
        {spy ? (
          <div className="flex items-center gap-2"><Avatar id={spy.avatar} size="sm" /><span className="font-semibold">{spy.pseudo}{spy.id === playerId && ' (toi)'}</span></div>
        ) : (
          <button className="text-sm underline decoration-dotted text-slate-200" style={{ minHeight: 0 }}
            onClick={() => api.gameAction('joinTeam', { team, role: 'spy' })}>Devenir maître-espion</button>
        )}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">🔎 Agents</p>
        <ul className="space-y-1.5">
          {agents.map((p) => (
            <li key={p.id} className="flex items-center gap-2"><Avatar id={p.avatar} size="sm" /><span>{p.pseudo}{p.id === playerId && ' (toi)'}</span></li>
          ))}
          {agents.length === 0 && <li className="text-sm text-slate-500 italic">Personne pour l'instant</li>}
        </ul>
      </div>
      {!(me?.team === team && me?.role === 'agent') && (
        <button className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2 text-sm font-semibold"
          onClick={() => api.gameAction('joinTeam', { team, role: 'agent' })}>
          Rejoindre les {t.name} comme agent
        </button>
      )}
    </div>
  );
}

function TeamsPhase({ state, playerId, isHost }) {
  const unassigned = state.players.filter((p) => !p.team);
  return (
    <div className="space-y-4">
      <p className="text-center text-slate-300 text-sm">
        Deux équipes. Dans chacune, un <strong>maître-espion</strong> voit les cartes secrètes et donne des indices d'un mot ;
        ses <strong>agents</strong> devinent. Attention à l'assassin 💀 !
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <TeamColumn team="red" state={state} playerId={playerId} />
        <TeamColumn team="blue" state={state} playerId={playerId} />
      </div>
      {unassigned.length > 0 && (
        <p className="text-center text-sm text-slate-400">Sans équipe : {unassigned.map((p) => p.pseudo).join(', ')}</p>
      )}
      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button className="btn btn-ghost" onClick={() => api.gameAction('randomTeams', {})}>🎲 Équipes au hasard</button>
          <button className="btn btn-primary disabled:opacity-50" disabled={!state.teamsReady} onClick={() => api.gameAction('startRound', {})}>
            🕵️ Commencer
          </button>
        </div>
      ) : (
        <p className="text-center text-slate-400 italic text-sm">L'hôte lance la partie quand les équipes sont prêtes.</p>
      )}
      {!state.teamsReady && (
        <p className="text-center text-xs text-amber-300">Il faut un maître-espion et au moins un agent dans chaque équipe.</p>
      )}
    </div>
  );
}

// ───────── Grille ─────────
function Board({ state, keyColors, canGuess }) {
  const [pending, setPending] = useState(null);
  useEffect(() => { setPending(null); }, [state.turn?.team, state.turn?.stage]);
  const over = state.phase === 'GAME_OVER';

  const tap = (i) => {
    if (!canGuess || state.board[i].revealed) return;
    if (pending === i) { api.gameAction('reveal', { index: i }); setPending(null); }
    else setPending(i);
  };

  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-2">
      {state.board.map((c, i) => {
        const key = keyColors?.[i];
        let cls = 'cn-card-hidden';
        if (c.revealed) cls = `cn-revealed-${c.color}`;
        else if (over) cls = `cn-revealed-${c.color} opacity-60`;
        else if (key === 'red') cls = 'cn-key-red';
        else if (key === 'blue') cls = 'cn-key-blue';
        else if (key === 'assassin') cls = 'cn-key-assassin';
        const clickable = canGuess && !c.revealed;
        const len = c.word.length;
        const size = len > 9 ? 'text-[8.5px] sm:text-sm' : len > 7 ? 'text-[9.5px] sm:text-sm' : len > 5 ? 'text-[11px] sm:text-base' : 'text-[12.5px] sm:text-base';
        return (
          <motion.button
            key={`${state.round}-${i}`}
            type="button"
            layout={false}
            onClick={() => tap(i)}
            disabled={!clickable}
            aria-label={`${c.word}${c.revealed ? ` (${c.color})` : ''}`}
            className={`cn-card ${cls} ${clickable ? 'cn-clickable cursor-pointer' : 'cursor-default'} ${pending === i ? 'cn-pending' : ''}`}
            animate={c.revealed ? { rotateY: [90, 0] } : { rotateY: 0 }}
            transition={{ duration: 0.35 }}
          >
            <span className={`${size} ${c.revealed ? 'opacity-90' : ''}`} style={{ fontSize: `min(${len > 7 ? 14 : 16}px, calc((100cqw - 6px) / ${(Math.max(len, 4) * 0.74).toFixed(2)}))` }}>{c.word}</span>
            {c.revealed && c.color === 'assassin' && <span className="absolute top-0.5 right-1 text-xs">💀</span>}
            {!c.revealed && key === 'assassin' && <span className="absolute top-0.5 right-1 text-[10px]">💀</span>}
            {pending === i && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap text-[10px] font-semibold normal-case bg-yellow-300 text-slate-900 rounded px-1.5 py-0.5 z-10">
                Retoucher pour révéler
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ───────── Indice / tour ─────────
function CluePanel({ state, me, isMySpyTurn, isMyGuessTurn }) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState('1');
  const turn = state.turn;
  const t = TEAM[turn.team];

  if (turn.stage === 'CLUE') {
    if (isMySpyTurn) {
      return (
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); if (word.trim()) { api.gameAction('giveClue', { word: word.trim(), count: count === 'inf' ? 'inf' : parseInt(count, 10) }); setWord(''); } }}
        >
          <p className={`text-center font-semibold ${t.text}`}>🕵️ À toi : donne un indice d'UN mot et un nombre de cartes</p>
          <div className="flex gap-2">
            <input value={word} onChange={(e) => setWord(e.target.value.replace(/\s/g, '').slice(0, 30))} aria-label="Ton indice"
              placeholder="Indice…" autoComplete="off" autoCapitalize="off" spellCheck={false}
              className="flex-1 min-w-0 rounded-xl px-4 py-3 text-lg font-bold uppercase bg-black/40 border-2 border-white/15 focus:border-white/40 outline-none" />
            <select value={count} onChange={(e) => setCount(e.target.value)} aria-label="Nombre de cartes"
              className="rounded-xl px-2 bg-black/40 border-2 border-white/15 text-lg font-bold">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="inf">∞</option>
            </select>
            <button className={`rounded-xl px-4 font-bold text-white ${t.bg} disabled:opacity-40`} disabled={!word.trim()}>OK</button>
          </div>
        </form>
      );
    }
    return <p className="text-center text-slate-300">🕵️ Le maître-espion des <strong className={t.text}>{t.name}</strong> réfléchit à un indice…</p>;
  }

  const c = turn.clue;
  return (
    <div className="space-y-2 text-center">
      <p className="text-slate-300 text-sm">Indice des <strong className={t.text}>{t.name}</strong></p>
      <p className="font-display text-4xl tracking-wider">
        {c.word.toUpperCase()} <span className={t.text}>· {c.count === -1 ? '∞' : c.count}</span>
      </p>
      <p className="text-xs text-slate-400">
        {turn.guessesLeft === null ? 'Essais illimités (jusqu\'à une erreur)' : `${turn.guessesLeft} essai${turn.guessesLeft > 1 ? 's' : ''} restant${turn.guessesLeft > 1 ? 's' : ''}`}
      </p>
      {isMyGuessTurn ? (
        <div className="space-y-2">
          <p className="text-sm text-amber-200">Touche une carte, puis retouche-la pour la révéler.</p>
          <button className="btn btn-ghost text-sm" onClick={() => api.gameAction('endTurn', {})}>⏭ Fin du tour</button>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{me?.team === turn.team && me?.role === 'spy' ? 'Tes agents cherchent…' : `Les agents ${t.short.toLowerCase()}s cherchent…`}</p>
      )}
    </div>
  );
}

function History({ history, players }) {
  if (!history.length) return null;
  const name = (id) => players.find((p) => p.id === id)?.pseudo || '?';
  return (
    <details className="rounded-xl bg-white/[0.04] px-3 py-2">
      <summary className="cursor-pointer text-sm text-slate-300">📜 Indices donnés ({history.length})</summary>
      <ol className="mt-2 space-y-1.5 text-sm">
        {[...history].reverse().map((h, i) => (
          <li key={i}>
            <span className={TEAM[h.team].text}>{TEAM[h.team].dot} {name(h.spyId)}</span> : <strong>{h.word}</strong> · {h.count === -1 ? '∞' : h.count}
            {h.guesses.length > 0 && (
              <span className="text-slate-400"> → {h.guesses.map((g) => `${g.word}${g.color === h.team ? ' ✓' : g.color === 'assassin' ? ' 💀' : ' ✗'}`).join(', ')}</span>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function CodenamesGame() {
  const { gameState, room, playerId } = useGameStore();
  const state = gameState?.public;
  const priv = gameState?.private || {};
  const isHost = playerId === room.hostId;
  const seenReveals = useRef(null);

  const me = state?.players.find((p) => p.id === playerId);
  const turn = state?.turn;
  const isMySpyTurn = state?.phase === 'PLAYING' && turn?.stage === 'CLUE' && state.spies?.[turn.team] === playerId;
  const isMyGuessTurn = state?.phase === 'PLAYING' && turn?.stage === 'GUESS' && me?.team === turn.team && me?.role === 'agent';

  // Signal quand c'est à moi
  useEffect(() => {
    if (isMySpyTurn || isMyGuessTurn) { playTurnChime(); try { navigator.vibrate?.(120); } catch {} }
  }, [isMySpyTurn, isMyGuessTurn]);

  // Sons des cartes retournées
  const revealedCount = state?.board?.filter((c) => c.revealed).length ?? 0;
  useEffect(() => {
    if (!state?.board) return;
    if (seenReveals.current === null || revealedCount < seenReveals.current) { seenReveals.current = revealedCount; return; }
    if (revealedCount > seenReveals.current) {
      const last = state.history.at(-1)?.guesses.at(-1);
      if (last?.color === 'assassin') playExplosion();
      else if (last && last.color === state.history.at(-1).team) playSuccess();
      else playFail();
    }
    seenReveals.current = revealedCount;
  }, [revealedCount]);
  useEffect(() => { if (state?.phase === 'GAME_OVER') playBonus(); }, [state?.phase]);

  if (!state) return null;

  return (
    <div className="cn-shell">
      <div className="cn-inner space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-3xl sm:text-5xl leading-none flex items-center gap-2">
            <span aria-hidden="true">🕵️</span><span className="cn-title">Codenames</span>
          </h2>
          {me?.team && state.phase !== 'TEAMS' && (
            <span className={`text-[10px] sm:text-xs whitespace-nowrap shrink-0 rounded-full px-2 sm:px-2.5 py-1 border ${TEAM[me.team].soft} ${TEAM[me.team].text}`}>
              {me.role === 'spy' ? '🕵️ Espion' : '🔎 Agent'} {TEAM[me.team].short.toLowerCase()}
            </span>
          )}
        </div>

        {state.phase === 'TEAMS' && <TeamsPhase state={state} playerId={playerId} isHost={isHost} />}

        {state.phase !== 'TEAMS' && (
          <>
            {/* Score + tour */}
            <div className="flex items-center justify-between gap-2">
              {['red', 'blue'].map((team) => (
                <div key={team} className={`rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 border ${TEAM[team].soft} ${state.phase === 'PLAYING' && turn?.team === team ? `ring-2 ${TEAM[team].ring}` : ''} ${team === 'blue' ? 'order-3 text-right' : ''}`}>
                  <p className={`font-display text-3xl sm:text-4xl leading-none ${TEAM[team].text}`}>{state.remaining[team]}</p>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 whitespace-nowrap"><span className="hidden sm:inline">cartes </span>{TEAM[team].short.toLowerCase()}s</p>
                </div>
              ))}
              <div className="order-2 text-center flex-1 min-w-0">
                {state.phase === 'PLAYING' ? (
                  <>
                    <p className={`font-display text-xl sm:text-3xl leading-tight tracking-wider ${TEAM[turn.team].text}`}>Au tour des {TEAM[turn.team].name}</p>
                    <StepTimer endsAt={turn.endsAt} />
                  </>
                ) : (
                  <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`font-display text-3xl sm:text-4xl tracking-wider ${TEAM[state.winner].text}`}>
                    🏆 Les {TEAM[state.winner].name} gagnent !
                  </motion.p>
                )}
              </div>
            </div>

            {state.phase === 'GAME_OVER' && (
              <p className="text-center text-sm text-slate-300 -mt-2">
                {state.reason === 'ASSASSIN' ? "L'autre équipe a touché l'assassin 💀" : 'Toutes leurs cartes ont été trouvées.'}
              </p>
            )}

            {me?.role === 'spy' && priv.key && state.phase === 'PLAYING' && (
              <p className="text-center text-xs text-slate-400 -mt-1">Tu vois les couleurs secrètes : 🔴 / 🔵 encadrées, 💀 l'assassin, le reste est neutre.</p>
            )}

            <Board state={state} keyColors={state.phase === 'PLAYING' ? priv.key : null} canGuess={isMyGuessTurn} />

            {state.phase === 'PLAYING' && <CluePanel state={state} me={me} isMySpyTurn={isMySpyTurn} isMyGuessTurn={isMyGuessTurn} />}

            {/* Rejoindre en cours, reprendre le rôle de maître-espion */}
            {state.phase === 'PLAYING' && !me?.team && (
              <div className="flex justify-center gap-2">
                <button className="btn btn-ghost text-sm" onClick={() => api.gameAction('joinTeam', { team: 'red' })}>🔴 Rejoindre les Rouges</button>
                <button className="btn btn-ghost text-sm" onClick={() => api.gameAction('joinTeam', { team: 'blue' })}>🔵 Rejoindre les Bleus</button>
              </div>
            )}
            {state.phase === 'PLAYING' && me?.team && !state.spies[me.team] && (
              <div className="text-center">
                <button className="btn btn-primary text-sm" onClick={() => api.gameAction('claimSpymaster', {})}>🕵️ Ton équipe n'a plus de maître-espion : prendre sa place</button>
              </div>
            )}

            <History history={state.history} players={state.players} />

            {state.phase === 'GAME_OVER' && (isHost ? (
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button className="btn btn-primary" onClick={() => api.gameAction('newBoard', {})}>🔁 Nouvelle partie (mêmes équipes)</button>
                <button className="btn btn-ghost" onClick={() => api.gameAction('changeTeams', {})}>👥 Changer les équipes</button>
                <button className="btn btn-ghost" onClick={() => api.gameAction('endGame', {})}>🏠 Lobby</button>
              </div>
            ) : (
              <p className="text-center text-slate-400 italic text-sm">En attente de l'hôte…</p>
            ))}

            {isHost && state.phase === 'PLAYING' && (
              <div className="text-right">
                <button className="text-xs text-slate-500 hover:text-rose-300" style={{ minHeight: 0 }} onClick={() => api.gameAction('changeTeams', {})}>
                  👥 Revenir au choix des équipes
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
