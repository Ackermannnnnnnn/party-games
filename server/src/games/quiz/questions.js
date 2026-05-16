/**
 * Banque de questions du Quiz.
 * Format : { q, a[4], c (idx 0-3), d (difficulté 1-4), image? (URL ou /chemin) }
 *
 * Difficultés : 1=facile · 2=moyen · 3=difficile · 4=extrême
 *
 * Chaque question reçoit un `id` unique automatiquement (catégorie_index)
 * pour le système anti-répétition (5 dernières parties).
 */

// ═══════════════════════════════════════════════════════════════
// HISTOIRE
// ═══════════════════════════════════════════════════════════════
const HISTOIRE = [
  // — facile —
  { q: 'En quelle année a eu lieu la Révolution française ?', a: ['1789', '1815', '1799', '1804'], c: 0, d: 1 },
  { q: "Qui était l'empereur des Français de 1804 à 1814 ?", a: ['Napoléon Ier', 'Louis XVI', 'Charles X', 'Louis-Philippe'], c: 0, d: 1 },
  { q: 'En quelle année est tombé le mur de Berlin ?', a: ['1985', '1989', '1991', '1995'], c: 1, d: 1 },
  { q: 'Qui a découvert l\'Amérique en 1492 ?', a: ['Magellan', 'Vasco de Gama', 'Christophe Colomb', 'Marco Polo'], c: 2, d: 1 },
  { q: 'En quelle année a commencé la Première Guerre mondiale ?', a: ['1914', '1918', '1939', '1905'], c: 0, d: 1 },
  { q: 'Qui était le roi de France surnommé "le Roi-Soleil" ?', a: ['Louis XIII', 'Louis XIV', 'Louis XV', 'Louis XVI'], c: 1, d: 1 },
  { q: 'Qui a peint la Joconde ?', a: ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Donatello'], c: 1, d: 1 },
  { q: 'Qui a été le premier homme sur la Lune ?', a: ['Buzz Aldrin', 'Neil Armstrong', 'Youri Gagarine', 'John Glenn'], c: 1, d: 1 },
  { q: 'En quelle année se termine la Seconde Guerre mondiale ?', a: ['1944', '1945', '1946', '1943'], c: 1, d: 1 },
  { q: 'Qui était le chef de la France libre durant la WWII ?', a: ['Pétain', 'De Gaulle', 'Churchill', 'Clemenceau'], c: 1, d: 1 },
  { q: 'Quel pays a largué la bombe atomique sur Hiroshima ?', a: ['Russie', 'Royaume-Uni', 'États-Unis', 'France'], c: 2, d: 1 },
  { q: 'Quelle reine a été décapitée pendant la Révolution française ?', a: ['Marie de Médicis', 'Marie-Antoinette', 'Catherine de Médicis', 'Anne d\'Autriche'], c: 1, d: 1 },
  { q: 'Quel président a été assassiné à Dallas en 1963 ?', a: ['Lincoln', 'Kennedy', 'Reagan', 'Roosevelt'], c: 1, d: 1 },
  { q: 'Qui était Adolf Hitler ?', a: ['Empereur', 'Roi', 'Dictateur allemand', 'Pape'], c: 2, d: 1 },
  { q: 'Comment s\'appelait l\'épouse du roi Louis XVI ?', a: ['Joséphine', 'Marie-Antoinette', 'Catherine', 'Eugénie'], c: 1, d: 1 },

  // — moyen —
  { q: 'Quel pharaon a fait construire la grande pyramide de Gizeh ?', a: ['Toutânkhamon', 'Ramsès II', 'Khéops', 'Cléopâtre'], c: 2, d: 2 },
  { q: 'Quelle bataille marque la fin de Napoléon en 1815 ?', a: ['Austerlitz', 'Waterloo', 'Marengo', 'Iéna'], c: 1, d: 2 },
  { q: 'Quel président américain a aboli l\'esclavage ?', a: ['Washington', 'Jefferson', 'Lincoln', 'Roosevelt'], c: 2, d: 2 },
  { q: 'Quelle ville a été détruite par le Vésuve en 79 ?', a: ['Rome', 'Pompéi', 'Naples', 'Athènes'], c: 1, d: 2 },
  { q: 'Quelle dynastie a régné en France de 987 à 1328 ?', a: ['Mérovingiens', 'Carolingiens', 'Capétiens', 'Bourbons'], c: 2, d: 2 },
  { q: 'Quelle reine d\'Angleterre a régné le plus longtemps ?', a: ['Victoria', 'Élisabeth II', 'Élisabeth Ire', 'Anne'], c: 1, d: 2 },
  { q: 'Quel empereur romain est devenu chrétien ?', a: ['Néron', 'Constantin', 'Auguste', 'Trajan'], c: 1, d: 2 },
  { q: 'Quelle révolution éclate en Russie en 1917 ?', a: ['Bolchévique', 'Française', 'Industrielle', 'Verte'], c: 0, d: 2 },
  { q: 'Quel pays a inventé la poudre à canon ?', a: ['France', 'Inde', 'Chine', 'Allemagne'], c: 2, d: 2 },
  { q: 'Combien de républiques a connu la France ?', a: ['3', '4', '5', '6'], c: 2, d: 2 },
  { q: 'Quel roi a fait construire le château de Versailles ?', a: ['Louis XIII', 'Louis XIV', 'Louis XV', 'Henri IV'], c: 1, d: 2 },
  { q: 'Quel président a signé l\'abolition de la peine de mort en France ?', a: ['Mitterrand', 'Giscard', 'Pompidou', 'Chirac'], c: 0, d: 2 },
  { q: 'Quelle ville était la capitale de l\'Empire byzantin ?', a: ['Rome', 'Constantinople', 'Athènes', 'Alexandrie'], c: 1, d: 2 },
  { q: 'Quelle est la durée du règne de Louis XIV ?', a: ['54 ans', '60 ans', '72 ans', '80 ans'], c: 2, d: 2 },
  { q: 'Quel nom porte le Mexique avant l\'indépendance ?', a: ['Nouvelle-Espagne', 'Mésoamérique', 'Vieille-Europe', 'Hispania'], c: 0, d: 2 },
  { q: 'Quelle catastrophe nucléaire a eu lieu en 1986 ?', a: ['Three Mile Island', 'Tchernobyl', 'Fukushima', 'Mayak'], c: 1, d: 2 },
  { q: 'Quel personnage est lié à la phrase "L\'État c\'est moi" ?', a: ['Louis XIV', 'Napoléon', 'Charles V', 'François Ier'], c: 0, d: 2 },
  { q: 'Quel pays construit la Grande Muraille ?', a: ['Mongolie', 'Inde', 'Chine', 'Japon'], c: 2, d: 2 },
  { q: 'Quel pays était dirigé par Mussolini ?', a: ['Allemagne', 'Italie', 'Espagne', 'Portugal'], c: 1, d: 2 },
  { q: 'Quelle bataille marque le début de la WWII en France (1940) ?', a: ['Bataille de France', 'Bataille d\'Angleterre', 'Bataille de Verdun', 'Bataille de Stalingrad'], c: 0, d: 2 },
  { q: 'Quel siècle est appelé "siècle des Lumières" ?', a: ['16e', '17e', '18e', '19e'], c: 2, d: 2 },

  // — difficile —
  { q: 'En quelle année a été fondée l\'ONU ?', a: ['1919', '1945', '1948', '1950'], c: 1, d: 3 },
  { q: 'Quel traité met fin à la guerre de Cent Ans ?', a: ['Traité de Picquigny', 'Traité de Westphalie', 'Traité de Verdun', 'Traité de Tordesillas'], c: 0, d: 3 },
  { q: 'Qui a écrit "Le Prince" en 1513 ?', a: ['Dante', 'Machiavel', 'Pétrarque', 'Boccace'], c: 1, d: 3 },
  { q: 'Qui était le premier président des États-Unis ?', a: ['Jefferson', 'Adams', 'Washington', 'Madison'], c: 2, d: 3 },
  { q: 'En quelle année est créée l\'UE (Maastricht) ?', a: ['1957', '1986', '1992', '2002'], c: 2, d: 3 },
  { q: 'Quel pharaon a régné le plus longtemps ?', a: ['Ramsès II', 'Khéops', 'Pépi II', 'Toutmôsis III'], c: 2, d: 3 },
  { q: 'En quelle année les femmes ont obtenu le droit de vote en France ?', a: ['1920', '1936', '1944', '1958'], c: 2, d: 3 },
  { q: 'Quel pays a colonisé le plus de territoires au 19ᵉ siècle ?', a: ['France', 'Royaume-Uni', 'Belgique', 'Pays-Bas'], c: 1, d: 3 },
  { q: 'Quel philosophe grec a été le précepteur d\'Alexandre le Grand ?', a: ['Socrate', 'Platon', 'Aristote', 'Diogène'], c: 2, d: 3 },
  { q: 'Quel roi français est mort lors d\'un tournoi en 1559 ?', a: ['François Ier', 'Henri II', 'Charles IX', 'Henri III'], c: 1, d: 3 },
  { q: 'Quelle dynastie chinoise a construit la Cité Interdite ?', a: ['Han', 'Tang', 'Ming', 'Qing'], c: 2, d: 3 },
  { q: 'Qui a fondé l\'Empire mongol ?', a: ['Kubilai Khan', 'Gengis Khan', 'Tamerlan', 'Attila'], c: 1, d: 3 },
  { q: 'Combien de croisades majeures vers la Terre Sainte ?', a: ['5', '7', '8', '10'], c: 2, d: 3 },
  { q: 'Quel président français a démissionné en 1969 ?', a: ['De Gaulle', 'Pompidou', 'Coty', 'Auriol'], c: 0, d: 3 },

  // — extrême —
  { q: 'Quel pape a lancé la première croisade en 1095 ?', a: ['Urbain II', 'Grégoire VII', 'Innocent III', 'Clément V'], c: 0, d: 4 },
  { q: 'En quelle année est signée la Magna Carta ?', a: ['1066', '1215', '1314', '1453'], c: 1, d: 4 },
  { q: 'Qui était le dernier tsar de Russie ?', a: ['Pierre III', 'Alexandre II', 'Nicolas II', 'Paul Ier'], c: 2, d: 4 },
  { q: 'Quelle bataille marque la défaite des Francs face aux Maures (732) ?', a: ['Bataille de Tours-Poitiers', 'Bataille de Roncevaux', 'Bataille de Bouvines', 'Bataille de Crécy'], c: 0, d: 4 },
  { q: 'Quel est le seul empereur romain à avoir abdiqué volontairement ?', a: ['Néron', 'Dioclétien', 'Hadrien', 'Marc Aurèle'], c: 1, d: 4 },
  { q: 'Quel président mexicain a fondé la République en 1858 ?', a: ['Juarez', 'Madero', 'Cardenas', 'Calles'], c: 0, d: 4 },
  { q: 'En quelle année tombe Constantinople ?', a: ['1204', '1453', '1492', '1517'], c: 1, d: 4 },
  { q: 'Quel personnage a fondé l\'Académie d\'Athènes ?', a: ['Aristote', 'Platon', 'Socrate', 'Périclès'], c: 1, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// GÉOGRAPHIE
// ═══════════════════════════════════════════════════════════════
const GEO = [
  // — facile —
  { q: 'Quelle est la capitale du Japon ?', a: ['Kyoto', 'Osaka', 'Tokyo', 'Nagoya'], c: 2, d: 1 },
  { q: 'Quel est le plus long fleuve du monde ?', a: ['Amazone', 'Nil', 'Yangtsé', 'Mississippi'], c: 1, d: 1 },
  { q: 'Combien y a-t-il de continents ?', a: ['5', '6', '7', '8'], c: 2, d: 1 },
  { q: 'Quel pays a la forme d\'une botte ?', a: ['Espagne', 'Italie', 'Grèce', 'Portugal'], c: 1, d: 1 },
  { q: 'Quelle mer sépare l\'Europe de l\'Afrique ?', a: ['Mer Noire', 'Mer Méditerranée', 'Mer Rouge', 'Mer Caspienne'], c: 1, d: 1 },
  { q: 'Quelle est la plus haute montagne du monde ?', a: ['K2', 'Everest', 'Mont Blanc', 'Kilimandjaro'], c: 1, d: 1 },
  { q: 'Quelle ville est surnommée "la Ville lumière" ?', a: ['Londres', 'Paris', 'New York', 'Las Vegas'], c: 1, d: 1 },
  { q: 'Sur quel continent se trouve l\'Égypte ?', a: ['Asie', 'Afrique', 'Europe', 'Océanie'], c: 1, d: 1 },
  { q: 'Combien y a-t-il d\'océans ?', a: ['3', '4', '5', '6'], c: 2, d: 1 },
  { q: 'Quelle est la capitale du Royaume-Uni ?', a: ['Édimbourg', 'Manchester', 'Londres', 'Liverpool'], c: 2, d: 1 },
  { q: 'Quel pays est en forme d\'hexagone ?', a: ['Allemagne', 'France', 'Espagne', 'Pologne'], c: 1, d: 1 },
  { q: 'Quelle est la capitale des États-Unis ?', a: ['New York', 'Los Angeles', 'Washington', 'Chicago'], c: 2, d: 1 },
  { q: 'Quelle ville est la capitale de l\'Italie ?', a: ['Milan', 'Rome', 'Venise', 'Naples'], c: 1, d: 1 },
  { q: 'Quel océan est entre l\'Europe et l\'Amérique ?', a: ['Pacifique', 'Atlantique', 'Indien', 'Arctique'], c: 1, d: 1 },
  { q: 'Quel pays a Berlin pour capitale ?', a: ['Pologne', 'Allemagne', 'Autriche', 'Suisse'], c: 1, d: 1 },

  // — moyen —
  { q: 'Quelle est la capitale de l\'Australie ?', a: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], c: 2, d: 2 },
  { q: 'Quel est le plus grand désert du monde ?', a: ['Sahara', 'Gobi', 'Antarctique', 'Kalahari'], c: 2, d: 2 },
  { q: 'Quel est le pays le plus peuplé du monde en 2024 ?', a: ['Chine', 'Inde', 'États-Unis', 'Indonésie'], c: 1, d: 2 },
  { q: 'Quel pays est traversé par l\'équateur en Amérique du Sud ?', a: ['Pérou', 'Brésil', 'Colombie', 'Équateur'], c: 3, d: 2 },
  { q: 'Quel pays a pour capitale Reykjavik ?', a: ['Norvège', 'Suède', 'Islande', 'Finlande'], c: 2, d: 2 },
  { q: 'Quel est le plus petit pays du monde ?', a: ['Monaco', 'Vatican', 'Saint-Marin', 'Liechtenstein'], c: 1, d: 2 },
  { q: 'Quelle est la capitale du Canada ?', a: ['Toronto', 'Ottawa', 'Montréal', 'Vancouver'], c: 1, d: 2 },
  { q: 'Quel pays est le plus grand par superficie ?', a: ['Chine', 'USA', 'Canada', 'Russie'], c: 3, d: 2 },
  { q: 'Quel détroit sépare la France de l\'Angleterre ?', a: ['Détroit de Béring', 'Pas-de-Calais', 'Gibraltar', 'Bosphore'], c: 1, d: 2 },
  { q: 'Quelle est la capitale de l\'Argentine ?', a: ['Lima', 'Bogota', 'Buenos Aires', 'Santiago'], c: 2, d: 2 },
  { q: 'Quel pays a pour capitale Brasilia ?', a: ['Argentine', 'Pérou', 'Brésil', 'Chili'], c: 2, d: 2 },
  { q: 'Quel est le pays le plus visité au monde ?', a: ['USA', 'France', 'Espagne', 'Italie'], c: 1, d: 2 },
  { q: 'Quelle ville traverse les deux continents Europe et Asie ?', a: ['Athènes', 'Istanbul', 'Moscou', 'Bakou'], c: 1, d: 2 },
  { q: 'Quelle est la capitale de la Russie ?', a: ['Saint-Pétersbourg', 'Moscou', 'Kiev', 'Minsk'], c: 1, d: 2 },
  { q: 'Quel pays a la plus grande forêt tropicale ?', a: ['Brésil', 'Indonésie', 'RDC', 'Pérou'], c: 0, d: 2 },
  { q: 'Combien d\'États composent les USA ?', a: ['48', '49', '50', '52'], c: 2, d: 2 },
  { q: 'Quel pays est entre la France et l\'Espagne ?', a: ['Andorre', 'Monaco', 'Saint-Marin', 'Liechtenstein'], c: 0, d: 2 },
  { q: 'Quelle est la capitale de la Belgique ?', a: ['Anvers', 'Bruxelles', 'Liège', 'Gand'], c: 1, d: 2 },
  { q: 'Quel pays a Stockholm pour capitale ?', a: ['Norvège', 'Suède', 'Danemark', 'Finlande'], c: 1, d: 2 },
  { q: 'Quel pays a pour capitale Helsinki ?', a: ['Suède', 'Finlande', 'Norvège', 'Estonie'], c: 1, d: 2 },
  { q: 'Quelle est la capitale du Portugal ?', a: ['Porto', 'Lisbonne', 'Madrid', 'Faro'], c: 1, d: 2 },
  { q: 'Quel pays a Athènes pour capitale ?', a: ['Turquie', 'Italie', 'Grèce', 'Albanie'], c: 2, d: 2 },

  // — difficile —
  { q: 'Quelle est la capitale du Kazakhstan ?', a: ['Almaty', 'Astana', 'Bichkek', 'Tachkent'], c: 1, d: 3 },
  { q: 'Quel pays est le plus long du monde (nord-sud) ?', a: ['Norvège', 'Chili', 'Russie', 'Canada'], c: 1, d: 3 },
  { q: 'Quelle est la capitale de la Mongolie ?', a: ['Oulan-Bator', 'Astana', 'Bichkek', 'Pékin'], c: 0, d: 3 },
  { q: 'Combien de fuseaux horaires traverse la Russie ?', a: ['7', '9', '11', '13'], c: 2, d: 3 },
  { q: 'Combien de pays composent l\'UE en 2024 ?', a: ['25', '26', '27', '28'], c: 2, d: 3 },
  { q: 'Quel pays a pour capitale Hanoï ?', a: ['Cambodge', 'Vietnam', 'Thaïlande', 'Laos'], c: 1, d: 3 },
  { q: 'Quelle est la capitale du Pérou ?', a: ['La Paz', 'Quito', 'Lima', 'Bogota'], c: 2, d: 3 },
  { q: 'Quel pays a pour capitale Nairobi ?', a: ['Tanzanie', 'Kenya', 'Ouganda', 'Éthiopie'], c: 1, d: 3 },
  { q: 'Quelle est la profondeur max de la fosse des Mariannes (km) ?', a: ['8', '9', '11', '13'], c: 2, d: 3 },
  { q: 'Quel pays a pour capitale Manille ?', a: ['Indonésie', 'Philippines', 'Vietnam', 'Malaisie'], c: 1, d: 3 },
  { q: 'Quel est le pays le plus enclavé d\'Europe ?', a: ['Suisse', 'Autriche', 'Liechtenstein', 'Saint-Marin'], c: 2, d: 3 },
  { q: 'Quel pays a 4 langues officielles ?', a: ['Belgique', 'Suisse', 'Canada', 'Inde'], c: 1, d: 3 },

  // — extrême —
  { q: 'Quel est le seul pays au monde dont le drapeau n\'est pas rectangulaire ?', a: ['Suisse', 'Vatican', 'Népal', 'Bhoutan'], c: 2, d: 4 },
  { q: 'Quel est le seul pays dont le nom commence par "Q" ?', a: ['Qatar', 'Quito', 'Quetta', 'Qing'], c: 0, d: 4 },
  { q: 'Quelle est la capitale du Bhoutan ?', a: ['Thimphou', 'Katmandou', 'Dacca', 'Yangon'], c: 0, d: 4 },
  { q: 'Quel est le pays le moins peuplé du monde ?', a: ['Vatican', 'Tuvalu', 'Nauru', 'Saint-Marin'], c: 0, d: 4 },
  { q: 'Quel pays africain a deux capitales ?', a: ['Bolivie', 'Pays-Bas', 'Eswatini', 'Afrique du Sud'], c: 3, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// SPORT
// ═══════════════════════════════════════════════════════════════
const SPORT = [
  // — facile —
  { q: 'Combien de joueurs dans une équipe de foot sur le terrain ?', a: ['10', '11', '12', '9'], c: 1, d: 1 },
  { q: 'Quel pays a gagné la Coupe du Monde 2018 ?', a: ['Allemagne', 'Brésil', 'France', 'Argentine'], c: 2, d: 1 },
  { q: 'Combien de joueurs dans une équipe de basket sur le terrain ?', a: ['4', '5', '6', '7'], c: 1, d: 1 },
  { q: 'Quelle est la durée d\'un match de foot pro ?', a: ['80 min', '90 min', '100 min', '120 min'], c: 1, d: 1 },
  { q: 'Quel pays organise les JO 2024 ?', a: ['Japon', 'France', 'USA', 'Australie'], c: 1, d: 1 },
  { q: 'Sur quoi joue-t-on au curling ?', a: ['Sable', 'Glace', 'Herbe', 'Béton'], c: 1, d: 1 },
  { q: 'Combien d\'arbitres sur un terrain de foot ?', a: ['1', '3', '4', '5'], c: 2, d: 1 },
  { q: 'Quelle couleur du carton signifie expulsion ?', a: ['Jaune', 'Rouge', 'Noir', 'Bleu'], c: 1, d: 1 },
  { q: 'Combien de mi-temps dans un match de foot ?', a: ['1', '2', '3', '4'], c: 1, d: 1 },
  { q: 'Combien de sets pour gagner un match de tennis Grand Chelem (homme) ?', a: ['2', '3', '4', '5'], c: 1, d: 1 },

  // — moyen —
  { q: 'Combien de fois Roger Federer a gagné Wimbledon ?', a: ['6', '7', '8', '9'], c: 2, d: 2 },
  { q: 'Dans quel sport utilise-t-on un "birdie" ?', a: ['Tennis', 'Golf', 'Badminton', 'Bowling'], c: 1, d: 2 },
  { q: 'Quel sportif est surnommé "le Roi James" ?', a: ['Michael Jordan', 'LeBron James', 'Kobe Bryant', 'Stephen Curry'], c: 1, d: 2 },
  { q: 'En quelle année les premiers JO modernes ?', a: ['1896', '1900', '1924', '1936'], c: 0, d: 2 },
  { q: 'Quelle équipe nationale est surnommée "La Roja" ?', a: ['Italie', 'Espagne', 'Belgique', 'Argentine'], c: 1, d: 2 },
  { q: 'Quel est le sport national japonais ?', a: ['Karaté', 'Judo', 'Sumo', 'Kendo'], c: 2, d: 2 },
  { q: 'Combien de tours dans le GP de Monaco ?', a: ['58', '78', '88', '100'], c: 1, d: 2 },
  { q: 'Quel pays a gagné le plus d\'Euros de foot ?', a: ['France', 'Allemagne', 'Espagne', 'Italie'], c: 1, d: 2 },
  { q: 'Combien de Ligue des Champions a gagné le Real Madrid ?', a: ['11', '13', '14', '15'], c: 2, d: 2 },
  { q: 'Quel sport pratique Tony Parker ?', a: ['Foot', 'Tennis', 'Basket', 'Hand'], c: 2, d: 2 },
  { q: 'Combien de joueurs dans une équipe de hand ?', a: ['5', '6', '7', '8'], c: 2, d: 2 },
  { q: 'Quel coureur français a gagné le plus de Tours ?', a: ['Hinault', 'Anquetil', 'Bobet', 'Fignon'], c: 0, d: 2 },
  { q: 'Combien de minutes dure un quart-temps NBA ?', a: ['10', '12', '15', '20'], c: 1, d: 2 },
  { q: 'Quel club anglais joue à Old Trafford ?', a: ['Liverpool', 'Man United', 'Arsenal', 'Chelsea'], c: 1, d: 2 },
  { q: 'Combien de points pour un strike au bowling ?', a: ['10 + bonus', '15', '20', '25'], c: 0, d: 2 },
  { q: 'Quel pilote F1 a 7 titres mondiaux comme Schumacher ?', a: ['Vettel', 'Hamilton', 'Alonso', 'Senna'], c: 1, d: 2 },
  { q: 'Quel sport associe-t-on à Wimbledon ?', a: ['Golf', 'Tennis', 'Cricket', 'Polo'], c: 1, d: 2 },
  { q: 'Combien de buts dans la finale Coupe du Monde 2022 (temps réglementaire) ?', a: ['3', '4', '5', '6'], c: 2, d: 2 },

  // — difficile —
  { q: 'Combien de Ballons d\'Or a gagné Lionel Messi (2024) ?', a: ['6', '7', '8', '9'], c: 2, d: 3 },
  { q: 'Qui a gagné le Mondial de foot 2022 ?', a: ['France', 'Argentine', 'Brésil', 'Croatie'], c: 1, d: 3 },
  { q: 'Quel boxeur s\'est surnommé "The Greatest" ?', a: ['Tyson', 'Ali', 'Foreman', 'Frazier'], c: 1, d: 3 },
  { q: 'Quel pays a gagné le 1er Euro de foot (1960) ?', a: ['Italie', 'France', 'URSS', 'Allemagne'], c: 2, d: 3 },
  { q: 'Quel est le record du 100m hommes (Bolt) ?', a: ['9s58', '9s69', '9s49', '9s78'], c: 0, d: 3 },
  { q: 'Combien de Grands Chelems a gagné Rafael Nadal ?', a: ['20', '22', '24', '26'], c: 1, d: 3 },
  { q: 'En quelle année Maradona marque la "main de Dieu" ?', a: ['1982', '1986', '1990', '1994'], c: 1, d: 3 },
  { q: 'Quel club a gagné le plus de Ligue Europa ?', a: ['Séville', 'Inter', 'Juventus', 'Atlético'], c: 0, d: 3 },
  { q: 'Quel marathonien a couru sous 2h (officiellement) ?', a: ['Bekele', 'Kipchoge', 'Gebrselassie', 'Lemma'], c: 1, d: 3 },
  { q: 'Combien de fois la France a gagné la Coupe du Monde ?', a: ['1', '2', '3', '4'], c: 1, d: 3 },

  // — extrême —
  { q: 'Quelle équipe a inventé le tiki-taka ?', a: ['Bayern', 'Real', 'Barcelone', 'Manchester'], c: 2, d: 4 },
  { q: 'Quel est le plus jeune Ballon d\'Or de l\'histoire ?', a: ['Pelé', 'Ronaldo', 'Owen', 'Yashin'], c: 2, d: 4 },
  { q: 'Combien de fois Phil Mickelson a gagné le Masters ?', a: ['2', '3', '4', '5'], c: 1, d: 4 },
  { q: 'En quelle année est créée la Ligue 1 française ?', a: ['1932', '1945', '1950', '1958'], c: 0, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// CINÉMA & SÉRIES
// ═══════════════════════════════════════════════════════════════
const CINEMA = [
  // — facile —
  { q: 'Qui joue Jack dans Titanic ?', a: ['Brad Pitt', 'Leonardo DiCaprio', 'Tom Cruise', 'Matt Damon'], c: 1, d: 1 },
  { q: 'Quel acteur joue Iron Man ?', a: ['Chris Evans', 'Robert Downey Jr.', 'Mark Ruffalo', 'Chris Hemsworth'], c: 1, d: 1 },
  { q: 'Combien de films Harry Potter ont été réalisés ?', a: ['7', '8', '9', '10'], c: 1, d: 1 },
  { q: 'Quel film d\'animation Pixar parle d\'un poisson clown ?', a: ['Némo', 'Wall-E', 'Cars', 'Là-haut'], c: 0, d: 1 },
  { q: 'Quel acteur incarne Jack Sparrow ?', a: ['Tom Hanks', 'Johnny Depp', 'Brad Pitt', 'Will Smith'], c: 1, d: 1 },
  { q: 'Qui joue Hermione dans Harry Potter ?', a: ['Emma Stone', 'Emma Watson', 'Emma Roberts', 'Emma Thompson'], c: 1, d: 1 },
  { q: 'Quel personnage Disney a un acolyte appelé Olaf ?', a: ['Anna', 'Elsa', 'Mérida', 'Raiponce'], c: 1, d: 1 },
  { q: 'Quel film parle d\'un jeune sorcier à Poudlard ?', a: ['Le Hobbit', 'Harry Potter', 'Narnia', 'Percy Jackson'], c: 1, d: 1 },
  { q: 'Quel film parle de jouets vivants ?', a: ['Cars', 'Ratatouille', 'Toy Story', 'Là-haut'], c: 2, d: 1 },
  { q: 'Quel super-héros a un costume noir et chasse à Gotham ?', a: ['Superman', 'Spider-Man', 'Batman', 'Hulk'], c: 2, d: 1 },
  { q: 'Quel acteur a fait Forrest Gump ?', a: ['Tom Cruise', 'Tom Hanks', 'Tom Hardy', 'Tom Holland'], c: 1, d: 1 },

  // — moyen —
  { q: 'Qui a réalisé Pulp Fiction ?', a: ['Scorsese', 'Tarantino', 'Spielberg', 'Nolan'], c: 1, d: 2 },
  { q: 'Quel film a remporté l\'Oscar du meilleur film en 2020 ?', a: ['1917', 'Joker', 'Parasite', 'Le Mans 66'], c: 2, d: 2 },
  { q: 'Qui réalise Avatar ?', a: ['Spielberg', 'James Cameron', 'Peter Jackson', 'Ridley Scott'], c: 1, d: 2 },
  { q: 'Dans Star Wars, qui est le père de Luke ?', a: ['Yoda', 'Obi-Wan', 'Dark Vador', 'Han Solo'], c: 2, d: 2 },
  { q: 'Quelle série suit la famille Stark ?', a: ['Vikings', 'Game of Thrones', 'The Witcher', 'Outlander'], c: 1, d: 2 },
  { q: 'Quel film bat le record du box-office en 2009 ?', a: ['Avatar', 'Titanic', 'Avengers', 'Star Wars 7'], c: 0, d: 2 },
  { q: 'Dans Friends, qui épouse Monica ?', a: ['Joey', 'Ross', 'Chandler', 'Mike'], c: 2, d: 2 },
  { q: 'Qui est le Joker dans The Dark Knight ?', a: ['Jared Leto', 'Joaquin Phoenix', 'Heath Ledger', 'Jack Nicholson'], c: 2, d: 2 },
  { q: 'Quelle série Netflix se passe à Hawkins ?', a: ['Dark', 'Stranger Things', 'Lost', 'Wednesday'], c: 1, d: 2 },
  { q: 'Qui joue Wolverine dans X-Men ?', a: ['Hugh Jackman', 'Patrick Stewart', 'Ian McKellen', 'James McAvoy'], c: 0, d: 2 },
  { q: 'Combien d\'épisodes dans la saison 1 de Squid Game ?', a: ['8', '9', '10', '12'], c: 1, d: 2 },
  { q: 'Qui a réalisé Inception ?', a: ['Spielberg', 'Nolan', 'Tarantino', 'Villeneuve'], c: 1, d: 2 },
  { q: 'Quel film a inspiré "Je suis ton père" ?', a: ['Star Wars V', 'Star Wars IV', 'Indiana Jones', 'Le Roi Lion'], c: 0, d: 2 },
  { q: 'Quel acteur joue Neo dans Matrix ?', a: ['Tom Cruise', 'Keanu Reeves', 'Brad Pitt', 'Will Smith'], c: 1, d: 2 },
  { q: 'Quelle série suit Walter White ?', a: ['Mad Men', 'Breaking Bad', 'Better Call Saul', 'Ozark'], c: 1, d: 2 },
  { q: 'Quel acteur incarne James Bond le plus longtemps ?', a: ['Connery', 'Moore', 'Brosnan', 'Craig'], c: 1, d: 2 },
  { q: 'Quelle série suit le braquage de la Casa de Papel ?', a: ['Lupin', 'Casa de Papel', 'Élite', 'Narcos'], c: 1, d: 2 },
  { q: 'Quel film raconte l\'histoire d\'un boxeur de Philadelphie ?', a: ['Raging Bull', 'Rocky', 'Creed', 'The Fighter'], c: 1, d: 2 },
  { q: 'Quel film d\'animation 2013 chante "Libérée, délivrée" ?', a: ['Vaiana', 'La Reine des Neiges', 'Raiponce', 'Coco'], c: 1, d: 2 },
  { q: 'Combien de films dans la trilogie du Seigneur des Anneaux ?', a: ['2', '3', '4', '5'], c: 1, d: 2 },
  { q: 'Qui a réalisé Schindler\'s List ?', a: ['Spielberg', 'Coppola', 'Lucas', 'Eastwood'], c: 0, d: 2 },

  // — difficile —
  { q: 'Qui a remporté l\'Oscar du meilleur acteur en 2023 ?', a: ['Brendan Fraser', 'Austin Butler', 'Colin Farrell', 'Bill Nighy'], c: 0, d: 3 },
  { q: 'Combien de films Marvel dans la phase 1 du MCU ?', a: ['5', '6', '7', '8'], c: 1, d: 3 },
  { q: 'En quelle année est sorti le 1er Star Wars ?', a: ['1973', '1977', '1980', '1983'], c: 1, d: 3 },
  { q: 'Quel film a gagné la Palme d\'Or 2023 ?', a: ['Anatomie d\'une chute', 'The Zone of Interest', 'May December', 'Past Lives'], c: 0, d: 3 },
  { q: 'Quel acteur a joué Hannibal Lecter ?', a: ['Hopkins', 'De Niro', 'Pacino', 'Walken'], c: 0, d: 3 },
  { q: 'Quel film traite des dinosaures dans un parc ?', a: ['Le Monde Perdu', 'Jurassic Park', 'King Kong', 'Godzilla'], c: 1, d: 3 },
  { q: 'Quel film a une scène de douche célèbre (1960) ?', a: ['Vertigo', 'Psychose', 'La Mort aux Trousses', 'Les Oiseaux'], c: 1, d: 3 },
  { q: 'Combien de saisons compte The Office (US) ?', a: ['7', '8', '9', '10'], c: 2, d: 3 },
  { q: 'Quel film a été le 1er à atteindre 1 milliard de $ ?', a: ['Titanic', 'Star Wars', 'Le Roi Lion', 'Avatar'], c: 0, d: 3 },
  { q: 'Quel personnage français a 4 amis aux noms de fleurs ?', a: ['Astérix', 'Lucky Luke', 'Tintin', 'Spirou'], c: 0, d: 3 },

  // — extrême —
  { q: 'Quel acteur joue Anton Chigurh dans No Country for Old Men ?', a: ['Bardem', 'Del Toro', 'Banderas', 'Garcia'], c: 0, d: 4 },
  { q: 'Combien de fois Daniel Day-Lewis a gagné l\'Oscar du meilleur acteur ?', a: ['1', '2', '3', '4'], c: 2, d: 4 },
  { q: 'Quel est le 1er film d\'animation entièrement en CGI ?', a: ['Toy Story', 'Shrek', 'Le Roi Lion', 'Antz'], c: 0, d: 4 },
  { q: 'Quel réalisateur a signé Mulholland Drive ?', a: ['Lynch', 'Coppola', 'Scorsese', 'Lynch'], c: 0, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// MUSIQUE
// ═══════════════════════════════════════════════════════════════
const MUSIQUE = [
  // — facile —
  { q: 'Quel artiste a chanté "Thriller" ?', a: ['Prince', 'Michael Jackson', 'Madonna', 'David Bowie'], c: 1, d: 1 },
  { q: 'Combien de notes dans la gamme musicale occidentale ?', a: ['5', '6', '7', '8'], c: 2, d: 1 },
  { q: 'De quel pays vient le reggae ?', a: ['Cuba', 'Jamaïque', 'Haïti', 'Bahamas'], c: 1, d: 1 },
  { q: 'Combien de cordes a une guitare classique ?', a: ['4', '5', '6', '8'], c: 2, d: 1 },
  { q: 'Combien de touches sur un piano standard ?', a: ['76', '88', '92', '100'], c: 1, d: 1 },
  { q: 'Quel chanteur est surnommé "le King" ?', a: ['Elvis Presley', 'Michael Jackson', 'Frank Sinatra', 'James Brown'], c: 0, d: 1 },
  { q: 'Quel groupe de rock anglais a Paul McCartney ?', a: ['Rolling Stones', 'Beatles', 'Queen', 'Pink Floyd'], c: 1, d: 1 },
  { q: 'Quelle chanteuse a chanté "Hello" en 2015 ?', a: ['Beyoncé', 'Adele', 'Rihanna', 'Lady Gaga'], c: 1, d: 1 },
  { q: 'Combien de membres dans un trio musical ?', a: ['2', '3', '4', '5'], c: 1, d: 1 },
  { q: 'Quel instrument fait "ding dong" comme une cloche ?', a: ['Piano', 'Cloche', 'Tambour', 'Flûte'], c: 1, d: 1 },

  // — moyen —
  { q: 'De quel groupe Mick Jagger est-il le chanteur ?', a: ['The Beatles', 'The Rolling Stones', 'The Who', 'Pink Floyd'], c: 1, d: 2 },
  { q: 'Quel groupe a chanté "Bohemian Rhapsody" ?', a: ['Queen', 'Led Zeppelin', 'AC/DC', 'Rolling Stones'], c: 0, d: 2 },
  { q: 'Qui a composé "La Lettre à Élise" ?', a: ['Mozart', 'Bach', 'Beethoven', 'Chopin'], c: 2, d: 2 },
  { q: 'Quel instrument joue Slash ?', a: ['Batterie', 'Basse', 'Guitare', 'Piano'], c: 2, d: 2 },
  { q: 'Qui a composé "Les Quatre Saisons" ?', a: ['Vivaldi', 'Mozart', 'Bach', 'Haendel'], c: 0, d: 2 },
  { q: 'Combien de membres dans BTS ?', a: ['5', '6', '7', '9'], c: 2, d: 2 },
  { q: 'Quel groupe a chanté "Hotel California" ?', a: ['Eagles', 'Aerosmith', 'Boston', 'Fleetwood Mac'], c: 0, d: 2 },
  { q: 'Qui a chanté "Je l\'aime à mourir" ?', a: ['Aznavour', 'Cabrel', 'Brel', 'Goldman'], c: 1, d: 2 },
  { q: 'Quel rappeur français a sorti "Mauvais Œil" ?', a: ['Booba', 'Lunatic', 'Kery James', 'IAM'], c: 1, d: 2 },
  { q: 'Quelle est la chanson la plus écoutée sur Spotify ?', a: ['Despacito', 'Shape of You', 'Blinding Lights', 'Bad Guy'], c: 2, d: 2 },
  { q: 'Quel rappeur français se fait appeler "Le Duc de Boulogne" ?', a: ['Booba', 'Kaaris', 'Niska', 'PNL'], c: 0, d: 2 },
  { q: 'Quel single est le plus vendu de tous les temps ?', a: ['Imagine', 'White Christmas', 'Candle in the Wind', 'Bohemian Rhapsody'], c: 1, d: 2 },
  { q: 'Quel groupe a sorti "Parachutes" en 2000 ?', a: ['Coldplay', 'Radiohead', 'Muse', 'Travis'], c: 0, d: 2 },
  { q: 'Quel rappeur US a sorti "Lose Yourself" ?', a: ['Eminem', '50 Cent', 'Jay-Z', 'Snoop Dogg'], c: 0, d: 2 },
  { q: 'Quelle chanteuse est surnommée "la Reine du Rock\'n\'Roll" ?', a: ['Aretha Franklin', 'Tina Turner', 'Madonna', 'Whitney Houston'], c: 1, d: 2 },
  { q: 'Quel groupe français a chanté "Dragostea Din Tei" ?', a: ['O-Zone', 'Daft Punk', 'Phoenix', 'Justice'], c: 0, d: 2 },
  { q: 'Quel chanteur français a chanté "Comme d\'habitude" (My Way) ?', a: ['Aznavour', 'Sardou', 'Reggiani', 'Cloclo'], c: 3, d: 2 },

  // — difficile —
  { q: 'Quel chanteur a remporté l\'Eurovision 2021 pour l\'Italie ?', a: ['Mahmood', 'Måneskin', 'Diodato', 'Francesco Gabbani'], c: 1, d: 3 },
  { q: 'Quel album des Beatles est sorti en 1969 ?', a: ['Help!', 'Revolver', 'Abbey Road', 'White Album'], c: 2, d: 3 },
  { q: 'Quel rappeur a sorti "DAMN." en 2017 ?', a: ['Drake', 'Kendrick Lamar', 'Travis Scott', 'J. Cole'], c: 1, d: 3 },
  { q: 'En quelle année David Bowie est-il décédé ?', a: ['2014', '2015', '2016', '2017'], c: 2, d: 3 },
  { q: 'Quel groupe français a chanté "Champs-Élysées" ?', a: ['Joe Dassin', 'Téléphone', 'Indochine', 'Les Forbans'], c: 0, d: 3 },
  { q: 'Quel groupe a fondé Roger Waters ?', a: ['Pink Floyd', 'Genesis', 'Yes', 'King Crimson'], c: 0, d: 3 },
  { q: 'Quel chanteur est mort dans un crash en 1959 ("the day the music died") ?', a: ['Elvis', 'Buddy Holly', 'James Dean', 'Sinatra'], c: 1, d: 3 },

  // — extrême —
  { q: 'Combien d\'opéras Mozart a-t-il composés ?', a: ['12', '17', '22', '27'], c: 2, d: 4 },
  { q: 'Quel album est le plus vendu de tous les temps ?', a: ['Thriller', 'Back in Black', 'Dark Side of the Moon', 'Their Greatest Hits'], c: 0, d: 4 },
  { q: 'Quel groupe rock a publié "OK Computer" ?', a: ['Coldplay', 'Radiohead', 'Muse', 'Oasis'], c: 1, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// SCIENCES
// ═══════════════════════════════════════════════════════════════
const SCIENCES = [
  // — facile —
  { q: 'Quel est le symbole chimique de l\'or ?', a: ['Or', 'Au', 'Ag', 'Go'], c: 1, d: 1 },
  { q: 'Combien de planètes dans notre système solaire ?', a: ['7', '8', '9', '10'], c: 1, d: 1 },
  { q: 'Combien d\'os dans le corps humain adulte ?', a: ['186', '206', '226', '256'], c: 1, d: 1 },
  { q: 'Quel gaz les plantes absorbent-elles ?', a: ['Oxygène', 'Azote', 'Dioxyde de carbone', 'Hydrogène'], c: 2, d: 1 },
  { q: 'Quel organe pompe le sang ?', a: ['Foie', 'Cœur', 'Poumons', 'Rein'], c: 1, d: 1 },
  { q: 'À quelle température l\'eau bout-elle au niveau de la mer ?', a: ['90°C', '95°C', '100°C', '105°C'], c: 2, d: 1 },
  { q: 'Quelle est la planète la plus proche du Soleil ?', a: ['Vénus', 'Mercure', 'Terre', 'Mars'], c: 1, d: 1 },
  { q: 'Quelle planète est surnommée "la planète rouge" ?', a: ['Vénus', 'Mars', 'Jupiter', 'Saturne'], c: 1, d: 1 },
  { q: 'Combien de poumons a un humain ?', a: ['1', '2', '3', '4'], c: 1, d: 1 },
  { q: 'Quel est le symbole chimique de l\'eau ?', a: ['HO', 'H2O', 'H3O', 'O2H'], c: 1, d: 1 },
  { q: 'Combien de jambes a une araignée ?', a: ['6', '8', '10', '12'], c: 1, d: 1 },
  { q: 'Quel est l\'animal le plus grand du monde ?', a: ['Éléphant', 'Baleine bleue', 'Girafe', 'Requin blanc'], c: 1, d: 1 },

  // — moyen —
  { q: 'Qui a inventé la théorie de la relativité ?', a: ['Newton', 'Einstein', 'Galilée', 'Hawking'], c: 1, d: 2 },
  { q: 'Quel scientifique a énoncé la loi de la gravitation ?', a: ['Newton', 'Einstein', 'Tesla', 'Galilée'], c: 0, d: 2 },
  { q: 'Combien de chromosomes a l\'humain ?', a: ['44', '46', '48', '50'], c: 1, d: 2 },
  { q: 'Quel animal est le plus rapide au sol ?', a: ['Léopard', 'Guépard', 'Lion', 'Antilope'], c: 1, d: 2 },
  { q: 'Combien de doigts a une étoile de mer typique ?', a: ['3', '5', '6', '8'], c: 1, d: 2 },
  { q: 'À quelle vitesse se déplace la lumière (km/s) ?', a: ['150 000', '200 000', '300 000', '500 000'], c: 2, d: 2 },
  { q: 'Quel est l\'élément le plus abondant dans l\'univers ?', a: ['Oxygène', 'Carbone', 'Hélium', 'Hydrogène'], c: 3, d: 2 },
  { q: 'Quel est le plus grand organe du corps humain ?', a: ['Foie', 'Cerveau', 'Peau', 'Intestin'], c: 2, d: 2 },
  { q: 'Quel groupe sanguin est donneur universel ?', a: ['A+', 'AB+', 'O-', 'B-'], c: 2, d: 2 },
  { q: 'Quel astronaute a marché en premier sur la Lune ?', a: ['Aldrin', 'Armstrong', 'Collins', 'Glenn'], c: 1, d: 2 },
  { q: 'Quel est le métal le plus conducteur ?', a: ['Or', 'Argent', 'Cuivre', 'Aluminium'], c: 1, d: 2 },
  { q: 'Combien de planètes sont des géantes gazeuses ?', a: ['2', '3', '4', '5'], c: 2, d: 2 },
  { q: 'Quelle vitamine est produite par le soleil ?', a: ['A', 'B', 'C', 'D'], c: 3, d: 2 },
  { q: 'Quel est l\'organe le plus dur du corps humain ?', a: ['Os', 'Émail dentaire', 'Crâne', 'Tibia'], c: 1, d: 2 },
  { q: 'Quelle planète a la durée de jour la plus longue ?', a: ['Mercure', 'Vénus', 'Mars', 'Jupiter'], c: 1, d: 2 },
  { q: 'Combien de cœurs a un poulpe ?', a: ['1', '2', '3', '4'], c: 2, d: 2 },
  { q: 'Quel est le métal le plus utilisé au monde ?', a: ['Aluminium', 'Fer', 'Cuivre', 'Or'], c: 1, d: 2 },

  // — difficile —
  { q: 'Quelle est la formule chimique de l\'eau oxygénée ?', a: ['H2O', 'H2O2', 'HO', 'H3O'], c: 1, d: 3 },
  { q: 'Combien de muscles dans le corps humain (env.) ?', a: ['400', '500', '600', '700'], c: 2, d: 3 },
  { q: 'Quelle planète a le plus de lunes (2024) ?', a: ['Jupiter', 'Saturne', 'Uranus', 'Neptune'], c: 1, d: 3 },
  { q: 'Quelle particule a découvert Higgs ?', a: ['Quark', 'Boson', 'Neutrino', 'Photon'], c: 1, d: 3 },
  { q: 'Quel est le pH d\'une solution neutre ?', a: ['0', '7', '10', '14'], c: 1, d: 3 },
  { q: 'Quelle est l\'unité du courant électrique ?', a: ['Volt', 'Watt', 'Ampère', 'Joule'], c: 2, d: 3 },
  { q: 'Quel scientifique a fondé la psychanalyse ?', a: ['Freud', 'Jung', 'Lacan', 'Pavlov'], c: 0, d: 3 },
  { q: 'Quelle est la masse approximative de la Terre (kg) ?', a: ['6×10²¹', '6×10²⁴', '6×10²⁷', '6×10³⁰'], c: 1, d: 3 },

  // — extrême —
  { q: 'Quelle est la plus grande étoile connue (rayon) ?', a: ['Bételgeuse', 'UY Scuti', 'VY Canis Majoris', 'Stephenson 2-18'], c: 3, d: 4 },
  { q: 'Combien de bases dans l\'ADN ?', a: ['2', '3', '4', '5'], c: 2, d: 4 },
  { q: 'Unité de mesure de la résistance ?', a: ['Volt', 'Ampère', 'Ohm', 'Watt'], c: 2, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// CULTURE GÉNÉRALE
// ═══════════════════════════════════════════════════════════════
const CULTURE = [
  // — facile —
  { q: 'Combien de couleurs sur le drapeau de la France ?', a: ['2', '3', '4', '5'], c: 1, d: 1 },
  { q: 'Quelle est la monnaie du Royaume-Uni ?', a: ['Euro', 'Livre sterling', 'Couronne', 'Franc'], c: 1, d: 1 },
  { q: 'Combien de saisons dans une année ?', a: ['2', '3', '4', '5'], c: 2, d: 1 },
  { q: 'Quelle langue parle-t-on au Brésil ?', a: ['Espagnol', 'Portugais', 'Brésilien', 'Anglais'], c: 1, d: 1 },
  { q: 'Quel auteur a écrit "Les Misérables" ?', a: ['Zola', 'Dumas', 'Hugo', 'Balzac'], c: 2, d: 1 },
  { q: 'Quel monument est à Rio de Janeiro ?', a: ['Tour Eiffel', 'Christ Rédempteur', 'Big Ben', 'Statue de la Liberté'], c: 1, d: 1 },
  { q: 'Combien de doigts sur une main humaine ?', a: ['4', '5', '6', '7'], c: 1, d: 1 },
  { q: 'Combien de jours dans une semaine ?', a: ['5', '6', '7', '8'], c: 2, d: 1 },
  { q: 'Combien de mois dans une année ?', a: ['10', '11', '12', '13'], c: 2, d: 1 },
  { q: 'Quelle couleur obtient-on en mélangeant rouge et jaune ?', a: ['Vert', 'Orange', 'Violet', 'Marron'], c: 1, d: 1 },

  // — moyen —
  { q: 'Combien de cartes dans un jeu de tarot français ?', a: ['52', '54', '78', '82'], c: 2, d: 2 },
  { q: 'Quel animal est sur les pièces de 1 € françaises ?', a: ['Coq', 'Aucune', 'Lion', 'Aigle'], c: 1, d: 2 },
  { q: 'Quel est le sport le plus pratiqué au monde ?', a: ['Basket', 'Foot', 'Cricket', 'Tennis'], c: 1, d: 2 },
  { q: 'Que mesure-t-on en Pascal ?', a: ['Énergie', 'Force', 'Pression', 'Vitesse'], c: 2, d: 2 },
  { q: 'Quelle est la couleur du sang d\'une pieuvre ?', a: ['Rouge', 'Bleu', 'Vert', 'Violet'], c: 1, d: 2 },
  { q: 'Quel est le code morse pour SOS ?', a: ['... --- ...', '--- ... ---', '. - .', '... ...'], c: 0, d: 2 },
  { q: 'Quel auteur a écrit "Le Petit Prince" ?', a: ['Camus', 'Saint-Exupéry', 'Hugo', 'Sartre'], c: 1, d: 2 },
  { q: 'Quelle planète est connue pour ses anneaux ?', a: ['Mars', 'Jupiter', 'Saturne', 'Uranus'], c: 2, d: 2 },
  { q: 'Combien de muscles pour sourire (env.) ?', a: ['12', '17', '24', '32'], c: 1, d: 2 },
  { q: 'Quel jour est la fête nationale française ?', a: ['1er mai', '8 mai', '14 juillet', '15 août'], c: 2, d: 2 },
  { q: 'Combien de couleurs dans l\'arc-en-ciel ?', a: ['5', '6', '7', '8'], c: 2, d: 2 },
  { q: 'Quelle religion suit Bouddha ?', a: ['Hindouisme', 'Bouddhisme', 'Islam', 'Sikhisme'], c: 1, d: 2 },
  { q: 'Quel auteur a écrit "Roméo et Juliette" ?', a: ['Shakespeare', 'Molière', 'Goethe', 'Cervantes'], c: 0, d: 2 },
  { q: 'Quelle langue est la plus parlée au monde ?', a: ['Anglais', 'Mandarin', 'Espagnol', 'Hindi'], c: 1, d: 2 },
  { q: 'Combien de pieds dans un mètre ?', a: ['~3,28', '~2,1', '~1,5', '~5'], c: 0, d: 2 },

  // — difficile —
  { q: 'Combien de pièces dans un jeu d\'échecs (total) ?', a: ['16', '24', '32', '64'], c: 2, d: 3 },
  { q: 'Combien de muscles env. dans le corps humain ?', a: ['400', '600', '800', '1000'], c: 1, d: 3 },
  { q: 'Quel auteur a écrit "L\'Étranger" ?', a: ['Sartre', 'Camus', 'Gide', 'Malraux'], c: 1, d: 3 },
  { q: 'Combien de péchés capitaux dans le christianisme ?', a: ['5', '6', '7', '10'], c: 2, d: 3 },
  { q: 'Quel auteur a créé Sherlock Holmes ?', a: ['Agatha Christie', 'Conan Doyle', 'Edgar Allan Poe', 'Maurice Leblanc'], c: 1, d: 3 },
  { q: 'Quel poète a écrit "Les Fleurs du mal" ?', a: ['Rimbaud', 'Baudelaire', 'Verlaine', 'Apollinaire'], c: 1, d: 3 },

  // — extrême —
  { q: 'Combien de mots a la langue française (env.) ?', a: ['60 000', '100 000', '200 000', '500 000'], c: 1, d: 4 },
  { q: 'Quel est le mot le plus long du français officiel ?', a: ['anticonstitutionnellement', 'intergouvernementalisations', 'hippopotomonstrosesquippedaliophobie', 'pneumonoultramicroscopicsilicovolcanoconiose'], c: 1, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// 🎮 INTERNET, JEUX VIDÉO & TECH (catégorie focus)
// ═══════════════════════════════════════════════════════════════
const INTERNET_GAMING = [
  // — facile —
  { q: 'Qui a fondé Microsoft ?', a: ['Steve Jobs', 'Bill Gates', 'Elon Musk', 'Mark Zuckerberg'], c: 1, d: 1 },
  { q: 'Quel est le nom du plombier moustachu de Nintendo ?', a: ['Mario', 'Luigi', 'Wario', 'Toad'], c: 0, d: 1 },
  { q: 'Quelle entreprise a créé l\'iPhone ?', a: ['Samsung', 'Apple', 'Google', 'Microsoft'], c: 1, d: 1 },
  { q: 'Dans Minecraft, quel monstre explose ?', a: ['Zombie', 'Squelette', 'Creeper', 'Enderman'], c: 2, d: 1 },
  { q: 'Quelle entreprise possède YouTube ?', a: ['Microsoft', 'Apple', 'Google', 'Meta'], c: 2, d: 1 },
  { q: 'Quelle couleur est dominante chez Facebook ?', a: ['Rouge', 'Bleu', 'Vert', 'Orange'], c: 1, d: 1 },
  { q: 'Quel personnage de Mario lance des bananes ?', a: ['Mario', 'Yoshi', 'Donkey Kong', 'Bowser'], c: 2, d: 1 },
  { q: 'Quelle console est de Sony ?', a: ['Xbox', 'PlayStation', 'Switch', 'GameCube'], c: 1, d: 1 },
  { q: 'Quel jeu mobile a été un phénomène en 2016 (Pokémon) ?', a: ['Pokémon Sleep', 'Pokémon GO', 'Pokémon Café', 'Pokémon Unite'], c: 1, d: 1 },
  { q: 'Quel oiseau est le logo de Twitter avant 2023 ?', a: ['Aigle', 'Pigeon', 'Oiseau bleu', 'Hibou'], c: 2, d: 1 },
  { q: 'Quel format est utilisé pour les images animées ?', a: ['JPG', 'GIF', 'PNG', 'BMP'], c: 1, d: 1 },
  { q: 'Quel jeu de blocs est très vendu ?', a: ['Minecraft', 'Roblox', 'Tetris', 'Lego'], c: 0, d: 1 },

  // — moyen —
  { q: 'En quelle année a été créé Facebook ?', a: ['2002', '2004', '2006', '2008'], c: 1, d: 2 },
  { q: 'Quel jeu a popularisé le terme "Battle Royale" ?', a: ['Fortnite', 'PUBG', 'Apex', 'COD Warzone'], c: 1, d: 2 },
  { q: 'Combien de joueurs max dans Fortnite Battle Royale ?', a: ['50', '60', '100', '150'], c: 2, d: 2 },
  { q: 'Quelle est la couleur dominante de Spotify ?', a: ['Bleu', 'Rouge', 'Vert', 'Violet'], c: 2, d: 2 },
  { q: 'Quelle plateforme a popularisé les vidéos courtes ?', a: ['YouTube', 'TikTok', 'Vine', 'Snapchat'], c: 1, d: 2 },
  { q: 'Quel est le jeu vidéo le plus vendu de tous les temps ?', a: ['GTA V', 'Tetris', 'Minecraft', 'Mario Bros'], c: 2, d: 2 },
  { q: 'Quel format d\'image supporte la transparence ?', a: ['JPG', 'PNG', 'BMP', 'TIFF'], c: 1, d: 2 },
  { q: 'En quelle année est sortie la PS5 ?', a: ['2018', '2019', '2020', '2021'], c: 2, d: 2 },
  { q: 'Quel personnage rouge sauve la Princesse Peach ?', a: ['Mario', 'Luigi', 'Toad', 'Bowser'], c: 0, d: 2 },
  { q: 'Quelle franchise a vendu le plus de jeux ?', a: ['Mario', 'Pokémon', 'Call of Duty', 'GTA'], c: 1, d: 2 },
  { q: 'Quelle est la mascotte de Sega ?', a: ['Mario', 'Sonic', 'Crash Bandicoot', 'Spyro'], c: 1, d: 2 },
  { q: 'Combien d\'icônes par défaut sur le bureau Windows ?', a: ['1', 'Variable', '5', '10'], c: 1, d: 2 },
  { q: 'Quel jeu utilise des "épées laser" et l\'univers Star Wars ?', a: ['Battlefront', 'Jedi Fallen Order', 'KOTOR', 'Tous'], c: 3, d: 2 },
  { q: 'Quelle entreprise possède Instagram ?', a: ['Twitter', 'Meta (Facebook)', 'Snap', 'Google'], c: 1, d: 2 },
  { q: 'Quel jeu vidéo se passe à Vice City ?', a: ['GTA III', 'GTA Vice City', 'GTA V', 'GTA San Andreas'], c: 1, d: 2 },
  { q: 'Combien d\'abonnés a MrBeast (env. fin 2024) ?', a: ['100 M', '200 M', '300 M', '500 M'], c: 1, d: 2 },
  { q: 'Quel est le réseau social préféré des photos pro ?', a: ['Pinterest', 'Instagram', 'Behance', 'Flickr'], c: 1, d: 2 },
  { q: 'Quel jeu a un personnage qui dit "It\'s-a me, Mario!" ?', a: ['Mario 64', 'Super Mario Bros', 'Mario Kart', 'Mario Galaxy'], c: 0, d: 2 },
  { q: 'Quelle est la mascotte d\'Android ?', a: ['Robot vert', 'Pomme', 'Pingouin', 'Renard'], c: 0, d: 2 },
  { q: 'Quel jeu se joue à 2 équipes de 5 et utilise des champions ?', a: ['Dota 2', 'League of Legends', 'Valorant', 'Heroes of the Storm'], c: 1, d: 2 },
  { q: 'Quel jeu a la phrase culte "Snake? Snake?! SNAAAKE!" ?', a: ['Final Fantasy', 'Metal Gear Solid', 'Resident Evil', 'Halo'], c: 1, d: 2 },
  { q: 'Quel jeu Bethesda se passe en Tamriel ?', a: ['Fallout', 'The Elder Scrolls', 'Doom', 'Wolfenstein'], c: 1, d: 2 },
  { q: 'Quel personnage Pokémon de type électrique est jaune ?', a: ['Pikachu', 'Raichu', 'Voltali', 'Tous'], c: 0, d: 2 },
  { q: 'Quel est le plus grand streamer Twitch en 2024 ?', a: ['Ninja', 'xQc', 'Kai Cenat', 'AuronPlay'], c: 2, d: 2 },

  // — difficile —
  { q: 'Qui a créé Linux ?', a: ['Linus Torvalds', 'Bill Gates', 'Richard Stallman', 'Steve Wozniak'], c: 0, d: 3 },
  { q: 'Quel langage est nommé d\'après un type de café ?', a: ['Python', 'Ruby', 'Java', 'Rust'], c: 2, d: 3 },
  { q: 'Quel est le 1er moteur de recherche populaire avant Google ?', a: ['AltaVista', 'Lycos', 'Yahoo', 'Tous corrects'], c: 3, d: 3 },
  { q: 'Quelle entreprise a créé ChatGPT ?', a: ['Google', 'Microsoft', 'OpenAI', 'Meta'], c: 2, d: 3 },
  { q: 'Quel jeu vidéo est sorti en 1985 sur NES ?', a: ['Mario Bros', 'Super Mario Bros', 'Zelda', 'Donkey Kong'], c: 1, d: 3 },
  { q: 'Quel est le langage de programmation le plus populaire en 2024 ?', a: ['Python', 'JavaScript', 'Java', 'C++'], c: 0, d: 3 },
  { q: 'Quel est le 1er jeu vidéo de l\'histoire ?', a: ['Pong', 'Tennis for Two', 'Spacewar!', 'OXO'], c: 3, d: 3 },
  { q: 'Quel jeu PSX a un protagoniste avec une mèche bleue ?', a: ['Crash Bandicoot', 'Spyro', 'Cloud (FF7)', 'Sonic'], c: 2, d: 3 },
  { q: 'Quel jeu indépendant utilise du papier (Origami) ?', a: ['Tearaway', 'Paper Mario', 'Origami King', 'Tous corrects'], c: 3, d: 3 },
  { q: 'Quel jeu Activision a créé "Call of Duty" ?', a: ['Infinity Ward', 'Treyarch', 'Sledgehammer', 'Tous'], c: 3, d: 3 },
  { q: 'Combien d\'abonnés YouTube max sans paiement ?', a: ['Illimité', '1 M', '10 M', '100 M'], c: 0, d: 3 },
  { q: 'Quelle est la 1ère vidéo postée sur YouTube ?', a: ['Me at the zoo', 'Charlie bit me', 'Gangnam Style', 'Despacito'], c: 0, d: 3 },
  { q: 'Quel jeu a inventé le concept "open-world" 3D moderne ?', a: ['GTA III', 'Zelda OoT', 'Morrowind', 'Shenmue'], c: 0, d: 3 },
  { q: 'Quelle compagnie a sorti la Game Boy en 1989 ?', a: ['Sega', 'Nintendo', 'Sony', 'Atari'], c: 1, d: 3 },
  { q: 'Quel jeu se joue dans Hyrule ?', a: ['Mario', 'Zelda', 'Metroid', 'Final Fantasy'], c: 1, d: 3 },
  { q: 'Quel jeu Steam a un capot de "Crowbar" comme arme ?', a: ['Half-Life', 'Portal', 'Counter-Strike', 'Team Fortress 2'], c: 0, d: 3 },
  { q: 'Quel développeur a créé The Witcher 3 ?', a: ['CDPR', 'Bethesda', 'BioWare', 'Ubisoft'], c: 0, d: 3 },
  { q: 'Quel jeu a la phrase "The cake is a lie" ?', a: ['Half-Life', 'Portal', 'BioShock', 'Team Fortress 2'], c: 1, d: 3 },
  { q: 'En quelle année est sortie la Xbox originale ?', a: ['1999', '2001', '2003', '2005'], c: 1, d: 3 },
  { q: 'Quelle est l\'extension principale du livre numérique Kindle ?', a: ['.epub', '.azw3', '.pdf', '.mobi'], c: 1, d: 3 },

  // — extrême —
  { q: 'Quel est le 1er ordinateur personnel grand public ?', a: ['Apple I', 'Altair 8800', 'IBM PC', 'Commodore 64'], c: 1, d: 4 },
  { q: 'Combien d\'utilisateurs actifs WhatsApp en 2024 (milliards) ?', a: ['1', '2', '3', '4'], c: 1, d: 4 },
  { q: 'Quelle est la taille d\'un IP v4 (en bits) ?', a: ['16', '32', '64', '128'], c: 1, d: 4 },
  { q: 'Quel jeu est considéré comme le 1er MMORPG grand public ?', a: ['Ultima Online', 'EverQuest', 'WoW', 'RuneScape'], c: 0, d: 4 },
  { q: 'Quel langage utilise la syntaxe avec accolades et points-virgules ?', a: ['Python', 'Java', 'Ruby', 'Pascal'], c: 1, d: 4 },
  { q: 'Quel est le plus ancien gestionnaire de paquets Linux populaire ?', a: ['apt', 'yum', 'dpkg', 'rpm'], c: 2, d: 4 },
  { q: 'Quel jeu a vendu plus de 200 M d\'unités (la franchise) ?', a: ['Mario', 'Pokémon', 'Tetris', 'Tous'], c: 3, d: 4 },
  { q: 'Quel est le port HTTP standard ?', a: ['21', '80', '443', '8080'], c: 1, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// 🧒 MODE ENFANT — questions très simples (6-12 ans)
// ═══════════════════════════════════════════════════════════════
const ENFANT = [
  { q: 'De quelle couleur est le ciel un jour ensoleillé ?', a: ['Vert', 'Rose', 'Bleu', 'Marron'], c: 2, d: 1 },
  { q: 'Combien de pattes a un chien ?', a: ['2', '3', '4', '6'], c: 2, d: 1 },
  { q: 'Quel animal dit "Miaou" ?', a: ['Chien', 'Chat', 'Vache', 'Cheval'], c: 1, d: 1 },
  { q: 'Quel animal dit "Meuh" ?', a: ['Vache', 'Mouton', 'Cochon', 'Cheval'], c: 0, d: 1 },
  { q: 'Quelle couleur obtient-on en mélangeant bleu et jaune ?', a: ['Vert', 'Orange', 'Rouge', 'Violet'], c: 0, d: 1 },
  { q: 'Combien font 2 + 2 ?', a: ['3', '4', '5', '6'], c: 1, d: 1 },
  { q: 'Combien font 5 × 2 ?', a: ['8', '9', '10', '12'], c: 2, d: 1 },
  { q: 'Quelle est la première lettre de l\'alphabet ?', a: ['A', 'B', 'C', 'D'], c: 0, d: 1 },
  { q: 'Combien de jours dans une semaine ?', a: ['5', '6', '7', '8'], c: 2, d: 1 },
  { q: 'Combien de mois dans une année ?', a: ['10', '11', '12', '13'], c: 2, d: 1 },
  { q: 'Quel jour vient après lundi ?', a: ['Mercredi', 'Mardi', 'Dimanche', 'Vendredi'], c: 1, d: 1 },
  { q: 'Combien de doigts sur une main ?', a: ['3', '4', '5', '6'], c: 2, d: 1 },
  { q: 'Quel animal a une trompe ?', a: ['Girafe', 'Lion', 'Éléphant', 'Hippopotame'], c: 2, d: 1 },
  { q: 'Quel animal a un long cou ?', a: ['Lion', 'Girafe', 'Singe', 'Tigre'], c: 1, d: 1 },
  { q: 'Quelle couleur sont les bananes mûres ?', a: ['Rouge', 'Jaune', 'Vert', 'Bleu'], c: 1, d: 1 },
  { q: 'Quelle est la couleur de l\'herbe ?', a: ['Bleu', 'Rouge', 'Vert', 'Jaune'], c: 2, d: 1 },
  { q: 'Que mange une vache ?', a: ['Viande', 'Herbe', 'Poisson', 'Graines'], c: 1, d: 1 },
  { q: 'Quel personnage Disney a une longue chevelure magique ?', a: ['Cendrillon', 'Raiponce', 'Belle', 'Mulan'], c: 1, d: 1 },
  { q: 'Comment s\'appelle la sœur d\'Elsa dans la Reine des Neiges ?', a: ['Anna', 'Aurore', 'Ariel', 'Tiana'], c: 0, d: 1 },
  { q: 'Quel personnage Disney est un poisson clown ?', a: ['Némo', 'Dory', 'Marin', 'Picsou'], c: 0, d: 1 },
  { q: 'Combien de saisons y a-t-il ?', a: ['2', '3', '4', '5'], c: 2, d: 1 },
  { q: 'Quelle saison fait neige souvent ?', a: ['Été', 'Printemps', 'Hiver', 'Automne'], c: 2, d: 1 },
  { q: 'Quel animal pond des œufs ?', a: ['Vache', 'Poule', 'Chien', 'Mouton'], c: 1, d: 1 },
  { q: 'Que mange un lapin ?', a: ['Viande', 'Carottes', 'Poisson', 'Pizza'], c: 1, d: 1 },
  { q: 'De quelle couleur est un citron ?', a: ['Bleu', 'Rouge', 'Jaune', 'Vert'], c: 2, d: 1 },
  { q: 'Quel animal vit dans la mer ?', a: ['Poisson', 'Vache', 'Cheval', 'Mouton'], c: 0, d: 1 },
  { q: 'Que dit un canard ?', a: ['Cocorico', 'Coin coin', 'Hi han', 'Bêêê'], c: 1, d: 1 },
  { q: 'Combien font 3 + 5 ?', a: ['6', '7', '8', '9'], c: 2, d: 1 },
  { q: 'Combien font 10 - 4 ?', a: ['4', '5', '6', '7'], c: 2, d: 1 },
  { q: 'Quel est le nombre après 7 ?', a: ['6', '8', '9', '10'], c: 1, d: 1 },
  { q: 'Quel est le contraire de "chaud" ?', a: ['Tiède', 'Froid', 'Gelé', 'Bouillant'], c: 1, d: 1 },
  { q: 'Quel est le contraire de "grand" ?', a: ['Petit', 'Gros', 'Long', 'Haut'], c: 0, d: 1 },
  { q: 'De quelle couleur est la neige ?', a: ['Bleue', 'Blanche', 'Rouge', 'Verte'], c: 1, d: 1 },
  { q: 'Quelle est la lumière du jour ?', a: ['Lune', 'Soleil', 'Étoile', 'Lampe'], c: 1, d: 1 },
  { q: 'Quel personnage rouge sauve la princesse ?', a: ['Luigi', 'Mario', 'Sonic', 'Link'], c: 1, d: 1 },
  { q: 'Quel super-héros a une cape rouge et un S sur la poitrine ?', a: ['Batman', 'Superman', 'Spider-Man', 'Hulk'], c: 1, d: 1 },
  { q: 'Quelle forme a une roue ?', a: ['Carrée', 'Triangle', 'Ronde', 'Étoile'], c: 2, d: 1 },
  { q: 'Combien de roues a une voiture ?', a: ['2', '3', '4', '6'], c: 2, d: 1 },
  { q: 'Combien de roues a un vélo ?', a: ['1', '2', '3', '4'], c: 1, d: 1 },
  { q: 'Quel fruit est rouge et a un trognon ?', a: ['Banane', 'Pomme', 'Citron', 'Kiwi'], c: 1, d: 1 },
  { q: 'Quelle saison fait chaud ?', a: ['Hiver', 'Automne', 'Été', 'Printemps'], c: 2, d: 1 },
  { q: 'Combien de pattes a une araignée ?', a: ['4', '6', '8', '10'], c: 2, d: 1 },
  { q: 'Quel animal vole ?', a: ['Poisson', 'Oiseau', 'Vache', 'Chat'], c: 1, d: 1 },
  { q: 'Comment s\'appelle le chien dans Mickey ?', a: ['Pluto', 'Donald', 'Dingo', 'Goofy'], c: 0, d: 1 },
  { q: 'Combien de bougies sur un gâteau de 5 ans ?', a: ['3', '4', '5', '6'], c: 2, d: 1 },
  { q: 'Quel animal fait "Hi han" ?', a: ['Chien', 'Cheval', 'Âne', 'Mouton'], c: 2, d: 1 },
  { q: 'Que mange une abeille ?', a: ['Viande', 'Nectar', 'Poisson', 'Pizza'], c: 1, d: 1 },
  { q: 'Quel insecte fait du miel ?', a: ['Mouche', 'Abeille', 'Fourmi', 'Coccinelle'], c: 1, d: 1 },
  { q: 'Quel super-héros tisse des toiles ?', a: ['Hulk', 'Spider-Man', 'Iron Man', 'Thor'], c: 1, d: 1 },
  { q: 'Combien de couleurs dans le drapeau français ?', a: ['1', '2', '3', '4'], c: 2, d: 1 },
];

// ═══════════════════════════════════════════════════════════════
// 🏳️ DRAPEAUX — via flagcdn.com
// ═══════════════════════════════════════════════════════════════
const flag = (code) => `https://flagcdn.com/w640/${code}.png`;

const DRAPEAUX = [
  { q: 'Quel est ce drapeau ?', image: flag('fr'), a: ['Italie', 'France', 'Pays-Bas', 'Russie'], c: 1, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('us'), a: ['Royaume-Uni', 'Australie', 'États-Unis', 'Liberia'], c: 2, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('jp'), a: ['Chine', 'Corée du Sud', 'Japon', 'Vietnam'], c: 2, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('br'), a: ['Argentine', 'Brésil', 'Mexique', 'Colombie'], c: 1, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('de'), a: ['Allemagne', 'Belgique', 'Espagne', 'Autriche'], c: 0, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('it'), a: ['Hongrie', 'Mexique', 'Italie', 'Côte d\'Ivoire'], c: 2, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('es'), a: ['Espagne', 'Portugal', 'Maroc', 'Italie'], c: 0, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('gb'), a: ['Australie', 'Nouvelle-Zélande', 'États-Unis', 'Royaume-Uni'], c: 3, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('ca'), a: ['Pérou', 'Canada', 'Indonésie', 'Suisse'], c: 1, d: 1 },
  { q: 'Quel est ce drapeau ?', image: flag('cn'), a: ['Vietnam', 'Chine', 'Corée du Nord', 'Cuba'], c: 1, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('au'), a: ['Royaume-Uni', 'Nouvelle-Zélande', 'Australie', 'Tuvalu'], c: 2, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('mx'), a: ['Italie', 'Mexique', 'Hongrie', 'Inde'], c: 1, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('eg'), a: ['Égypte', 'Yémen', 'Syrie', 'Iraq'], c: 0, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('ar'), a: ['Argentine', 'Honduras', 'Salvador', 'Uruguay'], c: 0, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('tr'), a: ['Tunisie', 'Turquie', 'Pakistan', 'Singapour'], c: 1, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('gr'), a: ['Grèce', 'Argentine', 'Honduras', 'Israël'], c: 0, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('se'), a: ['Suède', 'Finlande', 'Norvège', 'Danemark'], c: 0, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('ch'), a: ['Danemark', 'Suisse', 'Géorgie', 'Tonga'], c: 1, d: 2 },
  { q: 'Quel est ce drapeau ?', image: flag('ma'), a: ['Tunisie', 'Turquie', 'Maroc', 'Vietnam'], c: 2, d: 3 },
  { q: 'Quel est ce drapeau ?', image: flag('be'), a: ['Allemagne', 'Belgique', 'Tchad', 'Roumanie'], c: 1, d: 3 },
  { q: 'Quel est ce drapeau ?', image: flag('ie'), a: ['Italie', 'Côte d\'Ivoire', 'Irlande', 'Mexique'], c: 2, d: 3 },
  { q: 'Quel est ce drapeau ?', image: flag('nl'), a: ['Russie', 'Pays-Bas', 'France', 'Luxembourg'], c: 1, d: 3 },
  { q: 'Quel est ce drapeau ?', image: flag('pt'), a: ['Portugal', 'Brésil', 'Espagne', 'Cameroun'], c: 0, d: 3 },
  { q: 'Quel est ce drapeau ?', image: flag('za'), a: ['Mozambique', 'Afrique du Sud', 'Namibie', 'Zambie'], c: 1, d: 3 },
  { q: 'Quel est ce drapeau ?', image: flag('np'), a: ['Bhoutan', 'Sri Lanka', 'Népal', 'Cambodge'], c: 2, d: 4 },
  { q: 'Quel est ce drapeau ?', image: flag('kr'), a: ['Corée du Nord', 'Corée du Sud', 'Mongolie', 'Bangladesh'], c: 1, d: 4 },
  { q: 'Quel est ce drapeau ?', image: flag('is'), a: ['Norvège', 'Islande', 'Finlande', 'Féroé'], c: 1, d: 4 },
  { q: 'Quel est ce drapeau ?', image: flag('ke'), a: ['Kenya', 'Ouganda', 'Soudan du Sud', 'Zimbabwe'], c: 0, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// 🏛️ MONUMENTS — questions TEXTUELLES (les images Wikipedia étant peu fiables,
// on s'en passe et on pose des questions classiques sur les monuments).
// ═══════════════════════════════════════════════════════════════
const MONUMENTS = [
  // — facile —
  { q: 'Dans quelle ville se trouve la Tour Eiffel ?', a: ['Lyon', 'Paris', 'Marseille', 'Bordeaux'], c: 1, d: 1 },
  { q: 'Dans quel pays se trouve le Big Ben ?', a: ['France', 'Royaume-Uni', 'USA', 'Allemagne'], c: 1, d: 1 },
  { q: 'Où se trouve la Statue de la Liberté ?', a: ['Paris', 'New York', 'Londres', 'Tokyo'], c: 1, d: 1 },
  { q: 'Dans quel pays se trouve le Christ Rédempteur ?', a: ['Mexique', 'Brésil', 'Argentine', 'Espagne'], c: 1, d: 1 },
  { q: 'Où se trouve le Colisée ?', a: ['Athènes', 'Rome', 'Paris', 'Madrid'], c: 1, d: 1 },
  { q: 'Dans quelle ville italienne se trouve la Tour de Pise ?', a: ['Rome', 'Florence', 'Pise', 'Milan'], c: 2, d: 1 },
  { q: 'Quelle ville abrite la Sagrada Família ?', a: ['Madrid', 'Barcelone', 'Valence', 'Séville'], c: 1, d: 1 },
  { q: 'Quelle muraille mesure plus de 21 000 km ?', a: ['Mur d\'Hadrien', 'Mur de Berlin', 'Grande Muraille de Chine', 'Mur des Lamentations'], c: 2, d: 1 },
  { q: 'Dans quel pays se trouve le Taj Mahal ?', a: ['Pakistan', 'Inde', 'Bangladesh', 'Iran'], c: 1, d: 1 },
  { q: 'Où se trouve l\'Acropole ?', a: ['Rome', 'Athènes', 'Le Caire', 'Istanbul'], c: 1, d: 1 },
  { q: 'Dans quelle ville US se trouve l\'Empire State Building ?', a: ['Chicago', 'Los Angeles', 'New York', 'Las Vegas'], c: 2, d: 1 },
  // — moyen —
  { q: 'Dans quel pays se trouve le Machu Picchu ?', a: ['Bolivie', 'Pérou', 'Mexique', 'Équateur'], c: 1, d: 2 },
  { q: 'Quel monument indien est un mausolée d\'amour ?', a: ['Taj Mahal', 'Fort Rouge', 'Hawa Mahal', 'Lotus Temple'], c: 0, d: 2 },
  { q: 'Quelle est la plus haute tour du monde (2024) ?', a: ['Tour Eiffel', 'Burj Khalifa', 'Tour de Tokyo', 'Empire State'], c: 1, d: 2 },
  { q: 'Quel monument se trouve sur les Champs-Élysées ?', a: ['Arc de Triomphe', 'Tour Eiffel', 'Sacré-Cœur', 'Notre-Dame'], c: 0, d: 2 },
  { q: 'Dans quel pays se trouve Stonehenge ?', a: ['Royaume-Uni', 'Irlande', 'Allemagne', 'France'], c: 0, d: 2 },
  { q: 'Dans quel désert se trouve les pyramides de Gizeh ?', a: ['Sahara', 'Désert Libyque', 'Désert d\'Arabie', 'Aucun'], c: 0, d: 2 },
  { q: 'Quel monument est connu pour pencher ?', a: ['Big Ben', 'Tour de Pise', 'Tour Eiffel', 'Burj Khalifa'], c: 1, d: 2 },
  { q: 'Où est le Mont Rushmore (visages présidentiels) ?', a: ['USA', 'Canada', 'Argentine', 'Russie'], c: 0, d: 2 },
  { q: 'Quel monument romain a une coupole non soutenue célèbre ?', a: ['Colisée', 'Panthéon', 'Forum', 'Arc de Constantin'], c: 1, d: 2 },
  // — difficile —
  { q: 'Dans quel pays se trouve Pétra (la cité rose) ?', a: ['Égypte', 'Liban', 'Jordanie', 'Israël'], c: 2, d: 3 },
  { q: 'Dans quel pays se trouve Angkor Wat ?', a: ['Thaïlande', 'Cambodge', 'Vietnam', 'Laos'], c: 1, d: 3 },
  { q: 'Quel monument a été conçu par Gustave Eiffel autre que sa tour ?', a: ['Statue de la Liberté', 'Tour de Belém', 'Sagrada Família', 'Sphinx'], c: 0, d: 3 },
  { q: 'Combien d\'années pour construire la Sagrada Família (en cours) ?', a: ['50', '100', '140+', '200'], c: 2, d: 3 },
  { q: 'En quelle année a été inaugurée la Tour Eiffel ?', a: ['1869', '1889', '1900', '1920'], c: 1, d: 3 },
  // — extrême —
  { q: 'Quel architecte a conçu la Sagrada Família ?', a: ['Gaudí', 'Le Corbusier', 'Frank Lloyd Wright', 'Niemeyer'], c: 0, d: 4 },
  { q: 'Quelle est la hauteur exacte de la Tour Eiffel (avec antenne) ?', a: ['324 m', '300 m', '350 m', '400 m'], c: 0, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// 🐾 ANIMAUX — questions TEXTUELLES
// ═══════════════════════════════════════════════════════════════
const ANIMAUX = [
  // — facile —
  { q: 'Quel est l\'animal le plus rapide au sol ?', a: ['Léopard', 'Guépard', 'Lion', 'Cheval'], c: 1, d: 1 },
  { q: 'Quel animal est le "roi de la jungle" ?', a: ['Tigre', 'Lion', 'Éléphant', 'Loup'], c: 1, d: 1 },
  { q: 'Quel animal a la trompe ?', a: ['Girafe', 'Hippopotame', 'Éléphant', 'Rhinocéros'], c: 2, d: 1 },
  { q: 'Quel animal a un long cou ?', a: ['Hippopotame', 'Girafe', 'Lion', 'Singe'], c: 1, d: 1 },
  { q: 'Quel animal noir et blanc mange du bambou ?', a: ['Koala', 'Panda géant', 'Zèbre', 'Vache'], c: 1, d: 1 },
  { q: 'Quel oiseau est connu pour ne pas voler ?', a: ['Aigle', 'Pigeon', 'Pingouin', 'Mouette'], c: 2, d: 1 },
  { q: 'Quel animal vit dans la mer et a 8 bras ?', a: ['Calmar', 'Pieuvre', 'Méduse', 'Étoile de mer'], c: 1, d: 1 },
  { q: 'Quel animal est le plus grand au monde ?', a: ['Éléphant', 'Baleine bleue', 'Girafe', 'Requin blanc'], c: 1, d: 1 },
  { q: 'Quel animal a la même tâche au pelage ?', a: ['Lion', 'Tigre', 'Léopard', 'Guépard'], c: 2, d: 1 },
  // — moyen —
  { q: 'Combien de temps dure la grossesse d\'un éléphant ?', a: ['9 mois', '12 mois', '18 mois', '22 mois'], c: 3, d: 2 },
  { q: 'Quelle est la durée de vie max d\'une tortue géante ?', a: ['80 ans', '100 ans', '150+ ans', '200+ ans'], c: 2, d: 2 },
  { q: 'Quel animal pèse jusqu\'à 6 tonnes ?', a: ['Hippopotame', 'Rhinocéros', 'Éléphant d\'Afrique', 'Buffle'], c: 2, d: 2 },
  { q: 'Quel animal est aussi appelé "guépard de mer" ?', a: ['Dauphin', 'Espadon', 'Voilier', 'Marlin'], c: 1, d: 2 },
  { q: 'Combien de cœurs a une pieuvre ?', a: ['1', '2', '3', '4'], c: 2, d: 2 },
  { q: 'Quel animal est l\'emblème national de la France ?', a: ['Aigle', 'Coq', 'Lion', 'Loup'], c: 1, d: 2 },
  { q: 'Quel animal a le plus de dents ?', a: ['Crocodile', 'Requin', 'Escargot', 'Chien'], c: 2, d: 2 },
  // — difficile —
  { q: 'Quelle est la durée de vie d\'une libellule adulte ?', a: ['1 jour', '2 mois', '6 mois', '1 an'], c: 1, d: 3 },
  { q: 'Quel animal peut courir à 110 km/h ?', a: ['Cheval', 'Guépard', 'Antilope', 'Faucon (en vol)'], c: 1, d: 3 },
  { q: 'Quel reptile a un troisième œil pinéal ?', a: ['Crocodile', 'Tuatara', 'Caméléon', 'Iguane'], c: 1, d: 3 },
  { q: 'Quel oiseau peut voler en arrière ?', a: ['Aigle', 'Hibou', 'Colibri', 'Mouette'], c: 2, d: 3 },
  // — extrême —
  { q: 'Combien d\'os a un requin (squelette) ?', a: ['Aucun (cartilage)', '50', '100', '200'], c: 0, d: 4 },
  { q: 'Quel animal a le plus gros cerveau (en kg) ?', a: ['Humain', 'Éléphant', 'Cachalot', 'Dauphin'], c: 2, d: 4 },
];

// ═══════════════════════════════════════════════════════════════
// Construction des catégories exposées (avec ID auto-généré)
// ═══════════════════════════════════════════════════════════════
const buildCategory = (id, label, list) => ({
  id, label,
  questions: list.map((item, idx) => ({
    id: `${id}_${idx}`,                  // ID unique pour anti-répétition
    category: id,
    question: item.q,
    answers: item.a,
    correct: item.c,
    difficulty: item.d || 1,
    image: item.image || null,
  })),
});

export const CATEGORIES = {
  all:        { id: 'all', label: '🎲 Toutes catégories', questions: [] },
  histoire:   buildCategory('histoire',  '📜 Histoire', HISTOIRE),
  geo:        buildCategory('geo',       '🌍 Géographie', GEO),
  sport:      buildCategory('sport',     '⚽ Sport', SPORT),
  cinema:     buildCategory('cinema',    '🎬 Cinéma & séries', CINEMA),
  musique:    buildCategory('musique',   '🎵 Musique', MUSIQUE),
  sciences:   buildCategory('sciences',  '🔬 Sciences', SCIENCES),
  culture:    buildCategory('culture',   '💡 Culture générale', CULTURE),
  internet:   buildCategory('internet',  '💻 Internet & gaming', INTERNET_GAMING),
  drapeaux:   buildCategory('drapeaux',  '🏳️ Drapeaux (avec images)', DRAPEAUX),
  monuments:  buildCategory('monuments', '🏛️ Monuments du monde', MONUMENTS),
  animaux:    buildCategory('animaux',   '🐾 Animaux', ANIMAUX),
  enfant:     buildCategory('enfant',    '🧒 Mode enfant (questions simples)', ENFANT),
};

CATEGORIES.all.questions = Object.values(CATEGORIES)
  .filter(c => c.id !== 'all' && c.id !== 'enfant') // exclude enfant from "all"
  .flatMap(c => c.questions);

export const DIFFICULTY_LABELS = {
  1: 'Facile', 2: 'Moyen', 3: 'Difficile', 4: 'Extrême',
};

export function listCategories() {
  return Object.values(CATEGORIES).map(c => ({
    id: c.id, label: c.label,
    count: c.questions.length,
    countByDifficulty: {
      1: c.questions.filter(q => q.difficulty === 1).length,
      2: c.questions.filter(q => q.difficulty === 2).length,
      3: c.questions.filter(q => q.difficulty === 3).length,
      4: c.questions.filter(q => q.difficulty === 4).length,
    },
  }));
}

export function isValidCategory(id) {
  return id in CATEGORIES;
}

// Store dynamique (modifiable via /admin)
import { quizStore } from '../../admin/stores.js';

// Init du store avec les données par défaut (depuis CATEGORIES) au chargement.
// Si un fichier JSON existe déjà, le store l'utilisera à la place.
quizStore.init(
  Object.values(CATEGORIES)
    .filter(c => c.id !== 'all')
    .flatMap(c => c.questions.map(q => ({ ...q })))
);

/**
 * Tire N questions distinctes au hasard.
 * Utilise le store dynamique (modifiable via /admin) plutôt que les données statiques.
 */
export function pickQuestions(categoryId, n, difficulty = 'random', excludedIds = new Set()) {
  let pool = quizStore.getByCategory(categoryId);

  const difficultyMap = { easy: 1, medium: 2, hard: 3, extreme: 4 };
  if (difficulty in difficultyMap) {
    pool = pool.filter(q => q.difficulty === difficultyMap[difficulty]);
  }

  // Filtre anti-répétition
  let available = pool.filter(q => !excludedIds.has(q.id));

  // Si l'exclusion laisse trop peu de questions, on relâche partiellement
  // (on permet de re-tirer dans le pool global pour ne pas bloquer la partie)
  if (available.length < n) {
    available = pool;
  }

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}
