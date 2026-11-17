import { describe, expect, it } from 'vitest'
import {
  ZOMBIE_KNOCKBACK_MS,
  ZOMBIE_KNOCKBACK_SPEED,
  isKnockbackActive,
  knockbackDirection,
} from '../../src/game/knockback'

describe('knockback do zumbi', () => {
  it('empurra para o lado oposto a quem aplicou o dano', () => {
    expect(knockbackDirection(100, 80)).toBe(1)
    expect(knockbackDirection(100, 120)).toBe(-1)
    expect(knockbackDirection(100, 100)).toBe(1)
  })

  it('mantém o recuo ativo apenas durante a janela configurada', () => {
    const until = 1000
    expect(isKnockbackActive(999, until)).toBe(true)
    expect(isKnockbackActive(1000, until)).toBe(false)
    expect(ZOMBIE_KNOCKBACK_MS).toBe(180)
    expect(ZOMBIE_KNOCKBACK_SPEED).toBe(240)
  })
})
