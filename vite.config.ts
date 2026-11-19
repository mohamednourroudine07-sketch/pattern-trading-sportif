import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  base: repositoryName && !repositoryName.endsWith('.github.io') ? `/${repositoryName}/` : '/',
  plugins: [
    react(),
    {
      name: 'localhost-sync-api',
      configureServer(server) {
        // Dossier de persistance locale pour la synchronisation PC <-> Téléphone
        const dataDir = path.resolve(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const syncFilePath = path.join(dataDir, 'sync_data.json');

        // Middleware pour parser le JSON et gérer la synchronisation
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/sync/push' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                fs.writeFileSync(syncFilePath, body, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Données synchronisées sur le PC avec succès', timestamp: Date.now() }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }

          if (req.url === '/api/sync/pull' && req.method === 'GET') {
            if (fs.existsSync(syncFilePath)) {
              try {
                const data = fs.readFileSync(syncFilePath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ empty: true, timestamp: 0 }));
            }
            return;
          }

          if (req.url === '/api/sync/status' && req.method === 'GET') {
            const exists = fs.existsSync(syncFilePath);
            let mtime = 0;
            if (exists) {
              const stat = fs.statSync(syncFilePath);
              mtime = stat.mtimeMs;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ exists, lastModified: mtime }));
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: '0.0.0.0', // Écoute sur toutes les interfaces pour accès PC et Téléphone Android
  },
});
