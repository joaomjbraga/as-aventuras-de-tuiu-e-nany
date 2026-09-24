const MOBILE_DEVICE_CLASS = 'mobile-device'
const MOBILE_PORTRAIT_CLASS = 'mobile-portrait'

interface LockableScreenOrientation extends ScreenOrientation {
  lock?: (orientation: 'landscape') => Promise<void>
}

/** Detecta celulares e tablets sem classificar desktop touchscreen como mobile. */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isStandaloneMobileApp(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIosBrowser(): boolean {
  return isIosDevice() && !isStandaloneMobileApp()
}

/** Mantém classes CSS sincronizadas com o dispositivo e a orientação atual. */
export function setupMobileViewport(): void {
  if (typeof window === 'undefined') return

  const updateViewportClasses = (): void => {
    const root = document.documentElement
    const mobile = isTouchDevice()
    root.classList.toggle(MOBILE_DEVICE_CLASS, mobile)
    root.classList.toggle(MOBILE_PORTRAIT_CLASS, mobile && window.innerHeight > window.innerWidth)
    root.classList.toggle('mobile-ios-browser', isIosBrowser())
  }

  updateViewportClasses()
  window.addEventListener('resize', updateViewportClasses)
  window.addEventListener('orientationchange', updateViewportClasses)
}

/**
 * Solicita o modo imersivo durante um gesto do usuário.
 * O bloqueio landscape é opcional porque Safari/iOS pode não expô-lo.
 */
export async function enterMobileFullscreen(): Promise<boolean> {
  if (!isTouchDevice()) return false

  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    }
  } catch {
    // Alguns navegadores bloqueiam fullscreen fora de uma interação elegível.
  }

  try {
    const orientation = screen.orientation as LockableScreenOrientation | undefined
    if (orientation?.lock) {
      await orientation.lock('landscape')
    }
  } catch {
    // O overlay de orientação cobre navegadores sem suporte ao lock.
  }

  return document.fullscreenElement !== null || isStandaloneMobileApp() || window.innerWidth > window.innerHeight
}
