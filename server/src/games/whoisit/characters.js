/**
 * Qui est-ce ? — personnages (les avatars avec photo du site) et leurs caractéristiques,
 * pour répondre automatiquement aux questions toutes prêtes et pour le mode « l'app devine ».
 *
 * Format : id: [genre, nature, dessin, cheveux, signes, couleur]
 *   genre    m (masculin) | f (féminin) | n (ni l'un ni l'autre)
 *   nature   h (humain) | a (animal) | r (robot / cyborg) | c (créature, dieu, alien, jouet…)
 *   dessin   1 = dessin animé, anime ou jeu vidéo | 0 = film / série avec acteurs
 *   cheveux  noir | brun | blond | roux | blanc | colore | aucun (chauve, casque, fourrure…)
 *   signes   M masque ou casque · H chapeau, casquette ou capuche · B barbe ou moustache · L lunettes
 *            V méchant · P pouvoirs ou magie · W arme · E enfant ou ado · C cape
 *   couleur  couleur qui domine sur lui : r rouge · b bleu · v vert · j jaune/orange · p violet/rose · n noir · w blanc/gris · m marron
 * Ce sont les looks les plus connus de chaque personnage.
 */
const T = {
  // Marvel
  ironman: ['m', 'h', 0, 'brun', 'MB', 'r'],
  hulk: ['m', 'c', 0, 'noir', 'P', 'v'],
  spiderman: ['m', 'h', 0, 'brun', 'MPE', 'r'],
  thor: ['m', 'c', 0, 'blond', 'BCPW', 'r'],
  captain: ['m', 'h', 0, 'blond', 'PW', 'b'],
  blackwidow: ['f', 'h', 0, 'roux', 'W', 'n'],
  blackpanth: ['m', 'h', 0, 'noir', 'MP', 'n'],
  wolverine: ['m', 'h', 0, 'noir', 'BPW', 'j'],
  deadpool: ['m', 'h', 0, 'aucun', 'MPW', 'r'],
  thanos: ['m', 'c', 0, 'aucun', 'VP', 'p'],
  loki: ['m', 'c', 0, 'noir', 'HVP', 'v'],
  doctorstr: ['m', 'h', 0, 'noir', 'BCP', 'r'],
  venom: ['m', 'c', 0, 'aucun', 'VP', 'n'],
  groot: ['m', 'c', 0, 'aucun', '', 'm'],
  rocket: ['m', 'a', 0, 'aucun', 'W', 'm'],
  // DC
  batman: ['m', 'h', 0, 'aucun', 'MC', 'n'],
  superman: ['m', 'c', 0, 'noir', 'CP', 'b'],
  wonderwoman: ['f', 'h', 0, 'noir', 'PW', 'r'],
  flash: ['m', 'h', 0, 'aucun', 'MP', 'r'],
  aquaman: ['m', 'h', 0, 'brun', 'BPW', 'j'],
  joker: ['m', 'h', 0, 'colore', 'V', 'p'],
  harley: ['f', 'h', 0, 'blond', 'VW', 'r'],
  cyborg: ['m', 'r', 0, 'aucun', 'P', 'w'],
  greenarr: ['m', 'h', 0, 'blond', 'BHW', 'v'],
  // Disney
  mickey: ['m', 'a', 1, 'aucun', '', 'n'],
  donald: ['m', 'a', 1, 'aucun', 'H', 'b'],
  goofy: ['m', 'a', 1, 'aucun', 'H', 'v'],
  elsa: ['f', 'h', 1, 'blond', 'P', 'b'],
  anna: ['f', 'h', 1, 'roux', '', 'p'],
  olaf: ['m', 'c', 1, 'aucun', '', 'w'],
  simba: ['m', 'a', 1, 'aucun', '', 'j'],
  stitch: ['m', 'c', 1, 'aucun', '', 'b'],
  ariel: ['f', 'c', 1, 'roux', '', 'v'],
  aladdin: ['m', 'h', 1, 'noir', '', 'p'],
  genie: ['m', 'c', 1, 'noir', 'BP', 'b'],
  buzz: ['m', 'c', 1, 'aucun', '', 'w'],
  woody: ['m', 'c', 1, 'brun', 'H', 'j'],
  wall_e: ['m', 'r', 1, 'aucun', '', 'j'],
  nemo: ['m', 'a', 1, 'aucun', 'E', 'j'],
  // Simpson
  homer: ['m', 'h', 1, 'aucun', '', 'w'],
  bart: ['m', 'h', 1, 'blond', 'E', 'r'],
  lisa: ['f', 'h', 1, 'blond', 'E', 'r'],
  marge: ['f', 'h', 1, 'colore', '', 'v'],
  maggie: ['f', 'h', 1, 'blond', 'E', 'b'],
  // Star Wars
  yoda: ['m', 'c', 0, 'blanc', 'PW', 'v'],
  vader: ['m', 'h', 0, 'aucun', 'MCVPW', 'n'],
  r2d2: ['n', 'r', 0, 'aucun', '', 'w'],
  chewbacca: ['m', 'c', 0, 'aucun', 'W', 'm'],
  mando: ['m', 'h', 0, 'aucun', 'MCW', 'w'],
  baby_yoda: ['m', 'c', 0, 'aucun', 'PE', 'v'],
  luke: ['m', 'h', 0, 'blond', 'PW', 'w'],
  leia: ['f', 'h', 0, 'brun', 'W', 'w'],
  // Anime
  goku: ['m', 'c', 1, 'noir', 'P', 'j'],
  naruto: ['m', 'h', 1, 'blond', 'PE', 'j'],
  pikachu: ['m', 'a', 1, 'aucun', 'P', 'j'],
  luffy: ['m', 'h', 1, 'noir', 'HP', 'r'],
  saitama: ['m', 'h', 1, 'aucun', 'CP', 'j'],
  totoro: ['n', 'c', 1, 'aucun', '', 'w'],
  kakashi: ['m', 'h', 1, 'blanc', 'MP', 'v'],
  sasuke: ['m', 'h', 1, 'noir', 'PWE', 'n'],
  tanjiro: ['m', 'h', 1, 'roux', 'WE', 'v'],
  vegeta: ['m', 'c', 1, 'noir', 'P', 'b'],
  gohan: ['m', 'c', 1, 'noir', 'P', 'p'],
  zoro: ['m', 'h', 1, 'colore', 'W', 'v'],
  sanji: ['m', 'h', 1, 'blond', 'B', 'n'],
  nami: ['f', 'h', 1, 'roux', '', 'b'],
  itachi: ['m', 'h', 1, 'noir', 'VP', 'n'],
  gaara: ['m', 'h', 1, 'roux', 'PE', 'r'],
  eren: ['m', 'h', 1, 'brun', 'PWE', 'm'],
  levi: ['m', 'h', 1, 'noir', 'W', 'm'],
  mikasa: ['f', 'h', 1, 'noir', 'W', 'r'],
  gojo: ['m', 'h', 1, 'blanc', 'LP', 'n'],
  sukuna: ['m', 'c', 1, 'colore', 'VP', 'w'],
  nezuko: ['f', 'c', 1, 'noir', 'PE', 'p'],
  zenitsu: ['m', 'h', 1, 'blond', 'WE', 'j'],
  inosuke: ['m', 'h', 1, 'aucun', 'MWE', 'm'],
  deku: ['m', 'h', 1, 'colore', 'PE', 'v'],
  allmight: ['m', 'h', 1, 'blond', 'P', 'b'],
  light: ['m', 'h', 1, 'brun', 'V', 'm'],
  lawliet: ['m', 'h', 1, 'noir', '', 'w'],
  ryuk: ['m', 'c', 1, 'noir', 'P', 'n'],
  gon: ['m', 'h', 1, 'noir', 'E', 'v'],
  killua: ['m', 'h', 1, 'blanc', 'PE', 'w'],
  ichigo: ['m', 'h', 1, 'roux', 'PW', 'n'],
  edward: ['m', 'h', 1, 'blond', 'PE', 'r'],
  natsu: ['m', 'h', 1, 'colore', 'P', 'w'],
  denji: ['m', 'h', 1, 'blond', 'P', 'n'],
  jotaro: ['m', 'h', 1, 'noir', 'HP', 'n'],
  sailormoon: ['f', 'h', 1, 'blond', 'PE', 'b'],
  onizuka: ['m', 'h', 1, 'blond', '', 'w'],
  anya: ['f', 'h', 1, 'colore', 'PE', 'n'],
  // Jeux vidéo
  mario: ['m', 'h', 1, 'brun', 'HB', 'r'],
  luigi: ['m', 'h', 1, 'brun', 'HB', 'v'],
  sonic: ['m', 'a', 1, 'aucun', '', 'b'],
  link: ['m', 'h', 1, 'blond', 'HW', 'v'],
  masterchief: ['m', 'h', 1, 'aucun', 'MW', 'v'],
  lara: ['f', 'h', 1, 'brun', 'W', 'b'],
  kratos: ['m', 'c', 1, 'aucun', 'BPW', 'w'],
  creeper: ['n', 'c', 1, 'aucun', 'V', 'v'],
  pacman: ['m', 'c', 1, 'aucun', '', 'j'],
  crash: ['m', 'a', 1, 'aucun', '', 'j'],
  kirby: ['n', 'c', 1, 'aucun', 'P', 'p'],
  yoshi: ['m', 'a', 1, 'aucun', '', 'v'],
  dk: ['m', 'a', 1, 'aucun', '', 'm'],
  bowser: ['m', 'c', 1, 'roux', 'V', 'v'],
  peach: ['f', 'h', 1, 'blond', 'H', 'p'],
  zelda: ['f', 'h', 1, 'blond', 'P', 'w'],
  steve: ['m', 'h', 1, 'brun', '', 'b'],
  geralt: ['m', 'h', 1, 'blanc', 'BPW', 'n'],
  ezio: ['m', 'h', 1, 'brun', 'BHW', 'w'],
  samus: ['f', 'h', 1, 'aucun', 'MW', 'j'],
  cloud: ['m', 'h', 1, 'blond', 'W', 'n'],
  jinx: ['f', 'h', 1, 'colore', 'VW', 'b'],
  // Cinéma & séries
  jacksparrow: ['m', 'h', 0, 'brun', 'HBW', 'm'],
  indiana: ['m', 'h', 0, 'brun', 'HW', 'm'],
  neo: ['m', 'h', 0, 'noir', 'LP', 'n'],
  jamesbond: ['m', 'h', 0, 'brun', 'W', 'n'],
  rocky: ['m', 'h', 0, 'brun', '', 'r'],
  terminator: ['m', 'r', 0, 'brun', 'LW', 'n'],
  harry: ['m', 'h', 0, 'noir', 'LPE', 'n'],
  hermione: ['f', 'h', 0, 'brun', 'PE', 'n'],
  voldemort: ['m', 'h', 0, 'aucun', 'VP', 'n'],
  gandalf: ['m', 'h', 0, 'blanc', 'BHPW', 'w'],
  gollum: ['m', 'c', 0, 'aucun', '', 'w'],
  shrek: ['m', 'c', 1, 'aucun', '', 'v'],
  dobby: ['m', 'c', 0, 'aucun', 'P', 'm'],
  walter: ['m', 'h', 0, 'aucun', 'BLV', 'j'],
  eleven: ['f', 'h', 0, 'brun', 'PE', 'p'],
  wednesday: ['f', 'h', 0, 'noir', 'E', 'n'],
  shelby: ['m', 'h', 0, 'brun', 'HW', 'n'],
  jonsnow: ['m', 'h', 0, 'noir', 'BW', 'n'],
  daenerys: ['f', 'h', 0, 'blond', '', 'w'],
  ted: ['m', 'c', 0, 'aucun', '', 'm'],
};

