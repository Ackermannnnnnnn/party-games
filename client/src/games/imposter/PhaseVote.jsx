import { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';
import Avatar from '../../components/Avatar.jsx';

/**
 * Vote.
 * - Sans Mr White : un clic sur un joueur = vote "imposteur".
 * - Avec Mr White : on désigne DEUX joueurs différents (imposteur + Mr White), puis on valide.
 */
export default function PhaseVote() {
  const { gameState, room, playerId } = useGameStore();
  const [pickImp, setPickImp] = useState(null);
  const [pickMW, setPickMW] = useState(null);

  const pub = gameState?.public || {};
  const descriptions = pub.descriptions || {};
  const votedIds = new Set(pub.votedIds || []);
  const voterIds = pub.voterIds || [];
  const mrWhiteMode = !!pub.options?.mrWhiteEnabled;
  const myVote = gameState?.private?.myVote;
  const iVoted = votedIds.has(playerId);

  // Seuls les participants encore présents peuvent être désignés (pas les spectateurs)
  const players = (pub.speakingOrder || [])
    .map((id) => room.players.find((p) => p.id === id))
    .filter(Boolean);
  const nameOf = (id) => players.find((p) => p.id === id)?.pseudo || '?';

  // Un choix devient invalide si le joueur visé a quitté la partie entre-temps
  const impId = players.some((p) => p.id === pickImp) ? pickImp : null;
  const mwId  = players.some((p) => p.id === pickMW) ? pickMW : null;

  const choose = (kind, id) => {
    if (kind === 'imp') {
      setPickImp(id === impId ? null : id);
      if (mwId === id) setPickMW(null);
    } else {
      setPickMW(id === mwId ? null : id);
      if (impId === id) setPickImp(null);
    }
  };

  const confirmDouble = () => {
    if (!impId || !mwId) return;
    api.gameAction('castVote', { targetId: impId, mrWhiteTargetId: mwId });
  };

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-brand-light">🗳️ Vote</h2>
        {pub.voteEndsAt && <Timer endsAt={pub.voteEndsAt} />}
      </div>

      <p className="text-slate-300">
        {mrWhiteMode
          ? <>Désigne <strong className="text-rose-300">😈 l'imposteur</strong> et <strong className="text-amber-300">🎩 Mr White</strong> (deux joueurs différents).</>
          : "Qui pensez-vous est l'imposteur ?"}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {players.map((p) => {
          const isMe = p.id === playerId;
          const words = descriptions[p.id] || [];
          const disabled = iVoted || isMe;
          const selectedAs = p.id === impId ? 'imp' : p.id === mwId ? 'mw' : null;

          const header = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <Avatar id={p.avatar} size="sm" />
                  <span className="font-semibold truncate">{p.pseudo}{isMe && ' (toi)'}</span>
                </span>
                {votedIds.has(p.id) && <span className="text-xs text-slate-400 shrink-0">a voté</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {words.length === 0
                  ? <span className="text-sm italic text-slate-500">aucun mot</span>
                  : words.map((w, i) => (
                      <span key={i} className="text-xs bg-slate-800 px-2 py-0.5 rounded">
                        {w}
                      </span>
                    ))
                }
              </div>
            </>
          );

          // Vote simple : toute la carte est cliquable
          if (!mrWhiteMode) {
            return (
              <button
                key={p.id}
                disabled={disabled}
                onClick={() => api.gameAction('castVote', { targetId: p.id })}
                className={`text-left rounded-xl p-4 border transition-all ${
                  disabled
                    ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                    : 'bg-slate-900 border-slate-700 hover:border-brand hover:bg-slate-800'
                }`}
              >
                {header}
              </button>
            );
          }

          // Double vote : deux boutons par joueur
          return (
            <div
              key={p.id}
              className={`rounded-xl p-4 border transition-all ${
                selectedAs === 'imp' ? 'bg-rose-500/10 border-rose-400'
                : selectedAs === 'mw' ? 'bg-amber-500/10 border-amber-400'
                : 'bg-slate-900 border-slate-700'
              } ${disabled ? 'opacity-50' : ''}`}
            >
              {header}
              {!isMe && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={disabled}
                    aria-pressed={selectedAs === 'imp'}
                    onClick={() => choose('imp', p.id)}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold border transition-colors disabled:cursor-not-allowed ${
                      selectedAs === 'imp'
                        ? 'bg-rose-500 border-rose-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-rose-400'
                    }`}
                  >
                    😈 Imposteur
                  </button>
                  <button
                    disabled={disabled}
                    aria-pressed={selectedAs === 'mw'}
                    onClick={() => choose('mw', p.id)}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold border transition-colors disabled:cursor-not-allowed ${
                      selectedAs === 'mw'
                        ? 'bg-amber-500 border-amber-400 text-slate-900'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-400'
                    }`}
                  >
                    🎩 Mr White
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mrWhiteMode && !iVoted && (
        <div className="space-y-2">
          <p className="text-center text-sm text-slate-400">
            😈 {impId ? <strong className="text-rose-300">{nameOf(impId)}</strong> : '—'}
            {' · '}
            🎩 {mwId ? <strong className="text-amber-300">{nameOf(mwId)}</strong> : '—'}
          </p>
          <button
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!impId || !mwId}
            onClick={confirmDouble}
          >
            ✅ Valider mon vote
          </button>
        </div>
      )}

      {iVoted && (
        <p className="text-center text-emerald-300">
          Vote enregistré ✓
          {myVote && (
            <span className="block text-sm text-slate-300 mt-1">
              😈 {nameOf(myVote.imposter)}
              {myVote.mrWhite && <> · 🎩 {nameOf(myVote.mrWhite)}</>}
            </span>
          )}
        </p>
      )}

      {voterIds.length > 0 && (
        <p className="text-center text-xs text-slate-500">
          {voterIds.filter((id) => votedIds.has(id)).length}/{voterIds.length} ont voté
        </p>
      )}
    </div>
  );
}
