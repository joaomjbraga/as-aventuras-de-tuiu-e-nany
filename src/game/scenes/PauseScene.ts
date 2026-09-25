import Phaser from 'phaser'
import { MUSIC_VOLUME_STEP, adjustMusicVolume, applyMute, applyMusicVolume, toggleMute } from '../audio'
import { isMuted } from '../storage'

type PauseOptionId = 'resume' | 'restart' | 'title' | 'volume' | 'mute' | 'quit'

interface PauseOption {
  id: PauseOptionId
  label: string
  action: () => void
}

const OPTION_FIRST_Y = 100
const OPTION_SPACING = 50
const OPTION_WIDTH = 460
const OPTION_HEIGHT = 44

export class PauseScene extends Phaser.Scene {
  private options: PauseOption[] = []
  private optionRects: Phaser.GameObjects.Rectangle[] = []
  private optionTexts: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Text
  private selectedIndex = 0
  private musicVolume = 0

  private moveUpKeys: Phaser.Input.Keyboard.Key[]
  private moveDownKeys: Phaser.Input.Keyboard.Key[]
  private volumeDownKeys: Phaser.Input.Keyboard.Key[]
  private volumeUpKeys: Phaser.Input.Keyboard.Key[]
  private selectKeys: Phaser.Input.Keyboard.Key[]
  private escKey!: Phaser.Input.Keyboard.Key
  private restartKey!: Phaser.Input.Keyboard.Key
  private titleKey!: Phaser.Input.Keyboard.Key
  private muteKey!: Phaser.Input.Keyboard.Key
  private quitKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'PauseScene' })
    this.moveUpKeys = []
    this.moveDownKeys = []
    this.volumeDownKeys = []
    this.volumeUpKeys = []
    this.selectKeys = []
  }

  create(): void {
    const { width, height } = this.scale

    applyMute(this)
    this.musicVolume = applyMusicVolume(this.musicScene())

    // A cena é reutilizada a cada pausa: limpa as listas da abertura anterior
    // (objetos destruídos) e zera o cursor, senão o highlight/atualização de SOM
    // passam a operar em entradas antigas e não afetam os elementos visíveis.
    this.optionRects = []
    this.optionTexts = []
    this.selectedIndex = 0

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(10)

    this.add
      .text(width / 2, 60, 'PAUSA', {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#e0e8f0',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 8)
      .setDepth(11)

    // Opções navegáveis por teclado (sem depender do mouse)
    this.options = [
      { id: 'resume', label: 'CONTINUAR', action: () => this.resumeGame() },
      { id: 'restart', label: 'REINICIAR', action: () => this.restartGame() },
      { id: 'title', label: 'VOLTAR AO TÍTULO', action: () => this.goToTitle() },
      { id: 'volume', label: this.volumeLabel(), action: () => this.adjustMusicVolume(MUSIC_VOLUME_STEP) },
      { id: 'mute', label: `SOM: ${isMuted() ? 'OFF' : 'ON'}`, action: () => this.toggleSound() },
      { id: 'quit', label: 'SAIR', action: () => this.quitGame() },
    ]

    this.options.forEach((opt, i) => {
      const y = OPTION_FIRST_Y + i * OPTION_SPACING
      const rect = this.add
        .rectangle(width / 2, y, OPTION_WIDTH, OPTION_HEIGHT, 0x1c2230)
        .setStrokeStyle(2, 0x4a5a80)
        .setDepth(11)
        .setInteractive({ useHandCursor: true })
      rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (opt.id === 'volume' && pointer.rightButtonDown()) this.adjustMusicVolume(-MUSIC_VOLUME_STEP)
        else opt.action()
      })
      this.optionRects.push(rect)

      const text = this.add
        .text(width / 2, y, opt.label, {
          fontFamily: 'monospace',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#e8edf7',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 4)
        .setDepth(11)
      this.optionTexts.push(text)
    })

    this.cursor = this.add
      .text(width / 2 - OPTION_WIDTH / 2 - 22, OPTION_FIRST_Y, '▶', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffe082',
      })
      .setOrigin(0.5)
      .setDepth(11)

    this.add
      .text(
        width / 2,
        402,
        '↑/↓: escolher   ←/→ ou A/D: volume   ENTER/SPACE: selecionar\nESC: continuar   M: mudo   R: reiniciar   T: título   Q: sair',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#9aa9c0',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(11)

    const kb = this.input.keyboard!
    this.moveUpKeys = ['UP', 'W'].map((key) => kb.addKey(key))
    this.moveDownKeys = ['DOWN', 'S'].map((key) => kb.addKey(key))
    this.volumeDownKeys = ['LEFT', 'A'].map((key) => kb.addKey(key))
    this.volumeUpKeys = ['RIGHT', 'D'].map((key) => kb.addKey(key))
    this.selectKeys = ['ENTER', 'SPACE', 'P'].map((key) => kb.addKey(key))
    this.escKey = kb.addKey('ESC')
    this.restartKey = kb.addKey('R')
    this.titleKey = kb.addKey('T')
    this.muteKey = kb.addKey('M')
    this.quitKey = kb.addKey('Q')

    this.highlightOption()
  }

  update(): void {
    const selectedOption = this.options[this.selectedIndex]
    if (selectedOption?.id === 'volume') {
      if (this.volumeDownKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
        this.adjustMusicVolume(-MUSIC_VOLUME_STEP)
        return
      }
      if (this.volumeUpKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
        this.adjustMusicVolume(MUSIC_VOLUME_STEP)
        return
      }
    }

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
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      this.toggleSound()
    }
    if (Phaser.Input.Keyboard.JustDown(this.quitKey)) {
      this.quitGame()
    }
  }

  private musicScene(): Phaser.Scene {
    return this.scene.get('MainScene') ?? this
  }

  private volumeLabel(): string {
    return `MÚSICA: ${Math.round(this.musicVolume * 100)}%  [←/→]`
  }

  private adjustMusicVolume(delta: number): void {
    this.musicVolume = adjustMusicVolume(this.musicScene(), delta)
    const index = this.options.findIndex((option) => option.id === 'volume')
    if (index >= 0) {
      this.options[index].label = this.volumeLabel()
      this.optionTexts[index].setText(this.options[index].label)
    }
  }

  private toggleSound(): void {
    const muted = toggleMute(this)
    const index = this.options.findIndex((option) => option.id === 'mute')
    if (index >= 0) {
      this.options[index].label = `SOM: ${muted ? 'OFF' : 'ON'}`
      this.optionTexts[index].setText(this.options[index].label)
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
      rect.setStrokeStyle(2, active ? 0x8ab0ff : 0x4a5a80, active ? 1 : 0.8)
    })
    this.cursor.setY(OPTION_FIRST_Y + this.selectedIndex * OPTION_SPACING)
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

  private quitGame(): void {
    this.scene.stop()
    this.scene.stop('MainScene')
    window.desktop?.quit()
  }
}
