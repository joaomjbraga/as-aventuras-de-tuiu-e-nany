import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    // Ponto inicial do jogo: nada a carregar aqui ainda.
    // Eventualmente dá para pré-configurar o sistema de input etc.
    this.scene.start('PreloadScene')
  }
}
