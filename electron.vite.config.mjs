import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        input: {
          index: 'src/main/index.js',
          worker: 'src/main/worker.js'
        }
      }
    }
  },
  preload: {
    build: {
      // Sandboxed preloads get Chromium's restricted `require` (allowlist:
      // electron, events, timers, url) — they can't resolve packages from
      // node_modules. Bundle @electron-toolkit/preload into the preload
      // output instead of externalizing it.
      externalizeDeps: { exclude: ['@electron-toolkit/preload'] }
    }
  },
  renderer: {}
})
