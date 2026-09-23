import { describe, expect, it } from 'vitest'
import {
  PICKUP_EFFECTS,
  PICKUP_WEIGHTS,
  randomPickupKind,
  rollPickupDrop,
  pickupTextureKey,
} from '../../src/game/powerups'

describe('rollPickupDrop', () => {
  it('derruba quando o roll é menor que a chance', () => {
    expect(rollPickupDrop(() => 0.001)).toBe(true)
    expect(rollPickupDrop(() => 0.99)).toBe(false)
  })
})

describe('randomPickupKind', () => {
  it('sorteia o primeiro pela fronteira do peso', () => {
    expect(randomPickupKind(() => 0.0)).toBe('heart')
  })

  it('respeita as fronteiras acumuladas dos pesos', () => {
    const total = Object.values(PICKUP_WEIGHTS).reduce((s, w) => s + w, 0)
    const kinds = Object.keys(PICKUP_WEIGHTS) as (keyof typeof PICKUP_WEIGHTS)[]
    let acc = 0
    kinds.forEach((kind, i) => {
      const before = acc / total
      acc += PICKUP_WEIGHTS[kind]
      const edge = acc / total - 0.0001
      expect(randomPickupKind(() => (i === kinds.length - 1 ? edge : (before + edge) / 2))).toBe(kind)
    })
  })

  it('sempre devolve um dos kinds conhecidos', () => {
    for (let i = 0; i < 50; i++) {
      expect(Object.keys(PICKUP_EFFECTS)).toContain(randomPickupKind(() => i / 50))
    }
  })
})

describe('pickupTextureKey', () => {
  it('coração reusa a textura do HUD', () => {
    expect(pickupTextureKey('heart')).toBe('pickup-heart')
  })
  it('demais usam o prefixo power-', () => {
    expect(pickupTextureKey('shield')).toBe('power-shield')
    expect(pickupTextureKey('speed')).toBe('power-speed')
    expect(pickupTextureKey('double')).toBe('power-double')
  })
})
