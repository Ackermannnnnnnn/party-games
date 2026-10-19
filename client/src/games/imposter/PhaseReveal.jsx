import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';

const ROLE_INFO = {
  imposter: { cls: 'bg-rose-500/20 text-rose-200 border-rose-400/40', text: "😈 Tu es l'IMPOSTEUR. Ton mot est différent : fonds-toi dans la masse !" },
  civil: { cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40', text: '✅ Tu es CIVIL. Trouve l\'imposteur sans trop dévoiler le mot.' },
  unknown: { cls: 'bg-amber-500/15 text-amber-200 border-amber-400/40', text: '🎭 Mode hardcore : personne ne sait s\'il est civil ou imposteur. Écoute bien les autres !' },
};

export default function PhaseReveal() {
  const { gameState, room, playerId } = useGameStore();
  const [flipped, setFlipped] = useState(false);
  const pub = gameState?.public || {};
  const priv = gameState?.private || {};
  const { word, role } = priv;
  const fellow = priv.fellowImposters || [];
  const opts = pub.options || {};
  const ready = new Set(pub.readyIds || []);
  const iAmReady = ready.has(playerId);
  const dontKnowIds = pub.dontKnowIds || [];
  const iSaidDontKnow = dontKnowIds.includes(playerId);
  const players = (pub.speakingOrder || []).map((id) => room.players.find((p) => p.id === id)).filter(Boolean);
  const [left, setLeft] = useState(0);

  useEffect(() => { setFlipped(false); }, [word]);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil(((pub.revealEndsAt || 0) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [pub.revealEndsAt]);

  const fellowNames = fellow.map((id) => room.players.find((p) => p.id === id)?.pseudo).filter(Boolean);
  const isMrWhite = role === 'mr_white';
  const info = ROLE_INFO[role];

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-xs text-slate-400 text-center">
        {opts.imposterCount > 1 ? `${opts.imposterCount} imposteurs` : '1 imposteur'}
        {opts.mrWhiteEnabled && ' · 🎩 Mr White'}
        {opts.mrWhiteRequested && !opts.mrWhiteEnabled && ' · sans Mr White (4 joueurs min.)'}
        {' · '}{opts.clueMode === 'oral' ? '🗣️ indices à voix haute' : '⌨️ indices écrits'}
        {!opts.imposterKnows && ' · 🎭 hardcore'}
      </p>

      <button type="button" onClick={() => setFlipped((f) => !f)} className="lg-flip w-56 sm:w-64 aspect-[5/6] block" style={{ minHeight: 0 }}
        aria-label={flipped ? 'Cacher mon mot' : 'Découvrir mon mot'}>
        <div className={`lg-flip-inner ${flipped ? 'is-flipped' : ''}`}>
          <div className="lg-face">
            <div className="imp-card-back flex flex-col items-center justify-center gap-3">
              <span className="text-6xl drop-shadow-lg" aria-hidden="true">🕵️</span>
              <span className="imp-title text-2xl tracking-widest">TOP SECRET</span>
              <span className="text-xs text-rose-100/80 px-6 text-center">Touche pour découvrir ton mot (cache bien ton écran)</span>
            </div>
          </div>
          <div className="lg-face lg-face-front">
            <div className="imp-card-front flex flex-col items-center justify-center gap-2 p-4 text-center">
              {isMrWhite ? (
                <>
                  <span className="text-6xl" aria-hidden="true">🎩</span>
                  <span className="imp-title text-4xl text-amber-200">Mr White</span>
                  <span className="text-xs text-slate-300">Tu n'as pas de mot. Bluffe !</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-violet-200/80">Ton mot</span>
                  <span className={`imp-word leading-none break-words max-w-full ${String(word).length > 12 ? 'text-4xl' : 'text-5xl sm:text-6xl'}`}>{word}</span>
                  <span className="text-[11px] text-slate-400 mt-2">Touche pour cacher</span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      {flipped && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-2 text-center">
          {isMrWhite && (
            <p className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-100">
              🎩 Écoute les indices des autres pour deviner le mot. Si tu es éliminé, tu pourras tenter de le deviner pour gagner seul !
            </p>
          )}
          {info && <p className={`rounded-xl border px-4 py-2 text-sm ${info.cls}`}>{info.text}</p>}
          {role === 'imposter' && fellowNames.length > 0 && <p className="text-rose-200 text-sm">Tes complices : <strong>{fellowNames.join(', ')}</strong></p>}
        </motion.div>
      )}

      <div className="flex flex-col items-center gap-2">
        <button type="button" className="btn btn-primary text-lg disabled:opacity-50" disabled={iAmReady || !flipped}
          onClick={() => { setFlipped(false); api.gameAction('ready', {}); }}>
          {iAmReady ? '✓ Prêt !' : flipped ? "J'ai retenu mon mot" : "Découvre d'abord ton mot"}
        </button>
        <div className="flex -space-x-2" aria-label="Joueurs prêts">
          {players.map((p) => (
            <span key={p.id} className={`rounded-full ring-2 ring-slate-900 transition ${ready.has(p.id) ? '' : 'opacity-30 grayscale'}`} title={p.pseudo}>
              <Avatar id={p.avatar} size="sm" />
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400">{ready.size}/{players.length} prêts · on commence dans {left}s au plus tard</p>
      </div>

      {!isMrWhite && (
        <div className="text-center space-y-1">
          {!iSaidDontKnow ? (
            <button type="button" onClick={() => api.gameAction('dontKnowWord', {})} className="text-xs text-slate-300 underline decoration-dotted" style={{ minHeight: 0 }}>
              🤷 Je ne connais pas ce mot
            </button>
          ) : <p className="text-amber-300 text-xs">✓ Tu as signalé ne pas connaître le mot.</p>}
          {dontKnowIds.length > 0 && (
            <p className="text-[11px] text-slate-400">{dontKnowIds.length}/{pub.dontKnowThreshold || 2} pour tirer un autre mot</p>
          )}
        </div>
      )}
    </div>
  );
}
