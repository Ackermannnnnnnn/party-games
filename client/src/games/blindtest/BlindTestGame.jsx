import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { socket } from '../../lib/socket.js';
import { playSuccess, playFail, playTurnChime } from '../../hooks/useSounds.js';
import Avatar from '../../components/Avatar.jsx';
import { syncClock, serverNow, roughSync, useSyncedAudio, preload, unlockAudio } from './audio.js';

const SHAPES = ['▲', '◆', '●', '■'];
const UNIVERSE_ICON = { film: '🎬', serie: '📺', anime: '🍥', musique: '🎵' };

// ───────── Petits composants ─────────
function useNow(ms = 200) {
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((t) => t + 1), ms); return () => clearInterval(id); }, [ms]);
  return serverNow();
}

function TimeBar({ endsAt, remaining, totalMs }) {
  const now = useNow(150);
  const left = endsAt ? Math.max(0, endsAt - now) : (remaining || 0);
  const frac = Math.min(1, left / totalMs);
  const sec = Math.ceil(left / 1000);
  const color = !endsAt ? '#94a3b8' : frac > 0.5 ? '#f59e0b' : frac > 0.2 ? '#fb7185' : '#f43f5e';
  return (
    <div className="flex items-center gap-3" aria-label={`${sec} secondes`}>
      <div className="qz-bar flex-1"><span style={{ width: `${frac * 100}%`, background: color }} /></div>
      <span className={`font-mono font-bold tabular-nums w-10 text-right ${endsAt && sec <= 5 ? 'text-rose-300 animate-pulse' : ''}`}>{endsAt ? sec : '⏸'}</span>
    </div>
  );
}

function Vinyl({ spinning, cover }) {
  return (
    <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44">
      <div className={`bt-vinyl ${spinning ? 'bt-spin' : ''}`}>
        {cover ? <img src={cover} alt="" className="bt-label object-cover" /> : <div className="bt-label bg-gradient-to-br from-amber-400 to-rose-500" />}
      </div>
      {spinning && (
        <div className="absolute -right-1 -top-1 flex gap-0.5 items-end h-6" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className="bt-eq" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      )}
    </div>
  );
}

function useMe() {
  const { gameState, playerId, room } = useGameStore();
  const p = gameState?.public || {};
  const priv = gameState?.private || {};
  const isHost = playerId === room?.hostId;
  const player = (id) => room?.players.find((x) => x.id === id) || (p.leaderboard || []).find((x) => x.playerId === id);
  return { p, priv, playerId, isHost, player, room };
}

function SoundBar({ blocked, unlock, volume, setVolume, isDiffuser }) {
  const { p, player } = useMe();
  if (!isDiffuser) {
    const d = player(p.diffuserId);
    return <p className="text-center text-xs text-slate-400">🔈 Le son passe sur l'appareil de <strong>{d?.pseudo || "l'hôte"}</strong></p>;
  }
  return (
    <div className="flex items-center justify-center gap-3">
      {blocked ? (
        <button type="button" onClick={unlock} className="rounded-full bg-amber-400 text-slate-900 font-bold px-4 py-1.5 text-sm animate-pulse" style={{ minHeight: 0 }}>
          🔊 Touche ici pour activer le son
        </button>
      ) : (
        <label className="flex items-center gap-2 text-xs text-slate-400">
          {volume === 0 ? '🔇' : '🔊'}
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-28 accent-amber-400" aria-label="Volume" />
        </label>
      )}
    </div>
  );
}

function Header() {
  const { p, playerId } = useMe();
  const me = (p.leaderboard || []).find((x) => x.playerId === playerId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="qz-title text-2xl">#{p.roundIdx + 1}<span className="text-slate-400 text-lg">/{p.total}</span></span>
        {p.universeLabel && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{p.universeLabel}</span>}
      </div>
      {me && <span className="rounded-full bg-amber-500/25 px-2.5 py-0.5 text-xs font-mono font-bold">{me.points} pts</span>}
    </div>
  );
}

