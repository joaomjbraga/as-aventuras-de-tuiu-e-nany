import Phaser from 'phaser'
import { MUSIC_VOLUME_STEP, adjustMusicVolume, applyMute, applyMusicVolume, toggleMute } from '../audio'
import { isMuted } from '../storage'
import { FONT, TEXT } from '../theme'
import { MENU_STYLE, VerticalMenu } from '../ui/verticalMenu'

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
  private menu!: VerticalMenu
  private options: PauseOption[] = []
  private musicVolume = 0

  private moveUpKeys: Phaser.Input.Keyboard.Key[] = []
  private moveDownKeys: Phaser.Input.Keyboard.Key[] = []
  private volumeDownKeys: Phaser.Input.Keyboard.Key[] = []
  private volumeUpKeys: Phaser.Input.Keyboard.Key[] = []
  private selectKeys: Phaser.Input.Keyboard.Key[] = []
  private escKey!: Phaser.Input.Keyboard.Key
  private restartKey!: Phaser.Input.Keyboard.Key
  private titleKey!: Phaser.Input.Keyboard.Key
  private muteKey!: Phaser.Input.Keyboard.Key
  private quitKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'PauseScene' })
  }

  create(): void {
    const { width, height } = this.scale

    applyMute(this)
    this.musicVolume = applyMusicVolume(this.musicScene())

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(10)

    this.add
      .text(width / 2, 60, 'PAUSA', {
        fontFamily: FONT.family,
        fontSize: '40px',
        fontStyle: FONT.bold,
        color: TEXT.primary,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 8)
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

    // A cena é reutilizada a cada pausa: o VerticalMenu é reconstruído do zero
    // a partir das opções atuais, então nenhum highlight/rótulo da abertura
    // anterior sobrevive. `PauseOption` satisfaz `VerticalMenuItem`
    // estruturalmente, então a lista é passada direto e `setLabel` atualiza
    // a mesma entrada que o `update()` lê.
    this.menu = new VerticalMenu(
      this,
      {
        firstY: OPTION_FIRST_Y,
        spacing: OPTION_SPACING,
        width: OPTION_WIDTH,
        height: OPTION_HEIGHT,
        cursorX: width / 2 - OPTION_WIDTH / 2 - 22,
        depth: 11,
        fontSize: '20px',
        cursorColor: TEXT.accent,
        // Botão direito na linha de volume DIMINUI o volume; o esquerdo executa
        // a ação (que também aumenta).
        onActivate: (index, pointer) => {
          const option = this.options[index]
          if (option.id === 'volume' && pointer.rightButtonDown()) {
            this.adjustMusicVolume(-MUSIC_VOLUME_STEP)
            return
          }
          option.action()
        },
      },
      MENU_STYLE,
      this.options,
    )

    this.add
      .text(
        width / 2,
        height - 30,
        '↑/↓: escolher   ←/→ ou A/D: volume   ENTER/SPACE: selecionar\nESC: continuar   M: mudo   R: reiniciar   T: título   Q: sair',
        {
          fontFamily: FONT.family,
          fontSize: '14px',
          color: TEXT.controls,
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
  }

  update(): void {
    const selectedOption = this.options[this.menu.index]
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
      this.menu.move(-1)
      return
    }
    if (this.moveDownKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.menu.move(1)
      return
    }
    if (this.selectKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.options[this.menu.index]?.action()
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
    this.relabel('volume', this.volumeLabel())
  }

  private toggleSound(): void {
    const muted = toggleMute(this)
    this.relabel('mute', `SOM: ${muted ? 'OFF' : 'ON'}`)
  }

  /** Atualiza o rótulo de uma opção (volume e mudo mudam de valor). */
  private relabel(id: PauseOptionId, label: string): void {
    const index = this.options.findIndex((option) => option.id === id)
    if (index < 0) return
    this.menu.setLabel(index, label)
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
