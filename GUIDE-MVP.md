# 🚀 Guide MVP — étape par étape

## Étape 0 — Prérequis

- Node.js 20+
- npm (ou pnpm)
- Un éditeur (VSCode recommandé)

```bash
node -v   # >= 20
```

## Étape 1 — Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Tu dois voir : `🚀 Server listening on :3001`. Test rapide :

```bash
curl http://localhost:3001/health
# {"ok":true,"rooms":0,"uptime":1.2}
```

## Étape 2 — Frontend

```bash
cd ../client
npm install
npm run dev
```

Vite ouvre `http://localhost:5173`. Tu dois voir la home avec un champ pseudo et deux boutons.

## Étape 3 — Test multi-joueurs en local

1. Ouvre `http://localhost:5173` dans **3 navigateurs différents** (ou 3 fenêtres en navigation privée — important : `localStorage` est cloisonné).
2. Joueur 1 : tape un pseudo → "Créer une room" → note le code (ex `K7M3PA`).
3. Joueurs 2 & 3 : entrent leur pseudo + le code → "Rejoindre".
4. Joueur 1 (host, couronne 👑) : "Lancer le jeu".
5. Chacun voit son mot, donne un indice, vote. 🎉

## Étape 4 — Sons (optionnel)

Place 5 fichiers `.mp3` dans `client/public/sounds/` :

```
client/public/sounds/
├── vote.mp3
├── reveal.mp3
├── victory.mp3
├── defeat.mp3
└── tick.mp3
```

Sources gratuites : [pixabay.com/sound-effects](https://pixabay.com/sound-effects/) ou [freesound.org](https://freesound.org).

## Étape 5 — Ajouter un nouveau jeu (exemple : Quiz)

C'est la beauté de l'archi modulaire. Trois étapes :

**1. Crée le fichier serveur**
```js
// server/src/games/quiz/QuizGame.js
import { BaseGame } from '../../core/BaseGame.js';

export class QuizGame extends BaseGame {
  static id = 'quiz';
  static label = 'Quiz culture G';
  static minPlayers = 2;

  start() {
    this.questions = [/* … */];
    this.currentIdx = 0;
    this.scores = new Map();
    this.setPhase('QUESTION');
  }

  handleAction(playerId, type, payload) {
    if (type === 'answer') {
      // logique
    }
  }

  getPublicState() { return { phase: this.phase, idx: this.currentIdx }; }
}
```

**2. Enregistre-le**
```js
// server/src/games/registry.js
import { QuizGame } from './quiz/QuizGame.js';

export const GAMES = {
  [ImposterGame.id]: ImposterGame,
  [QuizGame.id]: QuizGame, // ← ajout
};
```

**3. Crée le composant React**
```jsx
// client/src/games/quiz/QuizGame.jsx
export default function QuizGame() { /* … */ }
```

Et dans `GameRoom.jsx` :
```jsx
{inGame && room.gameId === 'imposter' && <ImposterGame />}
{inGame && room.gameId === 'quiz' && <QuizGame />}
```

Aucune autre ligne à toucher. Le RoomManager, le chat, les votes : tout marche déjà.

## Étape 6 — Déploiement VPS

### 6.1 Préparer la prod

Sur le **serveur** :
```bash
# .env de prod
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://ton-domaine.com
```

Sur le **client**, créer `.env.production` :
```
VITE_SERVER_URL=https://ton-domaine.com
```

Build :
```bash
cd client && npm run build
# Génère client/dist/
```

### 6.2 VPS Linux (Ubuntu 22.04)

```bash
# Installer Node + PM2 + Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2

# Cloner ton repo
cd /var/www
git clone <ton-repo> party-games
cd party-games/server
npm ci
pm2 start src/index.js --name party-games
pm2 startup && pm2 save
```

### 6.3 Nginx (reverse proxy + WSS)

`/etc/nginx/sites-available/party-games` :
```nginx
server {
  server_name ton-domaine.com;

  # Frontend statique
  root /var/www/party-games/client/dist;
  index index.html;
  location / {
    try_files $uri /index.html;
  }

  # API + Socket.io
  location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400;
  }

  location /health {
    proxy_pass http://localhost:3001;
  }

  listen 80;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/party-games /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS gratuit
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ton-domaine.com
```

✅ Done. Coût total : VPS ~5€/mois + nom de domaine ~10€/an.

## Étape 7 — Roadmap des prochains jeux

Ordre suggéré (du plus simple au plus complexe) :

| Jeu | Complexité | Notes |
|---|---|---|
| **Quiz** | ⭐ | Liste de questions, scoring simple, FSM `QUESTION → REVEAL → END` |
| **Petit Bac** | ⭐⭐ | Lettre tirée, soumission par catégorie, validation par les joueurs |
| **Cartes (blackjack)** | ⭐⭐ | Deck généré serveur, tours de jeu |
| **Loup-garou** | ⭐⭐⭐ | Plusieurs rôles, phases nuit/jour, actions secrètes (loups choisissent une cible) |

Pour **Loup-garou**, le pattern privé/public sera essentiel :
- les loups voient leurs alliés, les civils non
- la voyante voit le rôle d'un joueur
- le serveur orchestre l'ordre des actions de nuit
