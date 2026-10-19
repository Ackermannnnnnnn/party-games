/**
 * Catalogue du Blind Test.
 *
 * Chaque entrée décrit un extrait musical trouvé sur Deezer au moment de la partie
 * (extrait officiel de 30 s). On ne stocke jamais d'audio : seulement de quoi le retrouver.
 *
 * Univers :
 *   film · serie · anime  → on doit trouver l'ŒUVRE (titre du film / de la série / de l'anime)
 *   musique               → on doit trouver le TITRE et l'ARTISTE (points pour chacun)
 *
 * Popularité : 1 = grand public · 2 = niche
 *
 * Format compact :
 *   W(œuvre, [variantes acceptées], artiste de l'extrait, titre de l'extrait, popularité, extra?)
 *   M(artiste, titre, popularité, extra?)
 *   extra = { aa: [variantes artiste], as: [variantes titre], q: 'requête Deezer forcée', dz: idDeezer, tags: [] }
 *
 * Pour vérifier que tout est bien trouvé sur Deezer : `node tools/blindtest-check.mjs`
 */

const W = (answer, alt, artist, song, pop, extra = {}) => ({ answer, alt, artist, song, pop, ...extra });
const M = (artist, song, pop, extra = {}) => ({ answer: song, artist, song, pop, ...extra });

