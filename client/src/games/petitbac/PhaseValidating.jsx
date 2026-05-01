import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';
import { motion } from 'framer-motion';

export default function PhaseValidating() {
  const { gameState, room, playerId } = useGameStore();
  const p = gameState?.public || {};
  const isHost = playerId === room.hostId;
  const categories = p.categories || [];
  const players = room.players;
  const allAnswers = p.allAnswers || {};
  const challenges = p.challenges || {};
  const hostJudgments = p.hostJudgments || {};
  const threshold = p.challengeThreshold || 1;
  const letter = p.currentLetter;
  const validationMode = p.options?.validationMode || 'collective';

  const isHostMode = validationMode === 'host';

  const isChallenged = (targetId, catId) => {
    const set = challenges[targetId]?.[catId] || [];
    return set.length >= threshold;
  };
  const isHostRejected = (targetId, catId) => !!hostJudgments[targetId]?.[catId];

  const onCellClick = (targetId, catId) => {
    if (targetId === playerId) return;
    if (isHostMode) {
      if (!isHost) return; // seul l'hôte peut juger
      api.gameAction('hostJudge', { targetId, category: catId });
    } else {
      api.gameAction('toggleChallenge', { targetId, category: catId });
    }
  };

  const isAnswerInvalidByLetter = (text) => {
    if (!text || text.trim().length < 2) return true;
    return text.trim()[0]?.toLowerCase() !== letter.toLowerCase();
  };

  const headerHint = isHostMode
    ? '👑 Mode "Maître du jeu" — clique sur les réponses pour les rejeter (toggle).'
    : `Clique pour contester. ${threshold} contestation${threshold > 1 ? 's' : ''} = rejeté.`;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs sm:text-sm text-slate-400">Manche {p.round} / {p.totalRounds}</p>
          <p className="font-display text-2xl sm:text-3xl text-brand-light">
            🗳️ Validation — Lettre {letter}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {p.validationEndsAt && <Timer endsAt={p.validationEndsAt} />}
          {isHost && (
            <button onClick={() => api.gameAction('forceScoring', {})} className="btn btn-primary text-sm px-3 py-2">
              🧮 Calculer les scores
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-300 text-center">
        {headerHint}
      </p>

      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-slate-900/40 rounded-xl p-3">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>{cat.icon}</span> {cat.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map(pl => {
                const text = (allAnswers[pl.id]?.[cat.id] || '').trim();
                const isMe = pl.id === playerId;
                const challengers = challenges[pl.id]?.[cat.id] || [];
                const challenged = isHostMode ? isHostRejected(pl.id, cat.id) : isChallenged(pl.id, cat.id);
                const myVote = challengers.includes(playerId);
                const autoInvalid = !!text && isAnswerInvalidByLetter(text);
                const empty = !text;
                const canClick = !isMe && !empty && (isHostMode ? isHost : true);

                // Réponse qui ne commence pas par la lettre = AUTO-REJETÉE (rouge fort)
                // Pas la peine de cliquer dessus, le serveur la rejette d'office.
                const finalRejected = challenged || autoInvalid;
                const cellClickable = canClick && !autoInvalid; // pas la peine de cliquer si déjà rejetée

                return (
                  <button
                    key={pl.id}
                    disabled={!cellClickable}
                    onClick={() => onCellClick(pl.id, cat.id)}
                    className={`text-left rounded-lg px-3 py-2 border transition ${
                      empty
                        ? 'bg-slate-800/40 border-slate-700 text-slate-500 italic cursor-not-allowed'
                        : isMe
                          ? autoInvalid
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-100 cursor-default'
                            : 'bg-brand/10 border-brand/40 cursor-default'
                          : finalRejected
                            ? 'bg-rose-500/20 border-rose-500 text-rose-100'
                            : myVote && !isHostMode
                              ? 'bg-rose-500/10 border-rose-400 text-rose-200'
                              : isHostMode && !isHost
                                ? 'bg-slate-800/60 border-slate-700 text-slate-200 cursor-default'
                                : 'bg-slate-800/60 border-slate-700 hover:border-rose-400 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 truncate">{pl.pseudo}{isMe && ' (toi)'}</p>
                        <p className={`font-semibold truncate ${autoInvalid ? 'line-through opacity-80' : ''}`}>
                          {empty ? '— vide —' : text}
                        </p>
                      </div>
                      {autoInvalid && !empty && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white whitespace-nowrap">
                          ✗ pas en {letter}
                        </span>
                      )}
                      {!autoInvalid && !empty && !isHostMode && challengers.length > 0 && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            challenged ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          ⚠ {challengers.length}/{threshold}
                        </motion.span>
                      )}
                      {!autoInvalid && !empty && isHostMode && challenged && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white">
                          ✗ rejeté
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
