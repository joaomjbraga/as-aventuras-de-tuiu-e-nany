import Phaser from 'phaser'
import { LEVELS, bgImageKey, type LevelConfig } from '../levels'
import { createButton } from '../ui'
import { setSessionLevel } from '../session'
import { isLevelCompleted } from '../storage'
import { COLOR, FONT, TEXT } from '../theme'

interface LevelCard {
  level: LevelConfig
  panel: Phaser.GameObjects.Rectangle
  thumb: Phaser.GameObjects.Image
  name: Phaser.GameObjects.Text
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
  private readonly viewportLeft = 28
  private readonly viewportWidth = 712
  private readonly cardWidth = 264
  private readonly cardGap = 36
  private selectedIndex = 0
  private cursor!: Phaser.GameObjects.Rectangle
  private enterKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private dragStartX = 0
  private dragging = false
  private cardsMask?: Phaser.Display.Masks.GeometryMask
  private maskGraphics?: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.selectedIndex = 0

    this.add.rectangle(cx, height / 2, width, height, COLOR.bg)

    this.add
      .text(cx, 28, 'ESCOLHA O CENÁRIO', {
        fontFamily: FONT.family,
        fontSize: '26px',
        color: TEXT.primary,
        fontStyle: FONT.bold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 6)

    this.buildCards()

    this.cursor = this.add.rectangle(0, 0, 32, 8, COLOR.hoverBorder, 1).setOrigin(0.5).setDepth(5)
    if (this.cards.length > 0) this.placeCursor()

    // A partida começa só com uma ação explícita (botão ou ENTER): um clique no
    // card apenas seleciona, como no CharacterSelectScene.
    createButton(this, cx, height - 84, 'COMEÇAR [ENTER]', () => this.confirmSelected(), {
      width: 320,
      height: 60,
      fontSize: '20px',
      color: TEXT.accent,
      bgColor: 0x2a2f22,
      bgHover: 0x3a4230,
      strokeColor: 0x8a7a3a,
    }).setDepth(2)

    const navigationHint = this.add
      .text(cx, height - 28, '←/→ ou RODA: rolar · clique: escolher · ENTER: começar    ESC: voltar', {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: '#6b7a8f',
      })
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
        if (pointer.y < 76 || pointer.y > height - 60) return
        this.setScrollOffset(this.scrollOffset + Math.sign(deltaY) * 108)
      },
    )
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragStartX = pointer.x
      this.dragging = false
    })
    // Soltar o botão precisa encerrar o arrasto. Sem este handler, soltar sobre
    // um card deixava `dragging` ligado e o `pointerup` do panel era ignorado.
    this.input.on('pointerup', () => {
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

  /**
   * Descarta a máscara de recorte: o `Graphics` foi criado fora da display
   * list e não seria destruído automaticamente, vazando um por reentrada.
   */
  shutdown(): void {
    this.cardsMask?.destroy()
    this.maskGraphics?.destroy()
    this.cardsMask = undefined
    this.maskGraphics = undefined
    this.cards = []
    this.dragging = false
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
    const cardH = 256
    const cardY = 212
    const total = LEVELS.length * this.cardWidth + Math.max(0, LEVELS.length - 1) * this.cardGap
    this.maxScrollOffset = Math.max(0, total - this.viewportWidth)
    this.scrollOffset = 0

    this.cardsContainer = this.add.container(this.viewportLeft, 0).setDepth(1)
    // O Graphics da máscara é criado fora da display list (`false`), logo a
    // limpeza da cena não o destrói: seguramos a referência e destruímos em
    // shutdown() para não acumular um por reentrada na cena.
    const maskGraphics = this.make.graphics({}, false)
    maskGraphics.fillStyle(0xffffff)
    maskGraphics.fillRect(this.viewportLeft, 76, this.viewportWidth, height - 136)
    this.cardsMask = maskGraphics.createGeometryMask()
    this.cardsContainer.setMask(this.cardsMask)
    this.maskGraphics = maskGraphics

    const cardStartX = this.cardWidth / 2

    LEVELS.forEach((level, i) => {
      const x = cardStartX + i * (this.cardWidth + this.cardGap)

      const panel = this.add.rectangle(x, cardY, this.cardWidth, cardH, COLOR.panel)
      panel.setStrokeStyle(1, COLOR.border)

      // Miniatura da arte de fundo da fase (textura `bg-<id>-img`), com ajuste
      // de escala para caber no card sem distorção (imagens widescreen).
      const thumb = this.add.image(x, cardY - 52, bgImageKey(level))
      const src = this.textures.get(bgImageKey(level)).getSourceImage()
      const tw = src.width || 1
      const th = src.height || 1
      const fit = Math.min((this.cardWidth - 48) / tw, 120 / th)
      thumb.setScale(fit)

      const namePlate = this.add.rectangle(x, cardY + 86, this.cardWidth - 20, 44, 0x090c14, 0.88)

      const name = this.add
        .text(x, cardY + 86, level.name.toUpperCase(), {
          fontFamily: FONT.family,
          fontSize: '20px',
          color: TEXT.body,
          fontStyle: FONT.bold,
        })
        .setOrigin(0.5)
        .setStroke(TEXT.stroke, 6)

      // Fase já concluída: '✓' dourado no canto do card
      let done: Phaser.GameObjects.Text | undefined
      if (isLevelCompleted(level.id)) {
        done = this.add
          .text(x + this.cardWidth / 2 - 12, cardY - cardH / 2 + 10, '✓', {
            fontFamily: FONT.family,
            fontSize: '24px',
            color: '#ffd54f',
            fontStyle: FONT.bold,
          })
          .setOrigin(1, 0)
          .setStroke(TEXT.stroke, 4)
      }

      this.cardsContainer.add([panel, thumb, namePlate, name])
      if (done) this.cardsContainer.add(done)

      panel.setInteractive({ useHandCursor: true })
      panel.on('pointerover', () => {
        if (this.selectedIndex !== i) panel.setStrokeStyle(1, COLOR.hoverBorder, 0.5)
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

      this.cards.push({ level, panel, thumb, name })
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
    this.cursor.setPosition(this.cardsContainer.x + card.panel.x, card.panel.y + 124)
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
      card.panel.setStrokeStyle(active ? 2 : 1, active ? COLOR.selectBorder : COLOR.border, active ? 1 : 0.85)
      card.thumb.setAlpha(active ? 1 : 0.65)
      card.name.setColor(active ? '#ffffff' : TEXT.body)
    })
  }

  private confirmSelected(): void {
    const card = this.cards[this.selectedIndex]
    if (!card) return
    setSessionLevel(card.level.id)
    this.scene.start('DifficultySelectScene')
  }
}
