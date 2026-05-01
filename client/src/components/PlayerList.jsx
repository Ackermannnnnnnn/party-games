import { useGameStore } from '../store/gameStore.js';

export default function PlayerList() {
  const { room, playerId, gameState } = useGameStore();
  if (!room) return null;
  const eliminated = new Set(gameState?.public?.eliminatedIds || []);

  return (
    <ul className="space-y-2">
      {room.players.map((p) => {
        const isMe   = p.id === playerId;
        const isHost = p.id === room.hostId;
        const isOut  = eliminated.has(p.id);
        return (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              isOut ? 'bg-slate-900/40 line-through opacity-50' : 'bg-slate-900/70'
            }`}
          >
            <span className="flex items-center gap-2">
              {isHost && <span title="Host">👑</span>}
              {!p.connected && <span title="Déconnecté" className="text-rose-400">⏸</span>}
              <span className={isMe ? 'font-bold text-brand-light' : ''}>
                {p.pseudo}{isMe && ' (toi)'}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
