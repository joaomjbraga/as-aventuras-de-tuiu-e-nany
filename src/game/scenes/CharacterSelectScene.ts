import Phaser from 'phaser'
import { CHARACTERS, type CharacterKey } from '../sprites'
import { CONTROL_SCHEMES, type ControlSchemeId } from '../controls'
import { setSessionPlayers, type PlayerId, type SessionPlayer } from '../session'
import { COLOR, FONT, TEXT } from '../theme'

/**
 * Opções desta tela derivadas de `CHARACTERS`: adicionar um personagem em
 * sprites.ts passa a exibi-lo aqui automaticamente, sem duplicar a lista.
 */
const OPTIONS = Object.keys(CHARACTERS) as CharacterKey[]

interface PlayerCursor {
  playerId: PlayerId
  scheme: ControlSchemeId
  index: number
  marker: Phaser.GameObjects.Rectangle
  confirmed: boolean
  keys: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
}

interface OptionState {
  key: CharacterKey
  panel: Phaser.GameObjects.Rectangle
  sprite: Phaser.GameObjects.Sprite
  confirmedLabel: Phaser.GameObjects.Text
}

export class CharacterSelectScene extends Phaser.Scene {
  private options: OptionState[] = []
  private takenBy: Record<string, PlayerId | undefined> = {}
  private cursors: PlayerCursor[] = []
  private prompt!: Phaser.GameObjects.Text
  private enterKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private p2ConfirmKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'CharacterSelectScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    // A cena é reutilizada entre partidas: reseta os registros antes de
    // reconstruir, senão entradas antigas (objetos destruídos) continuam no
    // array e desalinham os índices na reentrada.
    this.options = []
    this.takenBy = {}

    this.add.rectangle(cx, height / 2, width, height, COLOR.bg)

    this.add
      .text(cx, 32, 'ESCOLHA SEU PERSONAGEM', {
        fontFamily: FONT.family,
        fontSize: '26px',
        color: TEXT.primary,
        fontStyle: FONT.bold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 6)

    // Cartões com personagem (sprites normalizados, alinhados pelos pés)
    const targetHeight = 208
    const feetY = 280
    // Espaçamento derivado da quantidade de opções para a fileira ficar sempre
    // centralizada, sem depender de quantos personagens existirem.
    const cardSlot = 256
    const spread = (OPTIONS.length - 1) * cardSlot

    OPTIONS.forEach((key, i) => {
      const def = CHARACTERS[key]
      const x = cx - spread / 2 + i * cardSlot

      const panel = this.add.rectangle(x, 184, 236, 248, COLOR.panel)
      panel.setStrokeStyle(1, COLOR.border)

      // Seleção com o mouse: clicar em um cartão seleciona o personagem (J1)
      panel.setInteractive({ useHandCursor: true })
      panel.on('pointerover', () => {
        if (!this.takenBy[key]) panel.setStrokeStyle(1, COLOR.hoverBorder, 0.5)
      })
      panel.on('pointerout', () => this.refreshSelectionVisuals())
      panel.on('pointerdown', () => this.selectWithMouse(i))

      const scale = targetHeight / def.frameHeight
      const sprite = this.add
        .sprite(x, feetY - targetHeight / 2, def.key, 0)
        .setScale(scale)
        .setDepth(2)

      this.add
        .text(x, 332, def.name.toUpperCase(), {
          fontFamily: FONT.family,
          fontSize: '20px',
          color: TEXT.body,
          fontStyle: FONT.bold,
        })
        .setOrigin(0.5)
        .setStroke(TEXT.stroke, 6)

      const confirmedLabel = this.add
        .text(x, 360, '', {
          fontFamily: FONT.family,
          fontSize: '16px',
          color: TEXT.ok,
          fontStyle: FONT.bold,
        })
        .setOrigin(0.5)

      this.options.push({ key, panel, sprite, confirmedLabel })
    })

    this.prompt = this.add
      .text(cx, 380, '', {
        fontFamily: FONT.family,
        fontSize: '18px',
        color: TEXT.accent,
        align: 'center',
        fontStyle: FONT.bold,
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 4)

    this.add
      .text(cx, 412, 'J1: ←/→ + ENTER    J2: A/D + W    [ESC] voltar', {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: '#6b7a8f',
        align: 'center',
      })
      .setOrigin(0.5)

    this.cursors = [this.makeCursor('P1', 'p1', COLOR.hoverBorder), this.makeCursor('P2', 'p2', COLOR.p2Border)]
    this.cursors.forEach((cursor) => this.placeMarker(cursor))

    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.escKey = this.input.keyboard!.addKey('ESC')
    this.p2ConfirmKey = this.input.keyboard!.addKey('W')

    this.refreshSelectionVisuals()
    this.updatePrompt()
  }

  update(): void {
    this.cursors.forEach((cursor) => {
      const { left, right } = cursor.keys

      // Cursor já confirmado não se move mais: o startMatch() lê a escolha
      // fixada pelo cursor confirmado, e não a posição atual do marcador.
      if (cursor.confirmed) return

      if (Phaser.Input.Keyboard.JustDown(left)) {
        cursor.index = (cursor.index - 1 + OPTIONS.length) % OPTIONS.length
        this.placeMarker(cursor)
      }
      if (Phaser.Input.Keyboard.JustDown(right)) {
        cursor.index = (cursor.index + 1) % OPTIONS.length
        this.placeMarker(cursor)
      }
    })

    const p1 = this.cursors.find((c) => c.playerId === 'P1')

    // Jogador 1: ENTER confirma (1ª vez); depois ENTER inicia a partida
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      if (!p1?.confirmed) {
        if (p1) this.tryConfirm(p1)
      } else {
        this.startMatch()
      }
    }

    // Jogador 2: W confirma (qualquer momento antes do início)
    const p2 = this.cursors.find((c) => c.playerId === 'P2')
    if (p2 && Phaser.Input.Keyboard.JustDown(this.p2ConfirmKey)) {
      this.tryConfirm(p2)
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('TitleScene')
    }
  }

