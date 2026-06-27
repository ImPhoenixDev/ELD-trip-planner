import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Mirror the production same-origin setup: with an empty VITE_API_BASE_URL,
    // requests to /api are proxied to the local Django server (no CORS needed).
    strictPort: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
