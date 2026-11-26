import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// BASE_PATH is set by the GitHub Pages build (e.g. /pawmatch/). Locally and in the APK it is "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
  },
})
