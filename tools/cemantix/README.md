# Régénérer les vecteurs de Cémantix

1. Télécharger le modèle spaCy (≈ 570 Mo) et en extraire le vocabulaire :
   ```sh
   curl -L -o fr_core_news_lg.whl https://github.com/explosion/spacy-models/releases/download/fr_core_news_lg-3.8.0/fr_core_news_lg-3.8.0-py3-none-any.whl
   unzip fr_core_news_lg.whl 'fr_core_news_lg/fr_core_news_lg-3.8.0/vocab/*'
   python -m venv venv && ./venv/bin/pip install spacy numpy
   ```
2. Préparer la liste de mots autorisés (`liste.txt.gz`, un mot par ligne : liste Letterpress
   + mots fréquents + `tools/dictionnaire/supplement.txt`).
3. Lancer :
   ```sh
   ./venv/bin/python build_vectors.py fr_core_news_lg/fr_core_news_lg-3.8.0/vocab liste.txt.gz ../../server/src/games/cemantix/data 60000
   ```
