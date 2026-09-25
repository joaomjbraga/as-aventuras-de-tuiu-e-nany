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
      // O bundle é dominado pelo Phaser (~1.5 MB minificado) e roda 100% local
      // a partir do asar, sem rede. Dividir em chunks aqui só adicionaria
      // rodadas de carregamento sem ganho real, então o aviso de tamanho é
      // suprimido em vez de resolvido por code-splitting.
      chunkSizeWarningLimit: 2048,
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
