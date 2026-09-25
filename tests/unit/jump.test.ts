import { describe, expect, it } from 'vitest'
import { canTriggerDoubleJump, doubleJumpVelocityY, isNewJumpPress, resolveJumpAction } from '../../src/game/jump'

describe('isNewJumpPress', () => {
  it('reconhece uma nova pressão da tecla', () => {
    expect(isNewJumpPress(false, true)).toBe(true)
  })

  it('ignora a tecla que continua segurada', () => {
    expect(isNewJumpPress(true, true)).toBe(false)
  })

  it('não considera a soltura da tecla como uma pressão', () => {
    expect(isNewJumpPress(true, false)).toBe(false)
  })
})

describe('resolveJumpAction', () => {
  it('dispara o primeiro pulo no chão', () => {
    expect(
      resolveJumpAction({
        isGrounded: true,
        justPressed: true,
        jumpsUsed: 0,
        maxJumps: 2,
      }),
    ).toBe('first')
  })

  it('não consome o pulo duplo enquanto a tecla permanece segurada', () => {
    expect(
      resolveJumpAction({
        isGrounded: false,
        justPressed: false,
        jumpsUsed: 1,
        maxJumps: 2,
      }),
    ).toBe('none')
  })

  it('dispara o pulo duplo após soltar e pressionar a tecla novamente', () => {
    expect(
      resolveJumpAction({
        isGrounded: false,
        justPressed: true,
        jumpsUsed: 1,
        maxJumps: 2,
      }),
    ).toBe('double')
  })

  it('não marca um salto normal como duplo quando a tecla fica segurada', () => {
    let wasDown = false
    let jumpsUsed = 0
    const update = (isDown: boolean, isGrounded: boolean) => {
      const justPressed = isNewJumpPress(wasDown, isDown)
      wasDown = isDown
      const action = resolveJumpAction({ isGrounded, justPressed, jumpsUsed, maxJumps: 2 })
      if (action !== 'none') jumpsUsed += 1
      return { action, jumpsUsed }
    }

    expect(update(true, true)).toEqual({ action: 'first', jumpsUsed: 1 })
    expect(update(true, false)).toEqual({ action: 'none', jumpsUsed: 1 })
    expect(update(false, false)).toEqual({ action: 'none', jumpsUsed: 1 })
    expect(update(true, false)).toEqual({ action: 'double', jumpsUsed: 2 })
  })

  it('não permite um terceiro pulo', () => {
    expect(
      resolveJumpAction({
        isGrounded: false,
        justPressed: true,
        jumpsUsed: 2,
        maxJumps: 2,
      }),
    ).toBe('none')
  })
})

describe('ajuste do pulo duplo', () => {
  it('aguarda a subida desacelerar antes de executar o segundo pulo', () => {
    expect(canTriggerDoubleJump(-900, 300)).toBe(false)
    expect(canTriggerDoubleJump(-300, 300)).toBe(true)
    expect(canTriggerDoubleJump(200, 300)).toBe(true)
  })

  it('usa um impulso curto no segundo pulo', () => {
    expect(doubleJumpVelocityY(-100, 520)).toBe(-520)
  })

  it('não aumenta uma velocidade de subida que já é mais forte', () => {
    expect(doubleJumpVelocityY(-900, 520)).toBe(-900)
  })
})
