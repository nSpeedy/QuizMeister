import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      '/api': backendUrl,
      '/socket.io': { target: backendUrl, ws: true },
    },
  },
})
