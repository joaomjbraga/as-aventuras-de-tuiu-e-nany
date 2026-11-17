/**
 * Cálculo do tamanho inicial da janela, isolado do Electron para ser testável.
 *
 * O jogo tem resolução lógica 768x432 (16:9) e usa `Phaser.Scale.FIT`, então
 * qualquer janela 16:9 mostra o jogo inteiro. O problema no Linux era abrir
 * 1920x1080 com mínimo de 1280x720: em telas menores o gerenciador de janelas
 * deixava a janela vazar para fora da área útil (barra de título e botões fora
 * da tela, ou a janela inteira "grudada" no canto superior esquerdo).
 */

/** Proporção do jogo (BASE_WIDTH / BASE_HEIGHT em src/game/config.ts). */
export const GAME_ASPECT_RATIO = 16 / 9

/** Tamanho desejado quando a área útil da tela tem espaço de sobra. */
export const PREFERRED_WIDTH = 1280
export const PREFERRED_HEIGHT = 720

/** Menor janela ainda utilizável. */
export const MIN_WIDTH = 640
export const MIN_HEIGHT = 360

/**
 * Fração máxima da área útil que a janela inicial pode ocupar. GNOME (e outros
 * WMs) auto-maximizam janelas que abrem muito perto da borda da tela; ficar em
 * 80% mantém a janela centralizada, sem maximizar, em qualquer resolução.
 */
const MAX_WORK_AREA_FRACTION = 0.8

export interface WorkAreaSize {
  width: number
  height: number
}

export interface WindowSize extends WorkAreaSize {
  minWidth: number
  minHeight: number
}

/**
 * Escolhe um tamanho 16:9 que caiba na área útil do display. O mínimo também é
 * limitado pelo resultado: um `minWidth` maior que a janela inicial faz o WM
 * corrigir o tamanho e a janela volta a transbordar a tela.
 */
export function computeWindowSize(workArea: WorkAreaSize): WindowSize {
  const availableWidth = Math.max(1, Math.floor(workArea.width * MAX_WORK_AREA_FRACTION))
  const availableHeight = Math.max(1, Math.floor(workArea.height * MAX_WORK_AREA_FRACTION))

  const width = Math.max(1, Math.floor(Math.min(PREFERRED_WIDTH, availableWidth, availableHeight * GAME_ASPECT_RATIO)))
  const height = Math.max(1, Math.floor(Math.min(PREFERRED_HEIGHT, availableHeight, width / GAME_ASPECT_RATIO)))

  return {
    width,
    height,
    minWidth: Math.min(MIN_WIDTH, width),
    minHeight: Math.min(MIN_HEIGHT, height),
  }
}
