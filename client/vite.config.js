import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Identifiant unique de chaque build : le client compare le sien à /version.json
// pour détecter qu'une nouvelle version a été mise en ligne (onglet resté ouvert).
const BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: {
    port: 5173,
  },
});