const NAMES = {
  ironman: 'Iron Man', hulk: 'Hulk', spiderman: 'Spider-Man', thor: 'Thor', captain: 'Captain America', blackwidow: 'Black Widow',
  blackpanth: 'Black Panther', wolverine: 'Wolverine', deadpool: 'Deadpool', thanos: 'Thanos', loki: 'Loki', doctorstr: 'Doctor Strange',
  venom: 'Venom', groot: 'Groot', rocket: 'Rocket', batman: 'Batman', superman: 'Superman', wonderwoman: 'Wonder Woman', flash: 'Flash',
  aquaman: 'Aquaman', joker: 'Joker', harley: 'Harley Quinn', cyborg: 'Cyborg', greenarr: 'Green Arrow', mickey: 'Mickey', donald: 'Donald',
  goofy: 'Dingo', elsa: 'Elsa', anna: 'Anna', olaf: 'Olaf', simba: 'Simba', stitch: 'Stitch', ariel: 'Ariel', aladdin: 'Aladdin',
  genie: 'Génie', buzz: "Buzz l'Éclair", woody: 'Woody', wall_e: 'Wall-E', nemo: 'Némo', homer: 'Homer', bart: 'Bart', lisa: 'Lisa',
  marge: 'Marge', maggie: 'Maggie', yoda: 'Yoda', vader: 'Dark Vador', r2d2: 'R2-D2', chewbacca: 'Chewbacca', mando: 'Mandalorien',
  baby_yoda: 'Grogu', luke: 'Luke Skywalker', leia: 'Leia', goku: 'Goku', naruto: 'Naruto', pikachu: 'Pikachu', luffy: 'Luffy',
  saitama: 'Saitama', totoro: 'Totoro', kakashi: 'Kakashi', sasuke: 'Sasuke', tanjiro: 'Tanjiro', vegeta: 'Vegeta', gohan: 'Gohan',
  zoro: 'Zoro', sanji: 'Sanji', nami: 'Nami', itachi: 'Itachi', gaara: 'Gaara', eren: 'Eren', levi: 'Livaï', mikasa: 'Mikasa', gojo: 'Gojo',
  sukuna: 'Sukuna', nezuko: 'Nezuko', zenitsu: 'Zenitsu', inosuke: 'Inosuke', deku: 'Deku', allmight: 'All Might', light: 'Light Yagami',
  lawliet: 'L', ryuk: 'Ryuk', gon: 'Gon', killua: 'Killua', ichigo: 'Ichigo', edward: 'Edward Elric', natsu: 'Natsu', denji: 'Denji',
  jotaro: 'Jotaro', sailormoon: 'Sailor Moon', onizuka: 'Onizuka', anya: 'Anya', mario: 'Mario', luigi: 'Luigi', sonic: 'Sonic',
  link: 'Link', masterchief: 'Master Chief', lara: 'Lara Croft', kratos: 'Kratos', creeper: 'Creeper', pacman: 'Pac-Man', crash: 'Crash',
  kirby: 'Kirby', yoshi: 'Yoshi', dk: 'Donkey Kong', bowser: 'Bowser', peach: 'Peach', zelda: 'Zelda', steve: 'Steve', geralt: 'Geralt',
  ezio: 'Ezio', samus: 'Samus', cloud: 'Cloud', jinx: 'Jinx', jacksparrow: 'Jack Sparrow', indiana: 'Indiana Jones', neo: 'Neo',
  jamesbond: 'James Bond', rocky: 'Rocky', terminator: 'Terminator', harry: 'Harry Potter', hermione: 'Hermione', voldemort: 'Voldemort',
  gandalf: 'Gandalf', gollum: 'Gollum', shrek: 'Shrek', dobby: 'Dobby', walter: 'Walter White', eleven: 'Eleven', wednesday: 'Mercredi',
  shelby: 'Tommy Shelby', jonsnow: 'Jon Snow', daenerys: 'Daenerys', ted: 'Ted',
};

