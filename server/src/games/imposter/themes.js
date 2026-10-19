/**
 * Banque de mots du jeu de l'imposteur.
 *
 * Chaque thème a deux niveaux :
 *   - facile    : deux mots proches mais bien distincts (on peut donner des indices sans se griller tout de suite)
 *   - difficile : deux mots très proches (l'imposteur peut se fondre dans la masse… et les civils doutent)
 *
 * Une paire s'écrit 'Mot A|Mot B'. Au tirage, on choisit au hasard lequel des deux est le mot des civils.
 */
import { imposterStore } from '../../admin/stores.js';

const T = (label, facile, difficile) => ({ label, facile, difficile });

export const THEMES = {
  maison: T('🏠 Maison & objets', [
    'Fourchette|Cuillère', 'Lit|Canapé', 'Table|Bureau', 'Lampe|Bougie', 'Frigo|Congélateur',
    'Douche|Baignoire', 'Brosse à dents|Peigne', 'Oreiller|Couverture', 'Miroir|Fenêtre', 'Tapis|Rideau',
    'Four|Micro-ondes', 'Casserole|Poêle', 'Verre|Tasse', 'Assiette|Bol', 'Clé|Cadenas',
    'Parapluie|Imperméable', 'Horloge|Montre', 'Ciseaux|Couteau', 'Savon|Shampoing', 'Balai|Aspirateur',
    'Chaise|Tabouret', 'Étagère|Armoire', 'Escalier|Ascenseur', 'Porte|Portail', 'Sonnette|Interphone',
    'Télécommande|Manette', 'Radiateur|Cheminée', 'Robinet|Lavabo', 'Poubelle|Bac à linge', 'Ventilateur|Climatiseur',
    'Stylo|Crayon', 'Agrafeuse|Trombone', 'Bouilloire|Cafetière', 'Grille-pain|Gaufrier', 'Sèche-cheveux|Fer à lisser',
  ], [
    'Couette|Plaid', 'Tasse|Mug', 'Casserole|Marmite', 'Serviette|Peignoir', 'Commode|Buffet',
    'Lampadaire|Applique', 'Rideau|Store', 'Coussin|Oreiller', 'Bouteille|Gourde', 'Carafe|Pichet',
    'Gant de toilette|Éponge', 'Torchon|Serpillière', 'Saladier|Bol', 'Louche|Écumoire', 'Râpe|Économe',
    'Fauteuil|Pouf', 'Clé USB|Disque dur', 'Chargeur|Câble', 'Ampoule|Néon', 'Lave-linge|Sèche-linge',
    'Lave-vaisselle|Évier', 'Paillasson|Tapis', 'Cintre|Portemanteau', 'Boîte aux lettres|Colis', 'Dentifrice|Bain de bouche',
    'Trousse|Cartable', 'Scotch|Colle', 'Gomme|Correcteur', 'Calendrier|Agenda', 'Réveil|Minuteur',
  ]),

  nourriture: T('🍕 Nourriture', [
    'Pizza|Quiche', 'Pomme|Poire', 'Fraise|Framboise', 'Banane|Mangue', 'Carotte|Navet',
    'Fromage|Beurre', 'Pain|Brioche', 'Croissant|Pain au chocolat', 'Crêpe|Gaufre', 'Riz|Pâtes',
    'Steak|Côtelette', 'Poulet|Dinde', 'Saumon|Thon', 'Chocolat|Caramel', 'Glace|Sorbet',
    'Tomate|Poivron', 'Salade|Épinard', 'Orange|Clémentine', 'Citron|Pamplemousse', 'Cerise|Prune',
    'Raisin|Myrtille', 'Melon|Pastèque', 'Ananas|Noix de coco', 'Soupe|Velouté', 'Omelette|Œuf au plat',
    'Lasagnes|Gratin', 'Spaghetti|Tagliatelles', 'Couscous|Tajine', 'Sushi|Maki', 'Crevette|Homard',
    'Miel|Confiture', 'Yaourt|Fromage blanc', 'Cookie|Muffin', 'Tarte|Gâteau', 'Champignon|Truffe',
    'Ketchup|Mayonnaise', 'Moutarde|Wasabi', 'Sel|Poivre', 'Sucre|Édulcorant', 'Popcorn|Chips',
  ], [
    'Clémentine|Mandarine', 'Pain au chocolat|Pain aux raisins', 'Crêpe|Pancake', 'Moule|Huître', 'Courgette|Concombre',
    'Brownie|Fondant', 'Éclair|Religieuse', 'Macaron|Meringue', 'Tiramisu|Panna cotta', 'Croque-monsieur|Panini',
    'Ravioli|Tortellini', 'Penne|Rigatoni', 'Gnocchi|Ravioli', 'Risotto|Paella', 'Burrata|Mozzarella',
    'Camembert|Brie', 'Emmental|Gruyère', 'Comté|Beaufort', 'Roquefort|Bleu', 'Chèvre|Feta',
    'Abricot|Pêche', 'Nectarine|Pêche', 'Mûre|Myrtille', 'Groseille|Cassis', 'Pistache|Cacahuète',
    'Amande|Noisette', 'Noix|Noix de cajou', 'Lardons|Bacon', 'Jambon|Bacon', 'Saucisse|Merguez',
    'Chorizo|Salami', 'Pâté|Rillettes', 'Pesto|Sauce tomate', 'Béchamel|Crème fraîche', 'Vinaigre|Citron',
    'Crumble|Cheesecake', 'Flan|Crème brûlée', 'Crème brûlée|Crème catalane', 'Mousse au chocolat|Fondant', 'Smoothie|Milkshake',
  ]),

  fastfood: T('🍟 Fast-food & snacks', [
    'Burger|Sandwich', 'Frites|Potatoes', 'Hot-dog|Kebab', 'Nuggets|Tenders', 'Pizza|Calzone',
    'Tacos|Burrito', 'Milkshake|Sundae', 'Ketchup|Sauce barbecue', 'Donut|Beignet', 'Chips|Cacahuètes',
    'McDonald\'s|Burger King', 'KFC|Popeyes', 'Subway|Pomme de pain', 'Domino\'s|Pizza Hut', 'Starbucks|Columbus Café',
    'Kebab|Shawarma', 'Bagel|Wrap', 'Glace|Granité', 'Barbe à papa|Pomme d\'amour', 'Churros|Beignet',
  ], [
    'Big Mac|Whopper', 'McFlurry|Sundae', 'Cheeseburger|Hamburger', 'Wrap|Burrito', 'Quesadilla|Tacos',
    'Tacos français|Kebab', 'Nachos|Tortilla chips', 'Wings|Nuggets', 'Onion rings|Frites', 'Croque-monsieur|Croque-madame',
    'Sauce samouraï|Sauce algérienne', 'Sauce andalouse|Sauce cocktail', 'Mayonnaise|Sauce tartare', 'Coca|Pepsi', 'Fanta|Orangina',
    'Hot-dog|Saucisse frites', 'Panini|Wrap', 'Sandwich|Baguette', 'Mitraillette|Kebab', 'Fricadelle|Saucisse',
  ]),

  boissons: T('🍷 Boissons', [
    'Café|Thé', 'Eau|Jus', 'Vin|Bière', 'Lait|Chocolat chaud', 'Coca|Limonade',
    'Champagne|Prosecco', 'Whisky|Rhum', 'Vodka|Gin', 'Jus d\'orange|Jus de pomme', 'Smoothie|Jus pressé',
    'Sirop|Jus', 'Cappuccino|Latte', 'Mojito|Piña colada', 'Thé glacé|Limonade', 'Red Bull|Café',
    'Tisane|Thé', 'Cidre|Bière', 'Sangria|Vin rouge', 'Eau gazeuse|Eau plate', 'Expresso|Café allongé',
  ], [
    'Champagne|Crémant', 'Vin rouge|Vin rosé', 'Bière blonde|Bière blanche', 'Rhum|Cognac', 'Whisky|Bourbon',
    'Tequila|Mezcal', 'Pastis|Ricard', 'Spritz|Mojito', 'Cappuccino|Macchiato', 'Latte|Flat white',
    'Thé vert|Thé noir', 'Chaï|Matcha', 'Ice tea|Thé glacé', 'Schweppes|Sprite', 'Perrier|San Pellegrino',
    'Coca|Coca Zéro', 'Pepsi|Dr Pepper', 'Margarita|Daiquiri', 'Kir|Kir royal', 'Jägermeister|Get 27',
  ]),

  animaux: T('🐾 Animaux', [
    'Chat|Chien', 'Lion|Tigre', 'Loup|Renard', 'Cheval|Âne', 'Vache|Mouton',
    'Poule|Canard', 'Aigle|Faucon', 'Requin|Dauphin', 'Baleine|Orque', 'Serpent|Lézard',
    'Grenouille|Crapaud', 'Souris|Rat', 'Lapin|Lièvre', 'Ours|Panda', 'Singe|Gorille',
    'Girafe|Zèbre', 'Éléphant|Rhinocéros', 'Hibou|Chouette', 'Abeille|Guêpe', 'Papillon|Libellule',
    'Fourmi|Termite', 'Araignée|Scorpion', 'Escargot|Limace', 'Tortue|Crocodile', 'Pingouin|Manchot',
    'Perroquet|Toucan', 'Kangourou|Koala', 'Hamster|Cochon d\'Inde', 'Écureuil|Hérisson', 'Pieuvre|Méduse',
    'Cerf|Élan', 'Chameau|Dromadaire', 'Poisson rouge|Carpe', 'Mouche|Moustique', 'Pigeon|Corbeau',
  ], [
    'Guépard|Léopard', 'Léopard|Jaguar', 'Crocodile|Alligator', 'Lapin|Chinchilla', 'Corbeau|Corneille',
    'Phoque|Otarie', 'Otarie|Morse', 'Lama|Alpaga', 'Chèvre|Bouc', 'Taureau|Bœuf',
    'Âne|Mule', 'Poney|Cheval', 'Furet|Belette', 'Loutre|Castor', 'Rat|Hamster',
    'Huître|Coquille Saint-Jacques', 'Crevette|Écrevisse', 'Homard|Langouste', 'Calamar|Seiche', 'Truite|Saumon',
    'Moineau|Mésange', 'Hirondelle|Martinet', 'Cygne|Oie', 'Flamant rose|Ibis', 'Paon|Faisan',
    'Hyène|Chacal', 'Puma|Lynx', 'Bison|Buffle', 'Gazelle|Antilope', 'Chimpanzé|Orang-outan',
    'Frelon|Guêpe', 'Bourdon|Abeille', 'Grillon|Sauterelle', 'Coccinelle|Scarabée', 'Ver de terre|Asticot',
  ]),

  metiers: T('👨‍🍳 Métiers', [
    'Médecin|Infirmier', 'Boulanger|Pâtissier', 'Policier|Gendarme', 'Pompier|Secouriste', 'Professeur|Directeur',
    'Pilote|Hôtesse de l\'air', 'Cuisinier|Serveur', 'Avocat|Juge', 'Dentiste|Chirurgien', 'Plombier|Électricien',
    'Coiffeur|Barbier', 'Facteur|Livreur', 'Agriculteur|Éleveur', 'Architecte|Ingénieur', 'Acteur|Chanteur',
    'Journaliste|Écrivain', 'Peintre|Sculpteur', 'Vétérinaire|Pharmacien', 'Mécanicien|Garagiste', 'Caissier|Vendeur',
    'Banquier|Comptable', 'Photographe|Caméraman', 'Astronaute|Pilote de chasse', 'Militaire|Policier', 'Chauffeur de taxi|Chauffeur de bus',
  ], [
    'Boucher|Charcutier', 'Kiné|Ostéopathe', 'Psychologue|Psychiatre', 'Notaire|Avocat', 'Pharmacien|Préparateur',
    'Maçon|Carreleur', 'Menuisier|Charpentier', 'Couvreur|Charpentier', 'Peintre en bâtiment|Plaquiste', 'Fleuriste|Jardinier',
    'Sage-femme|Infirmière', 'Aide-soignant|Infirmier', 'Chef cuisinier|Commis', 'Barman|Serveur', 'Sommelier|Caviste',
    'Influenceur|Youtubeur', 'Streamer|Youtubeur', 'Développeur|Informaticien', 'Graphiste|Designer', 'Huissier|Notaire',
    'Contrôleur|Conducteur de train', 'Steward|Pilote', 'Maître-nageur|Surveillant de plage', 'Moniteur d\'auto-école|Professeur', 'Agent immobilier|Banquier',
  ]),

  sports: T('⚽ Sports', [
    'Football|Rugby', 'Tennis|Badminton', 'Basket|Handball', 'Natation|Plongée', 'Ski|Snowboard',
    'Boxe|Judo', 'Golf|Mini-golf', 'Vélo|Course à pied', 'Volley|Beach-volley', 'Surf|Planche à voile',
    'Escalade|Randonnée', 'Patinage|Roller', 'Skateboard|Trottinette', 'Équitation|Polo', 'Bowling|Pétanque',
    'Karaté|Taekwondo', 'Ping-pong|Tennis', 'Formule 1|Rallye', 'Hockey sur glace|Hockey sur gazon', 'Gymnastique|Danse',
    'Musculation|CrossFit', 'Yoga|Pilates', 'Fléchettes|Billard', 'Escrime|Kendo', 'Aviron|Kayak',
  ], [
    'Squash|Padel', 'Padel|Tennis', 'Badminton|Squash', 'Judo|Lutte', 'Boxe|MMA',
    'Boxe thaï|Kickboxing', 'Rugby|Football américain', 'Baseball|Cricket', 'Water-polo|Handball', 'Canoë|Kayak',
    'Kitesurf|Windsurf', 'Ski de fond|Biathlon', 'Saut à ski|Ski alpin', 'Bobsleigh|Luge', 'Curling|Pétanque',
    'Marathon|Semi-marathon', 'Sprint|Relais', 'Triathlon|Duathlon', 'BMX|VTT', 'Trail|Course à pied',
    'Ligue des champions|Ligue Europa', 'Coupe du monde|Euro', 'Roland-Garros|Wimbledon', 'Tour de France|Giro', 'JO d\'été|JO d\'hiver',
  ]),

  pays: T('🌍 Pays & villes', [
    'France|Belgique', 'Espagne|Portugal', 'Italie|Grèce', 'Japon|Chine', 'Brésil|Argentine',
    'États-Unis|Canada', 'Allemagne|Autriche', 'Maroc|Algérie', 'Mexique|Colombie', 'Inde|Pakistan',
    'Australie|Nouvelle-Zélande', 'Suède|Norvège', 'Égypte|Tunisie', 'Russie|Ukraine', 'Turquie|Grèce',
    'Sénégal|Côte d\'Ivoire', 'Thaïlande|Vietnam', 'Corée du Sud|Japon', 'Suisse|Luxembourg', 'Irlande|Écosse',
    'Paris|Londres', 'New York|Los Angeles', 'Rome|Venise', 'Tokyo|Séoul', 'Barcelone|Madrid',
    'Marseille|Lyon', 'Bruxelles|Amsterdam', 'Dubaï|Abou Dabi', 'Istanbul|Athènes', 'Rio|São Paulo',
  ], [
    'Belgique|Pays-Bas', 'Suède|Finlande', 'Norvège|Danemark', 'Autriche|Suisse', 'Slovaquie|Slovénie',
    'Croatie|Serbie', 'Pérou|Bolivie', 'Chili|Argentine', 'Kenya|Tanzanie', 'Cambodge|Laos',
    'Malaisie|Indonésie', 'Islande|Groenland', 'Écosse|Pays de Galles', 'Angleterre|Royaume-Uni', 'Monaco|Andorre',
    'Lyon|Bordeaux', 'Nice|Cannes', 'Lille|Strasbourg', 'Toulouse|Montpellier', 'Nantes|Rennes',
    'Milan|Turin', 'Munich|Berlin', 'Porto|Lisbonne', 'Séville|Valence', 'Genève|Lausanne',
    'Montréal|Québec', 'Miami|Las Vegas', 'Chicago|Boston', 'Marrakech|Casablanca', 'Alger|Tunis',
  ]),

  lieux: T('🏖️ Lieux', [
    'Plage|Piscine', 'Montagne|Colline', 'Forêt|Jungle', 'Désert|Savane', 'Hôpital|Clinique',
    'École|Université', 'Restaurant|Cantine', 'Cinéma|Théâtre', 'Musée|Galerie', 'Bibliothèque|Librairie',
    'Supermarché|Épicerie', 'Gare|Aéroport', 'Église|Mosquée', 'Château|Palais', 'Stade|Gymnase',
    'Zoo|Aquarium', 'Parc|Jardin', 'Prison|Commissariat', 'Hôtel|Camping', 'Boulangerie|Pâtisserie',
    'Discothèque|Bar', 'Fête foraine|Parc d\'attractions', 'Port|Plage', 'Banque|Poste', 'Mairie|Préfecture',
    'Grotte|Tunnel', 'Île|Presqu\'île', 'Lac|Étang', 'Rivière|Fleuve', 'Volcan|Montagne',
  ], [
    'Collège|Lycée', 'Hôtel|Auberge', 'Motel|Hôtel', 'Gîte|Chambre d\'hôte', 'Brasserie|Bistrot',
    'Pub|Bar', 'Café|Salon de thé', 'Cathédrale|Basilique', 'Synagogue|Temple', 'Château fort|Citadelle',
    'Mer|Océan', 'Golfe|Baie', 'Falaise|Dune', 'Vallée|Canyon', 'Glacier|Banquise',
    'Hypermarché|Supermarché', 'Centre commercial|Galerie marchande', 'Marché|Brocante', 'Station-service|Garage', 'Parking|Garage',
    'Métro|RER', 'Tramway|Métro', 'Salle de sport|Gymnase', 'Spa|Hammam', 'Sauna|Hammam',
    'Crèche|Maternelle', 'Internat|Colonie de vacances', 'Ferme|Ranch', 'Vignoble|Verger', 'Phare|Port',
  ]),

  transports: T('🚗 Transports', [
    'Voiture|Moto', 'Avion|Hélicoptère', 'Train|Métro', 'Bus|Tramway', 'Bateau|Sous-marin',
    'Vélo|Trottinette', 'Taxi|Uber', 'Camion|Camionnette', 'Fusée|Navette spatiale', 'Montgolfière|Dirigeable',
    'Scooter|Moto', 'Paquebot|Voilier', 'Tracteur|Moissonneuse', 'Ambulance|Camion de pompiers', 'Planche à roulettes|Rollers',
    'Jet-ski|Bateau à moteur', 'Téléphérique|Télésiège', 'TGV|Thalys', 'Cheval|Calèche', 'Kayak|Pédalo',
  ], [
    'Scooter|Mobylette', 'Quad|Buggy', 'Voilier|Catamaran', 'Yacht|Hors-bord', 'Ferry|Paquebot',
    'Monospace|SUV', 'Cabriolet|Coupé', 'Limousine|Berline', 'Trottinette électrique|Hoverboard', 'Vélo électrique|Scooter',
    'Tramway|Trolleybus', 'RER|Train', 'Avion de ligne|Jet privé', 'Planeur|ULM', 'Hydravion|Avion',
    'Péniche|Barge', 'Canoë|Barque', 'Remorque|Caravane', 'Camping-car|Caravane', 'Dépanneuse|Grue',
  ]),

  films: T('🎬 Films & séries', [
    'Harry Potter|Le Seigneur des anneaux', 'Star Wars|Star Trek', 'Titanic|Avatar', 'Le Roi Lion|Le Livre de la jungle', 'Shrek|Kung Fu Panda',
    'Toy Story|Monstres et Cie', 'La Reine des neiges|Raiponce', 'Fast & Furious|Mission impossible', 'James Bond|Jason Bourne', 'Jurassic Park|King Kong',
    'Stranger Things|Wednesday', 'Game of Thrones|The Witcher', 'Breaking Bad|Narcos', 'La Casa de papel|Lupin', 'Squid Game|Alice in Borderland',
    'Friends|How I Met Your Mother', 'The Office|Brooklyn Nine-Nine', 'Les Simpson|Family Guy', 'Pirates des Caraïbes|Indiana Jones', 'Le Parrain|Scarface',
    'Intouchables|Bienvenue chez les Ch\'tis', 'Astérix|Lucky Luke', 'Matrix|Inception', 'Retour vers le futur|Terminator', 'Rocky|Creed',
  ], [
    'Avengers|Justice League', 'Batman|Superman', 'Spider-Man|Venom', 'Inception|Interstellar', 'Interstellar|Gravity',
    'Le Hobbit|Le Seigneur des anneaux', 'Les Animaux fantastiques|Harry Potter', 'Narnia|Harry Potter', 'Hunger Games|Divergente', 'Twilight|Vampire Diaries',
    'Peaky Blinders|Boardwalk Empire', 'Prison Break|La Casa de papel', 'Dexter|You', 'Sherlock|Lupin', 'Grey\'s Anatomy|Dr House',
    'The Walking Dead|The Last of Us', 'Vikings|The Last Kingdom', 'The Crown|Downton Abbey', 'Mercredi|La Famille Addams', 'Les Bronzés|Camping',
    'Taxi|Fast & Furious', 'OSS 117|Johnny English', 'Le Dîner de cons|La Grande Vadrouille', 'Les Visiteurs|Kaamelott', 'Dune|Star Wars',
  ]),

  superheros: T('🦸 Super-héros', [
    'Batman|Daredevil', 'Spider-Man|Iron Man', 'Hulk|Thor', 'Wolverine|Deadpool', 'Wonder Woman|Captain Marvel',
    'Flash|Quicksilver', 'Aquaman|Namor', 'Joker|Harley Quinn', 'Thanos|Darkseid', 'Captain America|Iron Man',
    'Black Widow|Catwoman', 'Black Panther|Batman', 'Doctor Strange|Scarlet Witch', 'Magneto|Professeur X', 'Ant-Man|La Guêpe',
    'Groot|Rocket', 'Hawkeye|Green Arrow', 'Loki|Thor', 'Venom|Carnage', 'Superman|Supergirl',
  ], [
    'Spider-Man|Miles Morales', 'Batman|Robin', 'Robin|Nightwing', 'Hulk|She-Hulk', 'Iron Man|War Machine',
    'Captain America|Bucky', 'Falcon|Captain America', 'Daredevil|Punisher', 'Cyclope|Tornade', 'Mystique|Malicia',
    'Green Lantern|Green Arrow', 'Lex Luthor|Joker', 'Bane|Double-Face', 'Pingouin|Sphinx', 'Poison Ivy|Catwoman',
    'Star-Lord|Gamora', 'Drax|Groot', 'Vision|Ultron', 'Nick Fury|Phil Coulson', 'Galactus|Silver Surfer',
  ]),

  jeuxvideo: T('🎮 Jeux vidéo', [
    'Mario|Luigi', 'Sonic|Pac-Man', 'Minecraft|Roblox', 'Fortnite|Apex Legends', 'FIFA|PES',
    'Call of Duty|Battlefield', 'Zelda|Final Fantasy', 'Pokémon|Digimon', 'GTA|Red Dead Redemption', 'Tetris|Candy Crush',
    'PlayStation|Xbox', 'Nintendo Switch|Game Boy', 'Mario Kart|Crash Team Racing', 'League of Legends|Dota', 'Clash of Clans|Clash Royale',
    'Among Us|Fall Guys', 'The Sims|Animal Crossing', 'Rocket League|FIFA', 'Assassin\'s Creed|Prince of Persia', 'Overwatch|Valorant',
  ], [
    'Valorant|Counter-Strike', 'Fortnite|PUBG', 'Pikachu|Évoli', 'Bowser|Donkey Kong', 'Peach|Daisy',
    'Link|Zelda', 'Kirby|Yoshi', 'Master Chief|Doom Guy', 'Kratos|Dante', 'Lara Croft|Nathan Drake',
    'Elden Ring|Dark Souls', 'Skyrim|The Witcher', 'Diablo|Path of Exile', 'World of Warcraft|Final Fantasy XIV', 'Hearthstone|Magic',
    'Brawl Stars|Clash Royale', 'Subway Surfers|Temple Run', 'Geometry Dash|Flappy Bird', 'Smash Bros|Street Fighter', 'Tekken|Mortal Kombat',
  ]),

  mangas: T('🎌 Mangas & anime', [
    'Naruto|One Piece', 'Dragon Ball|One Punch Man', 'Pokémon|Yo-kai Watch', 'L\'Attaque des Titans|Demon Slayer', 'Death Note|Code Geass',
    'Goku|Vegeta', 'Luffy|Zoro', 'Naruto|Sasuke', 'Totoro|Ponyo', 'Le Voyage de Chihiro|Princesse Mononoké',
    'My Hero Academia|Jujutsu Kaisen', 'Hunter x Hunter|Fullmetal Alchemist', 'Captain Tsubasa|Inazuma Eleven', 'Sailor Moon|Cardcaptor Sakura', 'Bleach|Naruto',
  ], [
    'Goku|Gohan', 'Vegeta|Piccolo', 'Freezer|Cell', 'Kakashi|Jiraiya', 'Itachi|Sasuke',
    'Zoro|Sanji', 'Nami|Robin', 'Ace|Sabo', 'Eren|Livaï', 'Mikasa|Annie',
    'Tanjiro|Zenitsu', 'Nezuko|Shinobu', 'Gojo|Sukuna', 'Deku|Bakugo', 'Gon|Killua',
    'Light|L', 'Ichigo|Rukia', 'Saitama|Genos', 'Chainsaw Man|Jujutsu Kaisen', 'One Piece|Fairy Tail',
  ]),

  dessinsanimes: T('📺 Dessins animés', [
    'Bob l\'éponge|Patrick', 'Tom|Jerry', 'Scooby-Doo|Snoopy', 'Mickey|Donald', 'Les Simpson|Les Griffin',
    'Pokémon|Yu-Gi-Oh', 'Pat\'Patrouille|Peppa Pig', 'Oui-Oui|Barbapapa', 'Bugs Bunny|Daffy Duck', 'Titeuf|Le Petit Nicolas',
    'Les Schtroumpfs|Les Minions', 'Winnie l\'ourson|Les Bisounours', 'Garfield|Snoopy', 'Gumball|Regular Show', 'Totally Spies|Les Supers Nanas',
  ], [
    'Tic|Tac', 'Riri|Fifi', 'Dingo|Pluto', 'Bart|Lisa', 'Homer|Peter Griffin',
    'Rick et Morty|Futurama', 'South Park|Les Griffin', 'Kim Possible|Totally Spies', 'Ben 10|Danny Phantom', 'Avatar|La Légende de Korra',
    'Les Minions|Les Lapins Crétins', 'Peppa Pig|Masha et Michka', 'Dora|Diego', 'Sam le pompier|Bob le bricoleur', 'Tchoupi|Petit Ours Brun',
  ]),

  musique: T('🎵 Musique', [
    'Guitare|Basse', 'Piano|Orgue', 'Violon|Violoncelle', 'Batterie|Djembé', 'Trompette|Saxophone',
    'Flûte|Clarinette', 'Rap|Rock', 'Pop|Électro', 'Jazz|Blues', 'Reggae|Ragga',
    'Concert|Festival', 'Chanteur|Rappeur', 'Micro|Enceinte', 'Spotify|Deezer', 'Karaoké|Blind test',
    'Michael Jackson|Prince', 'Beyoncé|Rihanna', 'Eminem|50 Cent', 'Daft Punk|David Guetta', 'Stromae|Angèle',
  ], [
    'Violon|Alto', 'Clarinette|Hautbois', 'Trompette|Trombone', 'Synthétiseur|Piano', 'Ukulélé|Guitare',
    'Harpe|Lyre', 'Accordéon|Harmonica', 'Rap|Trap', 'Drill|Trap', 'House|Techno',
    'Metal|Hard rock', 'Punk|Rock', 'R&B|Soul', 'Gospel|Soul', 'Disco|Funk',
    'Jul|Naps', 'Ninho|Niska', 'PNL|SCH', 'Damso|Hamza', 'Aya Nakamura|Wejdene',
    'Drake|The Weeknd', 'Taylor Swift|Billie Eilish', 'Ed Sheeran|Bruno Mars', 'Coldplay|Imagine Dragons', 'Queen|The Beatles',
  ]),

  marques: T('🏷️ Marques', [
    'Nike|Adidas', 'Apple|Samsung', 'Coca-Cola|Pepsi', 'Quick|Burger King', 'Netflix|Disney+',
    'Google|Bing', 'Facebook|Instagram', 'TikTok|Snapchat', 'Amazon|eBay', 'Ikea|Conforama',
    'Mercedes|BMW', 'Peugeot|Renault', 'Ferrari|Lamborghini', 'Rolex|Swatch', 'Lego|Playmobil',
    'Nutella|Kinder', 'Haribo|Carambar', 'Zara|H&M', 'Louis Vuitton|Gucci', 'Évian|Cristaline',
  ], [
    'Puma|Reebok', 'Vans|Converse', 'Gucci|Prada', 'Chanel|Dior', 'Nivea|Dove',
    'Audi|Volkswagen', 'Tesla|Porsche', 'Toyota|Honda', 'Uber|Bolt', 'Deliveroo|Uber Eats',
    'WhatsApp|Messenger', 'YouTube|Twitch', 'Twitter|Threads', 'Lidl|Aldi', 'Carrefour|Delhaize',
    'Kinder Bueno|Twix', 'Kit Kat|Twix', 'Mars|Snickers', 'M&M\'s|Smarties', 'Oreo|Prince',
  ]),

  vetements: T('👕 Vêtements & mode', [
    'T-shirt|Chemise', 'Pantalon|Jean', 'Short|Bermuda', 'Pull|Sweat', 'Veste|Manteau',
    'Robe|Jupe', 'Basket|Chaussure', 'Botte|Sandale', 'Casquette|Bonnet', 'Écharpe|Cravate',
    'Chaussette|Collant', 'Pyjama|Peignoir', 'Maillot de bain|Bikini', 'Lunettes|Lunettes de soleil', 'Sac à dos|Sac à main',
    'Bague|Collier', 'Montre|Bracelet', 'Ceinture|Bretelles', 'Gants|Moufles', 'Costume|Smoking',
  ], [
    'Sweat|Hoodie', 'Doudoune|Parka', 'Blouson|Veste', 'Polo|T-shirt', 'Débardeur|Marcel',
    'Jogging|Legging', 'Chino|Jean', 'Mocassin|Derby', 'Escarpin|Talon', 'Tongs|Claquettes',
    'Bob|Casquette', 'Béret|Bonnet', 'Foulard|Écharpe', 'Nœud papillon|Cravate', 'Boucles d\'oreilles|Piercing',
    'Gilet|Cardigan', 'Kimono|Peignoir', 'Combinaison|Salopette', 'Mini-jupe|Jupe crayon', 'Sneakers|Baskets montantes',
  ]),

  corps: T('🧍 Corps & santé', [
    'Main|Pied', 'Bras|Jambe', 'Œil|Oreille', 'Nez|Bouche', 'Cœur|Poumon',
    'Dent|Langue', 'Cheveu|Barbe', 'Genou|Coude', 'Doigt|Orteil', 'Cerveau|Crâne',
    'Rhume|Grippe', 'Médicament|Vaccin', 'Pansement|Plâtre', 'Fièvre|Toux', 'Sang|Larme',
  ], [
    'Poignet|Cheville', 'Épaule|Hanche', 'Mollet|Cuisse', 'Ongle|Griffe', 'Sourcil|Cil',
    'Foie|Rein', 'Estomac|Intestin', 'Veine|Artère', 'Muscle|Tendon', 'Os|Cartilage',
    'Migraine|Mal de tête', 'Angine|Rhume', 'Allergie|Asthme', 'Entorse|Fracture', 'Bleu|Bosse',
  ]),

  fetes: T('🎉 Fêtes & loisirs', [
    'Noël|Nouvel An', 'Anniversaire|Mariage', 'Halloween|Carnaval', 'Pâques|Noël', 'Saint-Valentin|Fête des mères',
    'Cadeau|Surprise', 'Gâteau|Bougie', 'Ballon|Confettis', 'Feu d\'artifice|Pétard', 'Sapin|Guirlande',
    'Père Noël|Lapin de Pâques', 'Karaoké|Discothèque', 'Pique-nique|Barbecue', 'Camping|Randonnée', 'Jeu de société|Jeu de cartes',
    'Échecs|Dames', 'Monopoly|Cluedo', 'Uno|Dobble', 'Puzzle|Rubik\'s Cube', 'Cinéma|Bowling',
  ], [
    'Mariage|Fiançailles', 'Baptême|Communion', 'Enterrement de vie de garçon|Mariage', 'Réveillon|Nouvel An', 'Épiphanie|Chandeleur',
    'Galette des rois|Brioche', 'Bûche|Gâteau', 'Lampion|Lanterne', 'Déguisement|Costume', 'Masque|Maquillage',
    'Poker|Blackjack', 'Belote|Tarot', 'Loup-garou|Mafia', 'Scrabble|Boggle', 'Dixit|Codenames',
    'Escape game|Laser game', 'Paintball|Laser game', 'Bowling|Billard', 'Kermesse|Brocante', 'Fête de la musique|Festival',
  ]),

  ecole: T('🏫 École & travail', [
    'Professeur|Élève', 'Cahier|Classeur', 'Stylo|Feutre', 'Règle|Équerre', 'Cartable|Sac de sport',
    'Récréation|Cantine', 'Examen|Interro', 'Maths|Physique', 'Histoire|Géographie', 'Anglais|Espagnol',
    'Bureau|Open space', 'Réunion|Pause café', 'Patron|Collègue', 'Stage|Alternance', 'Salaire|Prime',
  ], [
    'Bac|Brevet', 'Licence|Master', 'Partiel|Examen', 'Colle|Retenue', 'Devoir|Exposé',
    'Compas|Rapporteur', 'Surligneur|Fluo', 'Tableau blanc|Tableau noir', 'CPE|Surveillant', 'Proviseur|Principal',
    'CDD|CDI', 'Télétravail|Bureau', 'Visio|Réunion', 'Démission|Licenciement', 'Entretien|Candidature',
  ]),

  tech: T('📱 Tech & Internet', [
    'Téléphone|Tablette', 'Ordinateur|Console', 'Clavier|Souris', 'Écran|Projecteur', 'Wi-Fi|Bluetooth',
    'Email|SMS', 'Selfie|Photo', 'Like|Partage', 'Story|Réel', 'Hashtag|Mention',
    'iPhone|Android', 'Windows|Mac', 'Google|ChatGPT', 'YouTube|TikTok', 'Instagram|Snapchat',
    'Imprimante|Scanner', 'Casque|Écouteurs', 'Clé USB|Carte SD', 'Batterie|Chargeur', 'Appli|Site web',
  ], [
    'Story|Statut', 'Réel|TikTok', 'Abonné|Ami', 'DM|Commentaire', 'Mème|GIF',
    'Emoji|Sticker', 'Wi-Fi|4G', '4G|5G', 'AirPods|Écouteurs', 'Laptop|Ordinateur fixe',
    'Mot de passe|Code PIN', 'Virus|Bug', 'Mise à jour|Redémarrage', 'Cloud|Disque dur', 'Streaming|Téléchargement',
    'Influenceur|Streamer', 'Podcast|Live', 'Twitch|Kick', 'Discord|WhatsApp', 'Netflix|Prime Video',
  ]),

  belgique: T('🇧🇪 Belgique', [
    'Frites|Gaufre', 'Bruxelles|Anvers', 'Liège|Namur', 'Gand|Bruges', 'Tintin|Spirou',
    'Manneken-Pis|Atomium', 'Chocolat belge|Praline', 'Bière belge|Trappiste', 'Stromae|Damso', 'Diables rouges|Red Flames',
    'Flandre|Wallonie', 'Mer du Nord|Ardennes', 'Speculoos|Pain d\'épices', 'Côte belge|Ostende', 'Roi Philippe|Roi Baudouin',
  ], [
    'Gaufre de Liège|Gaufre de Bruxelles', 'Mitraillette|Américain', 'Sauce andalouse|Sauce samouraï', 'Fricadelle|Boulet', 'Boulets liégeois|Carbonnade',
    'Chimay|Orval', 'Leffe|Grimbergen', 'Jupiler|Maes', 'Stella|Jupiler', 'Kriek|Gueuze',
    'Tintin|Les Schtroumpfs', 'Lucky Luke|Gaston Lagaffe', 'Spa|Durbuy', 'Mons|Charleroi', 'Delhaize|Colruyt',
    'Kevin De Bruyne|Eden Hazard', 'Romelu Lukaku|Thibaut Courtois', 'Septante|Nonante', 'Friterie|Snack', 'Pain à la grecque|Cramique',
  ]),

  histoire: T('🏛️ Histoire & mythologie', [
    'Roi|Empereur', 'Chevalier|Samouraï', 'Pirate|Viking', 'Pharaon|Sultan', 'Château|Pyramide',
    'Napoléon|César', 'Zeus|Poséidon', 'Hercule|Achille', 'Dragon|Licorne', 'Sorcier|Magicien',
    'Momie|Zombie', 'Vampire|Loup-garou', 'Fantôme|Esprit', 'Ange|Démon', 'Sirène|Nymphe',
  ], [
    'Viking|Barbare', 'Gladiateur|Légionnaire', 'Mousquetaire|Chevalier', 'Ninja|Samouraï', 'Pirate|Corsaire',
    'Zeus|Jupiter', 'Arès|Mars', 'Hadès|Poséidon', 'Odin|Thor', 'Méduse|Gorgone',
    'Minotaure|Centaure', 'Cyclope|Géant', 'Elfe|Fée', 'Gobelin|Troll', 'Phénix|Griffon',
  ]),

  nature: T('🌳 Nature & météo', [
    'Soleil|Lune', 'Pluie|Neige', 'Orage|Tempête', 'Arbre|Buisson', 'Fleur|Plante',
    'Rose|Tulipe', 'Été|Hiver', 'Printemps|Automne', 'Nuage|Brouillard', 'Arc-en-ciel|Aurore boréale',
    'Étoile|Planète', 'Mer|Lac', 'Sable|Galet', 'Feu|Lave', 'Vent|Tornade',
  ], [
    'Grêle|Grésil', 'Bruine|Averse', 'Ouragan|Typhon', 'Tornade|Cyclone', 'Brume|Brouillard',
    'Chêne|Hêtre', 'Sapin|Pin', 'Palmier|Cocotier', 'Marguerite|Pâquerette', 'Coquelicot|Tulipe',
    'Lune|Satellite', 'Comète|Météorite', 'Galaxie|Nébuleuse', 'Séisme|Tsunami', 'Rosée|Givre',
  ]),

  actions: T('🏃 Actions & émotions', [
    'Courir|Marcher', 'Manger|Boire', 'Dormir|Rêver', 'Chanter|Danser', 'Lire|Écrire',
    'Rire|Sourire', 'Pleurer|Crier', 'Nager|Plonger', 'Sauter|Grimper', 'Cuisiner|Pâtisser',
    'Conduire|Pédaler', 'Acheter|Vendre', 'Gagner|Perdre', 'Parler|Chuchoter', 'Dessiner|Peindre',
    'Joie|Tristesse', 'Peur|Colère', 'Amour|Amitié', 'Fatigue|Ennui', 'Surprise|Stress',
  ], [
    'Courir|Sprinter', 'Marcher|Flâner', 'Dormir|Somnoler', 'Crier|Hurler', 'Bouder|Râler',
    'Mentir|Tricher', 'Voler|Emprunter', 'Applaudir|Siffler', 'Embrasser|Câliner', 'Rougir|Transpirer',
    'Bâiller|S\'étirer', 'Éternuer|Tousser', 'Ronfler|Bâiller', 'Jalousie|Envie', 'Honte|Gêne',
    'Fierté|Orgueil', 'Nostalgie|Mélancolie', 'Angoisse|Panique', 'Excitation|Impatience', 'Timidité|Gêne',
  ]),

  celebrites: T('⭐ Célébrités', [
    'Zidane|Mbappé', 'Messi|Ronaldo', 'Neymar|Mbappé', 'Michael Jordan|LeBron James', 'Usain Bolt|Teddy Riner',
    'Elon Musk|Jeff Bezos', 'Bill Gates|Steve Jobs', 'Einstein|Newton', 'Mozart|Beethoven', 'Picasso|Van Gogh',
    'Leonardo DiCaprio|Brad Pitt', 'Omar Sy|Jamel Debbouze', 'Kev Adams|Norman', 'Squeezie|Cyprien', 'Griezmann|Benzema',
  ], [
    'Squeezie|Inoxtag', 'Michou|Inoxtag', 'Amixem|Squeezie', 'Tibo InShape|Bigflo et Oli', 'Gotaga|Kameto',
    'Nadal|Federer', 'Djokovic|Nadal', 'Benzema|Giroud', 'Pogba|Kanté', 'Ronaldinho|Ronaldo',
    'Rihanna|Shakira', 'Kim Kardashian|Paris Hilton', 'Dwayne Johnson|Vin Diesel', 'Tom Cruise|Tom Hanks', 'Johnny Depp|Orlando Bloom',
  ]),
};

