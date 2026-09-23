import Phaser from 'phaser'
import { LEVELS, bgImageKey, type LevelConfig } from '../levels'
import { setSessionLevel } from '../session'
import { isLevelCompleted } from '../storage'

interface LevelCard {
  level: LevelConfig
  panel: Phaser.GameObjects.Rectangle
  thumb: Phaser.GameObjects.Image
  name: Phaser.GameObjects.Text
  done?: Phaser.GameObjects.Text
}

/**
 * Seleção de cenário (exibida logo após a escolha de personagem).
 * Lista as fases de `LEVELS` em cards com a miniatura da arte de fundo;
 * confirmar grava a fase na sessão e inicia a partida (MainScene).
 */
export class LevelSelectScene extends Phaser.Scene {
  private cards: LevelCard[] = []
  private selectedIndex = 0
  private cursor!: Phaser.GameObjects.Rectangle
  private enterKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, 0x181d29)

    this.add
      .text(cx, 14, 'ESCOLHA O CENÁRIO', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e0e8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 3)

    this.buildCards()

    this.cursor = this.add.rectangle(0, 0, 16, 4, 0x4fc3f7, 1).setOrigin(0.5).setDepth(5)
    if (this.cards.length > 0) this.placeCursor()

    this.add
      .text(cx, height - 14, '←/→: escolher    ENTER: confirmar    ESC: voltar', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#6b7a8f',
      })
      .setOrigin(0.5)

    const kb = this.input.keyboard!
    this.enterKey = kb.addKey('ENTER')
    this.leftKey = kb.addKey('LEFT')
    this.rightKey = kb.addKey('RIGHT')
    this.escKey = kb.addKey('ESC')
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.move(-1)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.move(1)
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.confirmSelected()
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('CharacterSelectScene')
    }
  }

  private buildCards(): void {
    const { width } = this.scale
    const cx = width / 2
    const cardW = 132
    const cardH = 128
    const gap = 18
    const cardY = 106

    const total = LEVELS.length * cardW + Math.max(0, LEVELS.length - 1) * gap
    const startX = cx - total / 2 + cardW / 2

    LEVELS.forEach((level, i) => {
      const x = startX + i * (cardW + gap)

      const panel = this.add.rectangle(x, cardY, cardW, cardH, 0x131720)
      panel.setStrokeStyle(1, 0x2c3350)

      // Miniatura da arte de fundo da fase (textura `bg-<id>-img`), com ajuste
      // de escala para caber no card sem distorção (imagens widescreen).
      const thumb = this.add.image(x, cardY - 26, bgImageKey(level))
      const src = this.textures.get(bgImageKey(level)).getSourceImage()
      const tw = src.width || 1
      const th = src.height || 1
      const fit = Math.min((cardW - 24) / tw, 60 / th)
      thumb.setScale(fit)
      thumb.setDepth(1)

      const name = this.add
        .text(x, cardY + cardH / 2 - 6, level.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#c8d6e5',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 3)
        .setDepth(1)

      // Fase já concluída: '✓' dourado no canto do card
      let done: Phaser.GameObjects.Text | undefined
      if (isLevelCompleted(level.id)) {
        done = this.add
          .text(x + cardW / 2 - 6, cardY - cardH / 2 + 5, '✓', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffd54f',
            fontStyle: 'bold',
          })
          .setOrigin(1, 0)
          .setStroke('#0d101b', 2)
          .setDepth(1)
      }

      panel.setInteractive({ useHandCursor: true })
      panel.on('pointerover', () => {
        if (this.selectedIndex !== i) panel.setStrokeStyle(1, 0x4fc3f7, 0.5)
      })
      panel.on('pointerout', () => this.refreshSelection())
      panel.on('pointerdown', () => {
        this.selectedIndex = i
        this.placeCursor()
        this.confirmSelected()
      })

      this.cards.push({ level, panel, thumb, name, done })
    })

    this.refreshSelection()
  }

  private move(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + this.cards.length) % this.cards.length
    this.placeCursor()
    this.refreshSelection()
  }

  private placeCursor(): void {
    this.cursor.setPosition(this.cards[this.selectedIndex].panel.x, this.cards[this.selectedIndex].panel.y + 62)
  }

  private refreshSelection(): void {
    this.cards.forEach((card, i) => {
      const active = i === this.selectedIndex
      card.panel.setStrokeStyle(active ? 2 : 1, active ? 0x8ab0ff : 0x2c3350, active ? 1 : 0.85)
      card.thumb.setAlpha(active ? 1 : 0.65)
      card.name.setColor(active ? '#ffffff' : '#c8d6e5')
    })
  }

  private confirmSelected(): void {
    const card = this.cards[this.selectedIndex]
    if (!card) return
    setSessionLevel(card.level.id)
    this.scene.start('MainScene')
  }
}
