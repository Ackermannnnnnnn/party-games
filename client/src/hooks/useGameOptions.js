import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { socket } from '../lib/socket.js';

/**
 * Sync les options d'un jeu côté lobby entre l'hôte et les autres joueurs.
 *
 *  - Si tu es HOST : tu peux modifier `opts` librement, les changements sont
 *    debouncés (250 ms) et envoyés au serveur via `room:setOptions`.
 *  - Si tu n'es pas HOST : `opts` reflète en temps réel ce que l'hôte a choisi.
 *
 * @param {string} gameId
 * @param {object} defaults  valeurs par défaut si rien côté serveur
 * @returns {[opts, setOpts, isHost]}
 */
export function useGameOptions(gameId, defaults) {
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const isHost = !!(playerId && room?.hostId === playerId);
  const serverOpts = room?.gameOptions?.[gameId];

  const [opts, setOpts] = useState(() => ({ ...defaults, ...(serverOpts || {}) }));
  const isFirstSync = useRef(true);

  // Non-host : recopier ce que dit le serveur
  useEffect(() => {
    if (!isHost && serverOpts) {
      setOpts({ ...defaults, ...serverOpts });
    }
    // Host : on peut aussi se synchroniser au PREMIER chargement seulement,
    // pour récupérer ses options précédentes après un game:end
    if (isHost && isFirstSync.current && serverOpts) {
      setOpts({ ...defaults, ...serverOpts });
      isFirstSync.current = false;
    }
  }, [serverOpts, isHost]);

  // Host : émettre les changements (debouncé)
  const emitTimer = useRef(null);
  useEffect(() => {
    if (!isHost) return;
    clearTimeout(emitTimer.current);
    emitTimer.current = setTimeout(() => {
      socket.emit('room:setOptions', { gameId, options: opts });
    }, 250);
    return () => clearTimeout(emitTimer.current);
  }, [opts, isHost, gameId]);

  return [opts, setOpts, isHost];
}
