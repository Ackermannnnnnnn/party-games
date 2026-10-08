import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { playBonus, playExplosion, playFail, playSuccess, playTurnChime } from '../../hooks/useSounds.js';
import Avatar from '../../components/Avatar.jsx';
import Arena, { Hearts } from './Arena.jsx';
import WordInput from './WordInput.jsx';

/** Compte à rebours 3, 2, 1 avant le début. */
function Countdown({ endsAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const sec = Math.max(1, Math.ceil((endsAt - now) / 1000));
  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-slate-300">Préparez vos claviers…</p>
      <AnimatePresence mode="popLayout">
        <motion.p
          key={sec}
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="bp-title text-9xl"
        >
          {sec}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** Lettres à utiliser pour gagner une vie. */
function BonusLetters({ me, letters, maxLives }) {
  if (!me) return null;
  const used = new Set(me.letters);
  const missing = letters.length - used.size;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 text-center">
        Utilise toutes ces lettres pour gagner une vie
        {me.lives >= maxLives ? ' (tu es déjà au maximum)' : ` — encore ${missing}`}
      </p>
      <div className="flex flex-wrap justify-center gap-1">
        {letters.map((l) => (
          <span
            key={l}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-black uppercase transition-colors ${
              used.has(l) ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900' : 'bg-white/5 text-slate-500'
            }`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function GameOver({ state, playerId, isHost }) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  return (
    <div className="space-y-6 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3">
        <div className="text-6xl">🏆</div>
        {winner ? (
          <>
            <div className="flex justify-center"><Avatar id={winner.avatar} size="xl" ring /></div>
            <h2 className="bp-title text-5xl">{winner.pseudo} gagne !</h2>
            {winner.id === playerId && <p className="text-amber-200 font-semibold">Bravo, tu as survécu à la bombe 🎉</p>}
          </>
        ) : (
          <h2 className="bp-title text-5xl">Fin de la partie</h2>
        )}
      </motion.div>

      <ol className="max-w-lg mx-auto space-y-2 text-left">
        {state.ranking.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${r.rank === 1 ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/10 border border-amber-400/40' : 'bg-white/5'}`}>
            <span className="w-7 text-center font-black text-lg">{['🥇', '🥈', '🥉'][r.rank - 1] || r.rank}</span>
            <Avatar id={r.avatar} size="sm" />
            <span className="flex-1 min-w-0">
              <span className="font-semibold block truncate">{r.pseudo}{r.id === playerId && ' (toi)'}{r.left && <span className="text-xs text-slate-400 font-normal"> · a quitté</span>}</span>
              {r.longest && <span className="text-xs text-slate-400">Plus long mot : <strong className="text-slate-200">{r.longest}</strong></span>}
            </span>
            <span className="text-sm text-slate-300 tabular-nums shrink-0">{r.words} mot{r.words > 1 ? 's' : ''}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500">{state.usedCount} mots trouvés pendant la partie</p>

      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button className="bp-btn text-lg" onClick={() => api.gameAction('restart', {})}>🔁 Rejouer</button>
          <button className="bp-btn-ghost" onClick={() => api.gameAction('endGame', {})}>🏠 Retour au lobby</button>
        </div>
      ) : (
        <p className="text-slate-400 italic text-sm">En attente de l'hôte…</p>
      )}
    </div>
  );
}

export default function BombPartyGame() {
  const { gameState, room, playerId } = useGameStore();
  const state = gameState?.public;
  const isSpectator = !!gameState?.private?.spectator;
  const isHost = playerId === room.hostId;
  const [flash, setFlash] = useState(null);
  const [boom, setBoom] = useState(null);
  const lastSeq = useRef(null);

  const ev = state?.lastEvent;

  // Réactions aux événements : sons, flash sur l'avatar, explosion
  useEffect(() => {
    if (!ev || ev.seq === lastSeq.current) return;
    const first = lastSeq.current === null;
    lastSeq.current = ev.seq;
    if (first && Date.now() - ev.at > 2000) return;   // événement ancien (page rechargée)
    setFlash(ev);
    const t = setTimeout(() => setFlash(null), 1200);
    if (ev.type === 'ok') playSuccess();
    if (ev.type === 'bonus') playBonus();
    if (ev.type === 'fail' && ev.playerId === playerId) playFail();
    if (ev.type === 'boom') {
      playExplosion();
      try { navigator.vibrate?.([80, 40, 160]); } catch {}
      setBoom(ev);
      setTimeout(() => setBoom((b) => (b?.seq === ev.seq ? null : b)), 2600);
    }
    return () => clearTimeout(t);
  }, [ev?.seq]);

  // C'est mon tour : petit carillon
  const myTurn = state?.phase === 'PLAYING' && state.holderId === playerId;
  useEffect(() => {
    if (myTurn) {
      playTurnChime();
      try { navigator.vibrate?.(120); } catch {}
    }
  }, [myTurn, state?.turnStartedAt]);

  if (!state) return null;
  const me = state.players.find((p) => p.id === playerId);
  const boomPlayer = boom && state.players.find((p) => p.id === boom.playerId);

  return (
    <div className="bp-shell">
      <motion.div
        className="bp-inner space-y-5"
        animate={boom ? { x: [0, -12, 12, -8, 8, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-4xl sm:text-5xl leading-none flex items-center gap-2">
            <span aria-hidden="true">💣</span><span className="bp-title">BombParty</span>
          </h2>
          {state.phase === 'PLAYING' && (
            <span className="text-xs text-slate-400 text-right">
              {state.usedCount} mot{state.usedCount > 1 ? 's' : ''} trouvé{state.usedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isSpectator && state.phase !== 'GAME_OVER' && (
          <p className="text-center text-sm text-slate-300 bg-white/5 rounded-xl px-3 py-2">
            👀 Partie en cours : tu regardes, tu joueras à la prochaine.
          </p>
        )}

        {state.phase === 'COUNTDOWN' && <Countdown endsAt={state.countdownEndsAt} />}

        {state.phase === 'PLAYING' && (
          <>
            <div className="relative pt-4 sm:pt-2">
              <Arena state={state} playerId={playerId} flash={flash} />
              {/* Explosion */}
              <AnimatePresence>
                {boom && (
                  <motion.div
                    key={boom.seq}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="text-[9rem] leading-none"
                      initial={{ scale: 0.2, rotate: -20 }}
                      animate={{ scale: [0.2, 1.4, 1.1], rotate: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      💥
                    </motion.div>
                    <div className="mt-2 bg-black/75 backdrop-blur rounded-2xl px-4 py-2 text-center border border-rose-400/40">
                      <p className="font-bold text-rose-200">
                        {boomPlayer?.pseudo} {boom.eliminated ? 'est éliminé 💀' : 'perd une vie'}
                      </p>
                      {boom.examples?.length > 0 && (
                        <p className="text-xs text-slate-300 mt-0.5">
                          Il fallait trouver : <strong className="text-white">{boom.examples.join(', ')}</strong>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isSpectator && <WordInput state={state} playerId={playerId} lastEvent={ev} />}
            {isSpectator && <WordInput state={state} playerId={null} lastEvent={ev} />}

            {me && me.alive && (
              <div className="flex flex-col items-center gap-1">
                <Hearts lives={me.lives} max={state.maxLives} size="text-xl" />
                <BonusLetters me={me} letters={state.bonusLetters} maxLives={state.maxLives} />
              </div>
            )}
            {me && !me.alive && (
              <p className="text-center text-slate-400">💀 Tu es éliminé… regarde les autres s'en sortir !</p>
            )}

            {state.history.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {state.history.map((h, i) => {
                  const p = state.players.find((x) => x.id === h.playerId);
                  return (
                    <span key={`${h.word}-${i}`} className={`text-xs rounded-full px-2.5 py-1 bg-white/5 border border-white/10 ${i === 0 ? 'text-white' : 'text-slate-400'}`}>
                      <strong>{h.word}</strong> <span className="opacity-60">· {p?.pseudo}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}

        {state.phase === 'GAME_OVER' && <GameOver state={state} playerId={playerId} isHost={isHost} />}

        {isHost && state.phase !== 'GAME_OVER' && (
          <div className="text-right">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-rose-300"
              style={{ minHeight: 0 }}
              onClick={() => api.gameAction('endGame', {})}
            >
              🛑 Arrêter la partie
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
