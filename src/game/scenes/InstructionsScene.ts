import Phaser from 'phaser'

export class InstructionsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InstructionsScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, 0x11151d)
    this.add.rectangle(cx, 212, 720, 352, 0x161c26).setStrokeStyle(2, 0x3b5486, 0.9)

    this.add
      .text(cx, 24, 'COMO JOGAR', {
        fontFamily: 'monospace',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffd54f',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 6)

    this.addSection(36, 'CONTROLES', [
      'J1  ←/→ mover   ↑ ou ESPAÇO pular',
      'J2  A/D mover   W pular',
      'ESC pausa   M ativa/desativa o som',
      'Pulo duplo: solte e aperte de novo perto do ponto mais alto.',
    ])

    this.addSection(132, 'COMBATE', [
      'Pisão normal nunca mata o zumbi comum de primeira.',
      'Após o pulo duplo, o pisão causa 3 e mata de primeira.',
      'Contato lateral tira um coração.',
      'Atingir a meta libera o boss da fase.',
    ])

    this.addSection(228, 'ITENS E COMBO', [
      'O coração é o único item que os zumbis deixam.',
      'Ele recupera 1 coração ou vira pontos com a vida cheia.',
      'Abates seguidos aumentam o combo até x10.',
    ])

    this.addSection(316, 'SOBREVIVÊNCIA', [
      'Você tem 3 corações.',
      'Ao cair, aperte o botão de pulo para reviver.',
      'O revive só funciona enquanto o companheiro estiver em pé.',
    ])

    const backButton = this.add
      .rectangle(cx, height - 26, 380, 44, 0x2a3550, 0.9)
      .setStrokeStyle(2, 0x8ab0ff, 0.9)
      .setInteractive({ useHandCursor: true })

    const back = this.add
      .text(cx, height - 26, '[ ENTER / ESPAÇO / ESC ] voltar', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffe082',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 4)

    const goBack = () => this.scene.start('TitleScene')
    backButton.on('pointerdown', goBack)
    back.on('pointerdown', goBack)

    this.input.keyboard!.once('keydown-ENTER', goBack)
    this.input.keyboard!.once('keydown-SPACE', goBack)
    this.input.keyboard!.once('keydown-ESC', goBack)
  }

  private addSection(y: number, title: string, lines: string[]): void {
    this.add
      .text(52, y, title, {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#8fd8ff',
      })
      .setOrigin(0, 0)
      .setStroke('#0d101b', 4)

    lines.forEach((line, index) => {
      this.add
        .text(52, y + 20 + index * 18, line, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#c8d6e5',
        })
        .setOrigin(0, 0)
        .setStroke('#0d101b', 2)
    })
  }
}
