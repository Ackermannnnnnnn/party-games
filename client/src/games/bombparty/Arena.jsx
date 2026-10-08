import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../../components/Avatar.jsx';
import Bomb from './Bomb.jsx';

/** Met en évidence la syllabe dans le texte tapé. */
export function Highlight({ text, syllable }) {
  if (!text) return <span className="opacity-40">…</span>;
  const lower = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const i = syllable ? lower.indexOf(syllable) : -1;
  if (i < 0 || lower.length !== text.length) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <span className="text-orange-400">{text.slice(i, i + syllable.length)}</span>
      {text.slice(i + syllable.length)}
    </span>
  );
}

export function Hearts({ lives, max, size = 'text-sm' }) {
  return (
    <span className={`${size} leading-none tracking-tight`} aria-label={`${lives} vie${lives > 1 ? 's' : ''}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < lives ? '' : 'opacity-20 grayscale'}>❤️</span>
      ))}
    </span>
  );
}

/**
 * Les joueurs en cercle autour de la bombe. Celui qui l'a brille, et ce qu'il tape
 * s'affiche en direct sous son avatar.
 */
export default function Arena({ state, playerId, flash }) {
  const players = state.players || [];
  const n = players.length;
  const holderIndex = players.findIndex((p) => p.id === state.holderId);
  const angleOf = (i) => (i / n) * 360 - 90;
  const compact = n > 6;

  return (
    <div className="relative w-full max-w-[560px] mx-auto aspect-square">
      {/* Bombe au centre */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {state.phase === 'PLAYING' ? (
          <Bomb
            syllable={state.syllable}
            bombStartedAt={state.bombStartedAt}
            angle={holderIndex >= 0 ? angleOf(holderIndex) + 90 : null}
            size={compact ? 130 : 150}
          />
        ) : (
          <div className="text-7xl">💣</div>
        )}
      </div>

      {/* Sièges */}
      {players.map((p, i) => {
        const a = (angleOf(i) * Math.PI) / 180;
        const r = 40;
        const isHolder = p.id === state.holderId;
        const isMe = p.id === playerId;
        const flashing = flash && flash.playerId === p.id ? flash.type : null;
        return (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
            style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%`, width: compact ? 84 : 110 }}
          >
            <motion.div
              className={`relative ${isHolder ? 'bp-holder' : ''} ${!p.alive ? 'grayscale opacity-40' : ''}`}
              animate={flashing === 'boom' ? { scale: [1, 1.35, 0.9, 1] } : flashing === 'ok' || flashing === 'bonus' ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.45 }}
            >
              <Avatar id={p.avatar} size={compact ? 'sm' : 'md'} />
              {!p.alive && <span className="absolute -top-2 -right-2 text-lg">💀</span>}
            </motion.div>
            <span className={`mt-1 text-xs font-semibold truncate max-w-full ${isMe ? 'text-orange-300' : 'text-slate-200'}`}>
              {p.pseudo}{isMe && ' (toi)'}
            </span>
            <Hearts lives={p.lives} max={state.maxLives} size={compact ? 'text-[10px]' : 'text-xs'} />
            <AnimatePresence>
              {isHolder && state.phase === 'PLAYING' && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-1 px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 font-mono font-bold text-sm max-w-[160px] truncate ${
                    flashing === 'fail' ? 'bp-shake text-rose-300 border-rose-400/60' : 'text-white'
                  }`}
                >
                  <Highlight text={state.input} syllable={state.syllable} />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {(flashing === 'ok' || flashing === 'bonus') && (
                <motion.span
                  key={`ok-${flash.seq}`}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -28 }}
                  transition={{ duration: 1.1 }}
                  className="absolute -top-3 text-emerald-300 font-black text-sm whitespace-nowrap"
                >
                  {flashing === 'bonus' ? '+1 ❤️' : '✓'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
