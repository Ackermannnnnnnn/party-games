# Avatars perso

Dépose ici des images (`.png`, `.jpg`, `.webp`, `.gif`) : elles deviennent des avatars
que tous les joueurs peuvent choisir.

- **Le nom du fichier = le nom de l'avatar** : `Iron-Man.png` → « Iron Man ».
- **Un dossier = un onglet** dans le choix d'avatar :
  - `Marvel/Hulk.png` → onglet « Marvel »
  - `🎌 Mangas/Goku.jpg` → onglet « Mangas » avec l'icône 🎌
  - une image posée directement ici → onglet « ⭐ Perso »
- Pas besoin de redimensionner : chaque image est recadrée automatiquement au moment du build
  (smartcrop repère le personnage / le visage et zoome un peu dessus), puis réduite.
- **Cadrage à la main** : page `/admin` → onglet « 🖼️ Avatars ». On déplace le carré, on zoome,
  puis « Enregistrer » : le cadrage est écrit dans `cadrage.json` (ici) sur GitHub et Render
  redéploie tout seul. Il faut pour ça la variable `GITHUB_TOKEN` sur le serveur Render
  (jeton GitHub « fine-grained », dépôt party-games, droit *Contents : Read and write*).
  Sans jeton : « Télécharger cadrage.json », le poser dans ce dossier et le pousser.
- Pour mettre à jour le site : `git add .` → `git commit -m "Nouveaux avatars"` → `git push`.
  Render reconstruit le site et les avatars apparaissent pour tout le monde.

En local, `npm run dev` (ou `npm run avatars`) régénère la liste.

## Photos des personnages (Iron Man, Goku, Mario…)

Les avatars intégrés utilisent une vraie photo au lieu d'un emoji : `client/avatar-photos/<id>.webp`
(`goku.webp`, `ironman.webp`…). Un personnage sans photo n'est pas proposé aux joueurs.
Pour changer une photo : `/admin` → « 🖼️ Avatars » → choisis le personnage → clique une proposition,
« Chercher d'autres photos », colle l'adresse d'une image ou importe un fichier → « Enregistrer ».
Les propositions sont listées dans `client/avatar-photos/sources.json`.
