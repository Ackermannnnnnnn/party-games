import { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import Avatar from './Avatar.jsx';
import AvatarPicker from './AvatarPicker.jsx';

export default function PlayerList() {
  const { room, playerId, gameState } = useGameStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!room) return null;
  const eliminated = new Set(gameState?.public?.eliminatedIds || []);

  return (
    <>
      <ul className="space-y-1">
        {room.players.map((p) => {
          const isMe   = p.id === playerId;
          const isHost = p.id === room.hostId;
          const isOut  = eliminated.has(p.id);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${isMe ? 'bg-white/[0.05]' : ''} ${isOut ? 'opacity-50' : ''}`}
            >
              <span className="relative shrink-0">
                <Avatar id={p.avatar} size="sm" className={p.connected ? '' : 'grayscale opacity-60'} />
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--surface)] ${p.connected ? 'bg-emerald-400' : 'bg-slate-500'}`}
                  title={p.connected ? 'En ligne' : 'Déconnecté'} />
              </span>
              <span className={`flex-1 min-w-0 truncate text-sm ${isOut ? 'line-through' : ''} ${isMe ? 'font-semibold text-white' : 'text-slate-200'}`}>
                {p.pseudo}{isMe && <span className="text-slate-400 font-normal"> (toi)</span>}
              </span>
              {isHost && (
                <span className="shrink-0 rounded-md bg-token/15 text-token text-[10px] font-bold px-1.5 py-0.5" title="Hôte de la room">Hôte</span>
              )}
              {isMe && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="shrink-0 w-7 h-7 !min-h-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  title="Changer mon avatar"
                  aria-label="Changer mon avatar"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <AvatarPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
