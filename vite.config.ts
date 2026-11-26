import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  publicDir: false,
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: ['es2022', 'chrome105', 'safari15'],
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, 'src/renderer/overlay.html'),
        settings: resolve(__dirname, 'src/renderer/settings.html'),
      },
    },
  },
});
