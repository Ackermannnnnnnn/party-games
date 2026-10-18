import { useGameStore } from '../../store/gameStore.js';

/** État du Loup-Garou + petits calculs partagés par tous les écrans. */
export function useWerewolf() {
  const { gameState, room, playerId } = useGameStore();
  const s = gameState?.public;
  const priv = gameState?.private || {};
  if (!s) return null;
  const byId = Object.fromEntries(s.players.map((p) => [p.id, p]));
  const me = byId[playerId];
  const name = (id) => byId[id]?.pseudo || '?';
  const isHost = playerId === room?.hostId;
  const alive = !!priv.alive;
  const ghost = priv.ghost || null;
  const isWolfRole = priv.role === 'loup_garou' || priv.role === 'loup_blanc';

  // Rôles que je connais (affichés en petit sur le cercle)
  const known = {};
  if (ghost) Object.assign(known, ghost.roles);
  else {
    for (const id of priv.pack || []) known[id] = 'loup_garou';
    for (const h of priv.seerHistory || []) known[h.id] = h.role;
  }
  const tags = {};
  const addTag = (id, t) => { (tags[id] ||= []).includes(t) || tags[id].push(t); };
  if (priv.lover) { addTag(priv.lover, '❤️'); addTag(playerId, '❤️'); }
  if (priv.role === 'cupidon') for (const id of priv.lovers || []) addTag(id, '💘');
  if (ghost) for (const id of ghost.lovers || []) addTag(id, '❤️');
  if (s.phase === 'GAME_OVER') for (const id of s.lovers || []) addTag(id, '❤️');

  return { s, priv, playerId, me, byId, name, isHost, alive, ghost, isWolfRole, known, tags, spectator: !!priv.spectator };
}

/** Voix pondérées (le maire compte double). */
export function weightedCounts(votes, mayorId) {
  const c = {};
  for (const [voter, target] of Object.entries(votes || {})) {
    if (!target || target === 'none') continue;
    c[target] = (c[target] || 0) + (voter === mayorId ? 2 : 1);
  }
  return c;
}

export function arrowsFrom(votes, color) {
  return Object.entries(votes || {}).filter(([, t]) => t && t !== 'none').map(([from, to]) => ({ from, to, color }));
}
