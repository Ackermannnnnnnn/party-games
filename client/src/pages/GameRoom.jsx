import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import PlayerList from '../components/PlayerList.jsx';
import Chat from '../components/Chat.jsx';
import { GAMES, GAME_LIST, getGame } from '../games/registry.js';
import { Identity } from './Home.jsx';

export default function GameRoom() {
  const navigate = useNavigate();
  const { room, playerId, gameState, resetRoom, connected } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState('game');

  if (!room) return <JoinFromLink />;

  const isHost = playerId === room.hostId;
  const inGame = !!gameState;
  const ActiveGame = inGame ? getGame(room.gameId)?.Component : null;

  const leave = () => {
    api.leaveRoom();
    resetRoom();
    navigate('/');
  };

  // Ces jeux ont déjà leur propre écran « spectateur »
  const spectator = !!gameState?.private?.spectator && !['imposter', 'telephone', 'bombparty', 'petitbac'].includes(room.gameId);

  const copyCode = async () => {
    const link = `${window.location.origin}/room/${room.code}`;
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: 'Party Games', text: `Rejoins ma room ${room.code} !`, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copie le code :', room.code);
    }
  };

  return (
    <div className="mt-2 sm:mt-4 lg:grid lg:grid-cols-[1fr_300px] lg:gap-4">
      {/* Header room */}
      <div className="card flex items-center justify-between mb-3 lg:mb-4 lg:col-span-2">
        <div>
          <p className="text-[10px] sm:text-xs uppercase text-slate-400">Code de la room</p>
          <div className="flex items-center gap-2">
            <p className="font-display text-2xl sm:text-3xl tracking-widest text-brand-light">{room.code}</p>
            <button
              onClick={copyCode}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-100 px-2 py-1 rounded transition"
              title="Copier le code"
            >
              {copied ? '✓ lien copié' : '🔗 inviter'}
            </button>
          </div>
        </div>
        <button onClick={leave} className="btn btn-ghost text-xs sm:text-sm px-3 py-2">
          Quitter
        </button>
      </div>

      {!connected && (
        <div className="mb-3 lg:col-span-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-2.5 text-sm text-amber-100 flex items-center gap-2" role="status">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-amber-200 border-t-transparent animate-spin" aria-hidden="true" />
          Connexion perdue… reconnexion automatique en cours, ta place est gardée.
        </div>
      )}
      {inGame && spectator && (
        <div className="mb-3 lg:col-span-2 rounded-xl bg-sky-500/15 border border-sky-400/40 px-4 py-2.5 text-sm text-sky-100" role="status">
          👀 Une partie est en cours : tu la regardes, et tu joueras dès la prochaine manche.
        </div>
      )}

      {/* Tabs mobile */}
      <div className="flex gap-2 mb-3 lg:hidden">
        <TabBtn active={mobileTab === 'game'} onClick={() => setMobileTab('game')}>
          🎮 Jeu
        </TabBtn>
        <TabBtn active={mobileTab === 'chat'} onClick={() => setMobileTab('chat')}>
          👥 Joueurs ({room.players.length}) · 💬
        </TabBtn>
      </div>

      {/* Zone principale */}
      <div className={`space-y-3 sm:space-y-4 ${mobileTab === 'game' ? '' : 'hidden'} lg:block`}>
        {!inGame && <Lobby room={room} isHost={isHost} />}
        {inGame && ActiveGame && <ActiveGame />}
        {inGame && !ActiveGame && (
          <div className="card text-center text-rose-300">
            Jeu inconnu : <code>{room.gameId}</code>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className={`space-y-3 sm:space-y-4 ${mobileTab === 'chat' ? '' : 'hidden'} lg:block lg:max-h-[calc(100vh-180px)] lg:flex lg:flex-col lg:sticky lg:top-20`}>
        <div className="card">
          <h3 className="font-semibold mb-2 text-slate-300 text-sm">Joueurs ({room.players.length})</h3>
          <PlayerList />
        </div>
        <div className="card flex flex-col h-[50vh] lg:h-auto lg:flex-1 lg:min-h-[260px]">
          <h3 className="font-semibold mb-2 text-slate-300 text-sm">Chat</h3>
          <div className="flex-1 min-h-0">
            <Chat />
          </div>
        </div>
      </aside>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function Lobby({ room, isHost }) {
  const selectedId = room.selectedGameId || 'imposter';
  const selected = getGame(selectedId);
  const OptionsComp = selected?.OptionsComp;

  const enoughPlayers = selected ? room.players.length >= selected.minPlayers : false;

  return (
    <div className="card space-y-5">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl mb-1 text-brand-light">Salle d'attente</h2>
        <p className="text-slate-300 text-sm sm:text-base">Partage le code à tes amis pour qu'ils rejoignent.</p>
      </div>

      {/* Sélecteur de jeu */}
      <div className="border-t border-slate-700 pt-4">
        <h3 className="font-semibold text-slate-200 mb-3 text-sm sm:text-base">🎮 Choisis un jeu</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {GAME_LIST.map(g => {
            const active = g.id === selectedId;
            return (
              <button
                key={g.id}
                disabled={!isHost}
                onClick={() => api.setGame(g.id)}
                className={`text-left rounded-xl p-3 sm:p-4 border-2 transition ${
                  active
                    ? 'bg-brand/20 border-brand text-white'
                    : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-500'
                } ${!isHost ? 'cursor-default opacity-90' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{g.icon}</span>
                  <span className="font-semibold">{g.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{g.description}</p>
                <p className="text-[10px] text-slate-500 mt-1">Min {g.minPlayers} joueur(s)</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options du jeu sélectionné */}
      {OptionsComp && (
        <div className="border-t border-slate-700 pt-4">
          <h3 className="font-semibold text-slate-200 mb-3 text-sm sm:text-base">
            ⚙️ Options — {selected.label}
          </h3>
          <OptionsComp
            isHost={isHost}
            playerCount={room.players.length}
            onStart={(opts) => api.startGame(selected.id, opts)}
          />
        </div>
      )}

      {!isHost && (
        <p className="text-center text-slate-400 italic text-sm">En attente que l'hôte lance la partie…</p>
      )}
      {!enoughPlayers && (
        <p className="text-center text-rose-300 text-sm">
          Minimum {selected?.minPlayers} joueur(s) pour démarrer.
        </p>
      )}
    </div>
  );
}

/** Arrivée par un lien d'invitation (ou session perdue) : on choisit pseudo + avatar et on rejoint. */
function JoinFromLink() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { pseudo, avatarChosen, connected } = useGameStore();
  const roomCode = (code || '').toUpperCase();
  const resuming = localStorage.getItem('roomCode') === roomCode && !!localStorage.getItem('playerId');
  const [waited, setWaited] = useState(!resuming);
  useEffect(() => {
    if (!resuming) return undefined;
    const t = setTimeout(() => setWaited(true), 6000);
    return () => clearTimeout(t);
  }, [resuming]);

  if (!waited) {
    return (
      <div className="card text-center mt-10 space-y-2">
        <span className="inline-block w-6 h-6 rounded-full border-2 border-brand-light border-t-transparent animate-spin" aria-hidden="true" />
        <p>{connected ? 'Retour dans la room…' : 'Connexion au serveur…'}</p>
        <p className="text-xs text-slate-400">Si le serveur dormait, ça peut prendre jusqu'à une minute.</p>
      </div>
    );
  }
  const canJoin = pseudo.trim().length >= 1 && avatarChosen && roomCode.length === 6;
  return (
    <div className="max-w-md mx-auto mt-6 sm:mt-10 card space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase text-slate-400">Tu es invité dans la room</p>
        <p className="font-display text-4xl tracking-widest text-brand-light">{roomCode}</p>
      </div>
      <Identity compact />
      <button type="button" className="btn btn-primary w-full disabled:opacity-50" disabled={!canJoin || !connected}
        onClick={() => api.joinRoom(roomCode, pseudo)}>
        {connected ? '🎮 Rejoindre la partie' : 'Connexion au serveur…'}
      </button>
      <p className="text-[11px] text-slate-500 text-center">Partie déjà lancée ? Tu joueras à la manche suivante.</p>
      <button type="button" className="text-xs text-slate-400 underline w-full" style={{ minHeight: 0 }} onClick={() => navigate('/')}>Retour à l'accueil</button>
    </div>
  );
}
