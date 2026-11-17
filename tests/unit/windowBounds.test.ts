import { describe, expect, it } from 'vitest'
import {
  GAME_ASPECT_RATIO,
  MIN_HEIGHT,
  MIN_WIDTH,
  PREFERRED_HEIGHT,
  PREFERRED_WIDTH,
  computeWindowSize,
} from '../../src/main/windowBounds'

describe('tamanho inicial da janela', () => {
  it('usa o tamanho preferido quando a tela tem espaço', () => {
    expect(computeWindowSize({ width: 1920, height: 1080 })).toEqual({
      width: PREFERRED_WIDTH,
      height: PREFERRED_HEIGHT,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
    })
  })

  it.each([
    { width: 1366, height: 768 },
    { width: 1024, height: 600 },
    { width: 800, height: 600 },
    { width: 500, height: 400 },
  ])('cabe na área útil de $width x $height', (workArea) => {
    const bounds = computeWindowSize(workArea)

    expect(bounds.width).toBeLessThanOrEqual(workArea.width)
    expect(bounds.height).toBeLessThanOrEqual(workArea.height)
    expect(bounds.width / bounds.height).toBeCloseTo(GAME_ASPECT_RATIO, 1)
    // Abaixo do limite de auto-maximize dos gerenciadores de janela.
    expect(bounds.width).toBeLessThanOrEqual(Math.floor(workArea.width * 0.8))
    expect(bounds.height).toBeLessThanOrEqual(Math.floor(workArea.height * 0.8))
  })

  it('nunca define um mínimo maior que a própria janela', () => {
    const bounds = computeWindowSize({ width: 500, height: 400 })

    expect(bounds.minWidth).toBeLessThanOrEqual(bounds.width)
    expect(bounds.minHeight).toBeLessThanOrEqual(bounds.height)
  })
})
