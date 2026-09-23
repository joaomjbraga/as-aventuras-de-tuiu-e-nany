import { describe, expect, it } from 'vitest'
import { GROUND_HEIGHT, PLAYER_SPAWN_X_FACTORS, groundCenterYFor, groundTopFor, spawnXFor } from '../../src/game/layout'

describe('layout', () => {
  it('calcula o topo do chão a partir da altura do viewport', () => {
    expect(groundTopFor(216)).toBe(216 - GROUND_HEIGHT)
  })

  it('centraliza um corpo apoiado no chão', () => {
    expect(groundCenterYFor(168, 64)).toBe(136)
  })

  it('posiciona P1 à esquerda e P2 à direita', () => {
    expect(spawnXFor(384, 0)).toBe(384 * PLAYER_SPAWN_X_FACTORS.p1)
    expect(spawnXFor(384, 1)).toBe(384 * PLAYER_SPAWN_X_FACTORS.p2)
  })
})
