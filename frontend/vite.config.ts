import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/auth/me': 'http://localhost:5656',
      '/auth/refresh': 'http://localhost:5656',
      '/auth/login/onsubmit': 'http://localhost:5656',
      '/auth/register/onsubmit': 'http://localhost:5656',
      '/auth/logout/onsubmit': 'http://localhost:5656',
      '/auth/reset/onsubmit': 'http://localhost:5656',
      '/dashboard/onload': 'http://localhost:5656',
      '/dashboard/onsubmit': 'http://localhost:5656',
      '/admin': 'http://localhost:5656',
      '/livez': 'http://localhost:5656',
      '/readyz': 'http://localhost:5656',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
