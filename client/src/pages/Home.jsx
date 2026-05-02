import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import Avatar from '../components/Avatar.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { pseudo, setPseudo, avatar, setAvatar, room } = useGameStore();
  const [code, setCode] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (room?.code) navigate(`/room/${room.code}`);
  }, [room?.code]);

  const canPlay = pseudo.trim().length >= 1;

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-10">
      {/* Carte gauche : pseudo + avatar */}
      <div className="card">
        <h2 className="font-display text-2xl sm:text-3xl mb-2 text-brand-light">Bienvenue</h2>
        <p className="text-slate-300 mb-4 text-sm sm:text-base">Choisis ton pseudo et ton avatar.</p>

        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setPickerOpen(true)}
            className="relative group"
            title="Changer d'avatar"
          >
            <Avatar id={avatar} size="lg" />
            <span className="absolute -bottom-1 -right-1 bg-brand text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-lg group-hover:bg-brand-dark">
              ✏️
            </span>
          </button>
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-lg outline-none focus:border-brand"
            placeholder="Ton pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.slice(0, 20))}
            maxLength={20}
            autoComplete="off"
          />
        </div>
        <p className="text-xs text-slate-500 text-center">
          ✏️ Clique sur l'avatar pour le changer
        </p>
      </div>

      {/* Carte droite : créer / rejoindre */}
      <div className="card flex flex-col gap-4">
        <button
          disabled={!canPlay}
          className="btn btn-primary text-base sm:text-lg disabled:opacity-50"
          onClick={() => api.createRoom(pseudo, avatar)}
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
            onClick={() => api.joinRoom(code, pseudo, avatar)}
          >
            Rejoindre
          </button>
        </div>
      </div>

      {/* Picker en modal */}
      <AvatarPicker
        currentId={avatar}
        onSelect={setAvatar}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
