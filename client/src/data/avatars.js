/**
 * Avatars du jeu — basés sur des emojis avec un gradient de fond.
 * Chaque avatar : { id, label, emoji, bg (gradient tailwind), cat }
 *
 * Pour ajouter un avatar : push une entrée à la fin de la catégorie
 * (l'`id` doit rester unique dans toute la liste).
 */

export const AVATAR_CATEGORIES = [
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

export const AVATARS = [
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

/** Avatar par défaut si rien de choisi (le 1er de la liste). */
export const DEFAULT_AVATAR_ID = 'face_grin';

export function getAvatar(id) {
  return AVATARS.find(a => a.id === id) || AVATARS.find(a => a.id === DEFAULT_AVATAR_ID);
}

/** Renvoie un avatar aléatoire (utile pour init un nouveau joueur). */
export function getRandomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

export function getAvatarsByCategory(catId) {
  return AVATARS.filter(a => a.cat === catId);
}
