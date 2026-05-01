#!/usr/bin/env bash
# Met à jour le déploiement après un git push.
# À lancer sur le VPS depuis /var/www/party-games :
#   ./deploy/update.sh

set -e
cd "$(dirname "$0")/.."   # va à la racine du projet

echo "════════════════════════════════════"
echo "  🔄 Update Party Games"
echo "════════════════════════════════════"

# Sauvegarde les hashs avant pull
SERVER_PKG_HASH_BEFORE=$(md5sum server/package.json 2>/dev/null | cut -d' ' -f1)
CLIENT_PKG_HASH_BEFORE=$(md5sum client/package.json 2>/dev/null | cut -d' ' -f1)

echo "📥 git pull..."
git pull --ff-only

# Si server/package.json a changé → reinstall
SERVER_PKG_HASH_AFTER=$(md5sum server/package.json | cut -d' ' -f1)
if [ "$SERVER_PKG_HASH_BEFORE" != "$SERVER_PKG_HASH_AFTER" ]; then
  echo "📦 server/package.json a changé → npm install..."
  cd server && npm install --production && cd ..
fi

# Si client/package.json a changé → reinstall
CLIENT_PKG_HASH_AFTER=$(md5sum client/package.json | cut -d' ' -f1)
if [ "$CLIENT_PKG_HASH_BEFORE" != "$CLIENT_PKG_HASH_AFTER" ]; then
  echo "📦 client/package.json a changé → npm install..."
  cd client && npm install && cd ..
fi

echo "🏗️  Build du client..."
cd client && npm run build && cd ..

echo "🔄 Restart du serveur Node (PM2)..."
pm2 restart party-games

echo ""
echo "✅ Update terminé !"
pm2 status party-games
