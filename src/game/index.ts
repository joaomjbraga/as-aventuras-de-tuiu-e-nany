import Phaser from 'phaser'
import { gameConfig } from './config'
import { enterMobileFullscreen, isIosBrowser, setupMobileViewport } from './mobile'

setupMobileViewport()

const iosInstallBanner = document.getElementById('ios-install-banner')
const iosInstallClose = document.getElementById('ios-install-close')
const orientationOverlay = document.getElementById('orientation-overlay')
const mobileFullscreen = document.getElementById('mobile-fullscreen')

// A faixa HTML fica sobre o canvas. Sem bloquear esses eventos, a AboutScene
// interpreta o toque no botão como um toque para sair da tela Sobre.
;[iosInstallBanner, iosInstallClose, orientationOverlay, mobileFullscreen].forEach((element) => {
  element?.addEventListener('pointerdown', (event) => event.stopPropagation())
  element?.addEventListener('pointerup', (event) => event.stopPropagation())
  element?.addEventListener('click', (event) => event.stopPropagation())
})

if (isIosBrowser()) {
  document.querySelector<HTMLElement>('#mobile-fullscreen')?.replaceChildren('COMO JOGAR EM TELA CHEIA')
  document.getElementById('mobile-fullscreen')?.addEventListener('pointerup', () => {
    document.querySelector<HTMLElement>('#ios-install-banner')?.classList.add('visible')
  })
}

document.getElementById('mobile-fullscreen')?.addEventListener('pointerup', () => {
  void enterMobileFullscreen()
})
iosInstallClose?.addEventListener('pointerup', () => {
  document.documentElement.classList.add('ios-install-dismissed')
})
document.addEventListener(
  'pointerup',
  () => {
    void enterMobileFullscreen()
  },
  { once: true },
)

const game = new Phaser.Game(gameConfig)

export default game
