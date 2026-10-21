import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { socket } from '../../lib/socket.js';
import Avatar from '../../components/Avatar.jsx';
import { syncClock, serverNow, roughSync } from '../blindtest/audio.js';
import { sfx, unlockSound, stopMusic, setVolume, useVolumes } from './sfx.js';

// La 3D (Three.js) n'est téléchargée que par ceux qui l'activent
const LiarsBar3D = lazy(() => import('./LiarsBar3D.jsx'));
const VIEW_KEY = 'liarsbarView';
const webglOk = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

const RANK = {
  K: { name: 'Roi', plural: 'Rois', icon: '♚', color: '#f5c542' },
  Q: { name: 'Dame', plural: 'Dames', icon: '♛', color: '#e879f9' },
  A: { name: 'As', plural: 'As', icon: 'A', color: '#38bdf8' },
  J: { name: 'Joker', plural: 'Jokers', icon: '🃏', color: '#4ade80' },
  D: { name: 'Diable', plural: 'Diable', icon: '😈', color: '#ef4444' },
};

function useNow(ms = 200) {
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((t) => t + 1), ms); return () => clearInterval(id); }, [ms]);
  return serverNow();
}

/** Position d'un siège autour de la table (en %), le joueur local en bas. */
function seatPos(i, n) {
  const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: 50 + 40 * Math.cos(a), y: 50 + 37 * Math.sin(a) };
}

// ───────── Cartes ─────────
export function PlayingCard({ rank, faceUp = true, selected = false, small = false, onClick, disabled, className = '', style }) {
  const r = RANK[rank] || RANK.K;
  const size = small ? 'w-9 h-[52px] text-sm' : 'w-14 h-20 sm:w-16 sm:h-[92px] text-2xl';
  if (!faceUp) return <span className={`lb-card lb-back ${size} ${className}`} style={style} />;
  return (
    <button type="button" onClick={onClick} disabled={disabled || !onClick} style={{ ...style, '--c': r.color }}
      className={`lb-card lb-face ${size} ${selected ? 'lb-selected' : ''} ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}>
      <span className="lb-corner">{rank === 'J' || rank === 'D' ? '' : rank === 'K' ? 'R' : rank === 'Q' ? 'D' : 'A'}</span>
      <span className="lb-icon">{r.icon}</span>
      {!small && <span className="lb-name">{r.name}</span>}
    </button>
  );
}

// ───────── Revolver ─────────
function Revolver({ shots, spinning, fired, revealed }) {
  return (
    <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-52 sm:h-52 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]" aria-hidden="true">
      <defs>
        <radialGradient id="lbsteel" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#d4d4d8" /><stop offset="55%" stopColor="#71717a" /><stop offset="100%" stopColor="#27272a" /></radialGradient>
      </defs>
      <motion.g style={{ originX: '100px', originY: '100px' }}
        animate={spinning ? { rotate: [0, 1080 + 60 * shots] } : { rotate: 60 * shots }}
        transition={spinning ? { duration: 3.3, ease: [0.15, 0.6, 0.25, 1] } : { duration: 0.3 }}>
        <circle cx="100" cy="100" r="88" fill="url(#lbsteel)" stroke="#18181b" strokeWidth="4" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i * Math.PI) / 3 - Math.PI / 2;
          const used = i < shots;
          return <circle key={i} cx={100 + 52 * Math.cos(a)} cy={100 + 52 * Math.sin(a)} r="20" fill={used ? '#3f3f46' : '#09090b'} stroke="#52525b" strokeWidth="3" />;
        })}
        <circle cx="100" cy="100" r="14" fill="#3f3f46" stroke="#18181b" strokeWidth="3" />
      </motion.g>
      {revealed && fired && <circle cx="100" cy="100" r="95" fill="none" stroke="#ef4444" strokeWidth="6" />}
    </svg>
  );
}

function RouletteOverlay({ p, person }) {
  const now = useNow(100);
  const shot = p.shot;
  if (!shot) return null;
  const who = person(shot.playerId);
  const revealed = !!shot.revealed || now >= shot.revealAt;
  const remaining = 6 - shot.chamber;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-black/80 backdrop-blur-sm ${revealed && shot.fired ? 'lb-shake' : ''}`}>
      {revealed && shot.fired && <motion.div className="absolute inset-0 rounded-[2rem] bg-red-600" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />}
      {revealed && shot.fired && <motion.div className="absolute inset-0 rounded-[2rem] bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }} />}
      <div className="flex items-center gap-3 relative">
        <Avatar id={who.avatar} size="lg" className={revealed && shot.fired ? 'grayscale' : ''} />
        <div>
          <p className="text-xl sm:text-2xl font-bold">{who.pseudo}</p>
          <p className="text-sm text-slate-300">Tir n°{shot.chamber + 1} · 1 chance sur {remaining}</p>
        </div>
      </div>
      <Revolver shots={shot.chamber} spinning={!revealed} fired={shot.fired} revealed={revealed} />
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.p key="wait" className="lb-title text-3xl text-slate-200" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>…</motion.p>
        ) : shot.fired ? (
          <motion.p key="bang" initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="lb-title text-5xl sm:text-6xl text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]">💥 BANG</motion.p>
        ) : (
          <motion.p key="click" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="lb-title text-4xl text-emerald-300">*clic* · survit</motion.p>
        )}
      </AnimatePresence>
      {p.shotQueue?.length > 0 && <p className="text-xs text-slate-400">Ensuite : {p.shotQueue.map((id) => person(id).pseudo).join(', ')}</p>}
    </motion.div>
  );
}

