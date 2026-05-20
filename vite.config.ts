import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Claude-Jam-III/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    port: 3000,
    open: true,
  },
})
