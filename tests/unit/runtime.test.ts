import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDesktop, quitApp, toggleFullscreen } from '../../src/game/runtime'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Emula o preload do Electron (window.desktop presente) ou o navegador. */
function installDesktopBridge(quit = vi.fn(), toggleFullscreenBridge = vi.fn()): ReturnType<typeof vi.fn> {
  vi.stubGlobal('window', {
    desktop: { isElectron: true, platform: 'linux', quit, toggleFullscreen: toggleFullscreenBridge },
  })
  return quit
}

/** Emula o mínimo da Fullscreen API do DOM para testar o fallback web. */
function installDocument(fullscreenElement: unknown = null) {
  const requestFullscreen = vi.fn().mockResolvedValue(undefined)
  const exitFullscreen = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('document', {
    documentElement: { requestFullscreen },
    fullscreenElement,
    exitFullscreen,
  })
  return { requestFullscreen, exitFullscreen }
}

describe('detecção de runtime', () => {
  it('sem window (Node/vitest) não é desktop', () => {
    vi.stubGlobal('window', undefined)
    expect(isDesktop()).toBe(false)
  })

  it('sem a ponte desktop (navegador) não é desktop', () => {
    vi.stubGlobal('window', {})
    expect(isDesktop()).toBe(false)
  })

  it('com a ponte desktop (Electron) é desktop', () => {
    installDesktopBridge()
    expect(isDesktop()).toBe(true)
  })
})

describe('ação de sair', () => {
  it('não lança erro na web, onde não há ponte desktop', () => {
    vi.stubGlobal('window', {})
    expect(() => quitApp()).not.toThrow()
  })

  it('não lança erro em Node, onde não existe window', () => {
    vi.stubGlobal('window', undefined)
    expect(() => quitApp()).not.toThrow()
  })

  it('chama o quit do preload no desktop', () => {
    const quit = installDesktopBridge()
    quitApp()
    expect(quit).toHaveBeenCalledOnce()
  })
})

describe('tela cheia', () => {
  it('usa o IPC do desktop em vez da Fullscreen API', () => {
    const quit = vi.fn()
    const toggleFullscreenBridge = vi.fn()
    installDesktopBridge(quit, toggleFullscreenBridge)
    const dom = installDocument()

    toggleFullscreen()

    expect(toggleFullscreenBridge).toHaveBeenCalledOnce()
    expect(dom.requestFullscreen).not.toHaveBeenCalled()
  })

  it('entra em tela cheia na web quando nada está em fullscreen', () => {
    vi.stubGlobal('window', {})
    const dom = installDocument()

    toggleFullscreen()

    expect(dom.requestFullscreen).toHaveBeenCalledOnce()
    expect(dom.exitFullscreen).not.toHaveBeenCalled()
  })

  it('sai da tela cheia na web quando já há um elemento em fullscreen', () => {
    vi.stubGlobal('window', {})
    const dom = installDocument({})

    toggleFullscreen()

    expect(dom.exitFullscreen).toHaveBeenCalledOnce()
    expect(dom.requestFullscreen).not.toHaveBeenCalled()
  })
})
