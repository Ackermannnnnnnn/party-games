import { SERVER_URL } from '../lib/socket.js';
/**
 * Avatars du jeu — basés sur des emojis avec un gradient de fond.
 * Chaque avatar : { id, label, emoji, bg (gradient tailwind), cat }
 *
 * Pour ajouter un avatar : push une entrée à la fin de la catégorie
 * (l'`id` doit rester unique dans toute la liste).
 */

export const BUILTIN_CATEGORIES = [
  { id: 'marvel',   label: 'Marvel',     icon: '🦸' },
  { id: 'dc',       label: 'DC',         icon: '🦸‍♂️' },
  { id: 'disney',   label: 'Disney',     icon: '🏰' },
  { id: 'simpsons', label: 'Simpsons',   icon: '🍩' },
  { id: 'starwars', label: 'Star Wars',  icon: '⚔️' },
  { id: 'anime',    label: 'Anime',      icon: '🎌' },
  { id: 'gaming',   label: 'Gaming',     icon: '🎮' },
  { id: 'cinema',   label: 'Cinéma',     icon: '🎬' },
  { id: 'animals',  label: 'Animaux',    icon: '🐾' },
  { id: 'fantasy',  label: 'Fantastique',icon: '🧙' },
  { id: 'food',     label: 'Aliments',   icon: '🍕' },
  { id: 'misc',     label: 'Autres',     icon: '😀' },
];