// ───────── Sièges ─────────
function Seat({ s, pos, isCurrent, isMe, lastPlay, turnFrac }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 w-24 sm:w-28" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
      <div className="relative">
        {isCurrent && s.alive && (
          <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(245,158,11,0.25)" strokeWidth="6" />
            {turnFrac != null && <circle cx="50" cy="50" r="46" fill="none" stroke={turnFrac > 0.3 ? '#f59e0b' : '#ef4444'} strokeWidth="6" strokeDasharray={`${turnFrac * 289} 289`} strokeLinecap="round" />}
          </svg>
        )}
        <Avatar id={s.avatar} size="md" className={`${s.alive ? '' : 'grayscale opacity-40'} ${isCurrent && s.alive ? 'lb-glow' : ''}`} />
        {!s.alive && <span className="absolute inset-0 flex items-center justify-center text-2xl">💀</span>}
        {!s.connected && s.alive && <span className="absolute -top-1 -right-1 text-xs" title="Déconnecté">📴</span>}
      </div>
      <p className={`text-xs font-semibold truncate max-w-full ${isMe ? 'text-amber-300' : 'text-slate-100'}`}>{s.pseudo}{isMe ? ' (toi)' : ''}</p>
      {s.alive && (
        <div className="flex items-center gap-1.5">
          <span className="flex -space-x-2" title={`${s.cards} carte(s)`}>
            {Array.from({ length: Math.min(s.cards, 5) }).map((_, i) => <span key={i} className="lb-mini-back" />)}
            {s.cards === 0 && <span className="text-[10px] text-slate-500">0</span>}
          </span>
          <span className="flex gap-0.5" title={`${s.shots}/6 tirs`}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < s.shots ? 'bg-red-500' : 'bg-zinc-600'}`} />)}
          </span>
        </div>
      )}
      {lastPlay?.by === s.id && <span className="text-[10px] rounded-full bg-black/60 px-1.5 text-amber-200">a posé {lastPlay.count}</span>}
    </div>
  );
}

// ───────── Racine ─────────
export default function LiarsBarGame() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const room = useGameStore((s) => s.room);
  const p = gameState?.public;
  const priv = gameState?.private || {};
  const isHost = playerId === room?.hostId;
  const [selected, setSelected] = useState([]);
  const now = useNow(200);
  const lastPhase = useRef(null);
  const vols = useVolumes();
  const [viewPref, setViewPref] = useState(() => { try { return localStorage.getItem(VIEW_KEY); } catch { return null; } });

  useEffect(() => { syncClock(); unlockSound(); return () => stopMusic(); }, []); // l'ambiance démarre dès que le son est débloqué
  useEffect(() => { roughSync(p?.serverNow); }, [p?.serverNow]);
  useEffect(() => { setSelected([]); }, [p?.round, p?.currentId, p?.phase]);

  // Sons liés aux phases et événements
  useEffect(() => {
    if (!p) return;
    const key = `${p.gameNo}-${p.round}-${p.phase}-${p.shot?.startedAt || ''}`;
    if (lastPhase.current === key) return;
    lastPhase.current = key;
    if (p.phase === 'DEAL') sfx.deal(6);
    if (p.phase === 'REVEAL') setTimeout(() => sfx.flip(), 600);
    if (p.phase === 'ROULETTE' && p.shot && !p.shot.revealed) {
      const left = p.shot.revealAt - serverNow();
      sfx.spin(Math.min(1800, Math.max(800, left - 600)));
      sfx.heartbeat(Math.max(600, left - 200));
      setTimeout(() => sfx.cock(), Math.max(0, left - 450));
    }
    if (p.phase === 'GAME_OVER') sfx.win();
  }, [p?.phase, p?.round, p?.shot?.startedAt]);
  useEffect(() => {
    const onEvent = ({ type, payload }) => {
      if (type === 'play') sfx.card(payload?.count || 1);
      if (type === 'liar') sfx.liar();
      if (type === 'bang') sfx.bang();
      if (type === 'click') sfx.click();
    };
    socket.on('game:event', onEvent);
    return () => socket.off('game:event', onEvent);
  }, []);

  // petit signal quand c'est à toi
  const isMyTurn = p?.phase === 'TURN' && p?.currentId === playerId;
  useEffect(() => { if (isMyTurn) sfx.yourTurn(); }, [isMyTurn, p?.lastPlay?.at]);

  const seats = p?.seats || [];
  const myIndex = Math.max(0, seats.findIndex((s) => s.id === playerId));
  const ordered = useMemo(() => seats.map((_, i) => seats[(myIndex + i) % seats.length]), [seats, myIndex]);
  const posOf = (id) => { const i = ordered.findIndex((s) => s.id === id); return seatPos(Math.max(0, i), ordered.length || 1); };
  const person = (id) => seats.find((s) => s.id === id) || { pseudo: '?', avatar: null };

  if (!p) return null;
  const me = seats.find((s) => s.id === playerId);
  const myTurn = p.phase === 'TURN' && p.currentId === playerId;
  const canAccuse = p.phase === 'TURN' && p.lastPlay && p.lastPlay.by !== playerId && me?.alive && (p.options?.accuseMode === 'anyone' || myTurn);
  const turnTotal = (p.options?.turnSec || 0) * 1000;
  const turnFrac = p.turnEndsAt && turnTotal ? Math.max(0, Math.min(1, (p.turnEndsAt - now) / turnTotal)) : null;
  const tableCard = RANK[p.tableCard];
  const toggle = (id) => setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length >= 3 ? sel : [...sel, id]));
  const play = () => { unlockSound(); if (selected.length) { api.gameAction('play', { cardIds: selected }); setSelected([]); } };
  const liar = () => { unlockSound(); api.gameAction('liar'); };

  if (p.phase === 'GAME_OVER') return <GameOver p={p} isHost={isHost} playerId={playerId} />;
  const is3d = webglOk && (viewPref || p.options?.view || '2d') === '3d';
  const switchView = () => { const v = is3d ? '2d' : '3d'; setViewPref(v); try { localStorage.setItem(VIEW_KEY, v); } catch {} };

  const status = (() => {
    if (p.phase === 'DEAL') return `Manche ${p.round} · distribution…`;
    if (p.phase === 'REVEAL') return `${person(p.reveal?.accuser).pseudo} accuse ${person(p.reveal?.by).pseudo} !`;
    if (p.phase === 'ROULETTE') return 'Roulette russe…';
    if (myTurn) return p.mustAccuse ? 'Plus personne n\'a de cartes : juge la dernière pose !' : p.lastPlay ? 'À toi : accuse ou pose tes cartes' : 'À toi de poser';
    return `Au tour de ${person(p.currentId).pseudo}`;
  })();

  return (
    <div className="lb-shell" onPointerDown={() => unlockSound()}>
      <div className="flex items-center justify-between gap-2 px-1 pb-2 text-xs text-amber-100/80">
        <span>Manche {p.round} · {p.options?.accuseMode === 'anyone' ? 'tout le monde peut accuser' : 'le suivant accuse'}{p.options?.devilCard ? ' · 😈' : ''}</span>
        <span className="flex items-center gap-2">
          {webglOk && <button type="button" onClick={switchView} className="rounded-full border border-amber-400/40 px-2 py-0.5 text-amber-200 hover:bg-amber-400/10" style={{ minHeight: 0 }} title="Changer de vue (pour toi seulement)">{is3d ? '🗺️ 2D' : '🎥 3D'}</button>}
          <VolumeControls vols={vols} />
        </span>
      </div>

      {is3d ? (
        <div className="relative">
          <Suspense fallback={<div className="lb-3d flex items-center justify-center text-amber-200">Chargement de la 3D…</div>}>
            <LiarsBar3D p={p} playerId={playerId} ordered={ordered} myHand={priv.seated && priv.alive ? priv.hand || [] : []}
              selected={selected} onToggle={toggle} canSelect={myTurn && !p.mustAccuse} />
          </Suspense>
          <Hud3D p={p} person={person} tableCard={tableCard} now={now} turnFrac={turnFrac} playerId={playerId}
            myTurn={myTurn} canAccuse={canAccuse} selected={selected} onPlay={play} onLiar={liar} status={status} />
        </div>
      ) : (
      <div className="lb-table-wrap">
        <div className="lb-table">
          {/* Carte de table */}
          <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80">Table de</span>
            <motion.span key={`${p.round}-${p.tableCard}`} initial={{ scale: 0.4, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="lb-title text-3xl sm:text-4xl" style={{ color: tableCard?.color }}>{tableCard?.plural}</motion.span>
          </div>

          {/* Pile de cartes posées */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {Array.from({ length: Math.min(p.pile || 0, 14) }).map((_, i) => (
              <span key={i} className="lb-card lb-back w-10 h-14 absolute" style={{ left: -20 + ((i * 37) % 13) - 6, top: -28 + ((i * 53) % 11) - 5, transform: `rotate(${((i * 47) % 50) - 25}deg)` }} />
            ))}
          </div>

          {/* Dernière pose : les cartes glissent du joueur vers le centre */}
          <AnimatePresence>
            {p.phase === 'TURN' && p.lastPlay && (
              <motion.div key={`lp-${p.lastPlay.at}`} className="absolute flex gap-1 -translate-x-1/2 -translate-y-1/2 z-10"
                initial={{ left: `${posOf(p.lastPlay.by).x}%`, top: `${posOf(p.lastPlay.by).y}%`, scale: 0.7, opacity: 0.4 }}
                animate={{ left: '50%', top: '58%', scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 16 }}>
                {Array.from({ length: p.lastPlay.count }).map((_, i) => <span key={i} className="lb-card lb-back w-11 h-16" style={{ transform: `rotate(${(i - 1) * 8}deg)` }} />)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Distribution : les cartes partent du centre vers chaque joueur */}
          {p.phase === 'DEAL' && ordered.filter((s) => s.alive).flatMap((s) => Array.from({ length: 5 }).map((_, k) => (
            <motion.span key={`${p.round}-${s.id}-${k}`} className="lb-card lb-back w-8 h-11 absolute -translate-x-1/2 -translate-y-1/2 z-10"
              initial={{ left: '50%', top: '50%', opacity: 0, rotate: 0 }}
              animate={{ left: `${posOf(s.id).x}%`, top: `${posOf(s.id).y}%`, opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ delay: k * 0.18 + ordered.indexOf(s) * 0.04, duration: 0.55, ease: 'easeOut' }} />
          )))}

          {/* Révélation */}
          <AnimatePresence>
            {p.phase === 'REVEAL' && p.reveal && (
              <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 rounded-2xl bg-black/70 backdrop-blur-sm px-4 py-3 shadow-2xl">
                <motion.p initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="lb-title whitespace-nowrap text-3xl sm:text-4xl text-red-400">MENTEUR !</motion.p>
                <div className="flex gap-1.5" style={{ perspective: 600 }}>
                  {p.reveal.cards.map((c, i) => (
                    <motion.div key={c.id} initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ delay: 0.5 + i * 0.25, duration: 0.5 }} style={{ transformStyle: 'preserve-3d' }}>
                      <PlayingCard rank={c.rank} />
                    </motion.div>
                  ))}
                </div>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + p.reveal.cards.length * 0.25 }}
                  className={`lb-title whitespace-nowrap text-xl sm:text-2xl px-3 py-0.5 rounded ${p.reveal.devil ? 'bg-red-700 text-white' : p.reveal.lie ? 'bg-red-600/80 text-white' : 'bg-emerald-600/80 text-white'}`}>
                  {p.reveal.devil ? '😈 CARTE DU DIABLE !' : p.reveal.lie ? 'MENSONGE' : 'VÉRITÉ'}
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + p.reveal.cards.length * 0.25 }} className="text-xs text-amber-100 text-center max-w-[220px]">
                  {p.reveal.devil ? `Tout le monde sauf ${person(p.reveal.by).pseudo} tire !` : `${person(p.reveal.shooters[0]).pseudo} va tirer…`}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {ordered.map((s, i) => (
            <Seat key={s.id} s={s} pos={seatPos(i, ordered.length)} isCurrent={p.currentId === s.id && p.phase === 'TURN'} isMe={s.id === playerId}
              lastPlay={p.phase === 'TURN' ? p.lastPlay : null} turnFrac={p.currentId === s.id ? turnFrac : null} />
          ))}

          <AnimatePresence>{p.phase === 'ROULETTE' && <RouletteOverlay key={p.shot?.startedAt} p={p} person={person} />}</AnimatePresence>
        </div>
      </div>
      )}

      {/* Statut + main du joueur */}
      <div className="mt-3 space-y-3">
        {!is3d && <p className={`text-center font-semibold ${myTurn ? 'text-amber-300' : 'text-slate-200'}`}>{status}</p>}

        {!is3d && priv.seated && priv.alive && (
          <div className="flex justify-center items-end min-h-[100px]">
            <AnimatePresence>
              {(priv.hand || []).map((c, i, arr) => {
                const mid = (arr.length - 1) / 2;
                const sel = selected.includes(c.id);
                return (
                  <motion.div key={c.id} layout initial={{ y: 60, opacity: 0 }} animate={{ y: sel ? -18 : 0, opacity: 1, rotate: (i - mid) * 5 }} exit={{ y: -80, opacity: 0, scale: 0.7 }}
                    className="-mx-1.5 sm:-mx-1" style={{ originY: 1.2 }}>
                    <PlayingCard rank={c.rank} selected={sel} onClick={myTurn && !p.mustAccuse ? () => toggle(c.id) : undefined} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {(priv.hand || []).length === 0 && p.phase === 'TURN' && <p className="text-sm text-slate-400">Plus de cartes pour cette manche.</p>}
          </div>
        )}
        {priv.seated && !priv.alive && <p className="text-center text-slate-400 text-sm">💀 Tu es éliminé — profite du spectacle.</p>}
        {!priv.seated && <p className="text-center text-slate-400 text-sm">👀 Tu regardes la partie (table pleine ou arrivé en cours).</p>}

        {!is3d && <div className="flex justify-center gap-2">
          {myTurn && !p.mustAccuse && (
            <button type="button" onClick={play} disabled={!selected.length} className="btn btn-primary whitespace-nowrap disabled:opacity-40">
              {selected.length ? `Poser ${selected.length} ${selected.length > 1 ? tableCard?.plural : tableCard?.name}` : 'Choisis 1 à 3 cartes'}
            </button>
          )}
          {canAccuse && (
            <motion.button type="button" onClick={liar} whileTap={{ scale: 0.92 }} animate={p.mustAccuse && myTurn ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 1.2 }}
              className="lb-liar-btn">MENTEUR !</motion.button>
          )}
        </div>}
      </div>
    </div>
  );
}

/** Informations et actions par-dessus la scène 3D : carte de table, tour en cours, révélation, roulette, boutons. */
function Hud3D({ p, person, tableCard, now, turnFrac, myTurn, canAccuse, selected, onPlay, onLiar, status, playerId }) {
  const shot = p.phase === 'ROULETTE' ? p.shot : null;
  const revealed = !!shot && (shot.revealed || now >= shot.revealAt);
  const r = p.reveal;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center p-3 sm:p-4">
      {/* coin haut gauche : carte de table + à qui de jouer */}
      <div className="self-start flex flex-col items-start rounded-2xl bg-black/55 px-4 py-2 backdrop-blur-sm ring-1 ring-amber-200/10 max-w-[60%]">
        <span className="lb-title text-[13px] text-amber-200/80 leading-none">Table des</span>
        <span className="lb-title text-3xl sm:text-4xl leading-none" style={{ color: tableCard?.color }}>{tableCard?.plural}</span>
        <span className={`mt-1 text-xs sm:text-sm font-semibold leading-snug ${myTurn ? 'text-amber-300' : 'text-amber-50'}`}>{status}</span>
        {p.phase === 'TURN' && turnFrac != null && <span className="mt-1.5 h-1 w-28 rounded-full bg-white/10 overflow-hidden"><span className="block h-full bg-amber-400 transition-[width] duration-200" style={{ width: `${turnFrac * 100}%` }} /></span>}
      </div>

      <AnimatePresence>
        {p.phase === 'REVEAL' && r && (
          <motion.div key="rv" initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-[18%] flex flex-col items-center gap-1">
            <span className="lb-title text-5xl sm:text-6xl text-red-500 whitespace-nowrap drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">MENTEUR !</span>
            <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + r.cards.length * 0.3 }}
              className={`lb-title whitespace-nowrap text-2xl px-3 rounded ${r.devil ? 'bg-red-700' : r.lie ? 'bg-red-600/90' : 'bg-emerald-600/90'} text-white`}>
              {r.devil ? '😈 CARTE DU DIABLE !' : r.lie ? `${person(r.by).pseudo} A MENTI` : `${person(r.by).pseudo} DISAIT VRAI`}
            </motion.span>
          </motion.div>
        )}
        {shot && (
          <motion.div key={`sh-${shot.startedAt}`} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className={`absolute top-3 right-3 flex items-center gap-3 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-sm ${revealed && shot.fired ? 'lb-shake' : ''}`}>
            <Avatar id={person(shot.playerId).avatar} size="md" className={revealed && shot.fired ? 'grayscale' : ''} />
            <div className="text-left">
              <p className="font-bold text-amber-50">{person(shot.playerId).pseudo} · balle n°{shot.chamber + 1}</p>
              {!revealed ? <p className="text-xs text-amber-100/80">1 chance sur {6 - shot.chamber}…</p>
                : shot.fired ? <p className="lb-title text-4xl text-red-500 leading-none">BANG</p>
                  : <p className="lb-title text-3xl text-emerald-300 leading-none">*clic*</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* actions, au-dessus de ta main */}
      <div className="mt-auto mb-[30%] sm:mb-[25%] flex items-center gap-3">
        {canAccuse && (
          <motion.button type="button" onClick={onLiar} whileTap={{ scale: 0.92 }}
            animate={p.mustAccuse && myTurn ? { scale: [1, 1.07, 1] } : {}} transition={{ repeat: Infinity, duration: 1.1 }}
            className="lb-action lb-action-liar">Menteur !</motion.button>
        )}
        {myTurn && !p.mustAccuse && (
          <button type="button" onClick={onPlay} disabled={!selected.length} className="lb-action lb-action-play whitespace-nowrap">
            {selected.length ? `Poser ${selected.length} ${selected.length > 1 ? tableCard?.plural : tableCard?.name}` : 'Choisis tes cartes'}
          </button>
        )}
      </div>

      {/* c'est toi qui as le canon sur la tempe : bords de l'écran qui s'assombrissent au rythme du cœur */}
      {shot && shot.playerId === playerId && !revealed && (
        <motion.div className="absolute inset-0" style={{ background: 'radial-gradient(75% 65% at 45% 50%, transparent 35%, rgba(0,0,0,0.85) 100%)' }}
          animate={{ opacity: [0.65, 1, 0.65] }} transition={{ repeat: Infinity, duration: 0.8 }} />
      )}
      {revealed && shot?.fired && shot.playerId === playerId && (
        <motion.div className="absolute inset-0 flex items-center justify-center bg-black" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.92] }} transition={{ duration: 1.6, times: [0, 0.4, 1] }}>
          <motion.span className="lb-title text-5xl text-red-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>Tu es mort</motion.span>
        </motion.div>
      )}
      {revealed && !shot?.fired && shot?.playerId === playerId && (
        <motion.p className="absolute top-1/3 lb-title text-4xl text-emerald-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]" initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: [0, 1, 1, 0], scale: 1 }} transition={{ duration: 2 }}>Ouf… tu survis</motion.p>
      )}
      {revealed && shot?.fired && <motion.div className="absolute inset-0 bg-red-700" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 1.4 }} />}
      {revealed && shot?.fired && shot.playerId && person(shot.playerId) && <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.35, 0] }} transition={{ duration: 2.2 }} />}
    </div>
  );
}

function VolumeControls({ vols }) {
  return (
    <span className="flex items-center gap-2">
      <label className="flex items-center gap-1" title={vols.missing ? 'Ambiance du bar' : 'Musique'}>
        🎵<input type="range" min="0" max="1" step="0.05" value={vols.music} onChange={(e) => setVolume('music', Number(e.target.value))} className="w-16 accent-amber-400" aria-label="Volume de l'ambiance" />
      </label>
      <label className="flex items-center gap-1" title="Bruitages">
        🔊<input type="range" min="0" max="1" step="0.05" value={vols.sfx} onChange={(e) => setVolume('sfx', Number(e.target.value))} className="w-16 accent-amber-400" aria-label="Volume des bruitages" />
      </label>
    </span>
  );
}

function GameOver({ p, isHost, playerId }) {
  const winner = (p.ranking || [])[0];
  return (
    <div className="lb-shell space-y-4 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Dernier survivant</p>
      {winner ? (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2">
          <Avatar id={winner.avatar} size="xl" className="lb-glow" />
          <p className="lb-title text-5xl text-amber-300">🥃 {winner.pseudo}</p>
          {winner.id === playerId && <p className="text-amber-100">Tu as survécu au bar !</p>}
        </motion.div>
      ) : <p className="lb-title text-4xl">Personne n'a survécu…</p>}
      <ol className="max-w-sm mx-auto space-y-1 text-left">
        {(p.ranking || []).map((r) => (
          <li key={r.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${r.id === playerId ? 'bg-amber-500/20' : 'bg-black/30'}`}>
            <span className="w-5 text-center font-bold text-amber-200">{r.rank}</span>
            <Avatar id={r.avatar} size="xs" className={r.rank === 1 ? '' : 'grayscale'} />
            <span className="flex-1 truncate">{r.pseudo}</span>
            <span className="text-xs text-slate-400">{r.rank === 1 ? 'survivant' : `💀 au ${r.shots}ᵉ tir`}</span>
          </li>
        ))}
      </ol>
      {isHost ? (
        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
          <button type="button" onClick={() => { unlockSound(); api.gameAction('restart'); }} className="btn btn-primary">🔁 Rejouer</button>
          <button type="button" onClick={() => api.gameAction('endGame')} className="btn btn-ghost">🏠 Retour au salon</button>
        </div>
      ) : <p className="text-sm text-slate-400">L'hôte peut relancer une partie.</p>}
    </div>
  );
}
