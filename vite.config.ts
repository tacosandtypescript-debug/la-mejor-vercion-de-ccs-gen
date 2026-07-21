import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    base: '/la-mejor-vercion-de-ccs-gen/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
      strictPort: true,
    },
    plugins: [],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
  }
});