const BUILTIN_AVATARS = [
  // ───── 🦸 Marvel ─────
  { id: 'ironman',     cat: 'marvel', label: 'Iron Man',         emoji: '🤖', bg: 'from-red-500 to-yellow-500' },
  { id: 'hulk',        cat: 'marvel', label: 'Hulk',             emoji: '💚', bg: 'from-green-600 to-green-400' },
  { id: 'spiderman',   cat: 'marvel', label: 'Spider-Man',       emoji: '🕷️', bg: 'from-red-500 to-blue-600' },
  { id: 'thor',        cat: 'marvel', label: 'Thor',             emoji: '⚡', bg: 'from-blue-500 to-yellow-400' },
  { id: 'captain',     cat: 'marvel', label: 'Captain America',  emoji: '🛡️', bg: 'from-red-600 to-blue-700' },
  { id: 'blackwidow',  cat: 'marvel', label: 'Black Widow',      emoji: '🕸️', bg: 'from-rose-700 to-slate-900' },
  { id: 'blackpanth',  cat: 'marvel', label: 'Black Panther',    emoji: '🐆', bg: 'from-purple-700 to-slate-900' },
  { id: 'wolverine',   cat: 'marvel', label: 'Wolverine',        emoji: '🗡️', bg: 'from-yellow-500 to-blue-700' },
  { id: 'deadpool',    cat: 'marvel', label: 'Deadpool',         emoji: '🔫', bg: 'from-red-500 to-rose-800' },
  { id: 'thanos',      cat: 'marvel', label: 'Thanos',           emoji: '🟣', bg: 'from-purple-500 to-purple-800' },
  { id: 'loki',        cat: 'marvel', label: 'Loki',             emoji: '🪄', bg: 'from-emerald-600 to-yellow-600' },
  { id: 'doctorstr',   cat: 'marvel', label: 'Doctor Strange',   emoji: '🔮', bg: 'from-red-600 to-purple-600' },
  { id: 'venom',       cat: 'marvel', label: 'Venom',            emoji: '👅', bg: 'from-slate-900 to-slate-700' },
  { id: 'groot',       cat: 'marvel', label: 'Groot',            emoji: '🌳', bg: 'from-amber-700 to-emerald-800' },
  { id: 'rocket',      cat: 'marvel', label: 'Rocket',           emoji: '🦝', bg: 'from-amber-600 to-slate-700' },

  // ───── 🦸‍♂️ DC ─────
  { id: 'batman',      cat: 'dc', label: 'Batman',         emoji: '🦇', bg: 'from-slate-900 to-yellow-500' },
  { id: 'superman',    cat: 'dc', label: 'Superman',       emoji: '🦸', bg: 'from-blue-600 to-red-600' },
  { id: 'wonderwoman', cat: 'dc', label: 'Wonder Woman',   emoji: '👸', bg: 'from-red-600 to-blue-600' },
  { id: 'flash',       cat: 'dc', label: 'Flash',          emoji: '⚡', bg: 'from-red-500 to-yellow-400' },
  { id: 'aquaman',     cat: 'dc', label: 'Aquaman',        emoji: '🔱', bg: 'from-cyan-500 to-orange-500' },
  { id: 'joker',       cat: 'dc', label: 'Joker',          emoji: '🃏', bg: 'from-purple-600 to-green-500' },
  { id: 'harley',      cat: 'dc', label: 'Harley Quinn',   emoji: '🎭', bg: 'from-pink-500 to-blue-500' },
  { id: 'cyborg',      cat: 'dc', label: 'Cyborg',         emoji: '🦾', bg: 'from-red-700 to-slate-700' },
  { id: 'greenarr',    cat: 'dc', label: 'Green Arrow',    emoji: '🏹', bg: 'from-green-700 to-green-500' },

  // ───── 🏰 Disney ─────
  { id: 'mickey',      cat: 'disney', label: 'Mickey',         emoji: '🐭', bg: 'from-red-600 to-yellow-500' },
  { id: 'donald',      cat: 'disney', label: 'Donald',         emoji: '🦆', bg: 'from-blue-500 to-yellow-400' },
  { id: 'goofy',       cat: 'disney', label: 'Dingo',          emoji: '🐶', bg: 'from-amber-500 to-emerald-700' },
  { id: 'elsa',        cat: 'disney', label: 'Elsa',           emoji: '❄️', bg: 'from-cyan-300 to-blue-500' },
  { id: 'anna',        cat: 'disney', label: 'Anna',           emoji: '👸', bg: 'from-rose-400 to-emerald-500' },
  { id: 'olaf',        cat: 'disney', label: 'Olaf',           emoji: '⛄', bg: 'from-cyan-200 to-orange-400' },
  { id: 'simba',       cat: 'disney', label: 'Simba',          emoji: '🦁', bg: 'from-yellow-500 to-orange-600' },
  { id: 'stitch',      cat: 'disney', label: 'Stitch',         emoji: '👽', bg: 'from-blue-500 to-purple-500' },
  { id: 'ariel',       cat: 'disney', label: 'Ariel',          emoji: '🧜‍♀️', bg: 'from-red-400 to-cyan-500' },
  { id: 'aladdin',     cat: 'disney', label: 'Aladdin',        emoji: '🪄', bg: 'from-purple-600 to-orange-500' },
  { id: 'genie',       cat: 'disney', label: 'Génie',          emoji: '🧞', bg: 'from-cyan-500 to-blue-700' },
  { id: 'buzz',        cat: 'disney', label: 'Buzz l\'Éclair', emoji: '🚀', bg: 'from-purple-600 to-green-500' },
  { id: 'woody',       cat: 'disney', label: 'Woody',          emoji: '🤠', bg: 'from-amber-700 to-yellow-500' },
  { id: 'wall_e',      cat: 'disney', label: 'Wall-E',         emoji: '📦', bg: 'from-yellow-700 to-amber-900' },
  { id: 'nemo',        cat: 'disney', label: 'Némo',           emoji: '🐠', bg: 'from-orange-500 to-cyan-500' },

  // ───── 🍩 Simpsons ─────
  { id: 'homer',       cat: 'simpsons', label: 'Homer',  emoji: '🍩', bg: 'from-yellow-400 to-blue-500' },
  { id: 'bart',        cat: 'simpsons', label: 'Bart',   emoji: '🛹', bg: 'from-yellow-400 to-orange-500' },
  { id: 'lisa',        cat: 'simpsons', label: 'Lisa',   emoji: '🎷', bg: 'from-yellow-400 to-pink-500' },
  { id: 'marge',       cat: 'simpsons', label: 'Marge',  emoji: '👱‍♀️', bg: 'from-yellow-400 to-blue-700' },
  { id: 'maggie',      cat: 'simpsons', label: 'Maggie', emoji: '👶', bg: 'from-yellow-400 to-rose-400' },

  // ───── ⚔️ Star Wars ─────
  { id: 'yoda',        cat: 'starwars', label: 'Yoda',          emoji: '🟢', bg: 'from-green-500 to-amber-700' },
  { id: 'vader',       cat: 'starwars', label: 'Dark Vador',    emoji: '⚫', bg: 'from-slate-900 to-red-700' },
  { id: 'r2d2',        cat: 'starwars', label: 'R2-D2',         emoji: '🤖', bg: 'from-slate-200 to-blue-500' },
  { id: 'chewbacca',   cat: 'starwars', label: 'Chewbacca',     emoji: '🐺', bg: 'from-amber-700 to-amber-900' },
  { id: 'mando',       cat: 'starwars', label: 'Mandalorien',   emoji: '🪖', bg: 'from-slate-500 to-amber-700' },
  { id: 'baby_yoda',   cat: 'starwars', label: 'Grogu',         emoji: '👶', bg: 'from-emerald-600 to-amber-700' },
  { id: 'luke',        cat: 'starwars', label: 'Luke Skywalker',emoji: '🗡️', bg: 'from-amber-500 to-blue-600' },
  { id: 'leia',        cat: 'starwars', label: 'Leia',          emoji: '👑', bg: 'from-slate-200 to-amber-700' },

  // ───── 🎌 Anime ─────
  { id: 'goku',        cat: 'anime', label: 'Goku',     emoji: '🟠', bg: 'from-orange-500 to-blue-500' },
  { id: 'naruto',      cat: 'anime', label: 'Naruto',   emoji: '🍥', bg: 'from-orange-500 to-yellow-400' },
  { id: 'pikachu',     cat: 'anime', label: 'Pikachu',  emoji: '⚡', bg: 'from-yellow-400 to-yellow-600' },
  { id: 'luffy',       cat: 'anime', label: 'Luffy',    emoji: '🏴‍☠️', bg: 'from-red-600 to-yellow-500' },
  { id: 'saitama',     cat: 'anime', label: 'Saitama',  emoji: '👨‍🦲', bg: 'from-yellow-500 to-red-500' },
  { id: 'totoro',      cat: 'anime', label: 'Totoro',   emoji: '🌧️', bg: 'from-slate-500 to-emerald-700' },
  { id: 'kakashi',     cat: 'anime', label: 'Kakashi',  emoji: '👁️', bg: 'from-slate-500 to-slate-800' },
  { id: 'sasuke',      cat: 'anime', label: 'Sasuke',   emoji: '🌀', bg: 'from-slate-700 to-indigo-900' },
  { id: 'tanjiro',     cat: 'anime', label: 'Tanjiro',  emoji: '🗡️', bg: 'from-red-600 to-emerald-700' },

  // ───── 🎮 Gaming ─────
  { id: 'mario',       cat: 'gaming', label: 'Mario',         emoji: '🍄', bg: 'from-red-600 to-blue-700' },
  { id: 'luigi',       cat: 'gaming', label: 'Luigi',         emoji: '🍃', bg: 'from-green-600 to-blue-700' },
  { id: 'sonic',       cat: 'gaming', label: 'Sonic',         emoji: '💨', bg: 'from-blue-600 to-blue-400' },
  { id: 'link',        cat: 'gaming', label: 'Link',          emoji: '🗡️', bg: 'from-green-600 to-yellow-500' },
  { id: 'masterchief', cat: 'gaming', label: 'Master Chief',  emoji: '🪖', bg: 'from-green-700 to-slate-700' },
  { id: 'lara',        cat: 'gaming', label: 'Lara Croft',    emoji: '🏹', bg: 'from-amber-700 to-amber-500' },
  { id: 'kratos',      cat: 'gaming', label: 'Kratos',        emoji: '🪓', bg: 'from-red-700 to-slate-700' },
  { id: 'creeper',     cat: 'gaming', label: 'Creeper',       emoji: '💥', bg: 'from-emerald-600 to-emerald-800' },
  { id: 'pacman',      cat: 'gaming', label: 'Pac-Man',       emoji: '🟡', bg: 'from-yellow-400 to-yellow-600' },
  { id: 'crash',       cat: 'gaming', label: 'Crash',         emoji: '🦝', bg: 'from-orange-500 to-amber-700' },

  // ───── 🎬 Cinéma ─────
  { id: 'jacksparrow', cat: 'cinema', label: 'Jack Sparrow',  emoji: '☠️', bg: 'from-amber-700 to-red-700' },
  { id: 'indiana',     cat: 'cinema', label: 'Indiana Jones', emoji: '🤠', bg: 'from-amber-600 to-amber-800' },
  { id: 'neo',         cat: 'cinema', label: 'Neo',           emoji: '🕶️', bg: 'from-slate-900 to-emerald-700' },
  { id: 'jamesbond',   cat: 'cinema', label: 'James Bond',    emoji: '🎩', bg: 'from-slate-900 to-slate-600' },
  { id: 'rocky',       cat: 'cinema', label: 'Rocky',         emoji: '🥊', bg: 'from-red-700 to-yellow-500' },
  { id: 'terminator',  cat: 'cinema', label: 'Terminator',    emoji: '🤖', bg: 'from-slate-700 to-red-700' },

  // ───── 🐾 Animaux ─────
  { id: 'cat',         cat: 'animals', label: 'Chat',     emoji: '🐱', bg: 'from-orange-400 to-amber-600' },
  { id: 'dog',         cat: 'animals', label: 'Chien',    emoji: '🐶', bg: 'from-amber-500 to-amber-700' },
  { id: 'lion',        cat: 'animals', label: 'Lion',     emoji: '🦁', bg: 'from-amber-500 to-orange-700' },
  { id: 'tiger',       cat: 'animals', label: 'Tigre',    emoji: '🐯', bg: 'from-orange-500 to-yellow-600' },
  { id: 'panda',       cat: 'animals', label: 'Panda',    emoji: '🐼', bg: 'from-slate-300 to-slate-700' },
  { id: 'fox',         cat: 'animals', label: 'Renard',   emoji: '🦊', bg: 'from-orange-500 to-amber-700' },
  { id: 'wolf',        cat: 'animals', label: 'Loup',     emoji: '🐺', bg: 'from-slate-500 to-slate-700' },
  { id: 'koala',       cat: 'animals', label: 'Koala',    emoji: '🐨', bg: 'from-slate-400 to-slate-600' },
  { id: 'monkey',      cat: 'animals', label: 'Singe',    emoji: '🐵', bg: 'from-amber-500 to-amber-700' },
  { id: 'frog',        cat: 'animals', label: 'Grenouille',emoji: '🐸', bg: 'from-emerald-400 to-emerald-700' },
  { id: 'unicorn',     cat: 'animals', label: 'Licorne',  emoji: '🦄', bg: 'from-pink-400 to-purple-500' },
  { id: 'dragon',      cat: 'animals', label: 'Dragon',   emoji: '🐉', bg: 'from-emerald-600 to-red-600' },
  { id: 'octopus',     cat: 'animals', label: 'Pieuvre',  emoji: '🐙', bg: 'from-rose-500 to-purple-700' },
  { id: 'penguin',     cat: 'animals', label: 'Pingouin', emoji: '🐧', bg: 'from-slate-700 to-amber-400' },

  // ───── 🧙 Fantastique ─────
  { id: 'wizard',      cat: 'fantasy', label: 'Sorcier',    emoji: '🧙‍♂️', bg: 'from-purple-600 to-blue-700' },
  { id: 'witch',       cat: 'fantasy', label: 'Sorcière',   emoji: '🧙‍♀️', bg: 'from-purple-600 to-emerald-700' },
  { id: 'fairy',       cat: 'fantasy', label: 'Fée',        emoji: '🧚', bg: 'from-pink-400 to-purple-500' },
  { id: 'ninja',       cat: 'fantasy', label: 'Ninja',      emoji: '🥷', bg: 'from-slate-900 to-red-700' },
  { id: 'pirate',      cat: 'fantasy', label: 'Pirate',     emoji: '🏴‍☠️', bg: 'from-amber-800 to-red-700' },
  { id: 'knight',      cat: 'fantasy', label: 'Chevalier',  emoji: '⚔️', bg: 'from-slate-600 to-blue-700' },
  { id: 'vampire',     cat: 'fantasy', label: 'Vampire',    emoji: '🧛', bg: 'from-red-700 to-slate-900' },
  { id: 'zombie',      cat: 'fantasy', label: 'Zombie',     emoji: '🧟', bg: 'from-emerald-700 to-amber-800' },
  { id: 'alien',       cat: 'fantasy', label: 'Alien',      emoji: '👽', bg: 'from-emerald-500 to-purple-700' },
  { id: 'robot',       cat: 'fantasy', label: 'Robot',      emoji: '🤖', bg: 'from-slate-500 to-blue-700' },
  { id: 'mermaid',     cat: 'fantasy', label: 'Sirène',     emoji: '🧜‍♀️', bg: 'from-cyan-400 to-pink-400' },
  { id: 'astronaut',   cat: 'fantasy', label: 'Astronaute', emoji: '👨‍🚀', bg: 'from-blue-700 to-indigo-900' },

  // ───── 🍕 Aliments ─────
  { id: 'pizza',       cat: 'food', label: 'Pizza',     emoji: '🍕', bg: 'from-yellow-500 to-red-600' },
  { id: 'burger',      cat: 'food', label: 'Burger',    emoji: '🍔', bg: 'from-amber-600 to-yellow-500' },
  { id: 'taco',        cat: 'food', label: 'Taco',      emoji: '🌮', bg: 'from-yellow-500 to-orange-700' },
  { id: 'donut',       cat: 'food', label: 'Donut',     emoji: '🍩', bg: 'from-pink-400 to-amber-400' },
  { id: 'sushi',       cat: 'food', label: 'Sushi',     emoji: '🍣', bg: 'from-rose-300 to-emerald-400' },
  { id: 'icecream',    cat: 'food', label: 'Glace',     emoji: '🍦', bg: 'from-pink-300 to-amber-200' },
  { id: 'avocado',     cat: 'food', label: 'Avocat',    emoji: '🥑', bg: 'from-emerald-500 to-amber-700' },
  { id: 'baguette',    cat: 'food', label: 'Baguette',  emoji: '🥖', bg: 'from-amber-500 to-amber-700' },
  { id: 'croissant',   cat: 'food', label: 'Croissant', emoji: '🥐', bg: 'from-amber-400 to-amber-600' },

  // ───── 🎌 Mangas (suite) ─────
  { id: 'vegeta',      cat: 'anime', label: 'Vegeta',          emoji: '👑', bg: 'from-blue-700 to-yellow-400' },
  { id: 'gohan',       cat: 'anime', label: 'Gohan',           emoji: '📚', bg: 'from-purple-600 to-orange-400' },
  { id: 'zoro',        cat: 'anime', label: 'Zoro',            emoji: '⚔️', bg: 'from-green-700 to-slate-900' },
  { id: 'sanji',       cat: 'anime', label: 'Sanji',           emoji: '🚬', bg: 'from-yellow-400 to-slate-800' },
  { id: 'nami',        cat: 'anime', label: 'Nami',            emoji: '🍊', bg: 'from-orange-400 to-sky-500' },
  { id: 'itachi',      cat: 'anime', label: 'Itachi',          emoji: '🐦‍⬛', bg: 'from-red-700 to-slate-900' },
  { id: 'gaara',       cat: 'anime', label: 'Gaara',           emoji: '🏜️', bg: 'from-red-600 to-amber-700' },
  { id: 'eren',        cat: 'anime', label: 'Eren',            emoji: '🗝️', bg: 'from-emerald-700 to-amber-800' },
  { id: 'levi',        cat: 'anime', label: 'Livaï',           emoji: '🧹', bg: 'from-slate-600 to-emerald-900' },
  { id: 'mikasa',      cat: 'anime', label: 'Mikasa',          emoji: '🧣', bg: 'from-red-600 to-slate-800' },
  { id: 'gojo',        cat: 'anime', label: 'Gojo',            emoji: '🕶️', bg: 'from-sky-300 to-indigo-800' },
  { id: 'sukuna',      cat: 'anime', label: 'Sukuna',          emoji: '👹', bg: 'from-rose-700 to-slate-900' },
  { id: 'nezuko',      cat: 'anime', label: 'Nezuko',          emoji: '🎋', bg: 'from-pink-500 to-emerald-700' },
  { id: 'zenitsu',     cat: 'anime', label: 'Zenitsu',         emoji: '⚡', bg: 'from-yellow-400 to-orange-600' },
  { id: 'inosuke',     cat: 'anime', label: 'Inosuke',         emoji: '🐗', bg: 'from-slate-500 to-sky-700' },
  { id: 'deku',        cat: 'anime', label: 'Deku',            emoji: '💥', bg: 'from-green-600 to-slate-800' },
  { id: 'allmight',    cat: 'anime', label: 'All Might',       emoji: '💪', bg: 'from-blue-600 to-yellow-400' },
  { id: 'light',       cat: 'anime', label: 'Light Yagami',    emoji: '📓', bg: 'from-slate-900 to-red-800' },
  { id: 'lawliet',     cat: 'anime', label: 'L',               emoji: '🍰', bg: 'from-slate-200 to-slate-600' },
  { id: 'ryuk',        cat: 'anime', label: 'Ryuk',            emoji: '🍎', bg: 'from-slate-900 to-red-700' },
  { id: 'gon',         cat: 'anime', label: 'Gon',             emoji: '🎣', bg: 'from-green-600 to-slate-900' },
  { id: 'killua',      cat: 'anime', label: 'Killua',          emoji: '🛹', bg: 'from-slate-200 to-indigo-600' },
  { id: 'ichigo',      cat: 'anime', label: 'Ichigo',          emoji: '🍓', bg: 'from-orange-500 to-slate-900' },
  { id: 'edward',      cat: 'anime', label: 'Edward Elric',    emoji: '⚗️', bg: 'from-red-700 to-yellow-500' },
  { id: 'natsu',       cat: 'anime', label: 'Natsu',           emoji: '🔥', bg: 'from-rose-500 to-orange-500' },
  { id: 'denji',       cat: 'anime', label: 'Denji',           emoji: '🪚', bg: 'from-orange-500 to-red-800' },
  { id: 'jotaro',      cat: 'anime', label: 'Jotaro',          emoji: '⭐', bg: 'from-indigo-900 to-yellow-500' },
  { id: 'sailormoon',  cat: 'anime', label: 'Sailor Moon',     emoji: '🌙', bg: 'from-pink-400 to-blue-500' },
  { id: 'onizuka',     cat: 'anime', label: 'Onizuka',         emoji: '🏍️', bg: 'from-yellow-400 to-slate-800' },
  { id: 'anya',        cat: 'anime', label: 'Anya',            emoji: '🥜', bg: 'from-pink-300 to-slate-700' },

  // ───── 🎮 Jeux vidéo (suite) ─────
  { id: 'kirby',       cat: 'gaming', label: 'Kirby',          emoji: '🌸', bg: 'from-pink-300 to-pink-500' },
  { id: 'yoshi',       cat: 'gaming', label: 'Yoshi',          emoji: '🦖', bg: 'from-green-400 to-red-500' },
  { id: 'dk',          cat: 'gaming', label: 'Donkey Kong',    emoji: '🦍', bg: 'from-amber-700 to-red-600' },
  { id: 'bowser',      cat: 'gaming', label: 'Bowser',         emoji: '🐢', bg: 'from-green-600 to-orange-500' },
  { id: 'peach',       cat: 'gaming', label: 'Peach',          emoji: '🍑', bg: 'from-pink-400 to-yellow-400' },
  { id: 'zelda',       cat: 'gaming', label: 'Zelda',          emoji: '🔺', bg: 'from-yellow-400 to-indigo-600' },
  { id: 'steve',       cat: 'gaming', label: 'Steve',          emoji: '⛏️', bg: 'from-sky-500 to-emerald-700' },
  { id: 'geralt',      cat: 'gaming', label: 'Geralt',         emoji: '🐺', bg: 'from-slate-400 to-slate-800' },
  { id: 'ezio',        cat: 'gaming', label: 'Ezio',           emoji: '🦅', bg: 'from-slate-100 to-red-700' },
  { id: 'samus',       cat: 'gaming', label: 'Samus',          emoji: '🚀', bg: 'from-orange-500 to-red-700' },
  { id: 'cloud',       cat: 'gaming', label: 'Cloud',          emoji: '🗡️', bg: 'from-sky-400 to-slate-700' },
  { id: 'jinx',        cat: 'gaming', label: 'Jinx',           emoji: '💣', bg: 'from-sky-400 to-pink-600' },

  // ───── 🎬 Films & séries (suite) ─────
  { id: 'harry',       cat: 'cinema', label: 'Harry Potter',   emoji: '⚡', bg: 'from-red-700 to-yellow-500' },
  { id: 'hermione',    cat: 'cinema', label: 'Hermione',       emoji: '📖', bg: 'from-red-700 to-amber-500' },
  { id: 'voldemort',   cat: 'cinema', label: 'Voldemort',      emoji: '🐍', bg: 'from-emerald-800 to-slate-900' },
  { id: 'gandalf',     cat: 'cinema', label: 'Gandalf',        emoji: '🧙‍♂️', bg: 'from-slate-300 to-slate-600' },
  { id: 'gollum',      cat: 'cinema', label: 'Gollum',         emoji: '💍', bg: 'from-amber-300 to-slate-700' },
  { id: 'shrek',       cat: 'cinema', label: 'Shrek',          emoji: '🧅', bg: 'from-lime-500 to-amber-800' },
  { id: 'dobby',       cat: 'cinema', label: 'Dobby',          emoji: '🧦', bg: 'from-amber-200 to-emerald-700' },
  { id: 'walter',      cat: 'cinema', label: 'Walter White',   emoji: '🧪', bg: 'from-emerald-700 to-yellow-600' },
  { id: 'eleven',      cat: 'cinema', label: 'Eleven',         emoji: '🧇', bg: 'from-red-700 to-slate-900' },
  { id: 'wednesday',   cat: 'cinema', label: 'Mercredi',       emoji: '🖤', bg: 'from-slate-800 to-purple-900' },
  { id: 'shelby',      cat: 'cinema', label: 'Tommy Shelby',   emoji: '🎩', bg: 'from-slate-700 to-slate-900' },
  { id: 'jonsnow',     cat: 'cinema', label: 'Jon Snow',       emoji: '🐺', bg: 'from-slate-200 to-slate-800' },
  { id: 'daenerys',    cat: 'cinema', label: 'Daenerys',       emoji: '🐉', bg: 'from-slate-100 to-red-700' },
  { id: 'ted',         cat: 'cinema', label: 'Ted',            emoji: '🧸', bg: 'from-amber-500 to-amber-800' },

  // ───── 😀 Smileys / Autres ─────
  { id: 'face_grin',   cat: 'misc', label: 'Sourire',     emoji: '😀', bg: 'from-yellow-400 to-orange-500' },
  { id: 'face_cool',   cat: 'misc', label: 'Cool',        emoji: '😎', bg: 'from-amber-500 to-amber-700' },
  { id: 'face_devil',  cat: 'misc', label: 'Diable',      emoji: '😈', bg: 'from-purple-500 to-red-700' },
  { id: 'face_party',  cat: 'misc', label: 'Fête',        emoji: '🥳', bg: 'from-yellow-400 to-pink-500' },
  { id: 'face_star',   cat: 'misc', label: 'Étoile',      emoji: '🤩', bg: 'from-yellow-400 to-purple-500' },
  { id: 'face_heart',  cat: 'misc', label: 'Amoureux',    emoji: '😍', bg: 'from-rose-400 to-red-500' },
  { id: 'face_robot',  cat: 'misc', label: 'Robot face',  emoji: '🤖', bg: 'from-slate-500 to-cyan-500' },
  { id: 'face_clown',  cat: 'misc', label: 'Clown',       emoji: '🤡', bg: 'from-red-500 to-yellow-400' },
  { id: 'face_alien',  cat: 'misc', label: 'Alien face',  emoji: '👽', bg: 'from-emerald-400 to-purple-700' },
  { id: 'face_skull',  cat: 'misc', label: 'Crâne',       emoji: '💀', bg: 'from-slate-500 to-slate-800' },
  { id: 'face_ghost',  cat: 'misc', label: 'Fantôme',     emoji: '👻', bg: 'from-slate-300 to-purple-500' },
  { id: 'face_poo',    cat: 'misc', label: 'Caca',        emoji: '💩', bg: 'from-amber-700 to-amber-900' },
];

