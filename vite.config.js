import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Local development intentionally uses the deployed Neon-backed API so
        // it reads and writes the same real data as the new production project.
        '/api': {
          target: env.LOCAL_API_TARGET || 'https://gnrsmashstats-kohl.vercel.app',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
