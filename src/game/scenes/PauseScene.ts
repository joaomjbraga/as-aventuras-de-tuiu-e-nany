import Phaser from 'phaser'

interface PauseOption {
  label: string
  action: () => void
}

export class PauseScene extends Phaser.Scene {
  private options: PauseOption[] = []
  private optionRects: Phaser.GameObjects.Rectangle[] = []
  private cursor!: Phaser.GameObjects.Text
  private selectedIndex = 0

  private moveUpKeys: Phaser.Input.Keyboard.Key[]
  private moveDownKeys: Phaser.Input.Keyboard.Key[]
  private selectKeys: Phaser.Input.Keyboard.Key[]
  private escKey!: Phaser.Input.Keyboard.Key
  private restartKey!: Phaser.Input.Keyboard.Key
  private titleKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'PauseScene' })
    this.moveUpKeys = []
    this.moveDownKeys = []
    this.selectKeys = []
  }

  create(): void {
    const { width, height } = this.scale

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(10)

    this.add
      .text(width / 2, 30, 'PAUSA', {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#e0e8f0',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 4)
      .setDepth(11)

    // Opções navegáveis por teclado (sem depender do mouse)
    this.options = [
      { label: 'CONTINUAR', action: () => this.resumeGame() },
      { label: 'REINICIAR', action: () => this.restartGame() },
      { label: 'VOLTAR AO TÍTULO', action: () => this.goToTitle() },
    ]

    const firstY = 66

    this.options.forEach((opt, i) => {
      const y = firstY + i * 34
      const rect = this.add
        .rectangle(width / 2, y, 190, 30, 0x1c2230)
        .setStrokeStyle(1, 0x4a5a80)
        .setDepth(11)
      this.optionRects.push(rect)

      this.add
        .text(width / 2, y, opt.label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#e8edf7',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 2)
        .setDepth(11)
    })

    this.cursor = this.add
      .text(width / 2 - 106, firstY, '▶', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffe082',
      })
      .setOrigin(0.5)
      .setDepth(11)

    // Atalhos da partida
    this.add
      .text(width / 2, 178, 'J1: ←/→ mover · ESPAÇO pular\nJ2: A/D mover · W pular', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#9aa9c0',
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(11)

    // Atalhos do menu
    this.add
      .text(width / 2, 205, '↑/↓: escolher   ENTER: selecionar   ESC: continuar', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#7a89a0',
      })
      .setOrigin(0.5)
      .setDepth(11)

    const kb = this.input.keyboard!
    this.moveUpKeys = ['UP', 'W'].map((key) => kb.addKey(key))
    this.moveDownKeys = ['DOWN', 'S'].map((key) => kb.addKey(key))
    this.selectKeys = ['ENTER', 'SPACE', 'P'].map((key) => kb.addKey(key))
    this.escKey = kb.addKey('ESC')
    this.restartKey = kb.addKey('R')
    this.titleKey = kb.addKey('T')

    this.highlightOption()
  }

  update(): void {
    if (this.moveUpKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.move(-1)
      return
    }
    if (this.moveDownKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.move(1)
      return
    }
    if (this.selectKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.options[this.selectedIndex].action()
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.resumeGame()
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.restartGame()
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.titleKey)) {
      this.goToTitle()
    }
  }

  private move(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + this.options.length) % this.options.length
    this.highlightOption()
  }

  private highlightOption(): void {
    this.optionRects.forEach((rect, i) => {
      const active = i === this.selectedIndex
      rect.setFillStyle(active ? 0x2a3550 : 0x1c2230)
      rect.setStrokeStyle(1, active ? 0x8ab0ff : 0x4a5a80, active ? 1 : 0.8)
    })
    this.cursor.setY(66 + this.selectedIndex * 34)
  }

  private resumeGame(): void {
    this.scene.stop()
    this.scene.resume('MainScene')
  }

  private restartGame(): void {
    this.scene.stop()
    this.scene.stop('MainScene')
    this.scene.start('MainScene')
  }

  private goToTitle(): void {
    this.scene.stop()
    this.scene.stop('MainScene')
    this.scene.start('TitleScene')
  }
}