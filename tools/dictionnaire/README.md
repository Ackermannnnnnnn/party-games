# Régénérer le dictionnaire de BombParty

1. Récupérer les sources dans un dossier `sources/` :
   ```sh
   npm pack an-array-of-french-words word-list-fr dictionary-fr
   for f in *.tgz; do mkdir -p "x-${f%.tgz}" && tar -xzf "$f" -C "x-${f%.tgz}"; done
   curl -o hbenbel-dictionary.csv https://raw.githubusercontent.com/hbenbel/French-Dictionary/master/dictionary/dictionary.csv
   # Déplier le dictionnaire Hunspell (paquet hunspell-tools)
   unmunch x-dictionary-fr-*/package/index.dic x-dictionary-fr-*/package/index.aff > grammalecte-unmunch.txt
   ```
2. Lancer : `python3 -I build_dict.py sources/ ../../server/src/games/bombparty/data/`

Pour ajouter des mots à la main, compléter `supplement.txt` puis relancer l'étape 2.
