import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MUSIC_VOLUME, STORAGE_KEYS, loadMusicVolume, saveMusicVolume } from '../../src/game/storage'

function installLocalStorage(initial: Record<string, string> = {}): Map<string, string> {
  const values = new Map(Object.entries(initial))
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
  vi.stubGlobal('localStorage', storage)
  return values
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('volume da música', () => {
  it('usa 40% quando não existe preferência salva', () => {
    installLocalStorage()
    expect(loadMusicVolume()).toBe(DEFAULT_MUSIC_VOLUME)
  })

  it('salva e recupera o volume', () => {
    const values = installLocalStorage()
    saveMusicVolume(0.7)

    expect(values.get(STORAGE_KEYS.MUSIC_VOLUME)).toBe('0.7')
    expect(loadMusicVolume()).toBe(0.7)
  })

  it('limita o volume entre 0% e 100%', () => {
    installLocalStorage()

    saveMusicVolume(2)
    expect(loadMusicVolume()).toBe(1)

    saveMusicVolume(-1)
    expect(loadMusicVolume()).toBe(0)
  })

  it('arredonda preferências com casas decimais extras', () => {
    installLocalStorage({ [STORAGE_KEYS.MUSIC_VOLUME]: '0.456' })
    expect(loadMusicVolume()).toBe(0.46)
  })
})
