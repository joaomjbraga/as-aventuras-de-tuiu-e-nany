/**
 * Power-ups que caem de zumbis abatidos (drop com chance configurável)
 * e, como segurança, spawnam periodicamente se não houver drop há um tempo.
 * Módulo sem Phaser (testável).
 */

export type PickupKind = 'heart' | 'shield' | 'speed' | 'double'

export interface PickupEffect {
  kind: PickupKind
  label: string
  /** Duração dos efeitos temporizados (shield/speed/double); coração é instantâneo. */
  durationMs?: number
  /** Cor aplicada à textura branca (tint). */
  tint: number
}

export const PICKUP_DROP_CHANCE = 0.12
export const PICKUP_SAFETY_INTERVAL_MS = 60_000
export const PICKUP_EFFECT_DURATION_MS = 12000

/** Peso de cada power-up no sorteio de drop. */
export const PICKUP_WEIGHTS: Record<PickupKind, number> = {
  heart: 35,
  shield: 25,
  speed: 20,
  double: 20,
}

export const PICKUP_EFFECTS: Record<PickupKind, PickupEffect> = {
  heart: { kind: 'heart', label: 'VIDA +1', tint: 0xff4d5d },
  shield: { kind: 'shield', label: 'ESCUDO', durationMs: PICKUP_EFFECT_DURATION_MS, tint: 0x53c1ff },
  speed: { kind: 'speed', label: 'VELOZ', durationMs: PICKUP_EFFECT_DURATION_MS, tint: 0xffe066 },
  double: { kind: 'double', label: 'DANO x2', durationMs: PICKUP_EFFECT_DURATION_MS, tint: 0xff7fd0 },
}

/** O abate derruba um power-up? (roll independente por abate). */
export function rollPickupDrop(rng: () => number = Math.random): boolean {
  return rng() < PICKUP_DROP_CHANCE
}

/** Sorteia um power-up pelos pesos configurados. */
export function randomPickupKind(rng: () => number = Math.random): PickupKind {
  const total = Object.values(PICKUP_WEIGHTS).reduce((sum, w) => sum + w, 0)
  const roll = rng() * total
  let acc = 0
  for (const [kind, weight] of Object.entries(PICKUP_WEIGHTS) as [PickupKind, number][]) {
    acc += weight
    if (roll < acc) return kind
  }
  return 'heart'
}

/** Chave da textura de cada power-up (cor aplicada por tint no uso). */
export function pickupTextureKey(kind: PickupKind): string {
  return kind === 'heart' ? 'pickup-heart' : `power-${kind}`
}
