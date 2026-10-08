# Dictionnaire de BombParty

`mots.txt.gz` : environ 550 000 formes françaises (une par ligne) : noms, adjectifs, verbes
conjugués à tous les temps, pluriels, féminins, mots composés (porte-monnaie, c'est-à-dire),
et un supplément d'argot et de mots courants récents (mdr, kiffer, streameur, covid…).
`syllabes.json` : pour chaque suite de 2 ou 3 lettres, le nombre de mots qui la contiennent
(sert à choisir les syllabes selon la difficulté).

Les deux fichiers sont générés par `tools/dictionnaire/build_dict.py` à partir de :

| Source | Contenu | Licence |
|---|---|---|
| Dictionnaire Grammalecte, via le paquet npm `dictionary-fr` (wooorm/dictionaries), déplié avec `unmunch` (Hunspell) | toutes les formes fléchies | MPL-2.0 |
| Liste Letterpress (atebits/Words), via les paquets npm `an-array-of-french-words` et `word-list-fr` | ~336 000 mots | MIT |
| `hbenbel/French-Dictionary` (GitHub) | ~400 000 entrées | MIT (licence indiquée par le dépôt) |
| `tools/dictionnaire/supplement.txt` (écrit pour ce projet) | argot, verlan, mots d'internet, anglicismes courants | même licence que le projet |

Filtrage appliqué : minuscules uniquement (pas de noms propres ni de sigles), lettres françaises,
tirets et apostrophes seulement, formes élidées retirées (l'arbre, qu'il…) sauf vraies locutions.

Comme le fichier contient des données sous MPL-2.0, `mots.txt.gz` est distribué sous MPL-2.0
(https://mozilla.org/MPL/2.0/).

`frequents.txt.gz` : les ~35 000 mots du dictionnaire les plus fréquents à l'oral (classés par
fréquence), tirés de FrequencyWords d'Hermit Dave (sous-titres OpenSubtitles 2018), licence
CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Ils servent uniquement à
montrer des exemples connus quand la bombe explose.
