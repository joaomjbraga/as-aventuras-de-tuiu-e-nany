/**
 * Regras puras de dificuldade e progressão da partida.
 * Módulo sem dependência de Phaser para ser testável via Vitest.
 */

/** Número de zumbis derrotados que encerra a partida com vitória. */
export const VICTORY_KILLS = 20

/** Limite de zumbis simultâneos na arena. */
export const MAX_SIMULTANEOUS_ZOMBIES = 12

/** Intervalo inicial de spawn (ms). */
export const SPAWN_START_DELAY = 2600

/** Intervalo mínimo (ms) ao qual a dificuldade converge. */
export const SPAWN_MIN_DELAY = 500

/** Duração da rampa completa da dificuldade (ms). */
export const DIFFICULTY_RAMP_MS = 120_000

/** Intervalo de spawn atual dado o tempo de partida decorrido (ms). */
export function spawnIntervalMs(elapsedMs: number): number {
  const progress = Math.min(1, Math.max(0, elapsedMs / DIFFICULTY_RAMP_MS))
  return Math.round(SPAWN_START_DELAY - progress * (SPAWN_START_DELAY - SPAWN_MIN_DELAY))
}

/** Permite spawnar mais um zumbi? Respeita o limite simultâneo. */
export function canSpawnZombie(activeZombies: number): boolean {
  return activeZombies < MAX_SIMULTANEOUS_ZOMBIES
}

/** Atingiu a condição de vitória? */
export function hasWon(kills: number): boolean {
  return kills >= VICTORY_KILLS
}