// ───────── Phases ─────────
function Loading() {
  const { p } = useMe();
  const l = p.loading || { done: 0, total: 1 };
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
      <Vinyl spinning />
      <p className="qz-title text-3xl">On prépare les extraits…</p>
      <div className="qz-bar w-64"><span style={{ width: `${(l.done / l.total) * 100}%`, background: '#f59e0b' }} /></div>
      <p className="text-xs text-slate-400">{l.done} / {l.total}</p>
    </div>
  );
}

function Countdown({ isDiffuser, blocked, unlock }) {
  const { p } = useMe();
  const now = useNow(100);
  const left = Math.max(0, (p.phaseEndsAt || 0) - now);
  const n = Math.ceil(left / 1000) - 1;
  const o = p.options || {};
  const modeText = o.answerMode === 'qcm' ? '🔢 Choisis la bonne réponse' : o.answerMode === 'buzzer' ? '🔔 Buzze dès que tu sais !' : '⌨️ Tape tes propositions, autant que tu veux';
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-amber-200">{p.total} extraits · {o.roundSec}s chacun</p>
      <AnimatePresence mode="wait">
        <motion.span key={n} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.35 }}
          className="qz-title text-9xl text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]">
          {n > 0 ? n : 'GO !'}
        </motion.span>
      </AnimatePresence>
      <p className="text-slate-300">{modeText}</p>
      {isDiffuser && (
        <button type="button" onClick={unlock} className={`rounded-full px-4 py-1.5 text-sm font-bold ${blocked ? 'bg-amber-400 text-slate-900 animate-pulse' : 'bg-white/10 text-slate-200'}`} style={{ minHeight: 0 }}>
          🔊 {blocked ? 'Touche ici pour activer le son' : 'Son activé — tester'}
        </button>
      )}
    </div>
  );
}

