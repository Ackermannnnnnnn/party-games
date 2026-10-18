import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import Avatar from '../components/Avatar.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';
import { getAvatar, isPhoto } from '../data/avatars.js';

/** Bloc pseudo + avatar, réutilisé sur l'accueil et sur la page d'un lien d'invitation. */
export function Identity({ compact = false }) {
  const { pseudo, setPseudo, avatar, avatarChosen } = useGameStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPickerOpen(true)} className="relative group shrink-0" title="Changer d'avatar" style={{ minHeight: 0 }}>
          <Avatar id={avatar} size="lg" className={avatarChosen ? '' : 'opacity-40 grayscale'} />
          <span className="absolute -bottom-1 -right-1 bg-brand text-white text-xs rounded-full w-7 h-7 flex items-center justify-center shadow-lg group-hover:bg-brand-dark">✏️</span>
        </button>
        <input
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-lg outline-none focus:border-brand"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value.slice(0, 20))}
          maxLength={20}
          autoComplete="off"
        />
      </div>
      {avatarChosen ? (
        <p className={`text-xs text-slate-400 ${compact ? 'mt-2' : 'mt-3 text-center'}`}>
          {isPhoto(avatar) ? '📷 Ta photo' : `${getAvatar(avatar).emoji} ${getAvatar(avatar).label}`} · touche l'avatar pour le changer
        </p>
      ) : (
        <button type="button" onClick={() => setPickerOpen(true)}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-amber-300/60 bg-amber-300/10 px-3 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/20">
          👆 Choisis d'abord ton avatar : ta photo ou un personnage (Goku, Batman, Mario…)
        </button>
      )}
      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pseudo, avatarChosen, room } = useGameStore();
  const [code, setCode] = useState(() => (params.get('code') || '').toUpperCase().slice(0, 6));

  useEffect(() => {
    if (room?.code) navigate(`/room/${room.code}`);
  }, [room?.code]);

  const canPlay = pseudo.trim().length >= 1 && avatarChosen;

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-10">
      {/* Carte gauche : pseudo + avatar */}
      <div className="card">
        <h2 className="font-display text-2xl sm:text-3xl mb-2 text-brand-light">Bienvenue</h2>
        <p className="text-slate-300 mb-4 text-sm sm:text-base">Choisis ton pseudo et ton avatar.</p>
        <Identity />
      </div>

      {/* Carte droite : créer / rejoindre */}
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
        {!canPlay && (
          <p className="text-xs text-slate-400 text-center">
            {!avatarChosen ? 'Choisis ton avatar pour pouvoir jouer.' : 'Entre ton pseudo pour pouvoir jouer.'}
          </p>
        )}
        <p className="text-[11px] text-slate-500 text-center">Une partie est déjà lancée ? Rejoins quand même : tu joueras à la manche suivante.</p>
      </div>
    </div>
  );
}
