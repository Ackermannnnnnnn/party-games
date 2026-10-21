import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import Avatar from '../components/Avatar.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';
import { getAvatar, isPhoto } from '../data/avatars.js';
import { GAME_LIST } from '../games/registry.js';

/** Bloc pseudo + avatar, réutilisé sur l'accueil et sur la page d'un lien d'invitation. */
export function Identity({ compact = false }) {
  const { pseudo, setPseudo, avatar, avatarChosen } = useGameStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-3 sm:gap-4">
        <button type="button" onClick={() => setPickerOpen(true)} className="relative group shrink-0 rounded-full" title="Changer d'avatar" style={{ minHeight: 0 }}>
          <Avatar id={avatar} size="lg" className={`ring-2 ring-white/10 transition group-hover:ring-brand-light/60 ${avatarChosen ? '' : 'opacity-40 grayscale'}`} />
          <span className="absolute -bottom-0.5 -right-0.5 bg-slate-100 text-slate-900 rounded-full w-7 h-7 flex items-center justify-center shadow-lg ring-4 ring-[var(--surface)] transition group-hover:bg-white" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <label htmlFor="pseudo" className="block text-xs text-slate-400 mb-1">Ton pseudo</label>
          <input
            id="pseudo"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-lg font-semibold outline-none"
            placeholder="Comment on t'appelle ?"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.slice(0, 20))}
            maxLength={20}
            autoComplete="off"
          />
        </div>
      </div>
      {avatarChosen ? (
        <p className={`text-xs text-slate-400 ${compact ? 'mt-2' : 'mt-3'}`}>
          {isPhoto(avatar) ? 'Ta photo' : getAvatar(avatar).label} · touche l'avatar pour en changer
        </p>
      ) : (
        <button type="button" onClick={() => setPickerOpen(true)}
          className="mt-3 w-full rounded-xl border border-dashed border-token/50 bg-token/10 px-3 py-3 text-sm font-semibold text-token hover:bg-token/15 transition">
          Choisis d'abord ton avatar : ta photo ou un personnage (Goku, Batman, Mario…)
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
    <div className="mt-2 sm:mt-8">
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 md:gap-10 items-center">
        <section className="pt-2 md:pt-0 min-w-0">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] text-slate-50">
            Ce soir,<br />on joue.
          </h1>
          <p className="mt-4 max-w-md text-slate-300 text-base sm:text-lg leading-relaxed">
            {GAME_LIST.length} jeux à plusieurs, sur le même canapé ou à distance. Crée une room, partage le code, c'est parti.
          </p>
        </section>

        <section className="card space-y-5 min-w-0">
          <Identity />
          <div className="h-px bg-white/[0.06]" />
          <button
            disabled={!canPlay}
            className="btn btn-token w-full text-base sm:text-lg py-3.5 disabled:opacity-40 disabled:shadow-none"
            onClick={() => api.createRoom(pseudo)}
          >
            Créer une room
          </button>
          <div>
            <label htmlFor="code" className="block text-xs text-slate-400 mb-1.5">Tu as un code ?</label>
            <div className="flex gap-2">
              <input
                id="code"
                size={6}
                className="ticket-code flex-1 min-w-0 w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 uppercase text-center text-lg outline-none"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter' && canPlay && code.length === 6) api.joinRoom(code, pseudo); }}
                maxLength={6}
                autoComplete="off"
                inputMode="text"
              />
              <button
                disabled={!canPlay || code.length !== 6}
                className="btn btn-ghost shrink-0 disabled:opacity-40"
                onClick={() => api.joinRoom(code, pseudo)}
              >
                Rejoindre
              </button>
            </div>
          </div>
          {!canPlay && (
            <p className="text-xs text-slate-400">
              {!avatarChosen ? 'Choisis ton avatar pour pouvoir jouer.' : 'Entre ton pseudo pour pouvoir jouer.'}
            </p>
          )}
        </section>
      </div>

      <section className="mt-10 sm:mt-14" aria-labelledby="games-title">
        <h2 id="games-title" className="font-display text-xl text-slate-200 mb-3">Au programme</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {GAME_LIST.map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05] px-3 py-2.5">
              <span className="text-2xl leading-none" aria-hidden="true">{g.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-100 truncate">{g.label}</span>
                <span className="block text-[11px] text-slate-400">{g.minPlayers > 1 ? `dès ${g.minPlayers} joueurs` : 'dès 1 joueur'}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">Une partie est déjà lancée ? Rejoins quand même : tu joueras à la manche suivante.</p>
      </section>
    </div>
  );
}