// ───── Avatars perso : images déposées dans client/avatars/ (voir scripts/avatars.mjs) ─────
const generated = import.meta.glob('../generated/customAvatars.json', { eager: true, import: 'default' });
const CUSTOM = Object.values(generated)[0] || { categories: [], avatars: [], builtin: {} };
const PHOTOS = CUSTOM.builtin || {};

/** Personnages ajoutés depuis l'admin (client/avatar-photos/characters.json). */
const addedFiles = import.meta.glob('../../avatar-photos/characters.json', { eager: true, import: 'default' });
const ADDED = (Object.values(addedFiles)[0] || []).filter((c) => c && c.id && c.label && c.cat);
const addedAvatar = (c) => ({ id: c.id, cat: c.cat, label: c.label, emoji: '🖼️', bg: 'from-slate-600 to-slate-800', added: true });

/** Catégories de personnages : on n'y montre que des photos, jamais d'emoji. */
export const CHARACTER_CATEGORIES = new Set(['marvel', 'dc', 'disney', 'simpsons', 'starwars', 'anime', 'gaming', 'cinema']);

const catIndex = (id) => BUILTIN_CATEGORIES.findIndex((c) => c.id === id);
const byLabel = (a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });

/*
 * Les listes ci-dessous sont recalculées sur place quand l'admin ajoute un personnage
 * (voir loadLiveAvatars) : on garde les mêmes tableaux pour que tous les imports restent valides.
 */
