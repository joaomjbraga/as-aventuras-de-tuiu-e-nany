import type { LevelConfig } from './levels'
import { DEFAULT_ZOMBIE_SPEED, type DifficultyParams } from './difficulty'

export type MatchDifficultyId = 'easy' | 'medium' | 'hard'

export interface MatchDifficultyPreset {
  id: MatchDifficultyId
  name: string
  description: string
  color: number
  enemySpeedMultiplier: number
  maxZombiesMultiplier: number
  spawnDelayMultiplier: number
  spawnMinDelayMultiplier: number
  rampMultiplier: number
  victoryKillsMultiplier: number
  bossHpMultiplier: number
  bossMoveSpeedMultiplier: number
}

export const MATCH_DIFFICULTY_PRESETS: readonly MatchDifficultyPreset[] = [
  {
    id: 'easy',
    name: 'FÁCIL',
    description: 'Mais tempo para reagir e menos pressão.',
    color: 0x7bed9f,
    enemySpeedMultiplier: 0.82,
    maxZombiesMultiplier: 0.75,
    spawnDelayMultiplier: 1.35,
    spawnMinDelayMultiplier: 1.4,
    rampMultiplier: 1.3,
    victoryKillsMultiplier: 0.8,
    bossHpMultiplier: 0.7,
    bossMoveSpeedMultiplier: 0.8,
  },
  {
    id: 'medium',
    name: 'MÉDIO',
    description: 'O equilíbrio padrão da aventura.',
    color: 0x8fd8ff,
    enemySpeedMultiplier: 0.9,
    maxZombiesMultiplier: 0.9,
    spawnDelayMultiplier: 1.12,
    spawnMinDelayMultiplier: 1.1,
    rampMultiplier: 1.1,
    victoryKillsMultiplier: 0.9,
    bossHpMultiplier: 0.85,
    bossMoveSpeedMultiplier: 0.9,
  },
  {
    id: 'hard',
    name: 'DIFÍCIL',
    description: 'Mais inimigos, menos tempo e bosses resistentes.',
    color: 0xffb74d,
    enemySpeedMultiplier: 1.15,
    maxZombiesMultiplier: 1.15,
    spawnDelayMultiplier: 0.82,
    spawnMinDelayMultiplier: 0.78,
    rampMultiplier: 0.8,
    victoryKillsMultiplier: 1.15,
    bossHpMultiplier: 1.35,
    bossMoveSpeedMultiplier: 1.15,
  },
] as const

export const DEFAULT_MATCH_DIFFICULTY: MatchDifficultyId = 'medium'

export function getMatchDifficulty(id: MatchDifficultyId): MatchDifficultyPreset {
  return MATCH_DIFFICULTY_PRESETS.find((preset) => preset.id === id) ?? MATCH_DIFFICULTY_PRESETS[1]
}

export interface ResolvedMatchLevel extends LevelConfig {
  enemySpeed: number
}

function scale(value: number, multiplier: number, minimum = 1): number {
  return Math.max(minimum, Math.round(value * multiplier))
}

/** Aplica o preset escolhido à configuração base da fase. */
export function resolveLevelForDifficulty(level: LevelConfig, difficultyId: MatchDifficultyId): ResolvedMatchLevel {
  const preset = getMatchDifficulty(difficultyId)
  const difficulty: DifficultyParams = {
    maxSimultaneousZombies: scale(level.difficulty.maxSimultaneousZombies, preset.maxZombiesMultiplier),
    spawnStartDelay: scale(level.difficulty.spawnStartDelay, preset.spawnDelayMultiplier, 100),
    spawnMinDelay: scale(level.difficulty.spawnMinDelay, preset.spawnMinDelayMultiplier, 100),
    difficultyRampMs: scale(level.difficulty.difficultyRampMs, preset.rampMultiplier, 1000),
  }

  return {
    ...level,
    victoryKills: scale(level.victoryKills, preset.victoryKillsMultiplier),
    difficulty,
    boss: level.boss
      ? {
          ...level.boss,
          hp: scale(level.boss.hp, preset.bossHpMultiplier),
          moveSpeed: scale(level.boss.moveSpeed ?? 60, preset.bossMoveSpeedMultiplier),
        }
      : undefined,
    enemySpeed: Math.round(DEFAULT_ZOMBIE_SPEED * preset.enemySpeedMultiplier),
  }
}
