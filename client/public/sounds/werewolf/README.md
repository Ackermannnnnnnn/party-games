# Sons du Loup-Garou

Place ici tes fichiers `.mp3` pour donner vie au jeu. Sans eux, ça marche quand même mais c'est silencieux.

## Liste des fichiers attendus

### Sons d'événements (courts, 1-3 sec)
- `wolves_howl.mp3` — quand les loups se réveillent (hurlement)
- `seer.mp3` — quand la voyante se réveille (chime mystique)
- `witch.mp3` — quand la sorcière se réveille (potion qui bout)
- `guard.mp3` — quand le garde se réveille (cliquetis d'armure ou bouclier qui se lève)
- `cupid.mp3` — quand cupidon se réveille (harpe)
- `rooster.mp3` — quand le village se réveille (coq qui chante)
- `death.mp3` — quand on annonce un mort (tonalité dramatique)
- `hunter_shot.mp3` — coup de feu du chasseur
- `heart_break.mp3` — quand un amoureux meurt (cœur qui se brise)
- `crowd_gasp.mp3` — quand le village découvre le lynché
- `village_win.mp3` — victoire du village (cloches, applaudissements)
- `wolves_win.mp3` — victoire des loups (hurlement triomphant)

### Musiques d'ambiance (longues, en boucle, ~2-5 min)
- `night_ambient.mp3` — musique sombre/mystérieuse pour la nuit (loop)
- `day_ambient.mp3` — musique légère/villageoise pour le jour (loop)

## Sources gratuites recommandées

- **Pixabay** : [pixabay.com/sound-effects](https://pixabay.com/sound-effects/) (libre de droits)
- **Freesound** : [freesound.org](https://freesound.org/) (Creative Commons)
- **Mixkit** : [mixkit.co/free-sound-effects](https://mixkit.co/free-sound-effects/) (libre)
- **YouTube Audio Library** : [studio.youtube.com](https://studio.youtube.com)

Tape par exemple "wolf howl", "rooster crow", "potion bubbling", "fantasy night ambient music"…

## Astuce pour la musique d'ambiance

Pour qu'une musique loope sans coupure audible, choisis un titre qui a déjà une boucle propre. Sinon utilise Audacity pour faire un fade out + fade in invisible.

## Format

- MP3, idéalement < 200 ko pour les SFX courts, < 3 Mo pour les ambiances
- 44.1 kHz, mono ou stéréo
- Si un fichier manque, Howler.js échoue silencieusement, le jeu continue