/** Avatars intégrés (+ ajoutés depuis l'admin), avec leur photo quand il y en a une. Triés par nom. */
export const BUILTIN_WITH_PHOTOS = [];
/** Onglets : d'abord ⭐ Perso / dossiers perso, puis les catégories intégrées par ordre alphabétique (onglets vides masqués). */
export const AVATAR_CATEGORIES = [];
export const AVATARS = [];
const ALL_AVATARS = [];

let live = { enabled: false, characters: [], images: {} };
const liveImg = (id, ver) => `${SERVER_URL}/avatars/live/${encodeURIComponent(id)}?v=${ver}`;

function rebuild() {
  const liveIds = new Set(live.characters.map((c) => c.id));
  const known = new Set(BUILTIN_AVATARS.map((a) => a.id));
  const added = [
    ...ADDED.filter((c) => !known.has(c.id) && (!live.enabled || liveIds.has(c.id))), // supprimé depuis l'admin → masqué tout de suite
    ...live.characters.filter((c) => !known.has(c.id) && !ADDED.some((a) => a.id === c.id)),
  ].map((c) => ({ ...addedAvatar(c), ...(live.characters.find((l) => l.id === c.id) || {}) }));
  const builtin = [...BUILTIN_AVATARS, ...added].map((a) => {
    let out = PHOTOS[a.id] ? { ...a, ...PHOTOS[a.id], builtinPhoto: true } : a;
    if (live.images[a.id]) out = { ...out, img: liveImg(a.id, live.images[a.id]) };
    else if (!out.img && a.added && live.enabled) out = { ...out, img: liveImg(a.id, 'repo') };
    return out;
  }).sort((a, b) => catIndex(a.cat) - catIndex(b.cat) || byLabel(a, b));
  /** Choisissables : un personnage sans photo n'est pas proposé (il reste affichable pour qui l'a déjà). */
  const pickable = builtin.filter((a) => a.img || !CHARACTER_CATEGORIES.has(a.cat));
  const cats = [...BUILTIN_CATEGORIES].sort(byLabel);
  BUILTIN_WITH_PHOTOS.splice(0, Infinity, ...builtin);
  AVATAR_CATEGORIES.splice(0, Infinity, ...CUSTOM.categories, ...cats.filter((c) => pickable.some((a) => a.cat === c.id)));
  AVATARS.splice(0, Infinity, ...CUSTOM.avatars.map((a) => ({ ...a, bg: 'from-slate-600 to-slate-800', emoji: '🖼️' })), ...pickable);
  ALL_AVATARS.splice(0, Infinity, ...AVATARS, ...builtin.filter((a) => !pickable.includes(a)));
}
rebuild();