// ═══════════════════════════════════════════════════════════════
// 🎬 FILMS — thèmes et chansons de films
// ═══════════════════════════════════════════════════════════════
const FILMS = [
  W('Star Wars', ['La Guerre des étoiles'], 'John Williams', 'Main Title', 1, { q: 'John Williams Star Wars Main Title' }),
  W('Star Wars', ["L'Empire contre-attaque", 'La Guerre des étoiles'], 'John Williams', 'The Imperial March', 1, { as: ["Darth Vader's Theme"] }),
  W('Indiana Jones', ["Les Aventuriers de l'arche perdue", 'Raiders of the Lost Ark'], 'John Williams', 'Raiders March', 1),
  W('Jurassic Park', [], 'John Williams', 'Theme from Jurassic Park', 1),
  W('Harry Potter', ["Harry Potter à l'école des sorciers"], 'John Williams', "Hedwig's Theme", 1),
  W('Les Dents de la mer', ['Jaws'], 'John Williams', 'Main Title (Theme from Jaws)', 1, { q: 'John Williams Jaws Main Title' }),
  W('E.T.', ["E.T. l'extra-terrestre", 'ET'], 'John Williams', 'Flying Theme', 2, { q: 'John Williams E.T. Flying Theme' }),
  W('Superman', [], 'John Williams', 'Superman March', 2),
  W('Titanic', [], 'Céline Dion', 'My Heart Will Go On', 1),
  W('Le Roi lion', ['The Lion King', 'Roi lion'], 'Carmen Twillie', 'Circle of Life', 1, { q: 'Circle of Life Lion King Carmen Twillie Lebo M' }),
  W('La Reine des neiges', ['Frozen'], 'Anaïs Delva', 'Libérée, délivrée', 1),
  W('Pirates des Caraïbes', ['Pirates of the Caribbean'], 'Klaus Badelt', "He's a Pirate", 1),
  W('Le Seigneur des anneaux', ['The Lord of the Rings', "La Communauté de l'anneau", 'Seigneur des anneaux'], 'Howard Shore', 'Concerning the Hobbits', 1),
  W('Gladiator', [], 'Hans Zimmer', 'Now We Are Free', 1, { aa: ['Lisa Gerrard'] }),
  W('Inception', [], 'Hans Zimmer', 'Time', 1, { q: 'Hans Zimmer Time Inception' }),
  W('Interstellar', [], 'Hans Zimmer', 'Cornfield Chase', 1),
  W('Rocky', [], 'Bill Conti', 'Gonna Fly Now', 1),
  W('Rocky', ['Rocky III', 'Rocky 3'], 'Survivor', 'Eye of the Tiger', 1),
  W('Le Parrain', ['The Godfather'], 'Nino Rota', 'The Godfather Waltz', 1, { q: 'Nino Rota Godfather Love Theme' }),
  W('Mission impossible', ['Mission: Impossible'], 'Lalo Schifrin', 'Mission: Impossible Theme', 1),
  W('James Bond', ['007'], 'Monty Norman', 'James Bond Theme', 1),
  W('Skyfall', ['James Bond', '007'], 'Adele', 'Skyfall', 1),
  W('Retour vers le futur', ['Back to the Future'], 'Alan Silvestri', 'Back to the Future', 1, { q: 'Alan Silvestri Back to the Future Theme' }),
  W('SOS Fantômes', ['Ghostbusters'], 'Ray Parker Jr.', 'Ghostbusters', 1),
  W('Le Bon, la Brute et le Truand', ['The Good, the Bad and the Ugly', 'Le Bon la Brute et le Truand'], 'Ennio Morricone', 'The Good, the Bad and the Ugly', 1),
  W("Il était une fois dans l'Ouest", ['Once Upon a Time in the West'], 'Ennio Morricone', "L'uomo dell'armonica", 2, { q: "Ennio Morricone Once Upon a Time in the West Man with a Harmonica" }),
  W('Le Professionnel', [], 'Ennio Morricone', 'Chi Mai', 2),
  W("Le Fabuleux Destin d'Amélie Poulain", ['Amélie Poulain', 'Amélie'], 'Yann Tiersen', "Comptine d'un autre été, l'après-midi", 1),
  W('Intouchables', [], 'Ludovico Einaudi', 'Fly', 2),
  W('Pulp Fiction', [], 'Dick Dale', 'Misirlou', 1),
  W('Kill Bill', [], 'Tomoyasu Hotei', 'Battle Without Honor or Humanity', 1),
  W('Top Gun', [], 'Kenny Loggins', 'Danger Zone', 1),
  W('Footloose', [], 'Kenny Loggins', 'Footloose', 2),
  W('Dirty Dancing', [], 'Bill Medley', "(I've Had) The Time of My Life", 1, { aa: ['Jennifer Warnes'], q: "Bill Medley Jennifer Warnes Time of My Life" }),
  W('Grease', [], 'John Travolta', "You're the One That I Want", 1, { aa: ['Olivia Newton-John'] }),
  W('Flashdance', [], 'Irene Cara', 'Flashdance... What a Feeling', 2),
  W('Le Livre de la jungle', ['The Jungle Book', 'Livre de la jungle'], 'Phil Harris', 'Il en faut peu pour être heureux', 1, { q: 'Il en faut peu pour être heureux Livre de la jungle' }),
  W('Aladdin', [], 'Paolo Domingo', 'Ce rêve bleu', 1, { q: 'Ce rêve bleu Aladdin' }),
  W('La Petite Sirène', ['The Little Mermaid', 'Petite Sirène'], 'Henri Salvador', "Sous l'océan", 1, { q: "Sous l'océan Petite Sirène" }),
  W('Encanto', [], 'Encanto', 'Ne parlons pas de Bruno', 1, { q: 'Ne parlons pas de Bruno Encanto' }),
  W('Vaiana', ['Moana'], 'Cerise Calixte', 'Le bleu lumière', 1, { q: 'Le bleu lumière Vaiana' }),
  W('Toy Story', [], 'Randy Newman', "You've Got a Friend in Me", 1),
  W('Shrek', [], 'Smash Mouth', 'All Star', 1),
  W('Hercule', ['Hercules'], 'Hercule', 'De zéro en héros', 1, { q: 'De zéro en héros Hercule' }),
  W('Mulan', [], 'Mulan', 'Comme un homme', 1, { q: 'Comme un homme Mulan' }),
  W('Tarzan', [], 'Phil Collins', "You'll Be in My Heart", 1),
  W('La Belle et la Bête', ['Beauty and the Beast', 'Belle et la Bête'], 'Céline Dion', 'Beauty and the Beast', 1, { aa: ['Peabo Bryson'] }),
  W('Pocahontas', [], 'Pocahontas', "L'air du vent", 1, { q: "L'air du vent Pocahontas" }),
  W('Mary Poppins', [], 'Julie Andrews', 'Supercalifragilisticexpialidocious', 1),
  W('Les Choristes', ['Choristes'], 'Les Petits Chanteurs de Saint-Marc', 'Vois sur ton chemin', 1),
  W('Les Indestructibles', ['The Incredibles', 'Indestructibles'], 'Michael Giacchino', 'The Incredits', 2),
  W('Là-haut', ['Up'], 'Michael Giacchino', 'Married Life', 2),
  W('Coco', [], 'Anthony Gonzalez', 'Un Poco Loco', 2),
  W('Requiem for a Dream', [], 'Clint Mansell', 'Lux Aeterna', 2),
  W('Psychose', ['Psycho'], 'Bernard Herrmann', 'Prelude', 2, { q: 'Bernard Herrmann Psycho Prelude' }),
  W("2001 : l'odyssée de l'espace", ["2001 l'odyssée de l'espace", '2001', 'A Space Odyssey'], 'Richard Strauss', 'Also sprach Zarathustra', 2),
  W('Le Grand Bleu', ['The Big Blue', 'Grand Bleu'], 'Éric Serra', 'The Big Blue Overture', 2, { q: 'Eric Serra Grand Bleu' }),
  W('Les Visiteurs', ['Visiteurs'], 'Éric Lévi', 'Enae Volare Mezzo', 2, { q: 'Eric Levi Les Visiteurs' }),
  W('Les Aventures de Rabbi Jacob', ['Rabbi Jacob'], 'Vladimir Cosma', 'La danse de Rabbi Jacob', 2),
  W('La Boum', ['Boum'], 'Richard Sanderson', 'Reality', 2),
  W('Avengers', ['The Avengers'], 'Alan Silvestri', 'The Avengers', 1),
  W('Spider-Man', [], 'Danny Elfman', 'Main Title', 2, { q: 'Danny Elfman Spider-Man Main Title' }),
  W('Batman', [], 'Danny Elfman', 'The Batman Theme', 2),
  W('Spider-Man : New Generation', ['Into the Spider-Verse', 'Spider-Man New Generation', 'Spider-Verse'], 'Post Malone', 'Sunflower', 1, { aa: ['Swae Lee'] }),
  W('Les Gardiens de la Galaxie', ['Guardians of the Galaxy', 'Gardiens de la Galaxie'], 'Blue Swede', 'Hooked on a Feeling', 2),
  W('Forrest Gump', [], 'Alan Silvestri', 'Feather Theme', 2),
  W('La La Land', [], 'Ryan Gosling', 'City of Stars', 1, { aa: ['Emma Stone'] }),
  W('The Greatest Showman', ['Greatest Showman'], 'Keala Settle', 'This Is Me', 1),
  W('Matrix', ['The Matrix'], 'Rob Dougan', 'Clubbed to Death', 2),
  W('Le Dernier des Mohicans', ['The Last of the Mohicans', 'Dernier des Mohicans'], 'Trevor Jones', 'Promentory', 2),
  W('Braveheart', [], 'James Horner', 'For the Love of a Princess', 2),
  W('Le Flic de Beverly Hills', ['Beverly Hills Cop', 'Flic de Beverly Hills'], 'Harold Faltermeyer', 'Axel F', 1),
  W('Ghost', [], 'The Righteous Brothers', 'Unchained Melody', 1),
  W('Bodyguard', ['The Bodyguard'], 'Whitney Houston', 'I Will Always Love You', 1),
  W('Pretty Woman', [], 'Roy Orbison', 'Oh, Pretty Woman', 1),
  W('Trainspotting', [], 'Underworld', 'Born Slippy .NUXX', 2),
  W('Drive', [], 'Kavinsky', 'Nightcall', 2),
  W('Barbie', [], 'Dua Lipa', 'Dance The Night', 1),
  W('Oppenheimer', [], 'Ludwig Göransson', 'Can You Hear The Music', 2),
  W('Fast and Furious', ['Fast & Furious', 'Fast and Furious 7', 'Furious 7'], 'Wiz Khalifa', 'See You Again', 1, { aa: ['Charlie Puth'] }),
  W('8 Mile', [], 'Eminem', 'Lose Yourself', 1),
  W('Men in Black', ['MIB'], 'Will Smith', 'Men in Black', 1),
  W('Terminator 2', ['Terminator'], 'Brad Fiedel', 'Terminator 2 Main Title', 2, { q: 'Brad Fiedel Terminator 2 Main Title' }),
  W('Halloween', [], 'John Carpenter', 'Halloween Theme', 2),
  W("L'Exorciste", ['The Exorcist', 'Exorciste'], 'Mike Oldfield', 'Tubular Bells', 2),
  W('Scarface', [], 'Paul Engemann', 'Push It to the Limit', 2),
  W('Twilight', [], 'Paramore', 'Decode', 2),
];

