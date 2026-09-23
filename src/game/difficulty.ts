/**
 * Regras puras de dificuldade e progressão da partida.
 * Módulo sem dependência de Phaser para ser testável via Vitest.
 *
 * Os valores padrão descrevem a fase "Casa" (nível 1). Cada fase pode
 * fornecer seu próprio `DifficultyParams` via `levels.ts`.
 */

/** Parâmetros de dificuldade de uma fase (spawn + limite de inimigos). */
export interface DifficultyParams {
  /** Limite de zumbis simultâneos na arena. */
  maxSimultaneousZombies: number
  /** Intervalo inicial de spawn (ms). */
  spawnStartDelay: number
  /** Intervalo mínimo (ms) ao qual a dificuldade converge. */
  spawnMinDelay: number
  /** Duração da rampa completa da dificuldade (ms). */
  difficultyRampMs: number
}

/** Dificuldade padrão (fase "Casa"). */
export const DEFAULT_DIFFICULTY: DifficultyParams = {
  maxSimultaneousZombies: 12,
  spawnStartDelay: 2600,
  spawnMinDelay: 500,
  difficultyRampMs: 120_000,
}

/** Número de zumbis que encerra a fase com vitória (padrão da "Casa"). */
export const VICTORY_KILLS = 20

/** Aliases para a dificuldade padrão (mantidos por compatibilidade/leitura). */
export const MAX_SIMULTANEOUS_ZOMBIES = DEFAULT_DIFFICULTY.maxSimultaneousZombies
export const SPAWN_START_DELAY = DEFAULT_DIFFICULTY.spawnStartDelay
export const SPAWN_MIN_DELAY = DEFAULT_DIFFICULTY.spawnMinDelay
export const DIFFICULTY_RAMP_MS = DEFAULT_DIFFICULTY.difficultyRampMs

/** Intervalo de spawn atual dado o tempo decorrido de partida (ms). */
export function spawnIntervalMs(elapsedMs: number, params: DifficultyParams = DEFAULT_DIFFICULTY): number {
  const progress = Math.min(1, Math.max(0, elapsedMs / params.difficultyRampMs))
  return Math.round(params.spawnStartDelay - progress * (params.spawnStartDelay - params.spawnMinDelay))
}

/** Permite spawnar mais um zumbi? Respeita o limite simultâneo da fase. */
export function canSpawnZombie(activeZombies: number, max = DEFAULT_DIFFICULTY.maxSimultaneousZombies): boolean {
  return activeZombies < max
}

/** Atingiu a condição de vitória da fase? */
export function hasWon(kills: number, target = VICTORY_KILLS): boolean {
  return kills >= target
}
