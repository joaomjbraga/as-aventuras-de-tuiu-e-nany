import { describe, expect, it } from 'vitest'
import { MAX_MULTIPLIER, multiplierFor, scoreOfKill } from '../../src/game/score'

describe('multiplierFor', () => {
  it('começa em x1 sem combo', () => {
    expect(multiplierFor(0)).toBe(1)
  })

  it('sobe 1 a cada abate consecutivo', () => {
    expect(multiplierFor(1)).toBe(2)
    expect(multiplierFor(2)).toBe(3)
    expect(multiplierFor(5)).toBe(6)
  })

  it('respeita o teto do multiplicador', () => {
    expect(multiplierFor(MAX_MULTIPLIER - 1)).toBe(MAX_MULTIPLIER)
    expect(multiplierFor(50)).toBe(MAX_MULTIPLIER)
  })

  it('nunca cai abaixo de x1', () => {
    expect(multiplierFor(-1)).toBe(1)
  })
})

describe('scoreOfKill', () => {
  it('vale o multiplicador (>= 1)', () => {
    expect(scoreOfKill(3)).toBe(3)
    expect(scoreOfKill(0)).toBe(1)
  })
})
