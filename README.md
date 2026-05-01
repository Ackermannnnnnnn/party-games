# 🎮 Party Games — Plateforme multijoueur web

Plateforme type Jackbox pour jouer à des party games entre amis dans le navigateur.

## 📁 Structure des fichiers générés

```
outputs/
├── ARCHITECTURE.md         ← Vision globale, stack, structure, conventions
├── GUIDE-MVP.md            ← Guide pas-à-pas pour lancer / déployer
├── README.md               ← Ce fichier
│
├── server/                 ← Backend Node.js + Socket.io (complet)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js                       Boot HTTP + WS
│       ├── core/
│       │   ├── RoomManager.js             Singleton, gère toutes les rooms
│       │   ├── Room.js                    Une room = joueurs + chat + 1 jeu
│       │   ├── Player.js
│       │   └── BaseGame.js                Classe abstraite à étendre
│       ├── games/
│       │   ├── registry.js                Mapping gameId → classe
│       │   └── imposter/
│       │       ├── ImposterGame.js        FSM complète du jeu
│       │       └── words.js               Paires de mots FR
│       ├── sockets/
│       │   └── index.js                   Tous les handlers Socket.io
│       └── utils/
│           ├── codeGen.js, logger.js, schemas.js
│
└── client/                 ← Frontend React + Vite + Tailwind (complet)
    ├── package.json
    ├── vite.config.js, tailwind.config.js, postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx, App.jsx
        ├── pages/
        │   ├── Home.jsx                   Pseudo + créer/rejoindre
        │   └── GameRoom.jsx               Lobby + sidebar joueurs/chat
        ├── games/imposter/
        │   ├── ImposterGame.jsx           Switch de phases avec animations
        │   ├── PhaseReveal.jsx            Carte secrète à retourner
        │   ├── PhaseDescribe.jsx          Indices + bouton "prêt à voter"
        │   ├── PhaseVote.jsx              Grille de vote + timer
        │   └── PhaseResults.jsx           Verdict + relance
        ├── components/
        │   ├── PlayerList.jsx, Chat.jsx, Timer.jsx
        ├── hooks/
        │   ├── useSocket.js               Hook + API helpers
        │   └── useSounds.js               Howler.js
        ├── store/gameStore.js             Zustand
        ├── lib/socket.js                  Singleton client
        └── styles/index.css
```

## 🚀 Démarrage rapide

```bash
# Terminal 1 — backend
cd server && npm install && npm run dev

# Terminal 2 — frontend
cd client && npm install && npm run dev
```

Ouvre `http://localhost:5173` dans 3 fenêtres → joue.

## 📚 Documents à lire dans l'ordre

1. **`ARCHITECTURE.md`** — Comprends la vision, les choix de stack, le pattern modulaire, les pièges à éviter.
2. **`GUIDE-MVP.md`** — Lance l'app, ajoute un jeu, déploie sur VPS.
3. Lis le code source dans cet ordre :
   - `server/src/core/BaseGame.js` (le contrat)
   - `server/src/games/imposter/ImposterGame.js` (un exemple complet)
   - `server/src/sockets/index.js` (l'orchestration)
   - `client/src/games/imposter/ImposterGame.jsx` (la vue)

## 🎯 Ce qui est inclus dans le MVP

- ✅ Création / join de room avec code 6-chars
- ✅ Chat temps réel
- ✅ Reconnexion auto (refresh = OK)
- ✅ Validation Zod côté serveur
- ✅ Cleanup auto des rooms vides
- ✅ Host migration si l'hôte quitte
- ✅ Jeu de l'imposteur complet (4 phases, FSM, votes, élimination, multi-rounds)
- ✅ État privé filtré (mot secret jamais leak côté autres clients)
- ✅ Timer synchronisé (timestamp serveur)
- ✅ UI propre + animations + sons (à fournir)
- ✅ Architecture modulaire prête pour 4+ jeux
