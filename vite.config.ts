import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api/send-invite': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.error('Proxy error:', err);
            res.status(500).end('Proxy error: API not available in local development. Deploy to Vercel to use email functionality.');
          });
        },
      },
    },
  },
})