// ═══════════════════════════════════════════════════════════════
// 📺 SÉRIES — génériques et chansons emblématiques
// ═══════════════════════════════════════════════════════════════
const SERIES = [
  W('Game of Thrones', ['GOT', 'Le Trône de fer'], 'Ramin Djawadi', 'Main Title', 1, { q: 'Ramin Djawadi Game of Thrones Main Title' }),
  W('Friends', [], 'The Rembrandts', "I'll Be There for You", 1),
  W('The Office', ['Office'], 'Jay Ferguson', 'The Office Theme', 2, { q: 'The Office Theme Jay Ferguson' }),
  W('Breaking Bad', [], 'Dave Porter', 'Breaking Bad Main Title Theme', 2),
  W('Stranger Things', [], 'Kyle Dixon', 'Stranger Things', 1, { aa: ['Michael Stein'], q: 'Kyle Dixon Michael Stein Stranger Things' }),
  W('La Casa de Papel', ['Money Heist', 'Casa de Papel'], 'Manu Pilas', 'Bella Ciao', 1),
  W('La Casa de Papel', ['Money Heist', 'Casa de Papel'], 'Cecilia Krull', 'My Life Is Going On', 2),
  W('Les Simpson', ['The Simpsons', 'Simpson', 'Les Simpsons'], 'Danny Elfman', 'The Simpsons Main Title Theme', 1, { q: 'Danny Elfman The Simpsons Theme' }),
  W('X-Files', ['The X-Files', 'Aux frontières du réel', 'XFiles'], 'Mark Snow', 'The X-Files', 1),
  W('Twin Peaks', [], 'Angelo Badalamenti', 'Twin Peaks Theme', 2),
  W('Prison Break', [], 'Ramin Djawadi', 'Prison Break Main Title', 2),
  W('Dexter', [], 'Rolfe Kent', 'Dexter Main Title', 2, { q: 'Rolfe Kent Dexter Main Title' }),
  W('The Walking Dead', ['Walking Dead'], 'Bear McCreary', 'The Walking Dead Main Title', 2),
  W('Peaky Blinders', [], 'Nick Cave & The Bad Seeds', 'Red Right Hand', 1, { aa: ['Nick Cave'] }),
  W('Squid Game', [], 'Jung Jae-il', 'Way Back Then', 1),
  W('Mercredi', ['Wednesday'], 'The Cramps', 'Goo Goo Muck', 2),
  W('The Mandalorian', ['Mandalorian'], 'Ludwig Göransson', 'The Mandalorian', 2),
  W('Westworld', [], 'Ramin Djawadi', 'Main Title Theme - Westworld', 2),
  W('Narcos', [], 'Rodrigo Amarante', 'Tuyo', 1),
  W('Sherlock', [], 'David Arnold', 'Sherlock Main Theme', 2, { aa: ['Michael Price'] }),
  W('Doctor Who', [], 'Murray Gold', 'Doctor Who Theme', 2),
  W('Les Soprano', ['The Sopranos', 'Les Sopranos', 'Sopranos'], 'Alabama 3', 'Woke Up This Morning', 2),
  W('True Detective', [], 'The Handsome Family', 'Far from Any Road', 2),
  W('Dr House', ['House', 'Docteur House', 'House MD'], 'Massive Attack', 'Teardrop', 1),
  W("Grey's Anatomy", ['Greys Anatomy'], 'Psapp', 'Cosy in the Rocket', 2),
  W('How I Met Your Mother', ['HIMYM'], 'The Solids', 'Hey Beautiful', 2),
  W('Le Prince de Bel-Air', ['The Fresh Prince of Bel-Air', 'Prince de Bel Air', 'Fresh Prince'], 'DJ Jazzy Jeff & The Fresh Prince', 'The Fresh Prince of Bel-Air', 1, { aa: ['Will Smith'] }),
  W('Scrubs', [], 'Lazlo Bane', 'Superman', 2),
  W('Malcolm', ['Malcolm in the Middle'], 'They Might Be Giants', 'Boss of Me', 1),
  W('Buffy contre les vampires', ['Buffy', 'Buffy the Vampire Slayer'], 'Nerf Herder', 'Buffy the Vampire Slayer Theme', 2),
  W('Charmed', [], 'Love Spit Love', 'How Soon Is Now?', 2),
  W('Smallville', [], 'Remy Zero', 'Save Me', 2),
  W('Newport Beach', ['The O.C.', 'The OC'], 'Phantom Planet', 'California', 2),
  W('Les Frères Scott', ['One Tree Hill', 'Freres Scott'], 'Gavin DeGraw', "I Don't Want to Be", 2),
  W('The Witcher', ['Witcher'], 'Joey Batey', 'Toss a Coin to Your Witcher', 1),
  W('Euphoria', [], 'Labrinth', "Still Don't Know My Name", 2),
  W('Succession', [], 'Nicholas Britell', 'Succession (Main Title Theme)', 2),
  W('The Last of Us', ['Last of Us'], 'Gustavo Santaolalla', 'The Last of Us', 2),
  W('Arcane', [], 'Imagine Dragons', 'Enemy', 1, { aa: ['JID'] }),
  W('Mad Men', [], 'RJD2', 'A Beautiful Mine', 2),
  W('Desperate Housewives', [], 'Danny Elfman', 'Desperate Housewives Main Title', 2),
  W('Dallas', [], 'Jerrold Immel', 'Dallas Theme', 2, { q: 'Dallas Main Theme Jerrold Immel' }),
  W('MacGyver', ['Mac Gyver'], 'Randy Edelman', 'MacGyver Theme', 2),
  W('Vikings', [], 'Fever Ray', 'If I Had a Heart', 2),
  W('Sons of Anarchy', [], 'Curtis Stigers', 'This Life', 2),
];

