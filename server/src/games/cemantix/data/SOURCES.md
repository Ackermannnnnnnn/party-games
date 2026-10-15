# Données de Cémantix

- `vocab.txt.gz` : les 60 000 mots français les plus fréquents (classés par fréquence) qui figurent
  à la fois dans les vecteurs ci-dessous et dans une liste de mots français propre
  (liste Letterpress, mots fréquents FrequencyWords, supplément du projet).
- `vectors.i8.gz` : pour chaque mot, son vecteur de sens (300 nombres entiers sur 8 bits,
  même ordre que `vocab.txt.gz`), décrit par `vectors.json`.
  Source : vecteurs fastText français d'Explosion (cbow, OSCAR Common Crawl + Wikipédia),
  licence **CC0**, distribués dans le modèle spaCy `fr_core_news_lg` 3.8.0.
  La quantification sur 8 bits ne change pas les 1000 plus proches voisins (vérifié).
- `secrets.txt` : mots secrets possibles, choisis à la main parmi des mots courants.
  Pour en ajouter, il suffit de les écrire dans ce fichier (les mots inconnus sont ignorés).

Régénération : `tools/cemantix/build_vectors.py` (voir les explications en tête du fichier).
