import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/livez': 'http://localhost:8000',
      '/readyz': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})