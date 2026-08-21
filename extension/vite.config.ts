import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'index.html'),
        sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
      },
    },
  },
})

