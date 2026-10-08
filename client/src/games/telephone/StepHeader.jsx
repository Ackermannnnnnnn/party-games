import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';

/** En-tête commun aux étapes : numéro d'étape, minuteur, avancement des joueurs. */
export default function StepHeader({ icon, title }) {
  const { gameState, room, playerId } = useGameStore();
  const pub = gameState?.public || {};
  const doneIds = new Set(pub.doneIds || []);
  const required = pub.requiredIds || [];
  const doneCount = required.filter((id) => doneIds.has(id)).length;
  const isHost = playerId === room.hostId;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Étape {pub.step + 1} / {pub.totalSteps}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-brand-light truncate">{icon} {title}</h2>
        </div>
        {pub.stepEndsAt && <Timer endsAt={pub.stepEndsAt} />}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-1.5 w-24 sm:w-40 rounded-full bg-slate-700 overflow-hidden shrink-0">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${required.length ? (doneCount / required.length) * 100 : 0}%` }}
            />
          </div>
          <span className="truncate">{doneCount}/{required.length} ont terminé</span>
        </div>
        {isHost && (
          <button
            type="button"
            onClick={() => api.gameAction('forceNext', {})}
            className="text-xs text-slate-400 hover:text-rose-300 shrink-0"
            title="Terminer l'étape sans attendre les retardataires"
          >
            ⏭ passer à la suite
          </button>
        )}
      </div>
    </div>
  );
}
