# 🎮 Party Games Platform — Architecture

## 1. Vue d'ensemble

```
┌────────────────┐     WebSocket (Socket.io)     ┌────────────────┐
│                │ ◄───────────────────────────► │                │
│   Frontend     │                                │   Backend      │
│  (React + Vite)│         HTTP (REST mini)       │ (Node + Express│
│                │ ◄───────────────────────────► │   + Socket.io) │
└────────────────┘                                └────────┬───────┘
                                                           │
                                                  ┌────────▼───────┐
                                                  │  In-Memory     │
                                                  │  RoomManager   │
                                                  │  (Map<code>)   │
                                                  └────────────────┘
```

**Principe clé :** *single source of truth = serveur*. Le client est un "viewer" stupide qui envoie des intentions (`vote`, `submitWord`, `ready`) et reçoit des snapshots de l'état (`gameState`).

---

## 2. Stack finale recommandée

### Frontend
| Lib | Rôle | Pourquoi |
|---|---|---|
| **Vite + React 18** | Base | Setup instantané, HMR rapide |
| **React Router** | Pages | Home / Lobby / Game |
| **Zustand** | State global | 1ko, parfait pour socket state |
| **Tailwind CSS** | Styling | Rapidité de prototypage |
| **socket.io-client** | Temps réel | Reconnexion auto, rooms natives |
| **Howler.js** | Audio | Cross-browser, simple |
| **framer-motion** | Animations | API simple pour transitions de phase |

### Backend
| Lib | Rôle |
|---|---|
| **Node 20+ + Express** | Serveur HTTP (santé, statics) |
| **socket.io** | WebSockets + rooms |
| **nanoid** | Codes de room (6 chars, lisibles) |
| **zod** | Validation des payloads sockets |
| **pino** | Logs structurés |

### Pas besoin (au début)
- ❌ Redis (in-memory suffit pour <50 rooms)
- ❌ DB (volatile = OK, on rejoue à chaque session)
- ❌ Auth (pseudo + code de room suffit)

---

## 3. Architecture serveur — concepts clés

### 3.1 RoomManager (singleton)
Gère la collection de toutes les rooms actives. Map en mémoire `Map<roomCode, Room>`.

### 3.2 Room (objet)
Contient :
- code (ID public)
- players (Map<socketId, Player>)
- hostId
- gameId (quel jeu est lancé, ou null = lobby)
- gameInstance (instance courante du GameEngine)
- chat[]

### 3.3 GameEngine (classe abstraite)
**LE point central de modularité.** Chaque jeu hérite et implémente :

```
class BaseGame {
  constructor(room, options)
  start()                       // Initialisation
  handleEvent(playerId, event)  // Gérer une action joueur
  getStateFor(playerId)         // ⚠️ État FILTRÉ par joueur (mot imposteur ≠ mot autres)
  getPublicState()              // État commun à tous
  end()                         // Cleanup
}
```

### 3.4 Pattern Finite State Machine
Chaque jeu a des **phases** explicites. Pour l'imposteur :

```
LOBBY → REVEAL → DESCRIBE → DISCUSS → VOTE → RESULTS → (next round | END)
```

Une seule transition possible à la fois. Toute action invalide en mauvaise phase est rejetée.

### 3.5 Émission d'événements
- `io.to(roomCode).emit('event', data)` → tout le monde dans la room
- `io.to(socketId).emit('event', data)` → un seul joueur (ex: révéler le mot secret)
- `socket.emit(...)` → réponse à l'expéditeur

---

## 4. Structure des dossiers

```
party-games/
├── server/
│   ├── src/
│   │   ├── index.js                  # Entry: boot HTTP + sockets
│   │   ├── config.js
│   │   ├── core/
│   │   │   ├── RoomManager.js
│   │   │   ├── Room.js
│   │   │   ├── Player.js
│   │   │   └── BaseGame.js           # Classe abstraite
│   │   ├── games/
│   │   │   ├── registry.js           # Mapping gameId -> classe
│   │   │   ├── imposter/
│   │   │   │   ├── ImposterGame.js
│   │   │   │   ├── words.js
│   │   │   │   └── phases.js
│   │   │   ├── werewolf/             # plus tard
│   │   │   ├── quiz/
│   │   │   ├── petitbac/
│   │   │   └── cards/
│   │   ├── sockets/
│   │   │   ├── index.js              # Wire-up des handlers
│   │   │   ├── roomHandlers.js
│   │   │   ├── chatHandlers.js
│   │   │   └── gameHandlers.js
│   │   ├── utils/
│   │   │   ├── codeGen.js
│   │   │   ├── logger.js
│   │   │   └── schemas.js            # Schémas zod
│   │   └── data/
│   │       └── words.fr.json
│   ├── package.json
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── routes.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Lobby.jsx
│   │   │   └── GameRoom.jsx
│   │   ├── games/
│   │   │   └── imposter/
│   │   │       ├── ImposterGame.jsx
│   │   │       ├── PhaseReveal.jsx
│   │   │       ├── PhaseDescribe.jsx
│   │   │       ├── PhaseVote.jsx
│   │   │       └── PhaseResults.jsx
│   │   ├── components/
│   │   │   ├── PlayerList.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Timer.jsx
│   │   │   ├── Button.jsx
│   │   │   └── Modal.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   ├── useRoom.js
│   │   │   └── useSounds.js
│   │   ├── store/
│   │   │   └── gameStore.js          # Zustand
│   │   ├── lib/
│   │   │   └── socket.js             # Singleton socket client
│   │   ├── assets/
│   │   │   └── sounds/               # vote.mp3, win.mp3, ...
│   │   └── styles/
│   │       └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── shared/
│   └── events.js                     # Constantes événements (DRY)
│
└── README.md
```

