import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const base = mode === 'aton' ? '/msg21/' : mode === 'charter' ? '/fleet/' : '/'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base,
  build: {
    rollupOptions: {
      input: mode === 'aton'
        ? resolve(__dirname, 'aton.html')
        : resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
}))