// ───── Mises à jour en direct (personnages ajoutés / photos changées depuis l'admin) ─────
const listeners = new Set();
let version = 0;
export function onAvatarsChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const avatarsVersion = () => version;

/** Récupère ce qui a été enregistré depuis l'admin et pas encore intégré au site. */
export async function loadLiveAvatars() {
  try {
    const r = await fetch(`${SERVER_URL}/avatars/live`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    live = { enabled: !!d.enabled, characters: Array.isArray(d.characters) ? d.characters : [], images: d.images || {} };
    rebuild();
    version += 1;
    listeners.forEach((fn) => fn(version));
  } catch { /* serveur injoignable : on garde la version du site */ }
}
if (typeof window !== 'undefined') loadLiveAvatars();

/** Avatar par défaut si rien de choisi (le 1er de la liste). */
export const DEFAULT_AVATAR_ID = 'face_grin';

/** Les photos envoyées par les joueurs : `photo:<hash>` (serveur) ou `photo:local` (pas encore envoyée). */
export const PHOTO_LOCAL = 'photo:local';
export function isPhoto(id) { return typeof id === 'string' && id.startsWith('photo:'); }
export function photoUrl(id) {
  if (id === PHOTO_LOCAL) { try { return localStorage.getItem('avatarPhoto'); } catch { return null; } }
  if (!isPhoto(id)) return null;
  return `${SERVER_URL}/photos/${id.slice(6)}`;
}

/** URL de l'image d'un avatar perso (`img:…`), sinon null. */
export function imageUrl(id) {
  if (typeof id !== 'string') return null;
  const a = ALL_AVATARS.find((x) => x.id === id);
  if (!a) unknownAvatar(id);
  return a?.img || null;
}

/** Avatar inconnu (personnage ajouté depuis l'admin après le chargement de la page) : on relit la liste, au plus toutes les 15 s. */
let lastRefresh = 0;
function unknownAvatar(id) {
  if (typeof id !== 'string' || !id || isPhoto(id) || id.startsWith('img:') || Date.now() - lastRefresh < 15000) return;
  lastRefresh = Date.now();
  loadLiveAvatars();
}

export function getAvatar(id) {
  const a = ALL_AVATARS.find((x) => x.id === id);
  if (!a) unknownAvatar(id);
  return a || ALL_AVATARS.find((x) => x.id === DEFAULT_AVATAR_ID);
}

/** Renvoie un avatar aléatoire (utile pour init un nouveau joueur). */
export function getRandomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

export function getAvatarsByCategory(catId) {
  return AVATARS.filter(a => a.cat === catId);
}
