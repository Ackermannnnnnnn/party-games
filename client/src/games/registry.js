import ImposterGame    from './imposter/ImposterGame.jsx';
import ImposterOptions from './imposter/GameOptions.jsx';
import QuizGame        from './quiz/QuizGame.jsx';
import QuizOptions     from './quiz/QuizOptions.jsx';
import PetitBacGame    from './petitbac/PetitBacGame.jsx';
import PetitBacOptions from './petitbac/PetitBacOptions.jsx';
import WerewolfGame    from './werewolf/WerewolfGame.jsx';
import WerewolfOptions from './werewolf/WerewolfOptions.jsx';
import TelephoneGame    from './telephone/TelephoneGame.jsx';
import TelephoneOptions from './telephone/TelephoneOptions.jsx';
import BombPartyGame    from './bombparty/BombPartyGame.jsx';
import BombPartyOptions from './bombparty/BombPartyOptions.jsx';
import CemantixGame     from './cemantix/CemantixGame.jsx';
import CemantixOptions  from './cemantix/CemantixOptions.jsx';
import CodenamesGame    from './codenames/CodenamesGame.jsx';
import CodenamesOptions from './codenames/CodenamesOptions.jsx';
import BlindTestGame    from './blindtest/BlindTestGame.jsx';
import BlindTestOptions from './blindtest/BlindTestOptions.jsx';

export const GAMES = {
  imposter: {
    id: 'imposter',
    label: "Jeu de l'imposteur",
    icon: '🎭',
    description: '1 180 paires de mots, 27 thèmes, Mr White, indices à l\'écrit ou à voix haute, classement.',
    minPlayers: 3,
    Component: ImposterGame,
    OptionsComp: ImposterOptions,
  },
  quiz: {
    id: 'quiz',
    label: 'Quiz culture G',
    icon: '🎯',
    description: '800 questions, 20 catégories, jokers, séries et Battle Royale. Jouable dès 1 joueur.',
    minPlayers: 1,
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
    description: 'Le grand classique, avec un meneur de jeu : nuits rôle par rôle, narrateur vocal, votes en direct.',
    minPlayers: 5,
    Component: WerewolfGame,
    OptionsComp: WerewolfOptions,
  },
  telephone: {
    id: 'telephone',
    label: 'Gartic Phone',
    icon: '🎨',
    description: 'Écris, dessine, devine… et découvre comment ta phrase a déraillé.',
    minPlayers: 3,
    Component: TelephoneGame,
    OptionsComp: TelephoneOptions,
  },
  bombparty: {
    id: 'bombparty',
    label: 'BombParty',
    icon: '💣',
    description: 'Trouve vite un mot avec la syllabe avant que la bombe explose !',
    minPlayers: 2,
    Component: BombPartyGame,
    OptionsComp: BombPartyOptions,
  },
  cemantix: {
    id: 'cemantix',
    label: 'Cémantix',
    icon: '🌡️',
    description: 'Trouve le mot secret : plus ton mot est proche par le sens, plus il fait chaud.',
    minPlayers: 1,
    Component: CemantixGame,
    OptionsComp: CemantixOptions,
  },
  codenames: {
    id: 'codenames',
    label: 'Codenames',
    icon: '🕵️',
    description: 'Deux équipes, un indice d\'un mot : retrouve tes agents, évite l\'assassin.',
    minPlayers: 4,
    Component: CodenamesGame,
    OptionsComp: CodenamesOptions,
  },
  blindtest: {
    id: 'blindtest',
    label: 'Blind Test',
    icon: '🎧',
    description: 'Films, séries, anime et musique : reconnais l\'extrait le plus vite possible. Saisie libre, QCM, buzzer ou maître du jeu.',
    minPlayers: 1,
    Component: BlindTestGame,
    OptionsComp: BlindTestOptions,
  },
};

export const GAME_LIST = Object.values(GAMES);

export function getGame(id) {
  return GAMES[id] || null;
}
