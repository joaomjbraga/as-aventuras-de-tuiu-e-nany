import Phaser from 'phaser'
import { MATCH_DIFFICULTY_PRESETS, getMatchDifficulty, type MatchDifficultyId } from '../difficultyPresets'
import { getSessionDifficulty, getSessionLevel, setSessionDifficulty } from '../session'

const PANEL_FIRST_Y = 116
const PANEL_SPACING = 62
const PANEL_WIDTH = 640
const PANEL_HEIGHT = 50

export class DifficultySelectScene extends Phaser.Scene {
  private selectedIndex = 0
  private panels: Phaser.GameObjects.Rectangle[] = []
  private names: Phaser.GameObjects.Text[] = []
  private descriptions: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Text
  private moveUpKeys: Phaser.Input.Keyboard.Key[] = []
  private moveDownKeys: Phaser.Input.Keyboard.Key[] = []
  private enterKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'DifficultySelectScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const level = getSessionLevel()
    const current = getSessionDifficulty()
    this.selectedIndex = Math.max(
      0,
      MATCH_DIFFICULTY_PRESETS.findIndex((preset) => preset.id === current),
    )
    this.panels = []
    this.names = []
    this.descriptions = []

    this.add.rectangle(width / 2, height / 2, width, height, 0x181d29)

    this.add
      .text(width / 2, 24, 'ESCOLHA A DIFICULDADE', {
        fontFamily: 'monospace',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#e0e8f0',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 6)

    this.add
      .text(width / 2, 60, `CENÁRIO: ${level.name}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8fa8c8',
      })
      .setOrigin(0.5)

    MATCH_DIFFICULTY_PRESETS.forEach((preset, index) => {
      const y = PANEL_FIRST_Y + index * PANEL_SPACING
      const panel = this.add
        .rectangle(width / 2, y, PANEL_WIDTH, PANEL_HEIGHT, 0x131720)
        .setStrokeStyle(1, 0x2c3350)
        .setInteractive({ useHandCursor: true })
      panel.on('pointerdown', () => this.startMatch(preset.id))
      panel.on('pointerover', () => {
        this.selectedIndex = index
        this.refreshSelection()
      })
      this.panels.push(panel)

      const name = this.add
        .text(142, y, preset.name, {
          fontFamily: 'monospace',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#c8d6e5',
        })
        .setOrigin(0, 0.5)
        .setStroke('#0d101b', 4)
      this.names.push(name)

      const description = this.add
        .text(310, y, preset.description, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#9aa9c0',
          wordWrap: { width: 390 },
        })
        .setOrigin(0, 0.5)
      this.descriptions.push(description)
    })

    this.cursor = this.add
      .text(68, PANEL_FIRST_Y, '▶', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffe082',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, 390, '↑/↓: escolher   ENTER: começar   ESC: voltar', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#7a89a0',
      })
      .setOrigin(0.5)

    const kb = this.input.keyboard!
    this.moveUpKeys = ['UP', 'LEFT', 'W', 'A'].map((key) => kb.addKey(key))
    this.moveDownKeys = ['DOWN', 'RIGHT', 'S', 'D'].map((key) => kb.addKey(key))
    this.enterKey = kb.addKey('ENTER')
    this.escKey = kb.addKey('ESC')

    this.refreshSelection()
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
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.startMatch(getMatchDifficulty(MATCH_DIFFICULTY_PRESETS[this.selectedIndex].id).id)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('LevelSelectScene')
    }
  }

  private move(delta: number): void {
    const count = MATCH_DIFFICULTY_PRESETS.length
    this.selectedIndex = (this.selectedIndex + delta + count) % count
    this.refreshSelection()
  }

  private refreshSelection(): void {
    this.panels.forEach((panel, index) => {
      const active = index === this.selectedIndex
      const preset = MATCH_DIFFICULTY_PRESETS[index]
      panel.setFillStyle(active ? 0x253047 : 0x131720)
      panel.setStrokeStyle(active ? 2 : 1, active ? preset.color : 0x2c3350, active ? 1 : 0.9)
      this.names[index].setColor(active ? '#ffffff' : '#c8d6e5')
      this.descriptions[index].setColor(active ? '#dbe7f5' : '#7a89a0')
    })
    this.cursor.setY(PANEL_FIRST_Y + this.selectedIndex * PANEL_SPACING)
  }

  private startMatch(difficultyId: MatchDifficultyId): void {
    setSessionDifficulty(difficultyId)
    this.scene.start('MainScene')
  }
}
