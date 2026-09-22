import Phaser from 'phaser'
import { CHARACTERS, type CharacterKey } from '../sprites'
import { CONTROL_SCHEMES, type ControlSchemeId } from '../controls'
import { setSessionPlayers, type PlayerId, type SessionPlayer } from '../session'

const OPTIONS: CharacterKey[] = ['tuio', 'nany']

interface PlayerCursor {
  playerId: PlayerId
  scheme: ControlSchemeId
  color: number
  index: number
  marker: Phaser.GameObjects.Rectangle
  confirmed: boolean
  keys: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
}

export class CharacterSelectScene extends Phaser.Scene {
  private optionSprites: Phaser.GameObjects.Sprite[] = []
  private optionPositions: { x: number; y: number }[] = []
  private confirmedLabels: Record<string, Phaser.GameObjects.Text> = {}
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

    this.add.rectangle(cx, height / 2, width, height, 0x181d29)

    this.add
      .text(cx, 24, 'ESCOLHA SEU PERSONAGEM', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e0e8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    // Opções lado a lado
    OPTIONS.forEach((key, i) => {
      const def = CHARACTERS[key]
      const x = cx - 64 + i * 128
      const sprite = this.add.sprite(x, 96, def.key, 0)
      sprite.setScale(1.4)

      this.optionSprites.push(sprite)
      this.optionPositions.push({ x, y: sprite.y })

      this.add
        .text(x, 150, def.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#c8d6e5',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)

      this.confirmedLabels[key] = this.add
        .text(x, 164, '', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#7bed9f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    })

    this.prompt = this.add
      .text(cx, height - 22, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffe082',
        align: 'center',
        fontStyle: 'bold',
        lineSpacing: 2,
      })
      .setOrigin(0.5)

    this.add
      .text(cx, 190, 'J1: ←/→ + ENTER    J2: A/D + W    [ESC] voltar', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#6b7a8f',
        align: 'center',
      })
      .setOrigin(0.5)

    // Cursores dos dois jogadores
    this.cursors = [
      this.makeCursor('P1', 'p1', 0x4fc3f7, 78),
      this.makeCursor('P2', 'p2', 0xffb74d, 106),
    ]
    this.cursors.forEach((cursor) => this.placeMarker(cursor))

    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.escKey = this.input.keyboard!.addKey('ESC')
    this.p2ConfirmKey = this.input.keyboard!.addKey('W')

    this.updatePrompt()
  }

  update(): void {
    this.cursors.forEach((cursor) => {
      const { left, right } = cursor.keys

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
        this.startGame()
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

  private makeCursor(
    playerId: PlayerId,
    scheme: ControlSchemeId,
    color: number,
    y: number,
  ): PlayerCursor {
    const marker = this.add.rectangle(0, y, 2, 6, color, 1).setOrigin(0.5)
    return {
      playerId,
      scheme,
      color,
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
    const pos = this.optionPositions[cursor.index]
    cursor.marker.x = pos.x
  }

  private tryConfirm(cursor: PlayerCursor): void {
    if (cursor.confirmed) return

    const key = OPTIONS[cursor.index]
    if (this.takenBy[key]) return // já escolhido pelo outro jogador

    this.takenBy[key] = cursor.playerId
    cursor.confirmed = true

    this.confirmedLabels[key].setText(`${cursor.playerId} OK`)
    cursor.marker.setFillStyle(cursor.color, 0.5)
    cursor.marker.width = 12

    this.updatePrompt()
  }

  private updatePrompt(): void {
    const p1 = this.cursors.find((c) => c.playerId === 'P1')
    if (p1?.confirmed) {
      this.prompt.setText('ENTER para começar\n(J2: escolha com A/D e confirme com W)')
    } else {
      this.prompt.setText('J1: escolha com ←/→ e confirme com ENTER')
    }
  }

  private startGame(): void {
    const players: SessionPlayer[] = this.cursors
      .filter((c) => c.confirmed)
      .map((c, i) => ({
        id: c.playerId,
        characterKey: OPTIONS[c.index],
        controls: c.scheme,
      }))

    if (players.length === 0) return

    setSessionPlayers(players)
    this.scene.start('MainScene')
  }
}