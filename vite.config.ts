import { defineConfig } from 'vite';

// Relative base so the same build runs from a web server, Electron (file://)
// and Capacitor (capacitor://localhost).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5173,
  },
});