---

## 5. Protocole d'événements Socket.io

### 5.1 Client → Serveur (intentions)

| Événement | Payload | Contexte |
|---|---|---|
| `room:create` | `{ pseudo }` | Création |
| `room:join` | `{ code, pseudo }` | Rejoindre |
| `room:leave` | `{}` | Quitter |
| `chat:send` | `{ text }` | Message |
| `game:select` | `{ gameId }` | Host choisit un jeu |
| `game:start` | `{ options }` | Host lance |
| `game:action` | `{ type, payload }` | Action in-game (vote, submit, etc.) |
| `game:ready` | `{}` | Joueur prêt pour la prochaine phase |

### 5.2 Serveur → Client (état)

| Événement | Payload | Quand |
|---|---|---|
| `room:state` | `{ code, players, hostId, gameId }` | À chaque changement |
| `chat:message` | `{ from, text, ts }` | Nouveau message |
| `game:state` | `{ phase, public, private }` | À chaque transition de phase |
| `game:event` | `{ type, payload }` | Notification (ex: voteCast) |
| `game:end` | `{ winner, summary }` | Fin de partie |
| `error` | `{ code, message }` | Erreur applicative |

⚠️ **Règle d'or :** chaque émission d'état envoie le state COMPLET, jamais des deltas. Plus simple, moins de bugs.

---

## 6. Game Engine modulaire — exemple

Pour ajouter un jeu **petit bac** plus tard, il suffit de :

1. Créer `server/src/games/petitbac/PetitBacGame.js` qui hérite de `BaseGame`
2. Implémenter `start()`, `handleEvent()`, `getStateFor()`
3. L'enregistrer dans `games/registry.js`
4. Créer `client/src/games/petitbac/PetitBacGame.jsx` qui lit `gameState` et affiche les bonnes phases

Aucune ligne à toucher dans le RoomManager, le chat, les votes génériques.

---

## 7. Gestion des rooms — bonnes pratiques

1. **Code de room = 6 chars sans I/O/0/1** (`nanoid` custom alphabet) → pas d'ambiguïté visuelle.
2. **Cleanup automatique** : si une room est vide pendant > 60 sec, on la supprime (timer).
3. **Reconnexion** : on stocke `playerId` (UUID) dans `localStorage`. À la reconnexion, le client envoie `room:rejoin { code, playerId }` → on remappe le nouveau `socketId` au joueur existant.
4. **Host migration** : si l'host quitte, le plus ancien joueur restant devient host.
5. **Limite hardcodée** : MAX 12 joueurs/room, MAX 50 rooms simultanées (configurable).

---

## 8. Sécurité (basique mais essentielle)

- **Toujours valider les payloads** avec zod côté serveur (jamais faire confiance au client).
- **Rate limiting** sur `chat:send` (3 msg/sec max) → évite le spam.
- **Filtrer le state** : ne JAMAIS envoyer le rôle imposteur des autres joueurs au client. Utiliser `getStateFor(playerId)`.
- **Sanitize les pseudos** : trim, max 20 chars, anti-XSS basique (échapper `<>`).
- CORS strict en prod (whitelist du domaine).

---

## 9. Erreurs à éviter

| ❌ Erreur | ✅ Solution |
|---|---|
| Stocker l'état du jeu côté client | Serveur = source de vérité, client = viewer |
| Envoyer tous les rôles à tout le monde | `getStateFor(playerId)` filtre |
| Timers côté client uniquement | Timer serveur + timestamp envoyé au client qui calcule l'affichage |
| Coupler logique de jeu et sockets | `BaseGame` ne connaît pas Socket.io, il appelle `room.broadcast()` |
| Géant fichier `gameLogic.js` avec ifs | FSM par phase, dispatch propre |
| Pas de validation des payloads | Zod sur 100% des handlers |
| Mémoriser les sockets côté serveur sans cleanup | Listener `disconnect` qui purge tout |
| Pas de gestion de reconnexion | UUID joueur + `room:rejoin` |
| Re-render React à chaque message socket | Zustand sélecteurs ciblés |
| Sounds joués sans interaction utilisateur | Premier clic débloque l'AudioContext (Howler le fait) |

---

## 10. Roadmap MVP → V1

**Phase 1 — MVP (1 semaine)**
- Backend room system + chat
- Frontend Home / Lobby
- Jeu de l'imposteur complet
- Déploiement VPS + Nginx + PM2

**Phase 2 — Polish (1 semaine)**
- Sons + animations framer-motion
- Reconnexion robuste
- Mobile responsive

**Phase 3 — Jeux additionnels (par ordre de difficulté)**
- Quiz (le plus simple)
- Petit Bac (modéré)
- Loup-garou (complexe : phases nuit/jour, rôles)
- Cartes (moyen)

**Phase 4 — Nice to have**
- Avatars / customisation
- Stats par joueur (localStorage)
- Salles publiques + matchmaking

---

## 11. Déploiement (VPS minimal)

```
[Internet] → Nginx (reverse proxy + WSS upgrade) → Node app (PM2) → :3001
```

- Frontend buildé (`npm run build`) servi en static par Nginx
- Backend Node sur :3001 derrière Nginx
- Certificat Let's Encrypt (Certbot)
- PM2 pour autostart + restart on crash

Coût estimé : VPS 5€/mois (Hetzner CX11) suffit pour 10–20 utilisateurs simultanés.
