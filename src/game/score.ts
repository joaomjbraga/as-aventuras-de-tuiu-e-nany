/**
 * Regras puras de placar/combo da partida (sem Phaser → testável).
 *
 * A cada abate sem levar dano o combo cresce e o multiplicador de pontos
 * sobe (x1, x2, x3, ...), limitado por MAX_MULTIPLIER. Levar dano zera o
 * combo (volta para x1).
 */

/** Maior multiplicador possível de pontos. */
export const MAX_MULTIPLIER = 10

/**
 * Multiplicador dado uma sequência de abates consecutivos sem dano.
 * x1 com combo 0; sobe 1 por abate, com teto em MAX_MULTIPLIER.
 */
export function multiplierFor(combo: number): number {
  return Math.min(Math.max(1, combo + 1), MAX_MULTIPLIER)
}

/** Pontos que um abate vale com o multiplicador atual (kills × mult). */
export function scoreOfKill(multiplier: number): number {
  return Math.max(1, multiplier)
}
