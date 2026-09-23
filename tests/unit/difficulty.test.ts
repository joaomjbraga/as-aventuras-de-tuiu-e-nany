import { describe, expect, it } from 'vitest'
import {
  MAX_SIMULTANEOUS_ZOMBIES,
  SPAWN_MIN_DELAY,
  SPAWN_START_DELAY,
  VICTORY_KILLS,
  canSpawnZombie,
  hasWon,
  spawnIntervalMs,
} from '../../src/game/difficulty'

describe('difficulty', () => {
  it('começa no intervalo base e converge ao teto mínimo', () => {
    expect(spawnIntervalMs(0)).toBe(SPAWN_START_DELAY)
    expect(spawnIntervalMs(120_000)).toBe(SPAWN_MIN_DELAY)
    expect(spawnIntervalMs(999_999)).toBe(SPAWN_MIN_DELAY)
  })

  it('decai monotonicamente no meio da rampa', () => {
    const half = spawnIntervalMs(60_000)
    expect(half).toBeLessThan(SPAWN_START_DELAY)
    expect(half).toBeGreaterThan(SPAWN_MIN_DELAY)
  })

  it('respeita o limite simultâneo de zumbis', () => {
    expect(canSpawnZombie(MAX_SIMULTANEOUS_ZOMBIES - 1)).toBe(true)
    expect(canSpawnZombie(MAX_SIMULTANEOUS_ZOMBIES)).toBe(false)
  })

  it('encerra a partida na meta de vitória', () => {
    expect(hasWon(VICTORY_KILLS - 1)).toBe(false)
    expect(hasWon(VICTORY_KILLS)).toBe(true)
  })
})
