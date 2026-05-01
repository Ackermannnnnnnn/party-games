# 🚀 Déployer Party Games en ligne

Guide complet pour mettre ton jeu en ligne **gratuitement** et le mettre à jour facilement.

---

## Étape 1 — Créer un compte GitHub (5 min, gratuit)

GitHub stocke ton code et déclenche les déploiements automatiques.

1. Va sur https://github.com → **Sign up**
2. Confirme ton email

---

## Étape 2 — Push ton projet sur GitHub (10 min)

### A. Installe Git si tu ne l'as pas
- Télécharge https://git-scm.com/download/win
- Installe avec les options par défaut

### B. Crée le repo

1. Sur GitHub : **+ → New repository**
2. Nom : `party-games`
3. **Private** (recommandé pour un projet perso)
4. **Create repository**

### C. Push ton code local

Ouvre PowerShell dans `C:\dev\party-games\` :

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/party-games.git
git push -u origin main
```

> Remplace `TON_USERNAME` par ton pseudo GitHub.
> Tu devras t'authentifier (GitHub te demandera de créer un token la 1ère fois).

✅ Vérifie sur GitHub que tu vois ton code.

---

## Étape 3 — Déployer sur Render.com (15 min, gratuit)

### A. Crée ton compte
1. Va sur https://render.com → **Get started**
2. **Sign up with GitHub** (le plus simple, pas de mot de passe)

### B. Déploie via Blueprint (le fichier `render.yaml` que je t'ai créé)

1. Sur Render : **+ New → Blueprint**
2. Connecte ton repo `party-games`
3. Render lit `render.yaml` et propose de créer **2 services** :
   - `party-games-server` (le backend Node.js)
   - `party-games-client` (le frontend React)
4. **Apply** → Render lance les builds (5-10 min)

### C. Récupère les URLs et configure les variables

Une fois les builds terminés :

1. **Sur le service `party-games-client`** :
   - Note son URL : `https://party-games-client-XXXX.onrender.com`
2. **Sur le service `party-games-server`** :
   - Note son URL : `https://party-games-server-XXXX.onrender.com`
   - Va dans **Environment** → ajoute la variable :
     - `CORS_ORIGIN` = l'URL du client (étape 1)
   - Clic **Save Changes** → ça redéploie

3. **Retourne sur `party-games-client`** :
   - **Environment** → ajoute :
     - `VITE_SERVER_URL` = l'URL du server
   - **Save Changes** → ça redéploie

### D. Teste !

Ouvre l'URL du client dans 2 navigateurs (un Chrome, un Firefox), crée une room, joue avec toi-même.

Partage l'URL avec tes amis, ils peuvent jouer.

---

## ⚠️ Limitation du free tier Render

Le serveur **s'endort après 15 min d'inactivité**. La 1ère personne qui se connecte attend 30s pour qu'il se réveille. Ensuite tout marche normalement.

### Solutions

**Option 1 — Accepter** : pas grave, on prévient les amis "patientez 30s la première fois"

**Option 2 — Garder le serveur éveillé** : utilise un service de ping gratuit comme https://cron-job.org → ping `https://ton-server.onrender.com/health` toutes les 14 min. Ça empêche le sleep.

**Option 3 — Upgrade à 7 $/mois** : sur Render, change le plan de `free` à `Starter` (toujours en ligne, 512 Mo RAM).

---

## Workflow d'updates (5 secondes)

Quand tu modifies du code en local :

```powershell
git add .
git commit -m "Fix XYZ ou nouvelle feature"
git push
```

Render détecte le push, rebuild automatiquement, déploie. Au bout de 2-3 min ton code est à jour en prod. Les joueurs en cours de partie sont éjectés (rien à faire, le code change).

---

## Alternative : VPS (pour plus tard)

Si tu veux plus de contrôle / pas de sleep / domaine perso :

- **Hetzner CX22** : 4,51 €/mois (Allemagne, latence FR top)
- **OVH VPS Starter** : 4 €/mois (France)
- Voir [`GUIDE-MVP.md`](./GUIDE-MVP.md) section "Déploiement" pour les commandes Linux (Nginx + PM2 + Certbot)

L'avantage : tu loues une vraie machine Linux, tu fais ce que tu veux, jamais de sleep, possibilité de plusieurs sites sur le même serveur. Coût similaire à Render Starter mais plus configurable.

---

## Domaine perso (optionnel)

Si tu veux `partygames.tonsite.fr` au lieu de `party-games-client-xxxx.onrender.com` :

1. Achète un domaine (Gandi, OVH, Namecheap... ~10 €/an)
2. Sur Render → ton service client → **Custom Domain** → ajoute ton domaine
3. Render te donne un CNAME, tu l'ajoutes chez ton registrar
4. Patiente 1h, c'est en ligne

---

## Récap visuel

```
[Toi sur Windows]
       │
       │ git push
       ▼
   [GitHub]
       │
       │ webhook
       ▼
   [Render]  ← rebuild auto
   ┌────────┴───────┐
   ▼                ▼
[Server]         [Client]
:3001 WS        Static React
       │              ▲
       │ Socket.io    │
       └─────────────┘
            ▲
            │ tes amis se connectent
            │
       https://party-games-client.onrender.com
```

C'est tout. Tu codes, tu push, c'est en ligne. Les amis jouent depuis leur navigateur, n'importe où dans le monde.
