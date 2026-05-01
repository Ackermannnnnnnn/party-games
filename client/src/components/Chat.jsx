import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';

export default function Chat() {
  const chat = useGameStore((s) => s.chat);
  const playerId = useGameStore((s) => s.playerId);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 space-y-1 text-sm min-h-0 scrollable">
        {chat.map((m, i) => (
          <div key={i} className={m.from === playerId ? 'text-brand-light' : 'text-slate-200'}>
            <span className="font-semibold">{m.pseudo}</span>: {m.text}
          </div>
        ))}
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
