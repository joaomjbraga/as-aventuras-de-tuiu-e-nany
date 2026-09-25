import Phaser from 'phaser'
import { COLOR, FONT, TEXT } from '../theme'

/**
 * Manual "COMO JOGAR". O texto precisa acompanhar as regras de verdade: as
 * seções abaixo espelham `combat.ts`, `difficultyPresets.ts` e `levels.ts`, e
 * qualquer mudança lá deve ser refletida aqui.
 */
export class InstructionsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InstructionsScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, COLOR.bgText)
    this.add.rectangle(cx, 212, 720, 352, COLOR.panelText).setStrokeStyle(2, COLOR.borderText, 0.9)

    this.add
      .text(cx, 24, 'COMO JOGAR', {
        fontFamily: FONT.family,
        fontSize: '32px',
        fontStyle: FONT.bold,
        color: TEXT.gold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 6)

    this.addSection(36, 'CONTROLES', [
      'J1  ←/→ mover   ↑ ou ESPAÇO pular',
      'J2  A/D mover   W pular',
      'ESC pausa   M som   F11 tela cheia',
      'Pulo duplo: solte e aperte de novo perto do ponto mais alto.',
    ])

    this.addSection(124, 'PARTIDA', [
      'Escolha o cenário, a dificuldade e o personagem.',
      'Dificuldade muda inimigos, velocidade, meta e a vida do boss.',
      'J2 pode entrar depois com o botão na tela ou a tecla W.',
      'Atingir a meta de abates libera o zumbi-chefe da fase.',
    ])

    this.addSection(212, 'COMBATE', [
      'Pisão normal: 2 de dano, nunca mata o zumbi comum de primeira.',
      'Após o pulo duplo: 3 de dano, mata de primeira.',
      'Contato lateral tira um coração (1,5s invulnerável).',
      'O boss só toma 1 de dano por pisão.',
    ])

    this.addSection(300, 'ITENS, COMBO E FIM', [
      'O coração é o único drop: recupera 1 vida ou vira pontos.',
      'Abates seguidos sobem o combo até x10; levar dano zera.',
      '3 corações cada. Ao cair, pule para reviver (se o outro estiver em pé).',
      'Vence quem derruba o boss. A próxima fase é sorteada.',
    ])

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

  private addSection(y: number, title: string, lines: string[]): void {
    this.add
      .text(52, y, title, {
        fontFamily: FONT.family,
        fontSize: '16px',
        fontStyle: FONT.bold,
        color: TEXT.section,
      })
      .setOrigin(0, 0)
      .setStroke(TEXT.stroke, 4)

    lines.forEach((line, index) => {
      this.add
        .text(52, y + 20 + index * 16, line, {
          fontFamily: FONT.family,
          fontSize: '13px',
          color: TEXT.body,
        })
        .setOrigin(0, 0)
        .setStroke(TEXT.stroke, 2)
    })
  }
}
