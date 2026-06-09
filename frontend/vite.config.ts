import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'aton' ? '/msg21/' : mode === 'charter' ? '/fleet/' : mode === 'svante' ? '/svante/' : '/',
  build: {
    rollupOptions: {
      input: mode === 'aton'
        ? resolve(__dirname, 'aton.html')
        : mode === 'svante'
        ? resolve(__dirname, 'svante.html')
        : resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/aisapi': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true },
      '/msg21/ws': { target: 'ws://localhost:3001', ws: true },
      '/fleet/ws': { target: 'ws://localhost:3001', ws: true },
      '/svante/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
}))
