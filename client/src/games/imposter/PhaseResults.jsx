import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import { Scoreboard } from './ImposterGame.jsx';

const ROLES = {
  civil:    { label: 'Civil',     icon: '✅', cls: 'bg-emerald-500/20 text-emerald-200' },
  imposter: { label: 'Imposteur', icon: '😈', cls: 'bg-rose-500/25 text-rose-200' },
  mr_white: { label: 'Mr White',  icon: '🎩', cls: 'bg-amber-500/25 text-amber-200' },
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

export default function PhaseResults() {
  const { gameState, room, playerId } = useGameStore();
  const pub = gameState?.public || {};
  const r = pub.result;
  if (!r) return null;

  const isHost = playerId === room.hostId;
  const roles = r.roles || [];
  const byId = (id) => roles.find((x) => x.id === id);
  const name = (id) => byId(id)?.pseudo || '?';
  const badCount = roles.filter((x) => x.role !== 'civil').length;
  const myRole = gameState?.private?.role;
  const won = !r.aborted && myRole && hasWon(myRole, r.winner);

  const banner = r.winner === 'civils' ? { icon: '🎉', title: 'Les civils gagnent !', color: 'from-emerald-500/30 to-emerald-900/10 border-emerald-400/50' }
    : r.winner === 'mr_white' ? { icon: '🎩', title: 'Mr White gagne seul !', color: 'from-amber-500/30 to-amber-900/10 border-amber-400/50' }
    : r.winner === 'imposter' ? { icon: '😈', title: badCount > 1 ? 'Les imposteurs gagnent !' : "L'imposteur gagne !", color: 'from-rose-500/30 to-rose-900/10 border-rose-400/50' }
    : { icon: '🚪', title: 'Partie interrompue', color: 'from-slate-500/20 to-slate-900/10 border-slate-400/40' };

  const voteLine = (label, eliminatedId, tied) => {
    const e = byId(eliminatedId);
    return (
      <p>
        <span className="text-slate-400">{label} : </span>
        {e ? (
          <><strong>{e.pseudo}</strong> est éliminé —{' '}
            <span className={e.role === 'civil' ? 'text-rose-300' : 'text-emerald-300'}>
              c'était {e.role === 'civil' ? 'un civil 😱' : e.role === 'mr_white' ? 'Mr White 🎯' : 'un imposteur 🎯'}
            </span></>
        ) : <span>{tied ? "égalité, personne n'est éliminé ⚖️" : "personne n'est éliminé"}</span>}
      </p>
    );
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120 }}
        className={`rounded-2xl border bg-gradient-to-b ${banner.color} p-5 text-center space-y-2`}>
        <div className="text-6xl" aria-hidden="true">{banner.icon}</div>
        <p className="imp-title text-4xl sm:text-5xl leading-none">{banner.title}</p>
        <p className="text-slate-200 text-sm">{r.aborted ? 'Un joueur indispensable a quitté la partie.' : REASONS[r.reason]}</p>
        {!r.aborted && myRole && (
          <p className={`inline-block rounded-full px-4 py-1 text-sm font-bold ${won ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
            {won ? '🏆 Tu as gagné' : '💀 Tu as perdu'}{r.points?.[playerId] ? ` · +${r.points[playerId]} pt${r.points[playerId] > 1 ? 's' : ''}` : ''}
          </p>
        )}
      </motion.div>

      {/* Les deux mots */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-emerald-300">Mot des civils</p>
          <p className="imp-title text-3xl sm:text-4xl break-words">{r.civilWord}</p>
        </div>
        <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-rose-300">Mot de l'imposteur</p>
          <p className="imp-title text-3xl sm:text-4xl break-words">{r.imposterWord}</p>
        </div>
      </div>
      {r.themeLabel && <p className="text-center text-xs text-slate-400 -mt-2">Thème : {r.themeLabel}</p>}

      {!r.aborted && (
        <div className="imp-panel p-4 space-y-1 text-sm sm:text-base">
          {voteLine(r.mrWhiteActive ? 'Vote imposteur' : 'Vote', r.eliminatedAsImposter, r.tiedImposter)}
          {r.mrWhiteActive && voteLine('Vote Mr White', r.eliminatedAsMrWhite, r.tiedMrWhite)}
          {r.mrWhiteGuess !== undefined && (
            <p>🎩 Mr White propose{' '}
              <strong className={r.mrWhiteGuessCorrect ? 'text-emerald-300' : 'text-rose-300'}>« {r.mrWhiteGuess || '(rien)'} »</strong>
              {r.mrWhiteGuessCorrect ? ' ✅' : ' ❌'}
            </p>
          )}
        </div>
      )}

      {/* Qui était qui, et qui a voté contre qui */}
      <div className="space-y-2">
        <p className="imp-title text-2xl text-center">Qui était qui ?</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {roles.map((p, i) => {
            const role = ROLES[p.role] || ROLES.civil;
            const vote = r.votesBy?.[p.id];
            return (
              <motion.li key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className={`rounded-2xl px-3 py-2 border ${p.role === 'civil' ? 'border-white/10 bg-white/[0.04]' : 'border-rose-400/40 bg-rose-500/10'} ${p.left ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <Avatar id={p.avatar} size="sm" />
                  <span className="font-semibold truncate flex-1">{p.pseudo}{p.id === playerId ? ' (toi)' : ''}</span>
                  {p.eliminated && <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-full">éliminé</span>}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${role.cls}`}>{role.icon} {role.label}</span>
                </div>
                {!r.aborted && (
                  <p className="text-[11px] text-slate-400 mt-1 pl-10">
                    {vote ? <>a voté 😈 {name(vote.imposter)}{vote.mrWhite ? <> · 🎩 {name(vote.mrWhite)}</> : null}</> : "n'a pas voté"}
                    {' · '}reçu {p.votesImposter + (p.votesMrWhite || 0)} vote{p.votesImposter + (p.votesMrWhite || 0) > 1 ? 's' : ''}
                    {r.points?.[p.id] > 0 && <span className="text-emerald-300 font-bold"> · +{r.points[p.id]} pt{r.points[p.id] > 1 ? 's' : ''}</span>}
                  </p>
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="imp-panel p-4">
        <p className="imp-title text-2xl text-center mb-2">🏆 Classement</p>
        <Scoreboard scores={pub.scores} playerId={playerId} gained={r.points || {}} />
        <p className="text-[11px] text-slate-500 text-center mt-2">+1 par vote juste · civils gagnants +2 · imposteurs gagnants +3 · Mr White qui devine +5</p>
      </div>

      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button type="button" className="btn btn-primary text-lg" onClick={() => api.gameAction('nextMatch', {})}>▶ Partie suivante</button>
          <button type="button" className="btn btn-ghost" onClick={() => api.gameAction('endGame', {})}>🏠 Retour au salon</button>
        </div>
      ) : <p className="text-center text-slate-400 italic text-sm">L'hôte lance la partie suivante…</p>}
    </div>
  );
}
