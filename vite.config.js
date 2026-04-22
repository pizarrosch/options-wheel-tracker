import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/tradier': {
        target: 'https://api.tradier.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/tradier/, ''),
        headers: { 'Accept': 'application/json' }
      }
    }
  }
})