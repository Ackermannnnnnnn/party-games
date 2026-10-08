"""Fusionne plusieurs listes de mots français en un dictionnaire de jeu (BombParty).
Usage : python3 -I build_dict.py <dossier_sources> <dossier_sortie>
Voir README.md dans ce dossier pour récupérer les sources.
"""
import json, re, sys, unicodedata, gzip, collections, os

src, out = sys.argv[1], sys.argv[2]
LETTERS = "a-zàâäéèêëîïôöùûüÿçœæ"
VALID = re.compile(rf"^[{LETTERS}]+(?:[-'][{LETTERS}]+)*$")
ELISION = re.compile(r"^(?:l|d|qu|n|m|t|s|j|c|ç|lorsqu|puisqu|jusqu|quoiqu|presqu)'")

def key(word):
    """Clé de jeu : sans accents, sans tirets ni apostrophes. "Porte-Monnaie" -> "portemonnaie"."""
    w = word.lower().replace("œ", "oe").replace("æ", "ae")
    w = unicodedata.normalize("NFD", w)
    w = "".join(c for c in w if not unicodedata.combining(c))
    return re.sub(r"[^a-z]", "", w)

KEEP_ELIDED = {"d'abord", "d'accord", "d'ailleurs", "d'emblée", "d'office", "d'autant", "d'antan",
               "c'est", "n'importe", "qu'importe", "d'après", "d'aplomb", "s'il", "qu'est-ce"}

def clean(raw, allow_elided=False):
    w = raw.strip().replace("’", "'").replace("‐", "-")
    w = w.split("/")[0].split("\t")[0].strip()
    if not w or w != w.lower():      # majuscule = nom propre, sigle...
        return None
    if ELISION.match(w) and not w.startswith(("presqu'île", "presqu'îles")):
        # Forme élidée (l'arbre, qu'il...) : le mot de base est déjà là. On garde seulement
        # les vraies locutions (c'est-à-dire, d'accord...) venant des listes de mots.
        if not (allow_elided and ("-" in w or w in KEEP_ELIDED)):
            return None                  # forme élidée (l'arbre, qu'il...) : le mot de base est déjà là
    if not VALID.match(w):
        return None
    if len(key(w)) < 2:
        return None
    return w

def read_lines(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            yield line

sources = {
    "grammalecte": lambda: read_lines(os.path.join(src, "grammalecte-unmunch.txt")),
    "letterpress-anarray": lambda: json.load(open(os.path.join(src, "x-an-array-of-french-words-2.0.0/package/index.json"), encoding="utf-8")),
    "letterpress-wordlist": lambda: read_lines(os.path.join(src, "x-word-list-fr-1.0.2/package/words.txt")),
    "hbenbel": lambda: read_lines(os.path.join(src, "hbenbel-dictionary.csv")),
    "supplement": lambda: (w for line in read_lines(os.path.join(os.path.dirname(__file__), "supplement.txt"))
                           if not line.startswith("#") for w in line.split()),
}

by_source = {}
for name, loader in sources.items():
    words = set()
    rejected = 0
    for raw in loader():
        w = clean(raw, allow_elided=(name != "grammalecte"))
        if w: words.add(w)
        else: rejected += 1
    by_source[name] = words
    print(f"{name:22s} {len(words):>8d} mots retenus, {rejected:>8d} écartés")

all_words = set().union(*by_source.values())
keys = sorted({key(w) for w in all_words})
print(f"{'TOTAL (formes)':22s} {len(all_words):>8d}")
print(f"{'TOTAL (clés de jeu)':22s} {len(keys):>8d}")
for name, ws in by_source.items():
    others = set().union(*(v for k, v in by_source.items() if k != name))
    only = ws - others
    print(f"  apporté uniquement par {name:20s}: {len(only):>7d}  ex: {', '.join(sorted(only)[::max(1, len(only)//8)][:8])}")

os.makedirs(out, exist_ok=True)
# On garde l'orthographe complète (accents, tirets) pour afficher des exemples ;
# le serveur calcule lui-même la clé de jeu de chaque mot au chargement.
with gzip.open(os.path.join(out, "mots.txt.gz"), "wt", encoding="utf-8", compresslevel=9) as f:
    f.write("\n".join(sorted(all_words)))

# Mots les plus fréquents (sous-titres de films, FrequencyWords) présents dans le dictionnaire :
# servent à montrer des exemples connus après une explosion.
freq_path = os.path.join(src, "fr_50k.txt")
if os.path.exists(freq_path):
    frequent = []
    seen = set()
    for line in read_lines(freq_path):
        w = line.split(" ")[0].strip()
        if w in all_words and len(key(w)) >= 4 and w not in seen:
            seen.add(w)
            frequent.append(w)
    with gzip.open(os.path.join(out, "frequents.txt.gz"), "wt", encoding="utf-8", compresslevel=9) as f:
        f.write("\n".join(frequent))
    print(f"mots fréquents retenus : {len(frequent)} ; ex: {frequent[:12]}")

# Statistiques de syllabes : nombre de mots contenant chaque suite de 2 ou 3 lettres
counts = collections.Counter()
for k in keys:
    subs = set()
    for n in (2, 3):
        for i in range(len(k) - n + 1):
            subs.add(k[i:i + n])
    counts.update(subs)
syllables = sorted(([s, c] for s, c in counts.items() if c >= 30), key=lambda x: -x[1])
with open(os.path.join(out, "syllabes.json"), "w", encoding="utf-8") as f:
    json.dump(syllables, f, separators=(",", ":"))
print(f"syllabes (>= 30 mots) : {len(syllables)} ; plus fréquentes : {syllables[:8]}")
for lo, hi in [(3000, None), (800, None), (150, 1500)]:
    n = sum(1 for s, c in syllables if c >= lo and (hi is None or c <= hi))
    print(f"  syllabes entre {lo} et {hi or '∞'} mots : {n}")