// ═══════════════════════════════════════════════════════════════
// 🍥 ANIME — openings et musiques de films d'animation japonais
// ═══════════════════════════════════════════════════════════════
const ANIME = [
  W("L'Attaque des Titans", ['Shingeki no Kyojin', 'Attack on Titan', 'SNK', 'Attaque des Titans'], 'Linked Horizon', 'Guren no Yumiya', 1),
  W('Naruto Shippuden', ['Naruto'], 'Ikimonogakari', 'Blue Bird', 1),
  W('Naruto', [], 'Asian Kung-Fu Generation', 'Haruka Kanata', 2),
  W('One Piece', [], 'Hiroshi Kitadani', 'We Are!', 1),
  W('Dragon Ball Z', ['DBZ', 'Dragon Ball'], 'Hironobu Kageyama', 'Cha-La Head-Cha-La', 1),
  W('Dragon Ball Super', ['DBS', 'Dragon Ball'], 'Kazuya Yoshii', 'Chōzetsu Dynamic!', 2, { q: 'Dragon Ball Super Chouzetsu Dynamic' }),
  W('Death Note', [], 'Nightmare', 'the WORLD', 2),
  W('Fullmetal Alchemist: Brotherhood', ['Fullmetal Alchemist', 'FMA', 'FMAB'], 'YUI', 'Again', 2),
  W('Tokyo Ghoul', [], 'TK from Ling tosite sigure', 'unravel', 1),
  W('Demon Slayer', ['Kimetsu no Yaiba'], 'LiSA', 'Gurenge', 1),
  W('Jujutsu Kaisen', ['JJK'], 'Eve', 'Kaikai Kitan', 1),
  W('My Hero Academia', ['Boku no Hero Academia', 'MHA'], 'Porno Graffitti', 'The Day', 1),
  W('Neon Genesis Evangelion', ['Evangelion', 'Eva'], 'Yoko Takahashi', "A Cruel Angel's Thesis", 1, { as: ['Zankoku na Tenshi no These'] }),
  W('Cowboy Bebop', [], 'Seatbelts', 'Tank!', 2),
  W('Hunter x Hunter', ['HxH', 'Hunter Hunter'], 'Masatoshi Ono', 'departure!', 2),
  W('Bleach', [], 'Orange Range', '*~Asterisk~', 2, { q: 'Orange Range Asterisk' }),
  W('Pokémon', ['Pokemon'], 'Jason Paige', 'Pokémon Theme', 1),
  W('Chainsaw Man', [], 'Kenshi Yonezu', 'KICK BACK', 1),
  W('Spy x Family', ['Spy Family'], 'Official HIGE DANdism', 'Mixed Nuts', 2),
  W('Oshi no Ko', [], 'YOASOBI', 'Idol', 1),
  W('Sword Art Online', ['SAO'], 'LiSA', 'crossing field', 2),
  W('Code Geass', [], 'FLOW', 'COLORS', 2),
  W('Steins;Gate', ['Steins Gate'], 'Kanako Itō', 'Hacking to the Gate', 2),
  W('Your Name', ['Kimi no Na wa'], 'RADWIMPS', 'Zenzenzense', 2),
  W('Mob Psycho 100', ['Mob Psycho'], 'MOB CHOIR', '99', 2),
  W('One Punch Man', ['One-Punch Man', 'OPM'], 'JAM Project', 'THE HERO !! ~Ikareru Kobushi ni Hi wo Tsukero~', 1, { q: 'JAM Project The Hero One Punch Man' }),
  W("JoJo's Bizarre Adventure", ['JoJo', 'Jojo no Kimyou na Bouken'], 'Hiroaki "TOMMY" Tominaga', 'Sono Chi no Sadame', 2, { q: 'Sono Chi no Sadame Jojo' }),
  W("JoJo's Bizarre Adventure", ['JoJo', 'Golden Wind', 'Vento Aureo'], 'Coda', "Fighting Gold", 2),
  W('Haikyuu!!', ['Haikyu', 'Haikyuu'], 'SPYAIR', 'Imagination', 2),
  W('Black Clover', [], 'Kankaku Piero', 'Haruka Mirai', 2),
  W('Fairy Tail', [], 'Funkist', 'Snow Fairy', 2),
  W('Vinland Saga', [], 'Survive Said The Prophet', 'MUKANJYO', 2),
  W('Blue Lock', [], 'UNISON SQUARE GARDEN', 'Chaos ga Kiwamaru', 2),
  W("Frieren", ['Sousou no Frieren', "Frieren: Beyond Journey's End"], 'YOASOBI', 'Yuusha', 2, { as: ['The Brave'] }),
  W('Solo Leveling', [], 'SawanoHiroyuki[nZk]', 'LEveL', 2),
  W('Le Voyage de Chihiro', ['Spirited Away', 'Chihiro', 'Sen to Chihiro'], 'Joe Hisaishi', "One Summer's Day", 1),
  W('Mon voisin Totoro', ['Totoro', 'My Neighbor Totoro', 'Tonari no Totoro'], 'Joe Hisaishi', 'My Neighbor Totoro', 1),
  W('Le Château ambulant', ["Howl's Moving Castle", 'Château ambulant'], 'Joe Hisaishi', 'Merry-Go-Round of Life', 2),
  W('Princesse Mononoké', ['Princess Mononoke', 'Mononoke Hime'], 'Joe Hisaishi', 'Princess Mononoke', 2),
  W('Les Chevaliers du Zodiaque', ['Saint Seiya', 'Chevaliers du Zodiaque'], 'MAKE-UP', 'Pegasus Fantasy', 2),
  W('Akira', [], 'Geinoh Yamashirogumi', 'Kaneda', 2),
  W('Ghost in the Shell', [], 'Kenji Kawai', 'Making of Cyborg', 2),
  W('Tokyo Revengers', [], 'Official HIGE DANdism', 'Cry Baby', 2),
  W('Re:Zero', ['Re Zero'], 'Konomi Suzuki', 'Redo', 2),
  W('Gurren Lagann', ['Tengen Toppa Gurren Lagann'], 'Shoko Nakagawa', 'Sorairo Days', 2),
  W('Psycho-Pass', ['Psycho Pass'], 'Ling tosite sigure', 'abnormalize', 2),
  W('Dandadan', [], 'Creepy Nuts', 'Otonoke', 2),
  W('Mashle', [], 'Creepy Nuts', 'Bling-Bang-Bang-Born', 1),
];

