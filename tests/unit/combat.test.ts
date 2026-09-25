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

function makePlayer(overrides: Partial<{ x: number; feetY: number; isAirborne: boolean; velocityY: number }> = {}) {
  return {
    x: 150,
    feetY: 126,
    isAirborne: true,
    velocityY: 120,
    ...overrides,
  }
}

describe('resolvePlayerZombieContact', () => {
  it('pisão mata o zumbi quando o stomp destrói o alvo', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer(), zombie)).toBe('stomp-kill')
  })

  it('pisão sem morte vira apenas um quique (cooldown do zumbi)', () => {
    const zombie = makeZombie({ stomp: () => false })
    expect(resolvePlayerZombieContact(makePlayer(), zombie)).toBe('stomp')
  })

  it('pulo normal descendo sobre o zumbi causa pisão, não dano ao jogador', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 180, velocityY: 240 }), zombie)).toBe('stomp-kill')
  })

  it('pés dentro da margem de 20% acima do centro ainda contam como pisão', () => {
    const zombie = makeZombie()
    const zombieCenterY = zombie.headY + zombie.spriteHeight / 2
    const tolerance = Math.round(zombie.spriteHeight * 0.2)
    expect(resolvePlayerZombieContact(makePlayer({ feetY: zombieCenterY + tolerance }), zombie)).toBe('stomp')
  })

  it('contato lateral durante a descida causa dano ao jogador', () => {
    const zombie = makeZombie()
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 240 }), zombie)).toBe('hit')
  })

  it('contato no chão continua causando dano ao jogador', () => {
    const zombie = makeZombie()
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 180, isAirborne: false, velocityY: 0 }), zombie)).toBe('hit')
  })

  it('jogador subindo não pisa nem causa dano ao jogador', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 180, velocityY: -120 }), zombie)).toBe('falling')
  })

  it('jogador subindo com velocidade leve também não gera pisão', () => {
    const zombie = makeZombie({ stomp: () => true })
    expect(resolvePlayerZombieContact(makePlayer({ feetY: 120, velocityY: -30 }), zombie)).toBe('falling')
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
    resolvePlayerZombieContact(makePlayer({ x: 42, feetY: 180 }), zombie)
    expect(calls).toEqual([{ fromX: 42, amount: 4 }])
  })
})

describe('stompDamage', () => {
  it('pisão normal causa 2 de dano em um zumbi com 3 de vida', () => {
    expect(stompDamage({ doubleJump: false, targetHp: 3 })).toBe(2)
  })

  it('zumbi comum sobrevive ao pisão normal e é derrotado de primeira pelo pisão duplo', () => {
    const zombieHp = 3
    const afterNormalStomp = zombieHp - stompDamage({ doubleJump: false, targetHp: zombieHp })
    const afterDoubleStomp = zombieHp - stompDamage({ doubleJump: true, targetHp: zombieHp })

    expect(afterNormalStomp).toBe(1)
    expect(afterDoubleStomp).toBe(0)
  })

  it('pisão normal retira o último HP de um zumbi já ferido', () => {
    expect(stompDamage({ doubleJump: false, targetHp: 1 })).toBe(1)
  })

  it('queda após o pulo duplo causa 3 de dano', () => {
    expect(stompDamage({ doubleJump: true, targetHp: 3 })).toBe(3)
  })
})
