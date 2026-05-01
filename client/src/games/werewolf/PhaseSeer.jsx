import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import NightWaitingScreen from './NightWaitingScreen.jsx';

const ROLE_ICONS = {
  villageois: '🧑‍🌾', loup_garou: '🐺', voyante: '🔮',
  sorciere: '🧙‍♀️', chasseur: '🏹', cupidon: '💘',
};
const ROLE_LABELS = {
  villageois: 'Villageois', loup_garou: 'Loup-Garou', voyante: 'Voyante',
  sorciere: 'Sorcière', chasseur: 'Chasseur', cupidon: 'Cupidon',
};

export default function PhaseSeer() {
  const { gameState, room, playerId } = useGameStore();
  const role = gameState?.private?.role;
  const isSeer = role === 'voyante';
  const aliveIds = new Set(gameState?.public?.aliveIds || []);
  const seerHistory = gameState?.private?.seerHistory || [];
  const iSawThisTurn = gameState?.private?.iSawThisTurn;
  const day = gameState?.public?.day;

  if (!isSeer) {
    return <NightWaitingScreen icon="🔮" title="La Voyante se réveille…" subtitle="Elle observe l'un d'entre vous." />;
  }

  const lastInsp = [...seerHistory].reverse().find(h => h.day === day);
  const candidates = room.players.filter(p => aliveIds.has(p.id) && p.id !== playerId);

  return (
    <div className="card space-y-4 py-6 sm:py-10">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-purple-300">🔮 Voyante</h2>
        <p className="text-slate-300 text-sm mt-2">Choisis un joueur pour découvrir son rôle.</p>
      </div>

      {!iSawThisTurn ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {candidates.map(p => (
            <button
              key={p.id}
              onClick={() => api.gameAction('seerInspect', { targetId: p.id })}
              className="rounded-xl p-3 border-2 bg-slate-900/40 border-slate-700 text-slate-300 hover:border-purple-400 transition"
            >
              {p.pseudo}
            </button>
          ))}
        </div>
      ) : (
        lastInsp && (
          <div className="bg-purple-500/10 border border-purple-500/40 text-purple-200 rounded-xl p-4 text-center">
            <p className="text-sm mb-1">Tu as observé</p>
            <p className="font-display text-xl">
              {room.players.find(pl => pl.id === lastInsp.playerId)?.pseudo}
            </p>
            <p className="text-2xl mt-2">
              {ROLE_ICONS[lastInsp.roleId]} {ROLE_LABELS[lastInsp.roleId]}
            </p>
          </div>
        )
      )}

      {/* Historique des inspections passées */}
      {seerHistory.length > (iSawThisTurn ? 1 : 0) && (
        <details className="text-sm text-slate-400">
          <summary className="cursor-pointer">📒 Mes notes ({seerHistory.length} observation{seerHistory.length>1?'s':''})</summary>
          <ul className="mt-2 space-y-1">
            {seerHistory.slice(0, -1).map((h, i) => (
              <li key={i}>
                Jour {h.day} : {room.players.find(pl => pl.id === h.playerId)?.pseudo} = {ROLE_ICONS[h.roleId]} {ROLE_LABELS[h.roleId]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