/** Univers (même découpage que les onglets d'avatars). */
const CAT = {};
for (const id of ['ironman', 'hulk', 'spiderman', 'thor', 'captain', 'blackwidow', 'blackpanth', 'wolverine', 'deadpool', 'thanos', 'loki', 'doctorstr', 'venom', 'groot', 'rocket']) CAT[id] = 'marvel';
for (const id of ['batman', 'superman', 'wonderwoman', 'flash', 'aquaman', 'joker', 'harley', 'cyborg', 'greenarr']) CAT[id] = 'dc';
for (const id of ['mickey', 'donald', 'goofy', 'elsa', 'anna', 'olaf', 'simba', 'stitch', 'ariel', 'aladdin', 'genie', 'buzz', 'woody', 'wall_e', 'nemo']) CAT[id] = 'disney';
for (const id of ['homer', 'bart', 'lisa', 'marge', 'maggie']) CAT[id] = 'simpsons';
for (const id of ['yoda', 'vader', 'r2d2', 'chewbacca', 'mando', 'baby_yoda', 'luke', 'leia']) CAT[id] = 'starwars';
for (const id of ['mario', 'luigi', 'sonic', 'link', 'masterchief', 'lara', 'kratos', 'creeper', 'pacman', 'crash', 'kirby', 'yoshi', 'dk', 'bowser', 'peach', 'zelda', 'steve', 'geralt', 'ezio', 'samus', 'cloud', 'jinx']) CAT[id] = 'gaming';
for (const id of ['jacksparrow', 'indiana', 'neo', 'jamesbond', 'rocky', 'terminator', 'harry', 'hermione', 'voldemort', 'gandalf', 'gollum', 'shrek', 'dobby', 'walter', 'eleven', 'wednesday', 'shelby', 'jonsnow', 'daenerys', 'ted']) CAT[id] = 'cinema';
for (const id of Object.keys(T)) if (!CAT[id]) CAT[id] = 'anime';

