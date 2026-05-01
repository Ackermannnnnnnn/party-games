import ImposterGame    from './imposter/ImposterGame.jsx';
import ImposterOptions from './imposter/GameOptions.jsx';
import QuizGame        from './quiz/QuizGame.jsx';
import QuizOptions     from './quiz/QuizOptions.jsx';
import PetitBacGame    from './petitbac/PetitBacGame.jsx';
import PetitBacOptions from './petitbac/PetitBacOptions.jsx';
import WerewolfGame    from './werewolf/WerewolfGame.jsx';
import WerewolfOptions from './werewolf/WerewolfOptions.jsx';

export const GAMES = {
  imposter: {
    id: 'imposter',
    label: "Jeu de l'imposteur",
    icon: '🎭',
    description: 'Trouve l\'imposteur parmi vous. Lui n\'a pas le même mot.',
    minPlayers: 3,
    Component: ImposterGame,
    OptionsComp: ImposterOptions,
  },
  quiz: {
    id: 'quiz',
    label: 'Quiz culture G',
    icon: '🎯',
    description: 'Réponds vite, gagne plus de points. Podium à la fin.',
    minPlayers: 3,
    Component: QuizGame,
    OptionsComp: QuizOptions,
  },
  petitbac: {
    id: 'petitbac',
    label: 'Petit Bac',
    icon: '📝',
    description: 'Une lettre, des catégories, à toi d\'être créatif et rapide !',
    minPlayers: 3,
    Component: PetitBacGame,
    OptionsComp: PetitBacOptions,
  },
  werewolf: {
    id: 'werewolf',
    label: 'Loup-Garou',
    icon: '🐺',
    description: 'Le village contre les loups, avec voyante, sorcière, chasseur…',
    minPlayers: 5,
    Component: WerewolfGame,
    OptionsComp: WerewolfOptions,
  },
};

export const GAME_LIST = Object.values(GAMES);

export function getGame(id) {
  return GAMES[id] || null;
}