function FreeAnswer() {
  const { p, priv } = useMe();
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const music = p.universe === 'musique';
  const f = priv.found || {};
  const complete = music ? f.title && f.artist : f.work;
  useEffect(() => { setText(''); setTimeout(() => inputRef.current?.focus(), 50); }, [p.roundIdx]);
  const send = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || complete) return;
    api.gameAction('guess', { value: v });
    setText('');
  };
  return (
    <div className="space-y-2">
      {music ? (
        <div className="flex justify-center gap-2 text-sm font-semibold">
          <span className={`rounded-full px-3 py-1 ${f.title ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/10 text-slate-400'}`}>{f.title ? '✓' : '?'} Titre</span>
          <span className={`rounded-full px-3 py-1 ${f.artist ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/10 text-slate-400'}`}>{f.artist ? '✓' : '?'} Artiste</span>
        </div>
      ) : null}
      {complete ? (
        <p className="text-center text-emerald-300 font-bold text-lg">✅ Trouvé ! On attend les autres…</p>
      ) : (
        <form className="flex gap-2" onSubmit={send}>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value.slice(0, 80))}
            aria-label="Ta proposition" placeholder={music ? 'Titre, artiste… ou les deux' : 'Ta proposition…'} autoComplete="off" spellCheck={false} enterKeyHint="send"
            className="flex-1 min-w-0 rounded-xl bg-black/40 border-2 border-white/15 focus:border-amber-300 px-4 py-3 text-lg font-semibold outline-none" />
          <button className="btn btn-primary" disabled={!text.trim()}>OK</button>
        </form>
      )}
      {(priv.guesses || []).length > 0 && (
        <ul className="flex flex-wrap justify-center gap-1.5">
          {priv.guesses.map((g, i) => (
            <li key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${g.ok ? 'bg-emerald-500/25 text-emerald-100' : 'bg-rose-500/15 text-rose-200 line-through'}`}>{g.v}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QcmAnswer() {
  const { p, priv } = useMe();
  const picked = priv.myChoice;
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {(p.choices || []).map((c, i) => (
        <button key={i} type="button" disabled={picked !== null && picked !== undefined} onClick={() => api.gameAction('choose', { idx: i })}
          className={`qz-answer qz-a${i} ${picked === i ? 'qz-picked' : ''} ${picked !== null && picked !== undefined && picked !== i ? 'qz-dim' : ''}`}>
          <span className="qz-shape" aria-hidden="true">{SHAPES[i]}</span>
          <span className="text-base sm:text-lg leading-tight">{c}</span>
        </button>
      ))}
    </div>
  );
}

function BuzzerAnswer() {
  const { p, priv, playerId, player } = useMe();
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const buzz = p.buzz;
  const now = useNow(200);
  const mine = buzz?.playerId === playerId;
  const gm = !!p.gmId;
  useEffect(() => { setText(''); if (mine && !gm) setTimeout(() => inputRef.current?.focus(), 50); }, [buzz?.playerId, mine, gm]);

  if (priv.isGm) return null;
  if (buzz) {
    const who = player(buzz.playerId);
    const left = buzz.endsAt ? Math.max(0, Math.ceil((buzz.endsAt - now) / 1000)) : null;
    if (mine && !gm) {
      return (
        <div className="space-y-2">
          <p className="text-center font-bold text-amber-200">🔔 Tu as buzzé ! Ta réponse{left !== null ? ` (${left}s)` : ''} :</p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) api.gameAction('buzzAnswer', { value: text.trim() }); }}>
            <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value.slice(0, 80))} aria-label="Ta réponse" autoComplete="off" spellCheck={false} enterKeyHint="send"
              placeholder={p.universe === 'musique' ? 'Titre ou artiste' : 'Ta réponse…'}
              className="flex-1 min-w-0 rounded-xl bg-black/40 border-2 border-amber-300 px-4 py-3 text-lg font-semibold outline-none" />
            <button className="btn btn-primary" disabled={!text.trim()}>OK</button>
          </form>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <Avatar id={who?.avatar} size="lg" />
        <p className="text-lg font-bold">🔔 {mine ? 'Tu as buzzé — réponds à voix haute !' : `${who?.pseudo || '?'} a buzzé !`}</p>
        {gm && !mine && <p className="text-xs text-slate-400">Le maître du jeu valide…</p>}
        {!gm && !mine && left !== null && <p className="text-xs text-slate-400">Il lui reste {left}s</p>}
      </div>
    );
  }
  if (priv.lockedOut) return <p className="text-center text-rose-300 font-semibold py-6">❌ Raté — tu ne peux plus buzzer sur cet extrait.</p>;
  return (
    <div className="flex justify-center py-2">
      <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => { unlockAudio(); api.gameAction('buzz'); }} className="bt-buzzer" aria-label="Buzzer">
        <span className="bt-buzzer-label">BUZZ</span>
      </motion.button>
    </div>
  );
}

function GmPanel() {
  const { p, priv, player } = useMe();
  const c = priv.gmCard;
  if (!c) return null;
  const buzzer = p.buzz ? player(p.buzz.playerId) : null;
  return (
    <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-3 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-amber-200">🎙️ Maître du jeu — réponse</p>
      <div className="flex items-center gap-3">
        {c.cover && <img src={c.cover} alt="" className="w-14 h-14 rounded-lg" />}
        <div>
          <p className="text-lg font-bold leading-tight">{c.universe === 'musique' ? c.song : c.answer}</p>
          <p className="text-sm text-slate-300">{c.universe === 'musique' ? c.artist : `${c.artist} — ${c.song}`}</p>
          {c.alt?.length > 0 && <p className="text-[11px] text-slate-400">Aussi accepté : {c.alt.join(', ')}</p>}
        </div>
      </div>
      {buzzer ? (
        <div className="space-y-2">
          <p className="text-center font-semibold">🔔 {buzzer.pseudo} a buzzé — sa réponse est-elle bonne ?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => api.gameAction('judge', { ok: true })} className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-lg">✓ Bonne</button>
            <button type="button" onClick={() => api.gameAction('judge', { ok: false })} className="btn bg-rose-600 hover:bg-rose-500 text-white text-lg">✗ Fausse</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => api.gameAction('replay')} className="btn btn-ghost text-sm">🔁 Rejouer l'extrait</button>
          <button type="button" onClick={() => api.gameAction('next')} className="btn btn-ghost text-sm">⏭ Révéler</button>
        </div>
      )}
    </div>
  );
}

function Round({ isDiffuser }) {
  const { p, priv, isHost, room } = useMe();
  const mode = p.options?.answerMode;
  const playing = !!p.audio?.playing;
  const progress = p.progress || {};
  const expected = (p.expectedIds || []).map((id) => room.players.find((x) => x.id === id)).filter(Boolean);
  const music = p.universe === 'musique';
  const status = (id) => {
    if (mode === 'qcm') return (p.answeredIds || []).includes(id) ? 'done' : '';
    if (mode === 'buzzer') return (p.lockedOut || []).includes(id) ? 'out' : '';
    const f = progress[id] || {};
    if (music) return f.title && f.artist ? 'done' : f.title || f.artist ? 'half' : '';
    return f.work ? 'done' : '';
  };
  return (
    <div className="space-y-4">
      <Header />
      <TimeBar endsAt={p.roundEndsAt} remaining={p.roundRemaining} totalMs={p.roundMs || 25000} />
      <div className="text-center space-y-3">
        <Vinyl spinning={playing && isDiffuser} />
        <p className="text-lg sm:text-xl font-bold">{UNIVERSE_ICON[p.universe]} {p.find}</p>
      </div>

      {priv.isGm && <GmPanel />}
      {!priv.isGm && mode === 'free' && <FreeAnswer />}
      {!priv.isGm && mode === 'qcm' && <QcmAnswer />}
      {mode === 'buzzer' && <BuzzerAnswer />}

      <div className="flex flex-wrap justify-center gap-1.5" aria-label="Joueurs">
        {expected.map((pl) => {
          const s = status(pl.id);
          return (
            <span key={pl.id} title={pl.pseudo} className={`rounded-full transition ${s === 'done' ? 'ring-2 ring-emerald-300' : s === 'half' ? 'ring-2 ring-amber-300' : s === 'out' ? 'opacity-30 grayscale' : 'opacity-60'}`}>
              <Avatar id={pl.avatar} size="sm" />
            </span>
          );
        })}
      </div>

      {isHost && !priv.isGm && (
        <div className="flex justify-center">
          <button type="button" onClick={() => api.gameAction('next')} className="text-xs text-slate-400 underline" style={{ minHeight: 0 }}>Passer cet extrait</button>
        </div>
      )}
    </div>
  );
}

function Reveal() {
  const { p, playerId, isHost, player } = useMe();
  const r = p.reveal || {};
  const mine = r.perPlayer?.[playerId];
  const music = r.universe === 'musique';
  const qcm = p.options?.answerMode === 'qcm';
  const top = (p.leaderboard || []).slice(0, 5);
  const last = p.roundIdx + 1 >= p.total;
  const finders = [];
  for (const f of r.finders || []) if (!finders.some((x) => x.id === f.id)) finders.push(f);
  return (
    <div className="space-y-4">
      <Header />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-white/[0.06] border border-white/10 p-4">
        {r.cover ? <img src={r.cover} alt="" className="w-28 h-28 rounded-xl shadow-lg" /> : <Vinyl />}
        <div className="text-center sm:text-left">
          <p className="text-[11px] uppercase tracking-wider text-amber-200">{UNIVERSE_ICON[r.universe]} C'était…</p>
          <p className="qz-title text-4xl leading-none">{music ? r.song : r.answer}</p>
          <p className="text-slate-300 mt-1">{music ? r.artist : `🎵 ${r.artist} — ${r.song}`}</p>
        </div>
      </motion.div>

      {mine && (
        <div className={`rounded-2xl px-4 py-2.5 text-center border ${mine.points > 0 ? 'bg-emerald-500/20 border-emerald-400/60' : 'bg-rose-500/15 border-rose-400/50'}`}>
          <p className="qz-title text-3xl">{mine.points > 0 ? `✅ +${mine.points} pts` : '❌ Pas trouvé'}</p>
          {music && !qcm && mine.points > 0 && (mine.title !== mine.artist) && <p className="text-xs">{mine.title ? 'Titre trouvé' : 'Artiste trouvé'} — il manquait {mine.title ? "l'artiste" : 'le titre'}</p>}
        </div>
      )}

      {qcm && (
        <div className="grid sm:grid-cols-2 gap-2">
          {(r.choices || []).map((c, i) => {
            const ok = i === r.correctChoice;
            const who = Object.entries(r.perPlayer || {}).filter(([, v]) => v.choice === i).map(([id]) => player(id)).filter(Boolean);
            return (
              <div key={i} className={`qz-answer qz-a${i} ${ok ? 'qz-picked' : 'qz-dim'}`}>
                <span className="qz-shape">{ok ? '✓' : SHAPES[i]}</span>
                <span className="flex-1 text-sm sm:text-base">{c}</span>
                <span className="flex -space-x-2">{who.map((w) => <Avatar key={w.id || w.playerId} id={w.avatar} size="xs" />)}</span>
              </div>
            );
          })}
        </div>
      )}

      {!qcm && finders.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1.5 text-center">{r.buzzWinner ? 'Buzz gagnant' : 'Ont trouvé'}</p>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {finders.map((f, i) => {
              const pl = player(f.id);
              const pts = r.perPlayer?.[f.id]?.points || 0;
              return (
                <li key={f.id} className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-sm">
                  {i === 0 && '🥇'} <Avatar id={pl?.avatar} size="xs" /> {pl?.pseudo} <span className="text-[11px] text-emerald-200">+{pts}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!qcm && finders.length === 0 && <p className="text-center text-slate-400 text-sm">Personne n'a trouvé 😶</p>}

      <ol className="space-y-1">
        {top.map((row, i) => (
          <li key={row.playerId} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${row.playerId === playerId ? 'bg-amber-500/20' : 'bg-white/[0.04]'}`}>
            <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
            <Avatar id={row.avatar} size="xs" />
            <span className="flex-1 truncate">{row.pseudo}</span>
            <span className="font-mono font-bold">{row.points}</span>
          </li>
        ))}
      </ol>

      {isHost && (
        <button type="button" onClick={() => api.gameAction('next')} className="btn btn-primary w-full">{last ? '🏆 Voir le classement' : '⏭ Extrait suivant'}</button>
      )}
    </div>
  );
}

