import { useEffect } from 'react';
import { socket } from '../lib/socket.js';
import { useGameStore } from '../store/gameStore.js';

/** Codes d'erreur qui invalident notre session de room (clean + redirect home). */
const FATAL_ROOM_ERRORS = new Set(['ROOM_NOT_FOUND', 'PLAYER_NOT_FOUND']);

/**
 * Hook unique : connecte le socket et branche tous les events sur le store.
 * À utiliser une seule fois au niveau de <App />.
 */
export function useSocket() {
  const setConnected   = useGameStore((s) => s.setConnected);
  const setRoom        = useGameStore((s) => s.setRoom);
  const setGameState   = useGameStore((s) => s.setGameState);
  const appendChat     = useGameStore((s) => s.appendChat);
  const setError       = useGameStore((s) => s.setError);
  const setPlayerId    = useGameStore((s) => s.setPlayerId);
  const resetRoom      = useGameStore((s) => s.resetRoom);
  const triggerRedirect = useGameStore((s) => s.triggerRedirectHome);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      const code = localStorage.getItem('roomCode');
      const playerId = localStorage.getItem('playerId');
      if (code && playerId) {
        socket.emit('room:rejoin', { code, playerId });
      }
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

    const onError = (e) => {
      setError(e);
      // Si l'erreur vient d'une tentative de rejoin invalide → cleanup + redirect
      if (FATAL_ROOM_ERRORS.has(e?.code)) {
        resetRoom();
        triggerRedirect(e.code);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:state', onRoomState);
    socket.on('room:closed', onRoomClosed);
    socket.on('chat:message', onChatMsg);
    socket.on('game:state', onGameState);
    socket.on('game:end', onGameEnd);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:state', onRoomState);
      socket.off('room:closed', onRoomClosed);
      socket.off('chat:message', onChatMsg);
      socket.off('game:state', onGameState);
      socket.off('game:end', onGameEnd);
      socket.off('error', onError);
    };
  }, []);
}

// API helpers (encapsule les emits)
export const api = {
  createRoom: (pseudo, avatar) => socket.emit('room:create', { pseudo, avatar }),
  joinRoom:   (code, pseudo, avatar) => socket.emit('room:join', { code: code.toUpperCase(), pseudo, avatar }),
  setAvatar:  (avatar) => socket.emit('player:setAvatar', { avatar }),
  leaveRoom:  () => {
    socket.emit('room:leave');
    localStorage.removeItem('roomCode');
    localStorage.removeItem('playerId');
  },
  sendChat:   (text) => socket.emit('chat:send', { text }),
  setGame:    (gameId) => socket.emit('room:setGame', { gameId }),
  startGame:  (gameId = 'imposter', options = {}) => socket.emit('game:start', { gameId, options }),
  gameAction: (type, payload) => socket.emit('game:action', { type, payload }),
};
