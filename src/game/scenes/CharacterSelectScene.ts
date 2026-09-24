import Phaser from 'phaser'
import { CHARACTERS, type CharacterKey } from '../sprites'
import { CONTROL_SCHEMES, type ControlSchemeId } from '../controls'
import { setSessionPlayers, type PlayerId, type SessionPlayer } from '../session'
import { isTouchDevice } from '../mobile'

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
    const touch = isTouchDevice()

    // A cena é reutilizada entre partidas: reseta os registros antes de
    // reconstruir, senão entradas antigas (objetos destruídos) continuam no
    // array e desalinham os índices na reentrada.
    this.options = []
    this.takenBy = {}

    this.add.rectangle(cx, height / 2, width, height, 0x181d29)

    this.add
      .text(cx, 16, 'ESCOLHA SEU PERSONAGEM', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e0e8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 3)

    // Cartões com personagem (sprites normalizados, alinhados pelos pés)
    const targetHeight = 104
    const feetY = 140

    OPTIONS.forEach((key, i) => {
      const def = CHARACTERS[key]
      const x = cx - 64 + i * 128

      const panel = this.add.rectangle(x, 92, 118, 124, 0x131720)
      panel.setStrokeStyle(1, 0x2c3350)

      // Seleção com o mouse: clicar em um cartão seleciona o personagem (J1)
      panel.setInteractive({ useHandCursor: true })
      panel.on('pointerover', () => {
        if (!this.takenBy[key]) panel.setStrokeStyle(1, 0x4fc3f7, 0.5)
      })
      panel.on('pointerout', () => this.refreshSelectionVisuals())
      panel.on('pointerdown', () => this.selectWithMouse(i))

      const scale = targetHeight / def.frameHeight
      const sprite = this.add
        .sprite(x, feetY - targetHeight / 2, def.key, 0)
        .setScale(scale)
        .setDepth(2)

      this.add
        .text(x, 166, def.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#c8d6e5',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 3)

      const confirmedLabel = this.add
        .text(x, 180, '', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#7bed9f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)

      this.options.push({ key, panel, sprite, confirmedLabel })
    })

    this.prompt = this.add
      .text(cx, 190, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffe082',
        align: 'center',
        fontStyle: 'bold',
        lineSpacing: 2,
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 2)

    this.add
      .text(
        cx,
        206,
        touch ? 'TOQUE NO PERSONAGEM 2X PARA CONFIRMAR' : 'J1: ←/→ + ENTER    J2: A/D + W    [ESC] voltar',
        {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#6b7a8f',
          align: 'center',
        },
      )
      .setOrigin(0.5)

    const back = this.add
      .text(cx, height - 2, touch ? 'VOLTAR' : '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffe082',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    back.on('pointerdown', () => this.scene.start('TitleScene'))

    // Mobile é uma experiência solo; o segundo cursor permanece apenas no desktop.
    this.cursors = touch
      ? [this.makeCursor('P1', 'p1', 0x4fc3f7)]
      : [this.makeCursor('P1', 'p1', 0x4fc3f7), this.makeCursor('P2', 'p2', 0xffb74d)]
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
    const marker = this.add.rectangle(0, 0, 14, 4, color, 1).setOrigin(0.5).setDepth(5)
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
    const panelX = this.options[cursor.index].panel.x
    const offset = cursor.playerId === 'P1' ? -9 : 9
    cursor.marker.setPosition(panelX + offset, 157)
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
      if (confirmed) borderColor = 0x3fd07a
      else if (isP1Here && isP2Here) borderColor = 0x9adcff
      else if (isP1Here) borderColor = 0x4fc3f7
      else if (isP2Here) borderColor = 0xffb74d
      else borderColor = 0x2c3350

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
    // Tint/alpha funcionam também no renderer Canvas de navegadores mobile;
    // preFX pode não estar disponível ou renderizar a textura de forma vazia.
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
        isTouchDevice()
          ? 'Toque novamente no personagem para começar\n(J2 pode tocar no outro personagem e confirmar)'
          : 'ENTER para começar · clique de novo no personagem e joga\n(J2: escolha com A/D e confirme com W)',
      )
    } else {
      this.prompt.setText(
        isTouchDevice()
          ? 'Toque no personagem para escolher'
          : 'J1: escolha com ←/→ e confirme com ENTER (ou clique no personagem)',
      )
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
