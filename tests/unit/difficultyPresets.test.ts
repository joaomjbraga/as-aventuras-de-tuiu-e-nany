import { describe, expect, it } from 'vitest'
import { LEVELS } from '../../src/game/levels'
import {
  MATCH_DIFFICULTY_PRESETS,
  getMatchDifficulty,
  resolveLevelForDifficulty,
} from '../../src/game/difficultyPresets'

const baseLevel = LEVELS[0]

describe('dificuldade da partida', () => {
  it('oferece os três níveis esperados', () => {
    expect(MATCH_DIFFICULTY_PRESETS.map((preset) => preset.id)).toEqual(['easy', 'medium', 'hard'])
    expect(MATCH_DIFFICULTY_PRESETS.map((preset) => preset.name)).toEqual(['FÁCIL', 'MÉDIO', 'DIFÍCIL'])
  })

  it('mantém o nível médio abaixo da pressão da base e acima do fácil', () => {
    const easy = resolveLevelForDifficulty(baseLevel, 'easy')
    const medium = resolveLevelForDifficulty(baseLevel, 'medium')

    expect(medium.enemySpeed).toBeLessThan(110)
    expect(medium.enemySpeed).toBeGreaterThan(easy.enemySpeed)
    expect(medium.difficulty.maxSimultaneousZombies).toBeLessThan(baseLevel.difficulty.maxSimultaneousZombies)
    expect(medium.difficulty.spawnStartDelay).toBeGreaterThan(baseLevel.difficulty.spawnStartDelay)
    expect(medium.victoryKills).toBeLessThan(baseLevel.victoryKills)
    expect(medium.boss?.hp).toBeLessThan(baseLevel.boss?.hp ?? 0)
  })

  it('suaviza inimigos e meta no fácil', () => {
    const resolved = resolveLevelForDifficulty(baseLevel, 'easy')

    expect(resolved.enemySpeed).toBeLessThan(110)
    expect(resolved.difficulty.maxSimultaneousZombies).toBeLessThan(baseLevel.difficulty.maxSimultaneousZombies)
    expect(resolved.difficulty.spawnStartDelay).toBeGreaterThan(baseLevel.difficulty.spawnStartDelay)
    expect(resolved.victoryKills).toBeLessThan(baseLevel.victoryKills)
    expect(resolved.boss?.hp).toBeLessThan(baseLevel.boss?.hp ?? 0)
  })

  it('aumenta pressão e resistência no difícil', () => {
    const resolved = resolveLevelForDifficulty(baseLevel, 'hard')

    expect(resolved.enemySpeed).toBeGreaterThan(110)
    expect(resolved.difficulty.maxSimultaneousZombies).toBeGreaterThan(baseLevel.difficulty.maxSimultaneousZombies)
    expect(resolved.difficulty.spawnStartDelay).toBeLessThan(baseLevel.difficulty.spawnStartDelay)
    expect(resolved.victoryKills).toBeGreaterThan(baseLevel.victoryKills)
    expect(resolved.boss?.hp).toBeGreaterThan(baseLevel.boss?.hp ?? 0)
  })

  it('faz fallback para médio quando recebe id desconhecido em tempo de execução', () => {
    expect(getMatchDifficulty('inexistente' as never).id).toBe('medium')
  })
})
