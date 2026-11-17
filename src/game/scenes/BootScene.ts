import Phaser from 'phaser'
import { applyMute } from '../audio'
import { installKeyboardState } from '../keyboardState'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    // O gerenciador de som é global: aplicar a preferência aqui evita que a
    // música da tela inicial toque antes de a MainScene/PauseScene sincronizar.
    applyMute(this)
    installKeyboardState()
    this.scene.start('PreloadScene')
  }
}
