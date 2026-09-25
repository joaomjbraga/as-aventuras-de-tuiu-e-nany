import Phaser from 'phaser'
import { MATCH_DIFFICULTY_PRESETS, type MatchDifficultyId } from '../difficultyPresets'
import { getSessionDifficulty, getSessionLevel, setSessionDifficulty } from '../session'
import { COLOR, FONT, TEXT } from '../theme'
import { VerticalMenu, type VerticalMenuItem } from '../ui/verticalMenu'

const PANEL_FIRST_Y = 116
const PANEL_SPACING = 62
const PANEL_WIDTH = 640
const PANEL_HEIGHT = 50

const ITEMS: VerticalMenuItem[] = MATCH_DIFFICULTY_PRESETS.map((preset) => ({
  // `label` é o nome à esquerda; `description` vai à direita do painel.
  label: preset.name,
  description: preset.description,
  accent: preset.color,
}))

export class DifficultySelectScene extends Phaser.Scene {
  private menu!: VerticalMenu
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

    this.add.rectangle(width / 2, height / 2, width, height, COLOR.bg)

    this.add
      .text(width / 2, 24, 'ESCOLHA A DIFICULDADE', {
        fontFamily: FONT.family,
        fontSize: '26px',
        fontStyle: FONT.bold,
        color: TEXT.primary,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 6)

    this.add
      .text(width / 2, 60, `CENÁRIO: ${level.name}`, {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: TEXT.muted,
      })
      .setOrigin(0.5)

    // Pré-seleciona a dificuldade já em uso na partida anterior.
    const initial = Math.max(
      0,
      MATCH_DIFFICULTY_PRESETS.findIndex((preset) => preset.id === current),
    )
    this.menu = new VerticalMenu(
      this,
      {
        firstY: PANEL_FIRST_Y,
        spacing: PANEL_SPACING,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        cursorX: 68,
        depth: 0,
        fontSize: '20px',
        labelX: 142,
        descriptionX: 310,
        descriptionWrap: 390,
        cursorColor: TEXT.accent,
        // Um clique no painel escolhe e começa: aqui a escolha já É a
        // confirmação (é o último passo antes da arena), ao contrário das
        // telas com seleção seguida de confirmação explícita.
        onActivate: (index) => this.startMatch(MATCH_DIFFICULTY_PRESETS[index].id),
      },
      {
        fill: COLOR.panel,
        fillActive: COLOR.selectFill,
        border: COLOR.border,
        borderActive: COLOR.selectBorder,
        label: TEXT.body,
        labelActive: '#ffffff',
        // A descrição fica um tom abaixo do nome para a hierarquia se manter.
        description: TEXT.hint,
        descriptionActive: TEXT.bodyActive,
        labelStroke: TEXT.stroke,
      },
      ITEMS,
      initial,
    )

    this.add
      .text(width / 2, height - 42, '↑/↓ ou ←/→: escolher   ENTER: começar   ESC: voltar', {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: TEXT.hint,
      })
      .setOrigin(0.5)

    const kb = this.input.keyboard!
    this.moveUpKeys = ['UP', 'LEFT', 'W', 'A'].map((key) => kb.addKey(key))
    this.moveDownKeys = ['DOWN', 'RIGHT', 'S', 'D'].map((key) => kb.addKey(key))
    this.enterKey = kb.addKey('ENTER')
    this.escKey = kb.addKey('ESC')
  }

  update(): void {
    if (this.moveUpKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.menu.move(-1)
      return
    }
    if (this.moveDownKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.menu.move(1)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      const id = MATCH_DIFFICULTY_PRESETS[this.menu.index]?.id
      if (id) this.startMatch(id)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('LevelSelectScene')
    }
  }

  private startMatch(difficultyId: MatchDifficultyId): void {
    setSessionDifficulty(difficultyId)
    this.scene.start('MainScene')
  }
}
