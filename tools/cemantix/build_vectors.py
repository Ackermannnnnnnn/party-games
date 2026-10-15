"""Prépare les vecteurs de mots du jeu Cémantix.

Source : vecteurs fastText français d'Explosion (licence CC0), distribués dans le modèle
spaCy fr_core_news_lg. On garde les N mots les plus fréquents qui figurent dans une liste de
mots français propre, normalisés puis quantifiés sur 8 bits (int8) : la similarité cosinus est
préservée (les 1000 plus proches voisins restent identiques à 100 % sur nos tests).

Usage (dans un environnement où spaCy est installé) :
  python build_vectors.py <dossier vocab du modèle> <liste de mots .txt.gz> <dossier de sortie> [N]
"""
import gzip, json, sys
import numpy as np
from spacy.strings import hash_string
from spacy.vectors import Vectors

vocab_dir, words_path, out_dir = sys.argv[1:4]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 60000

vectors = Vectors().from_disk(vocab_dir)
strings = json.load(open(f"{vocab_dir}/strings.json", encoding="utf-8"))
allowed = set(gzip.open(words_path, "rt", encoding="utf-8").read().split("\n"))

rows = []
for s in strings:
    if len(s) < 2 or s != s.lower() or s not in allowed:
        continue
    key = hash_string(s)
    if key in vectors.key2row:
        rows.append((vectors.key2row[key], s))
rows.sort()                      # les lignes du modèle sont classées par fréquence
rows = rows[:N]
words = [w for _, w in rows]

X = np.asarray(vectors.data)[[r for r, _ in rows]].astype(np.float32)
X /= np.linalg.norm(X, axis=1, keepdims=True)
Q = np.round(X / np.abs(X).max(axis=1, keepdims=True) * 127).astype(np.int8)

with gzip.open(f"{out_dir}/vocab.txt.gz", "wt", encoding="utf-8", compresslevel=9) as f:
    f.write("\n".join(words))
with gzip.open(f"{out_dir}/vectors.i8.gz", "wb", compresslevel=9) as f:
    f.write(Q.tobytes())
json.dump({"count": len(words), "dims": int(Q.shape[1]), "format": "int8"}, open(f"{out_dir}/vectors.json", "w"))
print(f"{len(words)} mots, {Q.shape[1]} dimensions, dernier mot : {words[-1]}")
