import { describe, expect, it } from 'vitest'
import { boundsFromRowFlags } from '../../src/game/spriteBounds'

/** Atalho: monta a lista de flags a partir das linhas com conteúdo. */
function flagsOf(height: number, ...contentRows: number[]): boolean[] {
  const rows = Array.from({ length: height }, () => false)
  for (const row of contentRows) rows[row] = true
  return rows
}

describe('boundsFromRowFlags', () => {
  it('encontra a faixa da primeira à última linha com conteúdo', () => {
    expect(boundsFromRowFlags(flagsOf(10, 3, 4, 5, 6))).toEqual({ y: 3, height: 4 })
  })

  it('funciona com conteúdo apenas na primeira linha', () => {
    expect(boundsFromRowFlags(flagsOf(8, 0))).toEqual({ y: 0, height: 1 })
  })

  it('funciona com conteúdo apenas na última linha', () => {
    expect(boundsFromRowFlags(flagsOf(8, 7))).toEqual({ y: 7, height: 1 })
  })

  it('ignora linhas vazias no meio da faixa', () => {
    expect(boundsFromRowFlags(flagsOf(10, 2, 3, 7, 8))).toEqual({ y: 2, height: 7 })
  })

  it('frame totalmente transparente devolve a altura inteira como fallback', () => {
    // Normalizar pela área inteira é melhor do que quebrar o spritesheet.
    expect(boundsFromRowFlags(flagsOf(12))).toEqual({ y: 0, height: 12 })
  })

  it('lista vazia devolve altura 0 em vez de NaN', () => {
    expect(boundsFromRowFlags([])).toEqual({ y: 0, height: 0 })
  })

  it('altura é sempre 1 ou mais quando há conteúdo', () => {
    for (let row = 0; row < 6; row++) {
      const bounds = boundsFromRowFlags(flagsOf(6, row))
      expect(bounds.height).toBe(1)
      expect(bounds.y).toBe(row)
    }
  })
})
