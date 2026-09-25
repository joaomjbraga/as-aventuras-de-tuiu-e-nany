import Phaser from 'phaser'
import { COLOR, FONT, TEXT } from '../theme'

/**
 * Menu "Sobre": o recado do casal que dá sentido ao jogo. É a primeira tela
 * exibida (o PreloadScene desemboca aqui) e sai em qualquer tecla de saída
 * (ENTER/ESPAÇO/ESC) ou clique.
 */
export class AboutScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AboutScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, COLOR.bgText)
    this.add.rectangle(cx, 192, 688, 316, COLOR.panelText).setStrokeStyle(2, COLOR.borderText, 0.9)

    this.add
      .text(cx, 36, 'SOBRE', {
        fontFamily: FONT.family,
        fontSize: '32px',
        fontStyle: FONT.bold,
        color: TEXT.gold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 6)

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
        .text(cx, 72 + i * 22, line.text, {
          fontFamily: FONT.family,
          fontSize: '18px',
          fontStyle: line.bold ? FONT.bold : FONT.normal,
          color: line.color ?? TEXT.body,
        })
        .setOrigin(0.5)
        .setStroke(TEXT.stroke, 4)
    })

    const backButton = this.add
      .rectangle(cx, height - 26, 380, 44, COLOR.selectFillPause, 0.9)
      .setStrokeStyle(2, COLOR.selectBorder, 0.9)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(cx, height - 26, '[ ENTER / ESPAÇO / ESC ] voltar', {
        fontFamily: FONT.family,
        fontSize: '18px',
        color: TEXT.accent,
        fontStyle: FONT.bold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 4)

    const goBack = () => this.scene.start('TitleScene')
    // Só o retângulo é interativo: um `Text` sem setInteractive() nunca emite
    // `pointerdown`, então ligar o listener nele seria código morto.
    backButton.on('pointerdown', goBack)

    this.input.keyboard!.once('keydown-ENTER', goBack)
    this.input.keyboard!.once('keydown-SPACE', goBack)
    this.input.keyboard!.once('keydown-ESC', goBack)
  }
}
