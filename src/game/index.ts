import Phaser from 'phaser'
import { gameConfig } from './config'
import { enterMobileFullscreen, isIosBrowser, setupMobileViewport } from './mobile'

setupMobileViewport()

if (isIosBrowser()) {
  document.querySelector<HTMLElement>('.ios-hint')?.style.setProperty('display', 'block')
  document.querySelector<HTMLElement>('#mobile-fullscreen')?.replaceChildren('COMO JOGAR EM TELA CHEIA')
  document.getElementById('mobile-fullscreen')?.addEventListener('pointerup', () => {
    document.querySelector<HTMLElement>('#ios-install-banner')?.classList.add('visible')
  })
}

document.getElementById('mobile-fullscreen')?.addEventListener('pointerup', () => {
  void enterMobileFullscreen()
})
document.getElementById('ios-install-close')?.addEventListener('pointerup', () => {
  document.getElementById('ios-install-banner')?.classList.remove('visible')
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
