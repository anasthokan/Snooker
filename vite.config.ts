import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SPLIT_API_URL = 'https://snooker-apis.atozeesolutions.com'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define:
    mode === 'split'
      ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(SPLIT_API_URL) }
      : {},
  build: {
    outDir:
      mode === 'split'
        ? 'dist'
        : 'game-hub-backend-main/game-hub-backend-main/static_app',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}))
