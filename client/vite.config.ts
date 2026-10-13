import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactRouter()],
  server: {
    proxy: {
      '/api': backendUrl,
      '/socket.io': { target: backendUrl, ws: true },
    },
  },
})
