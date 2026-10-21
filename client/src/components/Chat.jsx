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
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-sm min-h-0 scrollable">
        {chat.length === 0 && <p className="text-slate-500 text-sm">Personne n'a encore écrit. Lance la conversation !</p>}
        {chat.map((m, i) => {
          const mine = m.from === playerId;
          const sameAsPrev = i > 0 && chat[i - 1].from === m.from;
          return (
            <div key={i} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <span className={`shrink-0 ${sameAsPrev ? 'invisible' : ''}`}><Avatar id={avatarOf(m.from)} size="xs" /></span>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${mine ? 'bg-brand text-white rounded-br-md' : 'bg-white/[0.06] text-slate-100 rounded-bl-md'}`}>
                {!mine && !sameAsPrev && <span className="block text-[11px] font-semibold text-brand-light">{m.pseudo}</span>}
                <span className="break-words">{m.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none"
          placeholder="Écris un message"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
          aria-label="Message"
        />
        <button className="btn btn-primary !px-3 !py-2 !min-h-0 text-sm" disabled={!text.trim()} aria-label="Envoyer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
        </button>
      </form>
    </div>
  );
}
