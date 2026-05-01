#!/usr/bin/env bash
# Setup d'un VPS Ubuntu 22/24 pour Party Games.
# Usage : ./deploy/setup-vps.sh <ton-domaine>
# Exemple : ./deploy/setup-vps.sh party-games.fr
#
# Idempotent : peut être relancé sans casse.

set -e  # exit on first error

DOMAIN="${1:-}"
PROJECT_DIR="/var/www/party-games"
EMAIL="${ADMIN_EMAIL:-admin@example.com}"  # pour Let's Encrypt

if [ -z "$DOMAIN" ]; then
  echo "❌ Usage : $0 <ton-domaine>"
  echo "   Exemple : $0 party-games.fr"
  exit 1
fi

echo "════════════════════════════════════════════"
echo "  🚀 Setup Party Games VPS"
echo "  Domaine : $DOMAIN"
echo "  Dossier : $PROJECT_DIR"
echo "════════════════════════════════════════════"
echo ""

# ─────────── 1. Update système + paquets de base ───────────
echo "📦 Update du système..."
apt-get update -qq
apt-get upgrade -y -qq

echo "📦 Install des paquets de base..."
apt-get install -y -qq curl git ufw build-essential

# ─────────── 2. Node.js 20 (NodeSource) ───────────
if ! command -v node &> /dev/null; then
  echo "📦 Install Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  ✓ Node : $(node --version)"
echo "  ✓ npm  : $(npm --version)"

# ─────────── 3. PM2 (gestionnaire de process Node) ───────────
if ! command -v pm2 &> /dev/null; then
  echo "📦 Install PM2..."
  npm install -g pm2
fi
echo "  ✓ PM2 : $(pm2 --version)"

# ─────────── 4. Nginx ───────────
if ! command -v nginx &> /dev/null; then
  echo "📦 Install Nginx..."
  apt-get install -y -qq nginx
fi
echo "  ✓ Nginx : $(nginx -v 2>&1 | cut -d/ -f2)"

# ─────────── 5. Certbot (Let's Encrypt) ───────────
if ! command -v certbot &> /dev/null; then
  echo "📦 Install Certbot..."
  apt-get install -y -qq certbot python3-certbot-nginx
fi

# ─────────── 6. Firewall ───────────
echo "🔒 Configure le firewall..."
ufw allow OpenSSH > /dev/null
ufw allow 'Nginx Full' > /dev/null
ufw --force enable > /dev/null

# ─────────── 7. Install des deps du projet ───────────
cd "$PROJECT_DIR"

echo "📦 Install des deps du serveur..."
cd "$PROJECT_DIR/server"
npm install --production

echo "📦 Install des deps du client + build..."
cd "$PROJECT_DIR/client"
npm install
# Le client a besoin de l'URL du serveur en prod
cat > .env.production <<EOF
VITE_SERVER_URL=https://$DOMAIN
EOF
npm run build
echo "  ✓ Client buildé dans dist/"

# ─────────── 8. .env du serveur ───────────
echo "📝 Crée server/.env..."
cat > "$PROJECT_DIR/server/.env" <<EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://$DOMAIN
EOF

# ─────────── 9. Nginx config ───────────
echo "🔧 Configure Nginx..."
NGINX_CONF="/etc/nginx/sites-available/party-games"
sed "s/__DOMAIN__/$DOMAIN/g" "$PROJECT_DIR/deploy/nginx.conf.template" > "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/party-games

# Désactive le site par défaut
rm -f /etc/nginx/sites-enabled/default

# Teste la config nginx
nginx -t
systemctl reload nginx
echo "  ✓ Nginx configuré"

# ─────────── 10. Démarre le serveur Node avec PM2 ───────────
echo "🚀 Démarre le serveur avec PM2..."
cd "$PROJECT_DIR"
pm2 delete party-games 2>/dev/null || true  # supprime si existe
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root --silent || true
echo "  ✓ Server lancé"

# ─────────── 11. HTTPS via Let's Encrypt ───────────
echo ""
echo "🔐 Demande du certificat HTTPS Let's Encrypt..."
echo "   (Si ton domaine ne pointe pas encore vers cette IP, ça va échouer)"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || \
  echo "  ⚠️  Certbot a échoué. Lance manuellement plus tard : sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"

# ─────────── Done ───────────
echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Setup terminé !"
echo "════════════════════════════════════════════"
echo ""
echo "  🌐 https://$DOMAIN"
echo ""
echo "  Logs serveur en direct : pm2 logs party-games"
echo "  Status : pm2 status"
echo "  Reboot serveur Node : pm2 restart party-games"
echo "  Update : ./deploy/update.sh"
echo ""
