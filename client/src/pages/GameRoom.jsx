import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import PlayerList from '../components/PlayerList.jsx';
import Chat from '../components/Chat.jsx';
import { GAMES, GAME_LIST, getGame } from '../games/registry.js';
import { Identity } from './Home.jsx';
import Avatar from '../components/Avatar.jsx';

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
      {/* Bandeau de la room : code à partager, joueurs, quitter */}
      <div className="card !py-3 !px-3 sm:!px-4 flex items-center gap-3 mb-3 lg:mb-4 lg:col-span-2">
        <button onClick={copyCode} className="ticket group" style={{ minHeight: 0 }} title="Copier le lien d'invitation">
          <span className="ticket-code text-xl sm:text-2xl">{room.code}</span>
          <span className="rounded-lg bg-black/10 px-2 py-1 text-xs font-semibold group-hover:bg-black/15 transition">
            {copied ? 'Lien copié' : 'Inviter'}
          </span>
        </button>
        <div className="hidden sm:flex items-center -space-x-2 ml-1 min-w-0" aria-label={`${room.players.length} joueurs`}>
          {room.players.slice(0, 7).map((p) => (
            <Avatar key={p.id} id={p.avatar} size="sm" className={`ring-2 ring-[var(--surface)] ${p.connected ? '' : 'opacity-40'}`} />
          ))}
          {room.players.length > 7 && <span className="w-8 h-8 rounded-full bg-slate-800 ring-2 ring-[var(--surface)] text-xs flex items-center justify-center text-slate-300">+{room.players.length - 7}</span>}
        </div>
        <p className="hidden md:block text-sm text-slate-400 truncate">
          {inGame ? `${getGame(room.gameId)?.icon || ''} ${getGame(room.gameId)?.label || ''}` : `${room.players.length} joueur${room.players.length > 1 ? 's' : ''} dans la room`}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {inGame && isHost && <StopGameButton />}
          <button onClick={leave} className="btn btn-ghost text-sm !px-3 !py-2 !min-h-0">
            Quitter
          </button>
        </div>
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
      <div className="flex gap-1 p-1 mb-3 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] lg:hidden" role="tablist">
        <TabBtn active={mobileTab === 'game'} onClick={() => setMobileTab('game')}>
          {inGame ? 'Partie' : 'Salle d\'attente'}
        </TabBtn>
        <TabBtn active={mobileTab === 'chat'} onClick={() => setMobileTab('chat')}>
          Joueurs ({room.players.length}) et chat
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
        <div className="card !p-4">
          <h3 className="panel-title mb-3">Joueurs <span className="text-slate-500 font-sans font-medium text-sm">{room.players.length}</span></h3>
          <PlayerList />
        </div>
        <div className="card !p-4 flex flex-col h-[50vh] lg:h-auto lg:flex-1 lg:min-h-[260px]">
          <h3 className="panel-title mb-2">Chat</h3>
          <div className="flex-1 min-h-0">
            <Chat />
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Hôte : arrête la partie en cours et ramène tout le monde à la salle d'attente (avec confirmation). */
function StopGameButton() {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return undefined;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);
  return (
    <button
      type="button"
      onClick={() => { if (confirm) { api.stopGame(); setConfirm(false); } else setConfirm(true); }}
      className={`btn text-sm !px-3 !py-2 !min-h-0 whitespace-nowrap ${confirm ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'btn-ghost'}`}
      title="Arrêter la partie pour tout le monde et revenir à la salle d'attente"
    >
      {confirm ? 'Confirmer ?' : <><span className="sm:hidden">Arrêter</span><span className="hidden sm:inline">Arrêter la partie</span></>}
    </button>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition ${
        active ? 'bg-slate-100 text-slate-900 shadow' : 'text-slate-300 hover:text-white'
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
    <div className="space-y-4">
      {isHost && (
      <section className="card">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-slate-50">Choisis le jeu</h2>
            <p className="text-sm text-slate-400 mt-1">
              Tout le monde voit ton choix en direct.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GAME_LIST.map((g) => {
            const active = g.id === selectedId;
            const tooFew = room.players.length < g.minPlayers;
            return (
              <button
                key={g.id}
                disabled={!isHost}
                onClick={() => api.setGame(g.id)}
                aria-pressed={active}
                className={`relative text-left rounded-xl p-3 transition ${
                  active
                    ? 'bg-brand/15 ring-2 ring-brand shadow-[0_10px_30px_-18px_rgba(123,97,255,0.9)]'
                    : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]'
                } ${!isHost ? 'cursor-default' : ''} ${!isHost && !active ? 'opacity-60' : ''}`}
              >
                <span className="block text-3xl leading-none mb-2" aria-hidden="true">{g.icon}</span>
                <span className="block font-semibold text-slate-50 leading-tight">{g.label}</span>
                <span className={`block text-[11px] mt-0.5 ${tooFew ? 'text-rose-300/80' : 'text-slate-400'}`}>
                  {g.minPlayers > 1 ? `dès ${g.minPlayers} joueurs` : 'dès 1 joueur'}
                </span>
                {active && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center" aria-hidden="true">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      )}

      {selected && (
        <section className="card">
          {!isHost && <p className="text-sm text-slate-400 mb-3">L'hôte a choisi :</p>}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl leading-none" aria-hidden="true">{selected.icon}</span>
            <div className="min-w-0">
              <h3 className="font-display text-2xl text-slate-50 leading-tight">{selected.label}</h3>
              <p className="text-sm text-slate-400">{selected.description}</p>
            </div>
          </div>
          {OptionsComp && (
            <OptionsComp
              isHost={isHost}
              playerCount={room.players.length}
              onStart={(opts) => api.startGame(selected.id, opts)}
            />
          )}
          {!isHost && (
            <p className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-token animate-pulse" aria-hidden="true" />
              En attente que l'hôte lance la partie
            </p>
          )}
          {!enoughPlayers && (
            <p className="mt-3 text-center text-rose-300 text-sm">
              Il faut au moins {selected.minPlayers} joueurs pour ce jeu.
            </p>
          )}
        </section>
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
        <p className="text-sm text-slate-400 mb-2">On t'invite à jouer dans la room</p>
        <span className="ticket" style={{ '--notch': 'var(--surface)' }}><span className="ticket-code text-3xl pr-2">{roomCode}</span></span>
      </div>
      <Identity compact />
      <button type="button" className="btn btn-token w-full disabled:opacity-40" disabled={!canJoin || !connected}
        onClick={() => api.joinRoom(roomCode, pseudo)}>
        {connected ? 'Rejoindre la partie' : 'Connexion au serveur…'}
      </button>
      <p className="text-[11px] text-slate-500 text-center">Partie déjà lancée ? Tu joueras à la manche suivante.</p>
      <button type="button" className="text-xs text-slate-400 underline w-full" style={{ minHeight: 0 }} onClick={() => navigate('/')}>Retour à l'accueil</button>
    </div>
  );
}
