/**
 * Constantes de layout compartilhadas pelo jogo (viewport, chão, spawns).
 * Mantidas em módulo puro (sem Phaser) para serem testáveis via Vitest.
 */

/** Altura da faixa de chão (terra verde) em px, a partir da base do viewport. */
export const GROUND_HEIGHT = 96

/** Margem de segurança horizontal dos spawns de jogadores (frações da largura). */
export const PLAYER_SPAWN_X_FACTORS = { p1: 0.15, p2: 0.85 } as const

/** Linha superior do chão (y local onde o sprite deve ficar parado). */
export function groundTopFor(height: number): number {
  return height - GROUND_HEIGHT
}

/** Centro vertical de um corpo de altura `bodyHeight` apoiado em `groundTop`. */
export function groundCenterYFor(groundTop: number, bodyHeight: number): number {
  return groundTop - bodyHeight / 2
}

/** X de spawn horizontal de um jogador (P1 à esquerda, P2 à direita). */
export function spawnXFor(width: number, index: number): number {
  const factor = index === 0 ? PLAYER_SPAWN_X_FACTORS.p1 : PLAYER_SPAWN_X_FACTORS.p2
  return width * factor
}
