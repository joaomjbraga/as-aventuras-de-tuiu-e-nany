import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

/** Build desktop Electron: processo principal, preload e renderer Phaser. */
export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
    },
  },
  preload: {
    build: {
      externalizeDeps: false,
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs',
        },
      },
    },
  },
  renderer: {
    root: rootDir,
    base: './',
    publicDir: 'src/assets',
    build: {
      minify: 'esbuild',
      rollupOptions: {
        input: {
          index: resolve(rootDir, 'index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@game': resolve(rootDir, 'src/game'),
        '@': resolve(rootDir, 'src'),
      },
    },
  },
})
