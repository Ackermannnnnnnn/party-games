import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';

const ROLES = {
  civil:    { label: 'Civil',     icon: '✅', cls: 'bg-emerald-500/20 text-emerald-300' },
  imposter: { label: 'Imposteur', icon: '😈', cls: 'bg-rose-500/20 text-rose-300' },
  mr_white: { label: 'Mr White',  icon: '🎩', cls: 'bg-amber-500/20 text-amber-300' },
};

const REASONS = {
  ALL_FOUND:        'Le vote a visé juste.',
  TIE:              "Égalité au vote : les imposteurs s'en sortent.",
  NO_VOTE:          "Personne n'a été éliminé : les imposteurs s'en sortent.",
  CIVIL_ELIMINATED: 'Un civil a été éliminé à tort.',
  PARTIAL:          "Tous les coupables n'ont pas été démasqués.",
  MR_WHITE_GUESSED: 'Éliminé, il a quand même trouvé le mot des civils.',
};

/** Est-ce que le joueur ayant ce rôle fait partie des gagnants ? */
function hasWon(role, winner) {
  if (winner === 'civils')   return role === 'civil';
  if (winner === 'mr_white') return role === 'mr_white';
  if (winner === 'imposter') return role === 'imposter' || role === 'mr_white';
  return false;
}

/**
 * Fin de partie : on montre toujours le gagnant, le détail du vote,
 * les mots et le rôle de chaque joueur (même en cas d'égalité).
 */
export default function PhaseResults() {
  const { gameState, room, playerId } = useGameStore();
  const r = gameState?.public?.result;
  if (!r) return null;

  const isHost = playerId === room.hostId;
  const roles = r.roles || [];
  const byId = (id) => roles.find((x) => x.id === id);
  const badCount = roles.filter((x) => x.role !== 'civil').length;
  const myRole = gameState?.private?.role;

  const winnerLabel = r.winner === 'civils'   ? '🎉 Les civils ont gagné !'
                    : r.winner === 'mr_white' ? '🎩 Mr White gagne SEUL !'
                    : r.winner === 'imposter' ? (badCount > 1 ? '😈 Les imposteurs ont gagné !' : "😈 L'imposteur a gagné !")
                    : '🚪 Partie interrompue';

  /** Une ligne par vote : qui a été éliminé, ou pourquoi personne ne l'a été. */
  const voteLine = (label, eliminatedId, tied) => {
    const e = byId(eliminatedId);
    return (
      <p>
        <span className="text-slate-400">{label} : </span>
        {e ? (
          <>
            <strong>{e.pseudo}</strong> est éliminé —{' '}
            <span className={e.role === 'civil' ? 'text-emerald-300' : 'text-rose-300'}>
              c'était {e.role === 'civil' ? 'un civil 😱' : e.role === 'mr_white' ? 'Mr White 🎯' : 'un imposteur 🎯'}
            </span>
          </>
        ) : (
          <span className="text-slate-200">{tied ? "égalité, personne n'est éliminé ⚖️" : "aucun vote, personne n'est éliminé"}</span>
        )}
      </p>
    );
  };

  return (
    <div className="card text-center space-y-6 py-8">
      <h2 className="font-display text-3xl text-brand-light">Résultats</h2>

      {/* Gagnant */}
      <div className="bg-slate-900/60 rounded-xl p-5 space-y-2">
        <p className="text-2xl font-bold">{winnerLabel}</p>
        <p className="text-slate-300">
          {r.aborted ? 'Un joueur a quitté la partie : elle ne peut pas continuer.' : REASONS[r.reason]}
        </p>
        {!r.aborted && myRole && (
          <p className={`text-sm font-semibold ${hasWon(myRole, r.winner) ? 'text-emerald-300' : 'text-rose-300'}`}>
            {hasWon(myRole, r.winner) ? 'Tu as gagné 🏆' : 'Tu as perdu'}
          </p>
        )}
      </div>

      {/* Détail du vote */}
      {!r.aborted && (
        <div className="space-y-1 text-lg">
          {voteLine(r.mrWhiteActive ? 'Vote imposteur' : 'Vote', r.eliminatedAsImposter, r.tiedImposter)}
          {r.mrWhiteActive && voteLine('Vote Mr White', r.eliminatedAsMrWhite, r.tiedMrWhite)}
          {r.mrWhiteGuess !== undefined && (
            <p className="text-base pt-1">
              🎩 Devinette de Mr White :{' '}
              <strong className={r.mrWhiteGuessCorrect ? 'text-emerald-300' : 'text-rose-300'}>
                « {r.mrWhiteGuess || '(pas de réponse)'} »
              </strong>
              {r.mrWhiteGuessCorrect ? ' ✅ Correct' : ' ❌ Faux'}
            </p>
          )}
        </div>
      )}

      {/* Mots */}
      <p className="text-slate-300">
        Mot des civils : <span className="font-mono text-emerald-300">{r.civilWord}</span><br />
        Mot des imposteurs : <span className="font-mono text-rose-300">{r.imposterWord}</span>
      </p>

      {/* Rôles de tous les joueurs */}
      <div className="text-left">
        <h3 className="font-semibold mb-2 text-center">Qui était qui ?</h3>
        <ul className="space-y-1.5">
          {roles.map((p) => {
            const role = ROLES[p.role] || ROLES.civil;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 bg-slate-900/40 ${p.left ? 'opacity-50' : ''}`}
              >
                <Avatar id={p.avatar} size="sm" />
                <span className="font-medium truncate min-w-0 flex-1">
                  {p.pseudo}{p.id === playerId && ' (toi)'}
                  {p.left && <span className="text-xs text-slate-400 font-normal"> · a quitté</span>}
                </span>
                {p.eliminated && (
                  <span className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full shrink-0">éliminé</span>
                )}
                {!r.aborted && (
                  <span className="text-xs text-slate-400 shrink-0 tabular-nums" title="Votes reçus">
                    🗳️ {p.votesImposter}{r.mrWhiteActive && <> · 🎩 {p.votesMrWhite}</>}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${role.cls}`}>
                  {role.icon} {role.label}
                </span>
              </li>
            );
          })}
        </ul>
        {!r.aborted && r.mrWhiteActive && (
          <p className="text-xs text-slate-500 text-center mt-2">
            🗳️ votes reçus comme imposteur · 🎩 votes reçus comme Mr White
          </p>
        )}
      </div>

      {/* Suite : nouvelle partie ou retour au lobby */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
        {isHost ? (
          <>
            <button className="btn btn-primary" onClick={() => api.gameAction('nextMatch', {})}>
              ▶ Nouvelle partie
            </button>
            <button className="btn btn-ghost" onClick={() => api.gameAction('endGame', {})}>
              🏠 Retour au lobby
            </button>
          </>
        ) : (
          <p className="text-slate-400 italic text-sm self-center">En attente de l'hôte…</p>
        )}
      </div>
    </div>
  );
}
