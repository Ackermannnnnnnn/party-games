import { useEffect } from 'react';
import { socket } from '../lib/socket.js';
import { useGameStore } from '../store/gameStore.js';

/** Codes d'erreur qui invalident notre session de room (clean + redirect home). */
const FATAL_ROOM_ERRORS = new Set(['ROOM_NOT_FOUND', 'PLAYER_NOT_FOUND', 'KICKED']);

/** Ce qu'on envoie au serveur pour l'avatar : la photo perso, ou l'id de l'avatar choisi. */
export function avatarPayload() {
  const avatar = useGameStore.getState().avatar;
  if (avatar === 'photo:local') {
    let photo = null;
    try { photo = localStorage.getItem('avatarPhoto'); } catch {}
    if (photo) return { photo };
    return { avatar: 'face_grin' };
  }
  return { avatar };
}

function rejoinIfNeeded() {
  const code = localStorage.getItem('roomCode');
  const playerId = localStorage.getItem('playerId');
  if (code && playerId) {
    const pseudo = useGameStore.getState().pseudo?.trim();
    socket.emit('room:rejoin', { code, playerId, ...(pseudo ? { pseudo } : {}), ...avatarPayload() });
  }
}

/**
 * Hook unique : connecte le socket et branche tous les events sur le store.
 * À utiliser une seule fois au niveau de <App />.
 *
 * Reconnexion : à chaque (re)connexion du socket on reprend sa place dans la room ;
 * quand l'appli revient au premier plan (écran déverrouillé, onglet réactivé),
 * on relance la connexion si besoin et on redemande l'état à jour.
 */
export function useSocket() {
  const setConnected   = useGameStore((s) => s.setConnected);
  const setRoom        = useGameStore((s) => s.setRoom);
  const setGameState   = useGameStore((s) => s.setGameState);
  const appendChat     = useGameStore((s) => s.appendChat);
  const setError       = useGameStore((s) => s.setError);
  const setNotice      = useGameStore((s) => s.setNotice);
  const setPlayerId    = useGameStore((s) => s.setPlayerId);
  const resetRoom      = useGameStore((s) => s.resetRoom);
  const triggerRedirect = useGameStore((s) => s.triggerRedirectHome);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      rejoinIfNeeded();
    };
    const onDisconnect = () => setConnected(false);

    const onRoomJoined = ({ code, playerId }) => {
      localStorage.setItem('roomCode', code);
      setPlayerId(playerId);
    };
    const onRoomState  = (room) => setRoom(room);
    const onRoomClosed = ({ reason }) => {
      resetRoom();
      triggerRedirect(reason || 'ROOM_CLOSED');
    };
    const onChatMsg    = (msg)  => appendChat(msg);
    const onGameState  = (g)    => setGameState(g);
    const onGameEnd    = ()     => setGameState(null);
    const onNotice     = (n)    => setNotice(n);

    const onError = (e) => {
      setError(e);
      // Si l'erreur vient d'une tentative de rejoin invalide → cleanup + redirect
      if (FATAL_ROOM_ERRORS.has(e?.code) && localStorage.getItem('roomCode')) {
        resetRoom();
        triggerRedirect(e.code);
      }
    };

    // Retour au premier plan : le téléphone a pu couper la connexion en arrière-plan
    const onWake = () => {
      if (document.visibilityState === 'hidden') return;
      if (!socket.connected) socket.connect();
      else if (localStorage.getItem('roomCode')) socket.emit('room:sync');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:state', onRoomState);
    socket.on('room:closed', onRoomClosed);
    socket.on('room:notice', onNotice);
    socket.on('chat:message', onChatMsg);
    socket.on('game:state', onGameState);
    socket.on('game:end', onGameEnd);
    socket.on('error', onError);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:state', onRoomState);
      socket.off('room:closed', onRoomClosed);
      socket.off('room:notice', onNotice);
      socket.off('chat:message', onChatMsg);
      socket.off('game:state', onGameState);
      socket.off('game:end', onGameEnd);
      socket.off('error', onError);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, []);
}

// API helpers (encapsule les emits)
export const api = {
  createRoom: (pseudo) => socket.emit('room:create', { pseudo, ...avatarPayload() }),
  joinRoom:   (code, pseudo) => socket.emit('room:join', { code: code.toUpperCase(), pseudo, ...avatarPayload() }),
  /** Envoie l'avatar courant (photo ou avatar de la liste) aux autres joueurs. */
  syncAvatar: () => socket.emit('player:setAvatar', avatarPayload()),
  leaveRoom:  () => {
    socket.emit('room:leave');
    localStorage.removeItem('roomCode');
    localStorage.removeItem('playerId');
  },
  sendChat:   (text) => socket.emit('chat:send', { text }),
  setGame:    (gameId) => socket.emit('room:setGame', { gameId }),
  startGame:  (gameId = 'imposter', options = {}) => socket.emit('game:start', { gameId, options }),
  gameAction: (type, payload) => socket.emit('game:action', { type, payload }),
  stopGame:   () => socket.emit('game:stop'),
  kickPlayer: (playerId) => socket.emit('room:kick', { playerId }),
};
