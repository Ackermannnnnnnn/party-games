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
- Pour mettre à jour le site : `git add .` → `git commit -m "Nouveaux avatars"` → `git push`.
  Render reconstruit le site et les avatars apparaissent pour tout le monde.

En local, `npm run dev` (ou `npm run avatars`) régénère la liste.
