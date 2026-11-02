import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173, hmr: process.env.NO_HMR ? false : undefined, watch: process.env.NO_HMR ? { ignored: ['**/*'] } : undefined },
  preview: { host: '0.0.0.0', port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), viewer: resolve(__dirname, 'viewer.html'), wrenfield: resolve(__dirname, 'wrenfield.html') } },
  },
});
