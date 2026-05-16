import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';
import Timer from '../../components/Timer.jsx';

/**
 * Phase de devinette du Mr White (uniquement pour lui).
 * Les autres joueurs voient un écran d'attente dramatique.
 */
export default function PhaseMrWhiteGuess() {
  const { gameState, room } = useGameStore();
  const isMe = gameState?.private?.isMrWhite;
  const mrWhitePlayer = room.players.find(p => p.id === gameState?.public?.mrWhiteId);
  const [guess, setGuess] = useState('');

  if (!isMe) {
    return (
      <div className="card text-center py-12 space-y-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl"
        >🎩</motion.div>
        <h2 className="font-display text-2xl text-amber-300">Mr White a été éliminé !</h2>
        <p className="text-slate-300">
          {mrWhitePlayer?.pseudo || '?'} était <strong className="text-rose-300">Mr White</strong> et n'a jamais connu le mot…
        </p>
        <p className="text-slate-400 text-sm italic">Il a une chance de deviner pour gagner. Patience.</p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;
    api.gameAction('mrWhiteGuess', { guess: guess.trim() });
  };

  return (
    <div className="card text-center py-10 space-y-5">
      <div className="text-6xl">🎩</div>
      <h2 className="font-display text-2xl sm:text-3xl text-rose-300">Tu es éliminé, Mr White !</h2>
      <p className="text-slate-300">
        Mais tu as une dernière chance : <strong>devine le mot des civils</strong>.
      </p>
      <p className="text-amber-300 text-sm">Si tu trouves, tu gagnes la partie SEUL contre tout le monde.</p>

      <form onSubmit={submit} className="flex flex-col gap-2 max-w-sm mx-auto">
        <input
          autoFocus
          value={guess}
          onChange={(e) => setGuess(e.target.value.slice(0, 60))}
          placeholder="Tape ta devinette…"
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          maxLength={60}
        />
        <button type="submit" disabled={!guess.trim()} className="btn btn-primary disabled:opacity-50">
          🎯 Soumettre ma devinette
        </button>
      </form>

      <p className="text-xs text-slate-500">⏱ Casse, accents et ponctuation ignorés.</p>
    </div>
  );
}
