import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from /big-boy-burger-catch/.
// import.meta.env.BASE_URL is therefore '/big-boy-burger-catch/' in production.
export default defineConfig({
  base: '/big-boy-burger-catch/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
