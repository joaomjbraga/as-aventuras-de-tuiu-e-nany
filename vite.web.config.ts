import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

/**
 * Build web estático do renderer Phaser, sem Electron.
 *
 * É o mesmo código da versão desktop: a única diferença é que não há
 * processo principal nem preload, então a ponte `window.desktop` não
 * existe (ver `src/game/runtime.ts`).
 *
 * `base: './'` é importante: o bundle precisa funcionar tanto na raiz
 * de um domínio quanto sob um prefixo (o GitHub Pages publica o jogo em
 * `/as-aventuras-de-tuiu-e-nany/jogo/`) e também via `file://` num teste
 * local. Os assets do Phaser são carregados por caminhos relativos ao
 * HTML (`scenes/...`, `audio/...`, `sprites/...`), e `publicDir` copia
 * `src/assets` exatamente para a raiz do build, preservando esses caminhos.
 */
export default defineConfig({
  root: rootDir,
  base: './',
  publicDir: 'src/assets',
  resolve: {
    alias: {
      '@game': resolve(rootDir, 'src/game'),
      '@': resolve(rootDir, 'src'),
    },
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    minify: 'esbuild',
    // Phaser domina o bundle (~1.5 MB minificado); dividir em chunks só
    // acrescentaria rodadas de carregamento sem ganho real.
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      input: {
        index: resolve(rootDir, 'index.html'),
      },
    },
  },
})
