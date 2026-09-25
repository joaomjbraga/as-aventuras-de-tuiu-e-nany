import { describe, expect, it } from 'vitest'
import { PICKUP_EFFECTS, pickupTextureKey, randomPickupKind, rollPickupDrop } from '../../src/game/powerups'

describe('rollPickupDrop', () => {
  it('derruba quando o roll é menor que a chance', () => {
    expect(rollPickupDrop(() => 0.001)).toBe(true)
    expect(rollPickupDrop(() => 0.99)).toBe(false)
  })
})

describe('itens disponíveis', () => {
  it('usa coração como único tipo de drop', () => {
    expect(randomPickupKind()).toBe('heart')
    expect(Object.keys(PICKUP_EFFECTS)).toEqual(['heart'])
  })

  it('usa a textura específica do coração', () => {
    expect(pickupTextureKey()).toBe('pickup-heart')
  })
})
