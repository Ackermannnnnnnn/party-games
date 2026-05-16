import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';

export default function PhaseResults() {
  const { gameState, room, playerId } = useGameStore();
  const r = gameState?.public?.result;
  if (!r) return null;

  const isHost = playerId === room.hostId;
  const eliminated = room.players.find((p) => p.id === r.eliminatedId);
  const imposters  = (r.imposterIds || [])
    .map((id) => room.players.find((p) => p.id === id))
    .filter(Boolean);

  const winnerLabel = r.winner === 'imposter'  ? '😈 Les imposteurs ont gagné !'
                    : r.winner === 'civils'    ? '🎉 Les civils ont gagné !'
                    : r.winner === 'mr_white'  ? '🎩 Mr WHITE a deviné — il gagne SEUL !'
                    : '⚖️ Égalité — personne n\'est éliminé.';

  return (
    <div className="card text-center space-y-6 py-8">
      <h2 className="font-display text-3xl text-brand-light">Résultats</h2>

      {eliminated ? (
        <p className="text-xl">
          <strong>{eliminated.pseudo}</strong> a été éliminé
          {r.eliminatedWasImposter !== null && (
            r.eliminatedWasImposter
              ? <span className="text-rose-300"> — c'était un imposteur ! 🎯</span>
              : <span className="text-emerald-300"> — c'était un civil 😱</span>
          )}.
        </p>
      ) : (
        <p className="text-xl">Aucun joueur éliminé (égalité).</p>
      )}

      {r.gameOver && (
        <div className="bg-slate-900/60 rounded-xl p-5 space-y-2">
          <p className="text-2xl font-bold">{winnerLabel}</p>
          <p className="text-slate-300">
            {imposters.length > 1 ? 'Les imposteurs étaient' : "L'imposteur était"} :{' '}
            <strong className="text-brand-light">
              {imposters.map(p => p.pseudo).join(', ')}
            </strong>
          </p>
          <p className="text-slate-300">
            Mot des civils : <span className="font-mono text-emerald-300">{r.civilWord}</span><br />
            Mot des imposteurs : <span className="font-mono text-rose-300">{r.imposterWord}</span>
          </p>
          {r.mrWhiteId && (
            <p className="text-slate-300 mt-2 pt-2 border-t border-slate-700">
              🎩 Mr White : <strong className="text-amber-300">{room.players.find(p => p.id === r.mrWhiteId)?.pseudo}</strong>
              {r.mrWhiteGuess !== undefined && (
                <span className="block text-sm mt-1">
                  Sa devinette : <strong className={r.mrWhiteGuessCorrect ? 'text-emerald-300' : 'text-rose-300'}>
                    "{r.mrWhiteGuess || '(vide)'}"
                  </strong>
                  {r.mrWhiteGuessCorrect ? ' ✅ Correct' : ' ❌ Faux'}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {!r.gameOver && (
        <p className="text-slate-300 italic">
          La partie continue ! L'hôte peut lancer la prochaine manche.
        </p>
      )}

      {/* Cas spécial : ÉGALITÉ → 3 choix pour l'hôte */}
      {r.tied && !r.gameOver ? (
        isHost ? (
          <div className="space-y-2 pt-2">
            <p className="text-center text-slate-300 text-sm">⚖️ Égalité : que faire ?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button className="btn btn-primary" onClick={() => api.gameAction('revote', {})}>
                🔁 Re-voter (mêmes mots)
              </button>
              <button className="btn btn-ghost" onClick={() => api.gameAction('newWord', {})}>
                🆕 Nouveau mot
              </button>
              <button className="btn btn-ghost" onClick={() => api.gameAction('endGame', {})}>
                🏠 Retour au lobby
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-400 italic text-sm pt-2">L'hôte décide quoi faire après l'égalité…</p>
        )
      ) : (
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          {isHost && !r.gameOver && (
            <button className="btn btn-primary" onClick={() => api.gameAction('nextMatch', {})}>
              ▶ Prochaine manche
            </button>
          )}
          {isHost && r.gameOver && (
            <button className="btn btn-primary" onClick={() => api.gameAction('endGame', {})}>
              🔄 Retour au lobby (mêmes joueurs)
            </button>
          )}
          {isHost && !r.gameOver && (
            <button className="btn btn-ghost" onClick={() => api.gameAction('endGame', {})}>
              🛑 Stopper la partie
            </button>
          )}
          {!isHost && (
            <p className="text-slate-400 italic text-sm self-center">En attente de l'hôte…</p>
          )}
        </div>
      )}
    </div>
  );
}
