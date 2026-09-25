import { describe, expect, it } from 'vitest'
import { CHARACTER_FOOT_INSET, CHARACTERS, zombieTextureKey } from '../../src/game/sprites'

const only =
  (...keys: string[]) =>
  (key: string) =>
    keys.includes(key)

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

describe('zombieTextureKey', () => {
  const allMounted = only('zombie1', 'zombie2', 'zombie3')

  it('usa o spritesheet real da variante quando ele foi montado', () => {
    expect(zombieTextureKey(1, allMounted)).toBe('zombie1')
    expect(zombieTextureKey(2, allMounted)).toBe('zombie2')
    expect(zombieTextureKey(3, allMounted)).toBe('zombie3')
  })

  it('cai no placeholder procedural quando a variante real não carregou', () => {
    // A PreloadScene só monta a variante se TODOS os frames dela existirem, e
    // qualquer frame ausente derruba a variante inteira para o placeholder.
    // Uma variante que carregou não deve ser afetada pela que faltou.
    expect(zombieTextureKey(2, only('zombie1', 'zombie3'))).toBe('zombie')
    expect(zombieTextureKey(1, only('zombie1', 'zombie3'))).toBe('zombie1')
    expect(zombieTextureKey(2, () => false)).toBe('zombie')
  })

  it('nunca devolve a chave placeholder como se fosse uma variante real', () => {
    // O placeholder existe sempre, então uma checagem que o aceitasse
    // devolveria 'zombie' como se fosse a variante 0 de um zumbi.
    expect(zombieTextureKey(1, () => true)).toBe('zombie1')
  })
})
