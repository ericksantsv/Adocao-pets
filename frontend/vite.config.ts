import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api/* é encaminhado para o backend (evita CORS em desenvolvimento)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3333', rewrite: (p) => p.replace(/^\/api/, '') } },
  },
});