function Podium() {
  const { p, playerId, isHost, player } = useMe();
  const ranking = p.ranking || [];
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="space-y-5">
      <p className="qz-title text-5xl text-center">🏆 Classement</p>
      <ol className="space-y-1.5">
        {ranking.map((row, i) => (
          <motion.li key={row.playerId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (ranking.length - i) * 0.25 }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${row.playerId === playerId ? 'bg-amber-500/25 border border-amber-300/50' : 'bg-white/[0.05]'}`}>
            <span className="w-8 text-center text-xl">{medals[i] || i + 1}</span>
            <Avatar id={row.avatar} size={i === 0 ? 'md' : 'sm'} />
            <span className="flex-1 truncate font-semibold">{row.pseudo}</span>
            <span className="text-xs text-slate-400">{row.found} trouvé{row.found > 1 ? 's' : ''}</span>
            <span className="font-mono font-bold text-lg">{row.points}</span>
          </motion.li>
        ))}
      </ol>

      <details className="rounded-xl bg-white/[0.04] p-3">
        <summary className="cursor-pointer text-sm font-semibold">🎧 Récap des extraits</summary>
        <ul className="mt-2 space-y-1.5">
          {(p.history || []).map((h, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {h.cover ? <img src={h.cover} alt="" className="w-9 h-9 rounded" /> : <span className="w-9 text-center">{UNIVERSE_ICON[h.universe]}</span>}
              <span className="flex-1 min-w-0">
                <span className="block truncate font-semibold">{h.universe === 'musique' ? h.song : h.answer}</span>
                <span className="block truncate text-[11px] text-slate-400">{h.artist}{h.universe !== 'musique' ? ` — ${h.song}` : ''}</span>
              </span>
              <span className="flex -space-x-1.5">{(h.finders || []).slice(0, 5).map((id) => <Avatar key={id} id={player(id)?.avatar} size="xs" />)}</span>
            </li>
          ))}
        </ul>
      </details>

      {isHost ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { unlockAudio(); api.gameAction('restart'); }} className="btn btn-primary">🔁 Rejouer</button>
          <button type="button" onClick={() => api.gameAction('endGame')} className="btn btn-ghost">🏠 Retour au salon</button>
        </div>
      ) : <p className="text-center text-sm text-slate-400">L'hôte peut relancer une partie.</p>}
    </div>
  );
}

// ───────── Racine ─────────
export default function BlindTestGame() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const p = gameState?.public;
  const phase = p?.phase;
  const isDiffuser = !p?.diffuserId || p.diffuserId === playerId;
  const audioOn = isDiffuser && (phase === 'ROUND' || phase === 'REVEAL');
  const { blocked, unlock, volume, setVolume } = useSyncedAudio(p?.audio, audioOn);
  const lastReveal = useRef(null);

  useEffect(() => { syncClock(); }, []);
  useEffect(() => { roughSync(p?.serverNow); }, [p?.serverNow]);
  useEffect(() => { if (isDiffuser && p?.nextUrl) preload(p.nextUrl); }, [p?.nextUrl, isDiffuser]);

  // Sons : buzz, bonne / mauvaise réponse
  useEffect(() => {
    const onEvent = ({ type, payload }) => {
      if (type === 'buzz') playTurnChime();
      if (type === 'buzzResult' && payload?.playerId === playerId) (payload.ok ? playSuccess : playFail)();
      if (type === 'found' && payload?.playerId === playerId) playSuccess();
    };
    socket.on('game:event', onEvent);
    return () => socket.off('game:event', onEvent);
  }, [playerId]);
  useEffect(() => {
    if (phase !== 'REVEAL' || !p?.reveal) return;
    const key = `${p.gameNo}-${p.reveal.index}`;
    if (lastReveal.current === key) return;
    lastReveal.current = key;
    const mine = p.reveal.perPlayer?.[playerId];
    if (p.options?.answerMode === 'qcm' && mine) (mine.points > 0 ? playSuccess : playFail)();
  }, [phase, p?.reveal?.index]);

  if (!p) return null;
  let content = null;
  if (phase === 'LOADING') content = <Loading />;
  else if (phase === 'COUNTDOWN') content = <Countdown isDiffuser={isDiffuser} blocked={blocked} unlock={unlock} />;
  else if (phase === 'ROUND') content = <Round isDiffuser={isDiffuser} />;
  else if (phase === 'REVEAL') content = <Reveal />;
  else if (phase === 'PODIUM') content = <Podium />;

  return (
    <div className="bt-shell">
      <div className="qz-inner bt-inner space-y-3">
        {(phase === 'ROUND' || phase === 'REVEAL') && <SoundBar blocked={blocked} unlock={unlock} volume={volume} setVolume={setVolume} isDiffuser={isDiffuser} />}
        <motion.div key={`${phase}-${p.roundIdx}-${p.gameNo}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {content}
        </motion.div>
      </div>
    </div>
  );
}
