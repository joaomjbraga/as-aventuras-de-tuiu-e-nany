import Phaser from 'phaser'
import { LEVELS, bgImageKey, type LevelConfig } from '../levels'
import { createButton } from '../ui'
import { setSessionLevel } from '../session'
import { isLevelCompleted } from '../storage'
import { isTouchDevice } from '../mobile'

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
  private cardsContainer!: Phaser.GameObjects.Container
  private scrollOffset = 0
  private maxScrollOffset = 0
  private readonly viewportLeft = 14
  private readonly viewportWidth = 356
  private readonly cardWidth = 132
  private readonly cardGap = 18
  private selectedIndex = 0
  private cursor!: Phaser.GameObjects.Rectangle
  private enterKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private dragStartX = 0
  private dragging = false

  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.selectedIndex = 0

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

    // A partida começa só com uma ação explícita (botão ou ENTER), para um
    // simples toque/clique no card apenas selecionar — igual ao rank de escolha.
    createButton(this, cx, height - 42, isTouchDevice() ? 'COMEÇAR' : 'COMEÇAR [ENTER]', () => this.confirmSelected(), {
      width: 160,
      height: 30,
      fontSize: '10px',
      color: '#ffe082',
      bgColor: 0x2a2f22,
      bgHover: 0x3a4230,
      strokeColor: 0x8a7a3a,
    }).setDepth(2)

    const navigationHint = this.add
      .text(
        cx,
        height - 14,
        isTouchDevice()
          ? 'TOQUE: escolher    ARRASTE: rolar    ESC: voltar'
          : '←/→ ou RODA: rolar · clique: escolher · ENTER: começar    ESC: voltar',
        {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#6b7a8f',
        },
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    navigationHint.on('pointerdown', () => this.scene.start('CharacterSelectScene'))

    const kb = this.input.keyboard!
    this.enterKey = kb.addKey('ENTER')
    this.leftKey = kb.addKey('LEFT')
    this.rightKey = kb.addKey('RIGHT')
    this.escKey = kb.addKey('ESC')

    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        if (pointer.y < 38 || pointer.y > height - 30) return
        this.setScrollOffset(this.scrollOffset + Math.sign(deltaY) * 54)
      },
    )
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragStartX = pointer.x
      this.dragging = false
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return
      const deltaX = pointer.x - this.dragStartX
      if (Math.abs(deltaX) < 8) return
      this.dragging = true
      this.dragStartX = pointer.x
      this.setScrollOffset(this.scrollOffset - deltaX)
    })
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
    // Cena reutilizada entre partidas: descarta os cards da visita anterior.
    this.cards = []

    const { height } = this.scale
    const cardH = 128
    const cardY = 106
    const total = LEVELS.length * this.cardWidth + Math.max(0, LEVELS.length - 1) * this.cardGap
    this.maxScrollOffset = Math.max(0, total - this.viewportWidth)
    this.scrollOffset = 0

    this.cardsContainer = this.add.container(this.viewportLeft, 0).setDepth(1)
    const maskGraphics = this.make.graphics({}, false)
    maskGraphics.fillStyle(0xffffff)
    maskGraphics.fillRect(this.viewportLeft, 38, this.viewportWidth, height - 68)
    this.cardsContainer.setMask(maskGraphics.createGeometryMask())

    const cardStartX = this.cardWidth / 2

    LEVELS.forEach((level, i) => {
      const x = cardStartX + i * (this.cardWidth + this.cardGap)

      const panel = this.add.rectangle(x, cardY, this.cardWidth, cardH, 0x131720)
      panel.setStrokeStyle(1, 0x2c3350)

      // Miniatura da arte de fundo da fase (textura `bg-<id>-img`), com ajuste
      // de escala para caber no card sem distorção (imagens widescreen).
      const thumb = this.add.image(x, cardY - 26, bgImageKey(level))
      const src = this.textures.get(bgImageKey(level)).getSourceImage()
      const tw = src.width || 1
      const th = src.height || 1
      const fit = Math.min((this.cardWidth - 24) / tw, 60 / th)
      thumb.setScale(fit)

      const namePlate = this.add.rectangle(x, cardY + 43, this.cardWidth - 10, 22, 0x090c14, 0.88)

      const name = this.add
        .text(x, cardY + 43, level.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#c8d6e5',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 3)

      // Fase já concluída: '✓' dourado no canto do card
      let done: Phaser.GameObjects.Text | undefined
      if (isLevelCompleted(level.id)) {
        done = this.add
          .text(x + this.cardWidth / 2 - 6, cardY - cardH / 2 + 5, '✓', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffd54f',
            fontStyle: 'bold',
          })
          .setOrigin(1, 0)
          .setStroke('#0d101b', 2)
      }

      this.cardsContainer.add([panel, thumb, namePlate, name])
      if (done) this.cardsContainer.add(done)

      panel.setInteractive({ useHandCursor: true })
      panel.on('pointerover', () => {
        if (this.selectedIndex !== i) panel.setStrokeStyle(1, 0x4fc3f7, 0.5)
      })
      panel.on('pointerout', () => this.refreshSelection())
      panel.on('pointerdown', () => {
        this.selectedIndex = i
        this.placeCursor()
      })
      panel.on('pointerup', () => {
        // Clique seleciona (o pointerdown já moveu o cursor); a partida só
        // começa com o botão/tecla de confirmar, como no CharacterSelect.
        if (this.dragging) return
        this.refreshSelection()
      })

      this.cards.push({ level, panel, thumb, name, done })
    })

    this.refreshSelection()
  }

  private move(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + this.cards.length) % this.cards.length
    this.ensureSelectedVisible()
    this.placeCursor()
    this.refreshSelection()
  }

  private placeCursor(): void {
    const card = this.cards[this.selectedIndex]
    this.cursor.setPosition(this.cardsContainer.x + card.panel.x, card.panel.y + 62)
  }

  private ensureSelectedVisible(): void {
    const cardLeft = this.selectedIndex * (this.cardWidth + this.cardGap)
    const cardRight = cardLeft + this.cardWidth
    const padding = 8

    if (cardLeft < this.scrollOffset + padding) {
      this.setScrollOffset(cardLeft - padding)
    } else if (cardRight > this.scrollOffset + this.viewportWidth - padding) {
      this.setScrollOffset(cardRight - this.viewportWidth + padding)
    }
  }

  private setScrollOffset(value: number): void {
    this.scrollOffset = Phaser.Math.Clamp(value, 0, this.maxScrollOffset)
    this.cardsContainer.x = this.viewportLeft - this.scrollOffset
    if (this.cursor && this.cards.length > 0) this.placeCursor()
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
