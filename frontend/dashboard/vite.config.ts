import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/extraction': { target: 'http://localhost:8000', rewrite: (path) => path.replace(/^\/api\/extraction/, '') },
      '/api/filtering': { target: 'http://localhost:8001', rewrite: (path) => path.replace(/^\/api\/filtering/, '') },
      '/api/entity-profile': { target: 'http://localhost:8002', rewrite: (path) => path.replace(/^\/api\/entity-profile/, '') },
      '/api/contextual-validation': { target: 'http://localhost:8003', rewrite: (path) => path.replace(/^\/api\/contextual-validation/, '') },
      '/api/discovery': { target: 'http://localhost:8004', rewrite: (path) => path.replace(/^\/api\/discovery/, '') },
      '/api/multilingual': { target: 'http://localhost:8005', rewrite: (path) => path.replace(/^\/api\/multilingual/, '') },
      '/api/factcheck': { target: 'http://localhost:8006', rewrite: (path) => path.replace(/^\/api\/factcheck/, '') },
      '/api/sources': { target: 'http://localhost:8007', rewrite: (path) => path.replace(/^\/api\/sources/, '') },
      '/api/whatsapp': { target: 'http://localhost:8008', rewrite: (path) => path.replace(/^\/api\/whatsapp/, '') },
      '/api/briefs': { target: 'http://localhost:8009', rewrite: (path) => path.replace(/^\/api\/briefs/, '') },
    }
  }
});
