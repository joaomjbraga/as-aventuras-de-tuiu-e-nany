/** Regras puras do recuo aplicado a zumbis quando levam um pisão. */

export const ZOMBIE_KNOCKBACK_SPEED = 240
export const ZOMBIE_KNOCKBACK_MS = 180

/** Direção para longe de quem aplicou o dano (nunca zero). */
export function knockbackDirection(sourceX: number, fromX: number): 1 | -1 {
  return Math.sign(sourceX - fromX) === -1 ? -1 : 1
}

/** O recuo ainda está ativo? */
export function isKnockbackActive(now: number, until: number): boolean {
  return now < until
}
