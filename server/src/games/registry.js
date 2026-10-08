import { ImposterGame } from './imposter/ImposterGame.js';
import { QuizGame }     from './quiz/QuizGame.js';
import { PetitBacGame } from './petitbac/PetitBacGame.js';
import { WerewolfGame } from './werewolf/WerewolfGame.js';
import { TelephoneGame } from './telephone/TelephoneGame.js';

export const GAMES = {
  [ImposterGame.id]: ImposterGame,
  [QuizGame.id]: QuizGame,
  [PetitBacGame.id]: PetitBacGame,
  [WerewolfGame.id]: WerewolfGame,
  [TelephoneGame.id]: TelephoneGame,
};

export function getGameClass(gameId) {
  return GAMES[gameId] || null;
}

export function listGames() {
  return Object.values(GAMES).map(G => ({
    id: G.id,
    label: G.label,
    minPlayers: G.minPlayers,
    maxPlayers: G.maxPlayers,
  }));
}
