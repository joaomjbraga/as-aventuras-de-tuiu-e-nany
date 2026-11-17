import { afterEach, describe, expect, it, vi } from 'vitest'
import { installKeyboardState, isKeyPhysicallyDown } from '../../src/game/keyboardState'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('estado físico do teclado', () => {
  it('acompanha keydown/keyup/blur mesmo quando a cena está pausada', () => {
    const listeners = new Map<string, (event: { keyCode: number }) => void>()
    vi.stubGlobal('window', {
      addEventListener: (type: string, listener: (event: { keyCode: number }) => void) => {
        listeners.set(type, listener)
      },
    })

    installKeyboardState()
    expect(isKeyPhysicallyDown(39)).toBe(false)

    listeners.get('keydown')!({ keyCode: 39 })
    expect(isKeyPhysicallyDown(39)).toBe(true)

    listeners.get('keyup')!({ keyCode: 39 })
    expect(isKeyPhysicallyDown(39)).toBe(false)

    listeners.get('keydown')!({ keyCode: 39 })
    listeners.get('blur')!({ keyCode: 39 })
    expect(isKeyPhysicallyDown(39)).toBe(false)
  })
})
