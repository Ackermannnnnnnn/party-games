# Avatars perso

Dépose ici des images (`.png`, `.jpg`, `.webp`, `.gif`) : elles deviennent des avatars
que tous les joueurs peuvent choisir.

- **Le nom du fichier = le nom de l'avatar** : `Iron-Man.png` → « Iron Man ».
- **Un dossier = un onglet** dans le choix d'avatar :
  - `Marvel/Hulk.png` → onglet « Marvel »
  - `🎌 Mangas/Goku.jpg` → onglet « Mangas » avec l'icône 🎌
  - une image posée directement ici → onglet « ⭐ Perso »
- Pas besoin de redimensionner : chaque image est recadrée en carré (en gardant la partie
  la plus intéressante) et réduite automatiquement au moment du build.
- **Cadrage à la main** : page `/admin` → onglet « 🖼️ Avatars ». On déplace le carré, on zoome,
  puis « Enregistrer » : le cadrage est écrit dans `cadrage.json` (ici) sur GitHub et Render
  redéploie tout seul. Il faut pour ça la variable `GITHUB_TOKEN` sur le serveur Render
  (jeton GitHub « fine-grained », dépôt party-games, droit *Contents : Read and write*).
  Sans jeton : « Télécharger cadrage.json », le poser dans ce dossier et le pousser.
- Pour mettre à jour le site : `git add .` → `git commit -m "Nouveaux avatars"` → `git push`.
  Render reconstruit le site et les avatars apparaissent pour tout le monde.

En local, `npm run dev` (ou `npm run avatars`) régénère la liste.
