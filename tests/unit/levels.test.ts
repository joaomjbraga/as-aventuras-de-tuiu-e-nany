import { describe, expect, it } from 'vitest'
import {
  HOUSE_LEVEL_ID,
  LEVELS,
  allLevelsCompleted,
  getLevel,
  nextLevel,
  pickRandomLevel,
  randomNextLevel,
  type LevelConfig,
} from '../../src/game/levels'

const fakePool: LevelConfig[] = [
  {
    id: 'a',
    name: 'A',
    art: { image: 'a.jpg' },
    fogColor: 3,
    victoryKills: 5,
    difficulty: { maxSimultaneousZombies: 2, spawnStartDelay: 100, spawnMinDelay: 10, difficultyRampMs: 1000 },
  },
  {
    id: 'b',
    name: 'B',
    art: { image: 'b.jpg' },
    fogColor: 3,
    victoryKills: 5,
    difficulty: { maxSimultaneousZombies: 2, spawnStartDelay: 100, spawnMinDelay: 10, difficultyRampMs: 1000 },
  },
  {
    id: 'c',
    name: 'C',
    art: { image: 'c.jpg' },
    fogColor: 3,
    victoryKills: 5,
    difficulty: { maxSimultaneousZombies: 2, spawnStartDelay: 100, spawnMinDelay: 10, difficultyRampMs: 1000 },
  },
]

describe('levels', () => {
  it('campanha é zerada somente quando todas as fases foram concluídas', () => {
    const allIds = LEVELS.map((level) => level.id)
    expect(allLevelsCompleted([])).toBe(false)
    expect(allLevelsCompleted(allIds.slice(0, -1))).toBe(false)
    expect(allLevelsCompleted(allIds)).toBe(true)
  })

  it('sempre há pelo menos uma fase registrada', () => {
    expect(LEVELS.length).toBeGreaterThan(0)
  })

  it('fases possuem ids únicos', () => {
    const ids = LEVELS.map((level) => level.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('a pressão dos inimigos aumenta progressivamente entre as fases', () => {
    expect(LEVELS.map((level) => level.difficulty.maxSimultaneousZombies)).toEqual([14, 16, 18, 20])
    expect(LEVELS.map((level) => level.difficulty.spawnStartDelay)).toEqual([2200, 1900, 1600, 1400])
    expect(LEVELS.map((level) => level.difficulty.spawnMinDelay)).toEqual([400, 350, 300, 250])
    expect(LEVELS.map((level) => level.difficulty.difficultyRampMs)).toEqual([100_000, 90_000, 80_000, 70_000])
  })

  it('bosses têm vida crescente e exigem múltiplos pisões duplos', () => {
    const bossHp = LEVELS.map((level) => level.boss?.hp ?? 0)
    const doubleStompsRequired = bossHp.map((hp) => Math.ceil(hp / 3))

    expect(bossHp).toEqual([28, 36, 48, 60])
    expect(doubleStompsRequired).toEqual([10, 12, 16, 20])
    expect(LEVELS.map((level) => level.boss?.moveSpeed ?? 0)).toEqual([60, 68, 76, 84])
  })

  it('resolve id conhecido e cai na primeira fase para id desconhecido', () => {
    expect(getLevel(HOUSE_LEVEL_ID).id).toBe(HOUSE_LEVEL_ID)
    expect(getLevel('nao-existe').id).toBe(LEVELS[0].id)
  })

  it('a última fase não tem próxima', () => {
    expect(nextLevel(LEVELS[LEVELS.length - 1])).toBeNull()
  })

  it('retorna a fase seguinte na ordem da campanha', () => {
    for (let i = 0; i < LEVELS.length - 1; i++) {
      expect(nextLevel(LEVELS[i])?.id).toBe(LEVELS[i + 1].id)
    }
  })

  it('sorteia outra fase sem repetir a atual (primeiro item)', () => {
    const picked = pickRandomLevel(fakePool[0], fakePool, () => 0)
    expect(picked).not.toBeNull()
    expect(['b', 'c']).toContain(picked!.id)
  })

  it('sorteia outra fase sem repetir a atual (último item)', () => {
    const picked = pickRandomLevel(fakePool[2], fakePool, () => 0.99)
    expect(['a', 'b']).toContain(picked!.id)
  })

  it('retorna null quando não há outra fase para sortear', () => {
    const singlePool = [fakePool[0]]
    expect(pickRandomLevel(singlePool[0], singlePool)).toBeNull()
    // Com múltiplas fases, o avanço aleatório pode retornar outra fase.
    const picked = randomNextLevel(LEVELS[0])
    expect(picked).not.toBeNull()
    expect(picked!.id).not.toBe(LEVELS[0].id)
  })
})