// ═══════════════════════════════════════════════════════════════
// 🎵 MUSIQUE — trouver le titre ET l'artiste
// ═══════════════════════════════════════════════════════════════
const MUSIQUE = [
  // — grand public —
  M('Queen', 'Bohemian Rhapsody', 1),
  M('Michael Jackson', 'Billie Jean', 1),
  M('Michael Jackson', 'Thriller', 1),
  M('ABBA', 'Dancing Queen', 1),
  M('Daft Punk', 'Get Lucky', 1),
  M('Daft Punk', 'One More Time', 1),
  M('Stromae', 'Alors on danse', 1),
  M('Stromae', 'Papaoutai', 1),
  M('Indila', 'Dernière danse', 1),
  M('Céline Dion', 'Pour que tu m\'aimes encore', 1),
  M('Johnny Hallyday', 'Allumer le feu', 1, { aa: ['Johnny'] }),
  M('Édith Piaf', 'La Vie en rose', 1, { aa: ['Piaf'] }),
  M('Jacques Brel', 'Ne me quitte pas', 1, { aa: ['Brel'] }),
  M('Joe Dassin', 'Les Champs-Élysées', 1),
  M('Claude François', 'Alexandrie Alexandra', 1, { aa: ['Cloclo'] }),
  M('Michel Sardou', 'Les Lacs du Connemara', 1, { aa: ['Sardou'] }),
  M('Angèle', 'Balance ton quoi', 1),
  M('Aya Nakamura', 'Djadja', 1),
  M('PNL', 'Au DD', 1),
  M('GIMS', 'Sapés comme jamais', 1, { aa: ['Maître Gims'] }),
  M('Soprano', 'En feu', 1),
  M('Jul', 'Tchikita', 1),
  M('Orelsan', 'La terre est ronde', 1),
  M('IAM', 'Je danse le Mia', 1),
  M('Khaled', 'Aïcha', 1, { aa: ['Cheb Khaled'] }),
  M('Magic System', 'Premier Gaou', 1),
  M('Ed Sheeran', 'Shape of You', 1),
  M('Adele', 'Rolling in the Deep', 1),
  M('Rihanna', 'Umbrella', 1),
  M('Beyoncé', 'Crazy in Love', 1),
  M('The Weeknd', 'Blinding Lights', 1, { aa: ['Weeknd'] }),
  M('Dua Lipa', 'Levitating', 1),
  M('Eminem', 'Without Me', 1),
  M('Nirvana', 'Smells Like Teen Spirit', 1),
  M('AC/DC', 'Highway to Hell', 1, { aa: ['ACDC'] }),
  M('The Beatles', 'Hey Jude', 1, { aa: ['Beatles'] }),
  M('Bob Marley & The Wailers', 'Could You Be Loved', 1, { aa: ['Bob Marley'] }),
  M('Whitney Houston', 'I Wanna Dance with Somebody (Who Loves Me)', 1, { as: ['I Wanna Dance with Somebody'] }),
  M('Britney Spears', '...Baby One More Time', 1, { as: ['Baby One More Time'] }),
  M('Lady Gaga', 'Bad Romance', 1),
  M('Shakira', 'Waka Waka (This Time for Africa)', 1, { as: ['Waka Waka'] }),
  M('Coldplay', 'Viva La Vida', 1),
  M('Imagine Dragons', 'Believer', 1),
  M('Linkin Park', 'In the End', 1),
  M('Gala', 'Freed from Desire', 1),
  M('Vianney', 'Je m\'en vais', 1),
  M('ZAZ', 'Je veux', 1),
  M('Kendji Girac', 'Andalouse', 1, { aa: ['Kendji'] }),
  M('Christophe Maé', 'Il est où le bonheur', 1),
  M('Mylène Farmer', 'Désenchantée', 1),
  M('Indochine', "L'aventurier", 1),
  M('Téléphone', "Ça (c'est vraiment toi)", 1, { as: ["C'est vraiment toi", "Ça c'est vraiment toi"] }),
  M('Pharrell Williams', 'Happy', 1, { aa: ['Pharrell'] }),
  M('Luis Fonsi', 'Despacito', 1, { aa: ['Daddy Yankee'] }),
  M('PSY', 'Gangnam Style', 1),
  M('Mark Ronson', 'Uptown Funk', 1, { aa: ['Bruno Mars'] }),
  M('Billie Eilish', 'bad guy', 1),
  M('BTS', 'Dynamite', 1),
  M('Technotronic', 'Pump Up the Jam', 1),
  M('2 Unlimited', 'No Limit', 1, { aa: ['Two Unlimited'] }),
  // — niche —
  M('Booba', 'DKR', 2),
  M('Nekfeu', 'On verra', 2),
  M('Suprême NTM', 'Ma Benz', 2, { aa: ['NTM'] }),
  M('Damso', 'Macarena', 2),
  M('SCH', 'Otto', 2),
  M('Ninho', 'Lettre à une femme', 2),
  M('Lomepal', 'Yeux disent', 2),
  M('Roméo Elvis', 'Malade', 2),
  M('Daft Punk', 'Around the World', 2),
  M('Justice', 'D.A.N.C.E.', 2, { as: ['Dance'] }),
  M('Air', 'Sexy Boy', 2),
  M('Phoenix', '1901', 2),
  M('M83', 'Midnight City', 2),
  M('Polo & Pan', 'Canopée', 2),
  M('Tame Impala', 'The Less I Know The Better', 2),
  M('Arctic Monkeys', 'Do I Wanna Know?', 2),
  M('Radiohead', 'Creep', 2),
  M('The Strokes', 'Last Nite', 2, { aa: ['Strokes'] }),
  M('Gorillaz', 'Feel Good Inc.', 2),
  M('Portishead', 'Glory Box', 2),
  M('Kendrick Lamar', 'HUMBLE.', 2),
  M('Frank Ocean', 'Thinkin Bout You', 2),
  M('Travis Scott', 'SICKO MODE', 2),
  M('Fela Kuti', 'Water No Get Enemy', 2, { aa: ['Fela'] }),
  M('Cesária Évora', 'Sodade', 2),
  M('Rachid Taha', 'Ya Rayah', 2),
  M('Amr Diab', 'Tamally Maak', 2),
  M('Oum Kalthoum', 'Enta Omri', 2, { aa: ['Umm Kulthum', 'Oum Kalsoum'] }),
  M('Serge Gainsbourg', 'La Javanaise', 2, { aa: ['Gainsbourg'] }),
  M('Françoise Hardy', 'Tous les garçons et les filles', 2),
  M('Alain Bashung', 'Osez Joséphine', 2, { aa: ['Bashung'] }),
  M('Noir Désir', 'Le vent nous portera', 2),
  M('Louise Attaque', "J't'emmène au vent", 2, { as: ['Je t\'emmène au vent'] }),
  M('Saez', 'Jeune et con', 2),
  M('Fatboy Slim', 'Right Here, Right Now', 2),
  M('The Prodigy', 'Firestarter', 2, { aa: ['Prodigy'] }),
  M('The Chemical Brothers', 'Galvanize', 2, { aa: ['Chemical Brothers'] }),
  M('Aphex Twin', 'Windowlicker', 2),
  M('Bon Iver', 'Skinny Love', 2),
  M('Lana Del Rey', 'Video Games', 2),
  M('ROSALÍA', 'MALAMENTE', 2, { aa: ['Rosalia'] }),
  M('Bad Bunny', 'Tití Me Preguntó', 2),
  M('BLACKPINK', 'DDU-DU DDU-DU', 2),
  M('Hooverphonic', 'Mad About You', 2),
  M('dEUS', 'Instant Street', 2, { aa: ['Deus'] }),
  M('Lost Frequencies', 'Are You With Me', 2),
  M('Selah Sue', 'Raggamuffin', 2),
  M('Arno', 'Les yeux de ma mère', 2),
];

