import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import Avatar from './Avatar.jsx';

export default function Chat() {
  const chat = useGameStore((s) => s.chat);
  const playerId = useGameStore((s) => s.playerId);
  const room = useGameStore((s) => s.room);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const send = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    api.sendChat(v);
    setText('');
  };

  // Lookup table id -> avatar (rapide)
  const avatarOf = (pid) => room?.players?.find(p => p.id === pid)?.avatar;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 text-sm min-h-0 scrollable">
        {chat.map((m, i) => {
          const av = avatarOf(m.from);
          return (
            <div key={i} className="flex items-start gap-2">
              <Avatar id={av} size="xs" />
              <div className="flex-1 min-w-0">
                <span className={`font-semibold ${m.from === playerId ? 'text-brand-light' : 'text-slate-200'}`}>
                  {m.pseudo}
                </span>
                <span className="text-slate-200">: {m.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-brand"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
        />
        <button className="btn btn-ghost px-3 py-2 text-sm">Envoyer</button>
      </form>
    </div>
  );
}
