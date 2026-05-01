import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';

export default function Home() {
  const navigate = useNavigate();
  const { pseudo, setPseudo, room } = useGameStore();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (room?.code) navigate(`/room/${room.code}`);
  }, [room?.code]);

  const canPlay = pseudo.trim().length >= 1;

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-10">
      <div className="card">
        <h2 className="font-display text-2xl sm:text-3xl mb-2 text-brand-light">Bienvenue</h2>
        <p className="text-slate-300 mb-4 text-sm sm:text-base">Choisis un pseudo pour commencer.</p>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-lg outline-none focus:border-brand"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value.slice(0, 20))}
          maxLength={20}
          autoComplete="off"
        />
      </div>

      <div className="card flex flex-col gap-4">
        <button
          disabled={!canPlay}
          className="btn btn-primary text-base sm:text-lg disabled:opacity-50"
          onClick={() => api.createRoom(pseudo)}
        >
          🎮 Créer une room
        </button>
        <div className="text-center text-slate-500 text-sm">— ou —</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 uppercase tracking-widest text-center outline-none focus:border-brand text-base"
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            maxLength={6}
            autoComplete="off"
            inputMode="text"
          />
          <button
            disabled={!canPlay || code.length !== 6}
            className="btn btn-ghost disabled:opacity-50"
            onClick={() => api.joinRoom(code, pseudo)}
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}
