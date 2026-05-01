# 🚀 Déployer Party Games sur un VPS Hetzner

Guide complet pour héberger ton jeu sur un VPS à 4,51 €/mois, avec HTTPS, déploiement git, et auto-restart au crash.

**Temps total** : ~45 min la première fois. Ensuite 30 sec par update.

---

## Pré-requis

1. **Carte bancaire** (Hetzner valide ton compte avec 1 € pré-autorisé)
2. **Un nom de domaine** (~6-10 €/an, voir étape 1)
3. **Git installé** sur ton PC (https://git-scm.com)
4. **Un client SSH** : déjà inclus dans Windows 10+ via PowerShell. Ou télécharge **MobaXterm** (gratuit, plus user-friendly) : https://mobaxterm.mobatek.net/

---

## Étape 1 — Acheter un nom de domaine (5 min)

### Pourquoi ?
Hetzner te donne juste une IP genre `78.46.123.45`. Pour avoir HTTPS (obligatoire pour les sons et certaines APIs), il faut un domaine.

### Où ?
- **OVH** (français) : ~6 €/an pour un .fr → https://www.ovhcloud.com/fr/domains/
- **Gandi** : ~10 €/an pour un .fr ou .com → https://www.gandi.net
- **Namecheap** : ~10 $/an pour .com → https://www.namecheap.com

Choisis un nom court genre `party-games.fr`, `mesjeux.fr`, `tonpseudo.dev`. **Note bien le nom de domaine choisi**, on l'utilisera partout.

> Astuce : tu peux d'abord faire toute l'install et acheter le domaine plus tard. Sans domaine tu n'auras pas HTTPS mais ça marche en HTTP via l'IP.

---

## Étape 2 — Créer le serveur Hetzner (10 min)

### A. Compte
1. Va sur https://www.hetzner.com → **Cloud** (pas "Dedicated")
2. Crée un compte, valide ton email, entre ta CB
3. Console : https://console.hetzner.cloud

### B. Crée un projet
1. **+ New Project** → nom : "party-games"
2. Clique dessus

### C. Ajoute ta clé SSH (optionnel mais recommandé)

Sur ton PC Windows, ouvre PowerShell :
```powershell
# Crée une paire de clés (entrée 3 fois, pas de mot de passe pour faire simple)
ssh-keygen -t ed25519 -f $HOME\.ssh\hetzner

# Affiche la clé publique à copier
cat $HOME\.ssh\hetzner.pub
```

Copie le résultat (commence par `ssh-ed25519 AAAA...`) et sur Hetzner :
- **Security → SSH Keys → Add SSH Key** → colle, donne un nom (ex: "PC-Maison")

> Sans clé SSH, tu peux te connecter avec un mot de passe, c'est juste moins sûr et tu dois retaper le mot de passe à chaque fois.

### D. Crée le serveur
1. **+ New → Server**
2. **Location** : Nuremberg ou Falkenstein (Allemagne, latence ~30 ms depuis la France)
3. **Image** : Ubuntu 24.04 (la dernière LTS)
4. **Type** : **CX22** (la moins chère, 2 vCPU, 4 Go RAM, 4,51 €/mois). Largement assez.
5. **SSH keys** : coche celle que tu viens d'ajouter
6. **Networking** : laisse par défaut (IPv4 + IPv6)
7. **Firewall** : skip pour l'instant
8. **Name** : `party-games-vps`
9. **Create & Buy now**

Attends 20 secondes, ton serveur a une IP type `78.46.X.Y`. **Note-la**.

---

## Étape 3 — Pointer ton domaine vers le serveur (5 min)

Va dans le panneau de ton registrar (OVH, Gandi, etc.) → DNS de ton domaine → **ajoute 2 enregistrements A** :

```
Nom     Type    Valeur (IP du VPS)
@       A       78.46.X.Y
www     A       78.46.X.Y
```

> "Nom @" = ton-domaine.fr lui-même. "www" = www.ton-domaine.fr

Patiente 5-15 min que la propagation DNS se fasse. Pour vérifier, sur PowerShell :
```powershell
nslookup ton-domaine.fr
```
→ doit retourner ton IP Hetzner.

---

## Étape 4 — Push le code sur GitHub (10 min)

Si pas déjà fait :

1. **Crée un repo GitHub** (privé) : https://github.com/new → `party-games`
2. Sur ton PC, dans `C:\dev\party-games\` :

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/party-games.git
git push -u origin main
```

> Si le repo est privé, GitHub te demandera un **Personal Access Token** (Settings → Developer settings → Personal access tokens → "Tokens (classic)" → Generate new token classic, scope `repo`). Utilise ce token comme mot de passe.

✅ Vérifie sur GitHub que le code est en ligne.

---

## Étape 5 — Setup du VPS (15 min, automatique)

### A. Connecte-toi en SSH

Depuis PowerShell :
```powershell
ssh -i $HOME\.ssh\hetzner root@78.46.X.Y
```

(remplace l'IP par celle de ton VPS)

→ Tu devrais voir `root@party-games-vps:~#`

### B. Lance le script d'install

Sur le VPS, **copie-colle** ces commandes :

```bash
# Récupère ton repo (publique) ou clone privé (token requis)
cd /var/www
git clone https://github.com/TON_USERNAME/party-games.git
cd party-games

# Lance le setup (installe Node, Nginx, PM2, Certbot, configure tout)
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh ton-domaine.fr
```

Le script :
- Met à jour le système
- Installe Node 20, Nginx, PM2, Certbot
- Configure Nginx avec ton domaine
- Demande un certificat HTTPS Let's Encrypt
- Build le client, lance le server avec PM2

Au bout de ~10 min, tu verras :
```
✅ Setup terminé !
🌐 https://ton-domaine.fr
```

Va sur cette URL dans ton navigateur. **Ça doit marcher.**

---

## Étape 6 — Premier test

1. Ouvre `https://ton-domaine.fr` dans 2 navigateurs (Chrome + Firefox en privé)
2. Crée une room avec le 1er, rejoins avec le 2e
3. Lance un quiz

Si ça marche → 🎉

Sinon → voir section **Troubleshooting** plus bas.

---

## Workflow d'updates (30 sec à chaque fois)

Quand tu modifies du code en local :

```powershell
# Sur ton PC
git add .
git commit -m "Fix XYZ"
git push
```

Puis SSH sur le VPS :
```bash
cd /var/www/party-games
./deploy/update.sh
```

Le script :
- `git pull`
- Réinstalle les deps si `package.json` a changé
- Rebuild le client
- Redémarre le serveur (les joueurs en cours sont éjectés)

C'est tout.

---

## (Bonus) Auto-deploy via webhook GitHub

Si tu veux que le push déclenche automatiquement le rebuild sur le VPS, voir le bonus en bas du fichier.

---

## Coûts récurrents

| Item | Coût | Fréquence |
|---|---|---|
| Hetzner CX22 | 4,51 € | par mois |
| Domaine (.fr OVH) | ~6 € | par an |
| **Total annuel** | **~60 €** | |

Tu peux héberger plusieurs sites différents sur le même VPS si tu veux amortir, en ajoutant d'autres `server` blocks dans Nginx.

---

## Troubleshooting

### `502 Bad Gateway` quand je vais sur l'URL
Le serveur Node ne tourne pas. Sur le VPS :
```bash
pm2 logs party-games  # vois les erreurs
pm2 restart party-games
```

### `502` après un déploiement
Le `npm install` a foiré ou le build a planté.
```bash
cd /var/www/party-games
./deploy/update.sh   # relance et regarde les messages
```

### Le navigateur dit "Connexion non sécurisée"
Le certificat Let's Encrypt n'a pas été obtenu. Lance manuellement :
```bash
sudo certbot --nginx -d ton-domaine.fr -d www.ton-domaine.fr
```

### Je ne peux plus me connecter en SSH
Récupère ta connexion via la **Console Web** d'Hetzner (icône terminal sur ton serveur dans la console).

### Le serveur consomme trop / RAM saturée
Sur le VPS :
```bash
htop  # vois ce qui prend de la RAM
pm2 monit  # monitoring du serveur Node
```
Si Node mange tout, c'est un memory leak. Restart :
```bash
pm2 restart party-games
```

### Mes joueurs sont en France, latence élevée ?
Hetzner Nuremberg = ~25-30 ms depuis Paris. Pour mieux : OVH Roubaix (~10 ms), Scaleway Paris (~5 ms). Mêmes principes de déploiement.

---

## Bonus : Auto-deploy via webhook GitHub

Tu veux que ton `git push` déclenche le rebuild automatique sur le VPS, sans que tu aies à SSH ?

**Option simple : GitHub Actions + SSH**

Crée `.github/workflows/deploy.yml` dans ton repo :
```yaml
name: Deploy to VPS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: root
          key: ${{ secrets.VPS_SSH_KEY }}
          script: cd /var/www/party-games && ./deploy/update.sh
```

Sur GitHub : Settings → Secrets → ajoute `VPS_HOST` (l'IP) et `VPS_SSH_KEY` (le contenu de `~/.ssh/hetzner` privée).

À chaque `git push`, GitHub se connecte au VPS et lance update.sh. Magique.

---

C'est tout. Si tu bloques quelque part, screenshot-moi l'erreur, je débloque.
