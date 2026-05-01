import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { motion } from 'framer-motion';

export default function PhaseReveal() {
  const { gameState, room, playerId } = useGameStore();
  const [revealed, setRevealed] = useState(false);

  const word    = gameState?.private?.word;
  const role    = gameState?.private?.role;
  const fellow  = gameState?.private?.fellowImposters || [];
  const round   = gameState?.public?.round;
  const opts    = gameState?.public?.options || {};
  const dontKnowIds = gameState?.public?.dontKnowIds || [];
  const iSaidDontKnow = dontKnowIds.includes(playerId);

  // Reset le state "révélé" quand le mot change (reroll)
  useEffect(() => { setRevealed(false); }, [word]);

  const fellowNames = fellow
    .map(id => room?.players?.find(p => p.id === id)?.pseudo)
    .filter(Boolean);

  return (
    <div className="card text-center py-8 sm:py-12">
      <p className="text-slate-400 mb-2 text-sm">Manche {round}</p>
      <h2 className="font-display text-2xl sm:text-3xl text-brand-light mb-2">Ton mot secret</h2>
      <p className="text-xs text-slate-500 mb-6 sm:mb-8">
        {opts.imposterCount > 1 && `${opts.imposterCount} imposteurs · `}
        {opts.imposterKnows ? 'mode normal' : 'mode hardcore (l\'imposteur ne sait pas)'}
      </p>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="btn btn-primary text-lg"
        >
          👁 Révéler mon mot
        </button>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-4"
        >
          <div className="text-4xl sm:text-5xl md:text-6xl font-display tracking-wider break-words px-2">{word}</div>

          {role === 'imposter' && (
            <>
              <div className="inline-block bg-rose-500/20 text-rose-300 px-4 py-2 rounded-full text-sm font-semibold">
                ⚠️ Tu es l'IMPOSTEUR. Bluffe pour ne pas te faire repérer.
              </div>
              {fellowNames.length > 0 && (
                <p className="text-rose-200 text-sm">
                  Tes complices : <strong>{fellowNames.join(', ')}</strong>
                </p>
              )}
            </>
          )}

          {role === 'civil' && (
            <div className="inline-block bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full text-sm font-semibold">
              ✅ Tu es un CIVIL. Trouve l'imposteur sans lui révéler le mot.
            </div>
          )}

          {role === 'unknown' && (
            <div className="inline-block bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full text-sm font-semibold">
              🎭 Mode hardcore : ton rôle reste secret. Mémorise ton mot.
            </div>
          )}

          {/* Bouton "Je ne connais pas" */}
          <div className="pt-2 space-y-2">
            {!iSaidDontKnow ? (
              <button
                onClick={() => api.gameAction('dontKnowWord', {})}
                className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg"
              >
                🤷 Je ne connais pas ce mot
              </button>
            ) : (
              <p className="text-amber-300 text-sm">✓ Tu as voté "je ne connais pas".</p>
            )}
            {dontKnowIds.length > 0 && (
              <p className="text-xs text-slate-400">
                {dontKnowIds.length} joueur{dontKnowIds.length > 1 ? 's' : ''} ne connai{dontKnowIds.length > 1 ? 'ssent' : 't'} pas le mot
                ({2 - dontKnowIds.length} de plus pour tirer un nouveau mot)
              </p>
            )}
          </div>

          <p className="text-slate-400 text-sm pt-4">Mémorise-le, on passe à la suite dans quelques secondes…</p>
        </motion.div>
      )}
    </div>
  );
}
