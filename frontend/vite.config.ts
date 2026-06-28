import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Proxy API calls through the dev origin so the session cookie stays
    // first-party (avoids it being dropped on a cross-site localhost↔127.0.0.1 hop).
    proxy: {
      '/api.v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  }
})
