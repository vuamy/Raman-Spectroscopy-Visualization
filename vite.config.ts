import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [react()],
  base: '/Raman-Spectroscopy-Visualization/', // Replace 'your-repo-name' with the repository name.
  build: {
    outDir: 'dist',
  },
})
