import { create } from 'zustand';

/**
 * Store global. Source unique de vérité côté client.
 * Mis à jour par les events socket -> setRoomState / setGameState.
 */
export const useGameStore = create((set) => ({
  // Identité
  pseudo: localStorage.getItem('pseudo') || '',
  avatar: localStorage.getItem('avatar') || 'face_grin',
  playerId: null,

  // Connexion
  connected: false,
  serverError: null,

  // Room
  room: null,           // { code, hostId, gameId, players[] }
  chat: [],

  // Game state (envoyé par le serveur)
  gameState: null,      // { public, private }

  // Notification "tu dois rentrer au menu" (room fermée, introuvable, kick…)
  redirectHomeReason: null,

  // Setters
  setPseudo: (pseudo) => {
    localStorage.setItem('pseudo', pseudo);
    set({ pseudo });
  },
  setAvatar: (avatar) => {
    localStorage.setItem('avatar', avatar);
    set({ avatar });
  },
  setPlayerId: (id) => {
    if (id) localStorage.setItem('playerId', id);
    set({ playerId: id });
  },
  setConnected: (v) => set({ connected: v }),
  setError: (e)     => set({ serverError: e }),
  setRoom: (r)      => set({ room: r }),
  setGameState: (g) => set({ gameState: g }),
  appendChat: (m)   => set((s) => ({ chat: [...s.chat, m].slice(-100) })),
  resetRoom: ()     => {
    localStorage.removeItem('roomCode');
    localStorage.removeItem('playerId');
    set({ room: null, chat: [], gameState: null, playerId: null });
  },
  triggerRedirectHome: (reason) => set({ redirectHomeReason: reason }),
  clearRedirect: () => set({ redirectHomeReason: null }),
}));
