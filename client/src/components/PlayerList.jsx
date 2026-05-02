import { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import Avatar from './Avatar.jsx';
import AvatarPicker from './AvatarPicker.jsx';

export default function PlayerList() {
  const { room, playerId, gameState, avatar, setAvatar } = useGameStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!room) return null;
  const eliminated = new Set(gameState?.public?.eliminatedIds || []);

  const onPickAvatar = (id) => {
    setAvatar(id);
    api.setAvatar(id); // sync vers les autres joueurs
  };

  return (
    <>
      <ul className="space-y-2">
        {room.players.map((p) => {
          const isMe   = p.id === playerId;
          const isHost = p.id === room.hostId;
          const isOut  = eliminated.has(p.id);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                isOut ? 'bg-slate-900/40 opacity-60' : 'bg-slate-900/70'
              }`}
            >
              <Avatar id={p.avatar} size="sm" />
              <span className={`flex items-center gap-1.5 flex-1 min-w-0 ${isOut ? 'line-through' : ''}`}>
                {isHost && <span title="Host">👑</span>}
                {!p.connected && <span title="Déconnecté" className="text-rose-400">⏸</span>}
                <span className={`truncate ${isMe ? 'font-bold text-brand-light' : ''}`}>
                  {p.pseudo}{isMe && ' (toi)'}
                </span>
              </span>
              {isMe && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-xs text-slate-400 hover:text-brand-light px-1"
                  title="Changer mon avatar"
                >
                  ✏️
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <AvatarPicker
        currentId={avatar}
        onSelect={onPickAvatar}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
