import { describe, expect, it } from 'vitest'
import { CHARACTER_FOOT_INSET, CHARACTERS } from '../../src/game/sprites'

describe('geometria dos personagens', () => {
  it.each(Object.values(CHARACTERS))('$name usa um body menor que o frame visível', (character) => {
    expect(character.bodyWidth).toBeLessThan(character.frameWidth)
    expect(character.bodyHeight + CHARACTER_FOOT_INSET).toBeLessThanOrEqual(character.frameHeight)
  })

  it('mantém Tuiu e Nany com bodies próximos em pixels de mundo', () => {
    const tuioBodyHeight = CHARACTERS.tuio.bodyHeight * CHARACTERS.tuio.scale
    const nanyBodyHeight = CHARACTERS.nany.bodyHeight * CHARACTERS.nany.scale

    expect(tuioBodyHeight).toBeCloseTo(98.6)
    expect(nanyBodyHeight).toBeCloseTo(99)
  })

  it('mantém as alturas visíveis de Tuiu e Nany equivalentes', () => {
    const tuioHeight = CHARACTERS.tuio.frameHeight * CHARACTERS.tuio.scale
    const nanyHeight = CHARACTERS.nany.frameHeight * CHARACTERS.nany.scale

    expect(Math.abs(tuioHeight - nanyHeight)).toBeLessThan(0.5)
  })
})
