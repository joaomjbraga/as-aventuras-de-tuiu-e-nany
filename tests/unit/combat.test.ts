import { describe, expect, it } from 'vitest'
import { resolvePlayerZombieContact, stompDamage, type ZombieContactTarget } from '../../src/game/combat'

function makeZombie(overrides: Partial<ZombieContactTarget> = {}): ZombieContactTarget {
  return {
    isDying: false,
    x: 180,
    headY: 130,
    spriteHeight: 128,
    damageAmount: 2,
    stomp: () => false,
    ...overrides,
  }
}

function makePlayer(overrides: Partial<{ x: number; feetY: number; velocityY: number }> = {}) {
  return {
    x: 150,
    feetY: 126,
    velocityY: 0,
    ...overrides,
  }
}

describe('resolvePlayerZombieContact', () => {
  it('pisão mata o zumbi quando o stomp destrói o alvo', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 130 }), zombie)).toBe('stomp-kill')
  })

  it('pisão sem morte vira apenas um quique (cooldown do zumbi)', () => {
    const zombie = makeZombie({ stomp: () => false })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 130 }), zombie)).toBe('stomp')
  })

  it('pés dentro da margem de tolerância (20% da altura) ainda contam como pisão', () => {
    const zombie = makeZombie()
    // spriteHeight 128 → tolerance = 26
    expect(resolvePlayerZombieContact(makePlayer({ feetY: zombie.headY + 26 }), zombie)).toBe('stomp')
  })

  it('contato lateral (pés abaixo da cabeça) causa dano ao jogador', () => {
    const zombie = makeZombie()
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 160 }), zombie)).toBe('hit')
  })

  it('jogador subindo rápido não se machuca em contato lateral', () => {
    const zombie = makeZombie()
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 160, velocityY: -120 }), zombie)).toBe('falling')
  })

  it('jogador subindo rápido demais não pisa nem se machuca (passa por cima)', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 100, velocityY: -240 }), zombie)).toBe('falling')
  })

  it('pés recém saídos do chão com subida leve ainda pisa', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 120, velocityY: -30 }), zombie)).toBe('stomp-kill')
  })

  it('zumbi morrendo não interage', () => {
    const zombie = makeZombie({ isDying: true, stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer(), zombie)).toBe('dead')
  })

  it('stomp recebe o dano configurado e a posição X do jogador', () => {
    const calls: Array<{ fromX: number; amount: number }> = []
    const zombie = makeZombie({
      damageAmount: 4,
      stomp: (fromX, amount) => {
        calls.push({ fromX, amount })
        return true
      },
    })
    resolvePlayerZombieContact(makePlayer({ x: 42, feetY: 120 }), zombie)
    expect(calls).toEqual([{ fromX: 42, amount: 4 }])
  })
})

describe('stompDamage', () => {
  it('pisão normal causa 2 de dano (zumbi padrão de 3 de vida morre em 2 pisões)', () => {
    expect(stompDamage({ damageBoost: false, doubleJump: false })).toBe(2)
  })

  it('pisão com power-up de dano causa 4', () => {
    expect(stompDamage({ damageBoost: true, doubleJump: false })).toBe(4)
  })

  it('queda após o pulo duplo causa mais dano que o normal (+50%)', () => {
    expect(stompDamage({ damageBoost: false, doubleJump: true })).toBe(3)
  })

  it('queda após o pulo duplo com power-up de dano causa 6', () => {
    expect(stompDamage({ damageBoost: true, doubleJump: true })).toBe(6)
  })
})