  private makeCursor(playerId: PlayerId, scheme: ControlSchemeId, color: number): PlayerCursor {
    const marker = this.add.rectangle(0, 0, 28, 8, color, 1).setOrigin(0.5).setDepth(5)
    return {
      playerId,
      scheme,
      index: 0,
      marker,
      confirmed: false,
      keys: {
        left: this.input.keyboard!.addKey(CONTROL_SCHEMES[scheme].left),
        right: this.input.keyboard!.addKey(CONTROL_SCHEMES[scheme].right),
      },
    }
  }

  private placeMarker(cursor: PlayerCursor): void {
    const panelX = this.options[cursor.index].panel.x
    const offset = cursor.playerId === 'P1' ? -18 : 18
    cursor.marker.setPosition(panelX + offset, 314)
    this.refreshSelectionVisuals()
  }

  /**
   * Destaca o personagem selecionado e deixa os demais em preto e branco.
   */
  private refreshSelectionVisuals(): void {
    this.options.forEach((opt, i) => {
      const isP1Here = this.cursors[0].index === i
      const isP2Here = this.cursors[1]?.index === i
      const confirmed = this.takenBy[opt.key]

      let borderColor: number
      if (confirmed) borderColor = COLOR.confirmBorder
      else if (isP1Here && isP2Here) borderColor = COLOR.hoverBorderBoth
      else if (isP1Here) borderColor = COLOR.hoverBorder
      else if (isP2Here) borderColor = COLOR.p2Border
      else borderColor = COLOR.border

      opt.panel.setStrokeStyle(confirmed ? 2 : 1, borderColor, confirmed ? 1 : 0.85)

      const active = !!confirmed || isP1Here || isP2Here
      if (active) {
        opt.sprite.clearTint()
        opt.sprite.setAlpha(1)
      } else {
        this.grayscaleSprite(opt.sprite)
        opt.sprite.setAlpha(0.85)
      }
    })
  }

  private grayscaleSprite(sprite: Phaser.GameObjects.Sprite): void {
    // Tint/alpha são suficientes para o renderer Electron.
    sprite.clearTint()
    sprite.setTint(0x7d8794)
  }

  private tryConfirm(cursor: PlayerCursor): void {
    if (cursor.confirmed) return

    const key = OPTIONS[cursor.index]
    if (this.takenBy[key]) return // já escolhido pelo outro jogador

    this.takenBy[key] = cursor.playerId
    cursor.confirmed = true

    const optState = this.options[cursor.index]
    optState.confirmedLabel.setText(`${cursor.playerId} OK`)
    cursor.marker.setAlpha(0.25)

    this.refreshSelectionVisuals()
    this.updatePrompt()
  }

  private updatePrompt(): void {
    const p1 = this.cursors.find((c) => c.playerId === 'P1')
    if (p1?.confirmed) {
      this.prompt.setText(
        'ENTER para começar · clique de novo no personagem e joga\n(J2: escolha com A/D e confirme com W)',
      )
    } else {
      this.prompt.setText('J1: escolha com ←/→ e confirme com ENTER (ou clique no personagem)')
    }
  }

  /**
   * Seleção por mouse (J1): um clique escolhe/confirma o personagem;
   * um segundo clique no mesmo personagem inicia a partida.
   */
  private selectWithMouse(index: number): void {
    const p1 = this.cursors.find((c) => c.playerId === 'P1')
    if (!p1) return

    const key = OPTIONS[index]

    // Card já reservado pelo J2: ignora
    if (this.takenBy[key] && this.takenBy[key] !== 'P1') return

    // Segundo clique no personagem já confirmado pelo J1 → começa
    if (p1.confirmed && p1.index === index) {
      this.startMatch()
      return
    }

    // Se o J1 já tinha confirmado e está trocando de personagem, desfaz a escolha anterior
    if (p1.confirmed) {
      const prevKey = OPTIONS[p1.index]
      if (this.takenBy[prevKey] === 'P1') {
        delete this.takenBy[prevKey]
        this.options.find((o) => o.key === prevKey)!.confirmedLabel.setText('')
      }
      p1.confirmed = false
    }

    p1.index = index
    this.placeMarker(p1)
    this.tryConfirm(p1)
  }

  private startMatch(): void {
    const players: SessionPlayer[] = this.cursors
      .filter((c) => c.confirmed)
      .map((c) => ({
        id: c.playerId,
        characterKey: OPTIONS[c.index],
        controls: c.scheme,
      }))

    if (players.length === 0) return

    setSessionPlayers(players)

    // Personagens definidos → escolha do cenário da partida
    this.scene.start('LevelSelectScene')
  }
}