export const UNIVERSES = [
  { id: 'film', label: '🎬 Films', short: 'Film', find: 'Trouve le film' },
  { id: 'serie', label: '📺 Séries', short: 'Série', find: 'Trouve la série' },
  { id: 'anime', label: '🍥 Anime', short: 'Anime', find: "Trouve l'anime" },
  { id: 'musique', label: '🎵 Musique', short: 'Musique', find: "Trouve le titre et l'artiste" },
];

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function build(universe, list) {
  const seen = new Map();
  return list.map((e) => {
    let id = `${universe}-${slug(e.answer)}-${slug(e.song)}`;
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    if (n > 1) id += `-${n}`;
    return { ...e, id, universe, alt: e.alt || [] };
  });
}

export const CATALOG = [
  ...build('film', FILMS),
  ...build('serie', SERIES),
  ...build('anime', ANIME),
  ...build('musique', MUSIQUE),
];

export function isValidUniverse(id) {
  return UNIVERSES.some((u) => u.id === id);
}

export function universeInfo(id) {
  return UNIVERSES.find((u) => u.id === id) || UNIVERSES[0];
}

export function listUniverses() {
  return UNIVERSES.map((u) => {
    const items = CATALOG.filter((e) => e.universe === u.id);
    return { ...u, count: items.length, mainstream: items.filter((e) => e.pop === 1).length, niche: items.filter((e) => e.pop === 2).length };
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire une liste ordonnée de candidats (plus que nécessaire : certains peuvent manquer sur Deezer).
 * popularity : 'mix' (60 % grand public / 40 % niche) · 'mainstream' · 'niche'
 * Les entrées récemment jouées passent en dernier.
 */
export function pickCandidates(universes, count, popularity = 'mix', excluded = new Set()) {
  const pool = CATALOG.filter((e) => !universes.length || universes.includes(e.universe));
  const fresh = (list) => [...shuffle(list.filter((e) => !excluded.has(e.id))), ...shuffle(list.filter((e) => excluded.has(e.id)))];
  const main = fresh(pool.filter((e) => e.pop === 1));
  const niche = fresh(pool.filter((e) => e.pop === 2));

  const share = popularity === 'mainstream' ? 1 : popularity === 'niche' ? 0 : 0.6;
  const wanted = Math.ceil(count * 1.6) + 6; // marge pour les titres introuvables
  const nbMain = Math.round(wanted * share);
  const out = [];
  // On alterne pour garder la bonne proportion même si la liste est tronquée
  let i = 0; let j = 0;
  while (out.length < wanted && (i < main.length || j < niche.length)) {
    const mainSoFar = out.filter((e) => e.pop === 1).length;
    const wantMain = mainSoFar < Math.round((out.length + 1) * share) && mainSoFar < nbMain;
    if ((wantMain && i < main.length) || j >= niche.length) out.push(main[i++]);
    else out.push(niche[j++]);
  }
  return out.filter(Boolean);
}
