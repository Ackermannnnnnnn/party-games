// Configuration PM2 pour Party Games
// PM2 garde le serveur Node.js en vie, le redémarre s'il crash, gère les logs.
// Usage : pm2 start deploy/ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'party-games',
      cwd: '/var/www/party-games/server',
      script: 'src/index.js',
      // Auto-restart si crash, max 10 fois en 1 min sinon abandonne
      max_restarts: 10,
      min_uptime: '10s',
      // Pas de cluster mode (Socket.io marche mieux en single-process)
      instances: 1,
      exec_mode: 'fork',
      // Watch désactivé en prod (on push manuellement via update.sh)
      watch: false,
      // Restart si la RAM dépasse 400 Mo (préventif sur CX22 4Go)
      max_memory_restart: '400M',
      // Variables d'env
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logs
      out_file: '/var/log/party-games-out.log',
      error_file: '/var/log/party-games-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
