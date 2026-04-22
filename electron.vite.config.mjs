import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: 'src/main/index.js',
          worker: 'src/main/worker.js'
        }
      }
    }
  },
  preload: {},
  renderer: {}
})