export const UNIVERSES = [
  { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: 'cinema', label: 'Cinéma & séries', icon: '🎬' },
  { id: 'dc', label: 'DC', icon: '🦇' },
  { id: 'disney', label: 'Disney & Pixar', icon: '🏰' },
  { id: 'gaming', label: 'Jeux vidéo', icon: '🎮' },
  { id: 'marvel', label: 'Marvel', icon: '🦸' },
  { id: 'simpsons', label: 'Simpson', icon: '🍩' },
  { id: 'starwars', label: 'Star Wars', icon: '⚔️' },
];

export const CHARACTERS = Object.entries(T).map(([id, [g, k, d, hair, flags, color]]) => ({
  id, name: NAMES[id] || id, cat: CAT[id],
  g, k, drawn: !!d, hair, flags: new Set(flags.split('')), color,
}));
export const CHAR_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

/** Questions toutes prêtes : l'app y répond toute seule. `test(c)` → vrai / faux. */
const has = (f) => (c) => c.flags.has(f);
export const QUESTIONS = [
  { id: 'male', group: 'Qui', text: 'Est-ce un personnage masculin ?', ask: 'C\'est un personnage masculin ?', test: (c) => c.g === 'm' },
  { id: 'female', group: 'Qui', text: 'Est-ce un personnage féminin ?', ask: 'C\'est un personnage féminin ?', test: (c) => c.g === 'f' },
  { id: 'human', group: 'Qui', text: 'Est-ce un humain ?', ask: 'C\'est un humain ?', test: (c) => c.k === 'h' },
  { id: 'animal', group: 'Qui', text: 'Est-ce un animal ?', ask: 'C\'est un animal ?', test: (c) => c.k === 'a' },
  { id: 'robot', group: 'Qui', text: 'Est-ce un robot ou un cyborg ?', ask: 'C\'est un robot ou un cyborg ?', test: (c) => c.k === 'r' },
  { id: 'creature', group: 'Qui', text: 'Est-ce une créature, un dieu ou un alien ?', ask: 'C\'est une créature (dieu, alien, monstre, jouet…) ?', test: (c) => c.k === 'c' },
  { id: 'kid', group: 'Qui', text: 'Est-ce un enfant ou un ado ?', ask: 'C\'est un enfant ou un ado ?', test: has('E') },
  { id: 'villain', group: 'Qui', text: 'Est-ce un méchant ?', ask: 'C\'est un méchant ?', test: has('V') },
  { id: 'powers', group: 'Qui', text: 'A-t-il des pouvoirs ou de la magie ?', ask: 'Il a des pouvoirs ou de la magie ?', test: has('P') },
  { id: 'drawn', group: 'D\'où', text: 'Vient-il d\'un dessin animé, d\'un anime ou d\'un jeu vidéo ?', ask: 'Il vient d\'un dessin animé, d\'un anime ou d\'un jeu vidéo ?', test: (c) => c.drawn },
  ...UNIVERSES.map((u) => ({ id: `u_${u.id}`, group: 'D\'où', text: `Vient-il de l'univers ${u.label} ?`, ask: `Il vient de l'univers ${u.label} ?`, test: (c) => c.cat === u.id, universe: u.id })),
  { id: 'h_noir', group: 'Look', text: 'A-t-il les cheveux noirs ?', ask: 'Il a les cheveux noirs ?', test: (c) => c.hair === 'noir' },
  { id: 'h_brun', group: 'Look', text: 'A-t-il les cheveux bruns ?', ask: 'Il a les cheveux bruns ?', test: (c) => c.hair === 'brun' },
  { id: 'h_blond', group: 'Look', text: 'A-t-il les cheveux blonds ?', ask: 'Il a les cheveux blonds ?', test: (c) => c.hair === 'blond' },
  { id: 'h_roux', group: 'Look', text: 'A-t-il les cheveux roux ou orange ?', ask: 'Il a les cheveux roux ou orange ?', test: (c) => c.hair === 'roux' },
  { id: 'h_blanc', group: 'Look', text: 'A-t-il les cheveux blancs ou gris ?', ask: 'Il a les cheveux blancs ou gris ?', test: (c) => c.hair === 'blanc' },
  { id: 'h_colore', group: 'Look', text: 'A-t-il les cheveux colorés (bleu, rose, vert…) ?', ask: 'Il a les cheveux colorés (bleu, rose, vert…) ?', test: (c) => c.hair === 'colore' },
  { id: 'h_aucun', group: 'Look', text: 'Est-il sans cheveux visibles (chauve, casque, fourrure…) ?', ask: 'On ne voit pas ses cheveux (chauve, casque, fourrure…) ?', test: (c) => c.hair === 'aucun' },
  { id: 'mask', group: 'Look', text: 'Porte-t-il un masque ou un casque ?', ask: 'Il porte un masque ou un casque ?', test: has('M') },
  { id: 'hat', group: 'Look', text: 'Porte-t-il un chapeau, une casquette ou une capuche ?', ask: 'Il porte un chapeau, une casquette ou une capuche ?', test: has('H') },
  { id: 'beard', group: 'Look', text: 'A-t-il une barbe ou une moustache ?', ask: 'Il a une barbe ou une moustache ?', test: has('B') },
  { id: 'glasses', group: 'Look', text: 'Porte-t-il des lunettes ?', ask: 'Il porte des lunettes ?', test: has('L') },
  { id: 'cape', group: 'Look', text: 'Porte-t-il une cape ?', ask: 'Il porte une cape ?', test: has('C') },
  { id: 'c_r', group: 'Couleur', text: 'Sa couleur principale est-elle le rouge ?', ask: 'Sa couleur principale, c\'est le rouge ?', test: (c) => c.color === 'r' },
  { id: 'c_b', group: 'Couleur', text: 'Sa couleur principale est-elle le bleu ?', ask: 'Sa couleur principale, c\'est le bleu ?', test: (c) => c.color === 'b' },
  { id: 'c_v', group: 'Couleur', text: 'Sa couleur principale est-elle le vert ?', ask: 'Sa couleur principale, c\'est le vert ?', test: (c) => c.color === 'v' },
  { id: 'c_j', group: 'Couleur', text: 'Sa couleur principale est-elle le jaune ou orange ?', ask: 'Sa couleur principale, c\'est le jaune ou orange ?', test: (c) => c.color === 'j' },
  { id: 'c_p', group: 'Couleur', text: 'Sa couleur principale est-elle le violet ou rose ?', ask: 'Sa couleur principale, c\'est le violet ou rose ?', test: (c) => c.color === 'p' },
  { id: 'c_n', group: 'Couleur', text: 'Sa couleur principale est-elle le noir ?', ask: 'Sa couleur principale, c\'est le noir ?', test: (c) => c.color === 'n' },
  { id: 'c_w', group: 'Couleur', text: 'Sa couleur principale est-elle le blanc ou gris ?', ask: 'Sa couleur principale, c\'est le blanc ou gris ?', test: (c) => c.color === 'w' },
  { id: 'c_m', group: 'Couleur', text: 'Sa couleur principale est-elle le marron ?', ask: 'Sa couleur principale, c\'est le marron ?', test: (c) => c.color === 'm' },
  { id: 'weapon', group: 'Look', text: 'A-t-il une arme ?', ask: 'Il a une arme (épée, pistolet, arc…) ?', test: has('W') },
];
export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

/** Liste publique (sans les fonctions) envoyée aux joueurs. */
export const QUESTION_LIST = QUESTIONS.map(({ id, group, text, universe }) => ({ id, group, text, universe }));

export function charactersFor(universes) {
  const set = new Set(universes && universes.length ? universes : UNIVERSES.map((u) => u.id));
  return CHARACTERS.filter((c) => set.has(c.cat));
}
