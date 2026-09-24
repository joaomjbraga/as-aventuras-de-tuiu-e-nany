import Phaser from 'phaser'
import { isTouchDevice } from '../mobile'

/**
 * Menu "Sobre": por que o jogo existe. É o recado do casal antes da arena —
 * a homenagem de aniversário para a Anne. Volta ao Título em qualquer tecla
 * de saída (ENTER/ESPAÇO/ESC) ou clique.
 */
export class AboutScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AboutScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2
    const touch = isTouchDevice()

    this.add.rectangle(cx, height / 2, width, height, 0x11151d)
    this.add.rectangle(cx, 96, 344, 158, 0x161c26).setStrokeStyle(1, 0x3b5486, 0.9)

    this.add
      .text(cx, 18, 'SOBRE', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffd54f',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 3)

    const lines: Array<{ text: string; color?: string; bold?: boolean }> = [
      { text: 'FEITO COM CARINHO POR' },
      { text: 'JOÃO M J BRAGA', color: '#ff9fc2', bold: true },
      { text: '' },
      { text: 'ESTE JOGUINHO É O PRESENTE DE' },
      { text: '5 ANOS DE UM CASAL QUE SE AMA.' },
      { text: '' },
      { text: 'ANNE C C BRAGA, ESTA ARENA É' },
      { text: 'SUA: PULE NOS ZUMBIS, PROTEJA', bold: true },
      { text: 'QUEM VOCÊ AMA E SOBREVIVA À' },
      { text: 'AVENTURA DO NOSSO AMOR.' },
    ]

    lines.forEach((line, i) => {
      this.add
        .text(cx, 36 + i * 11, line.text, {
          fontFamily: 'monospace',
          fontSize: '9px',
          fontStyle: line.bold ? 'bold' : '',
          color: line.color ?? '#c8d6e5',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 2)
    })

    const backButton = this.add
      .rectangle(cx, height - 13, 190, 22, 0x2a3550, 0.9)
      .setStrokeStyle(1, 0x8ab0ff, 0.9)
      .setInteractive({ useHandCursor: true })

    const back = this.add
      .text(cx, height - 13, touch ? 'TOQUE AQUI PARA VOLTAR' : '[ ENTER / ESPAÇO / ESC ] voltar', {
        fontFamily: 'monospace',
        fontSize: touch ? '8px' : '9px',
        color: '#ffe082',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 2)

    const goBack = () => this.scene.start('TitleScene')
    backButton.on('pointerdown', goBack)
    back.on('pointerdown', goBack)

    this.input.keyboard!.once('keydown-ENTER', goBack)
    this.input.keyboard!.once('keydown-SPACE', goBack)
    this.input.keyboard!.once('keydown-ESC', goBack)
  }
}
