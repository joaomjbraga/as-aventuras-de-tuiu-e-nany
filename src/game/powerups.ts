/**
 * Itens que caem de zumbis abatidos. O único drop disponível é o coração;
 * a chance continua configurável e o spawn de segurança permanece ativo.
 * Módulo sem Phaser para permanecer testável.
 */

export type PickupKind = 'heart'

export interface PickupEffect {
  kind: PickupKind
  label: string
  tint: number
}

export const PICKUP_DROP_CHANCE = 0.12
export const PICKUP_SAFETY_INTERVAL_MS = 60_000

export const PICKUP_EFFECTS: Record<PickupKind, PickupEffect> = {
  heart: { kind: 'heart', label: 'VIDA +1', tint: 0xff4d5d },
}

/** O abate derruba um item? (roll independente por abate). */
export function rollPickupDrop(rng: () => number = Math.random): boolean {
  return rng() < PICKUP_DROP_CHANCE
}

/** Todos os drops usam coração; o retorno fica explícito para o fluxo de gameplay. */
export function randomPickupKind(): PickupKind {
  return 'heart'
}

/** Chave da textura do coração usada no mundo. */
export function pickupTextureKey(): string {
  return 'pickup-heart'
}
