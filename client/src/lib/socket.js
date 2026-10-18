import { io } from 'socket.io-client';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const URL = SERVER_URL;

export const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
});
