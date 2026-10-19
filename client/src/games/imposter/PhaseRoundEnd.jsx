import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import { CluesTable } from './PhaseDescribe.jsx';

export default function PhaseRoundEnd() {
  const { gameState, room, playerId } = useGameStore();
  const isHost = playerId === room.hostId;
  const speakingRound = gameState?.public?.speakingRound || 1;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="imp-title text-3xl">Fin du tour n°{speakingRound}</p>
        <p className="text-sm text-slate-300">Débattez ! Qui a donné un indice bizarre ?</p>
      </div>
      <CluesTable />
      {isHost ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => api.gameAction('nextSpeakingRound', {})}>🔁 Encore un tour d'indices</button>
          <button type="button" className="btn btn-primary" onClick={() => api.gameAction('startVote', {})}>🗳️ Passer au vote</button>
        </div>
      ) : (
        <p className="text-center text-slate-400 italic text-sm">L'hôte choisit : un autre tour d'indices, ou le vote…</p>
      )}
    </div>
  );
}