// ───────── Sélection ─────────
export const LEVELS = ['facile', 'difficile'];

function pairsOf(themeId, level) {
  const t = THEMES[themeId];
  if (!t) return [];
  const lv = level === 'mixte' ? LEVELS : [level];
  return lv.flatMap((l) => t[l].map((s) => s.split('|')));
}

export function listThemes() {
  return Object.entries(THEMES).map(([id, t]) => ({
    id,
    label: t.label,
    count: t.facile.length + t.difficile.length,
    pairCount: t.facile.length + t.difficile.length,
    facile: t.facile.length,
    difficile: t.difficile.length,
  }));
}

export function isValidTheme(themeId) {
  return themeId in THEMES;
}

// Store dynamique (modifiable via /admin) : on y charge la banque par défaut
imposterStore.init(
  Object.keys(THEMES).flatMap((themeId) => LEVELS.flatMap((level) =>
    pairsOf(themeId, level).map(([civil, imposter], idx) => ({ id: `${themeId}_${level}_${idx}`, themeId, level, civil, imposter })),
  )),
  'v2-2026-10',
);

/**
 * Tire une paire parmi les thèmes choisis ([] = tous) et le niveau demandé,
 * en évitant les paires déjà jouées récemment (`recent` : ids). Le côté civil/imposteur est tiré au hasard.
 */
export function pickPair({ themes = [], level = 'mixte', recent = [] } = {}) {
  let pool = imposterStore.getAll().filter((p) => (themes.length === 0 || themes.includes(p.themeId)));
  if (level !== 'mixte') pool = pool.filter((p) => !p.level || p.level === level);
  if (pool.length === 0) pool = imposterStore.getAll();
  const fresh = pool.filter((p) => !recent.includes(p.id));
  const from = fresh.length ? fresh : pool;
  const p = from[Math.floor(Math.random() * from.length)];
  const swap = Math.random() < 0.5;
  return { id: p.id, themeId: p.themeId, civil: swap ? p.imposter : p.civil, imposter: swap ? p.civil : p.imposter };
}

/** Compatibilité (ancienne API) : renvoie [civil, imposteur]. */
export function pickRandomPair(themeId = 'random') {
  const p = pickPair({ themes: themeId && themeId !== 'random' ? [themeId] : [] });
  return [p.civil, p.imposter];
}
