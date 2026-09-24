import Phaser from 'phaser'
import { isTouchDevice } from '../mobile'

export class InstructionsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InstructionsScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, 0x11151d)
    this.add.rectangle(cx, 106, 360, 176, 0x161c26).setStrokeStyle(1, 0x3b5486, 0.9)

    this.add
      .text(cx, 12, 'COMO JOGAR', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffd54f',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 3)

    if (isTouchDevice()) {
      this.addSection(18, 'CONTROLES TOUCH', [
        '◀ ▶ mover      ▲ pular / reviver',
        'Ⅱ pausar       ♪ ligar/desligar som',
        'Segure ◀/▶ para andar e toque ▲ para pular.',
        'Pulo duplo: toque ▲ de novo no ar.',
      ])
    } else {
      this.addSection(18, 'CONTROLES', [
        'J1  ←/→ mover   ↑ ou ESPAÇO pular',
        'J2  A/D mover   W pular',
        'ESC pausa   M ativa/desativa o som',
        'Pulo duplo: aperte o pulo de novo no ar.',
      ])
    }

    this.addSection(66, 'COMBATE', [
      'Pise no zumbi para causar dano e derrotá-lo.',
      'Contato lateral tira um coração.',
      'Atingir a meta libera o boss da fase.',
    ])

    this.addSection(114, 'ITENS E COMBO', [
      'Coração: recupera 1 coração ou dá pontos.',
      'Escudo: bloqueia dano   Veloz: aumenta a velocidade.',
      'Dano x2: dobra o dano dos pisões.',
      'Abates seguidos aumentam o combo até x10.',
    ])

    this.addSection(158, 'SOBREVIVÊNCIA', [
      ...(isTouchDevice()
        ? ['Você tem 3 corações.', 'Quando eles acabarem, a partida termina.']
        : [
            'Ao cair, aperte o botão de pulo para reviver.',
            'O revive só funciona enquanto o companheiro estiver em pé.',
          ]),
    ])

    const backButton = this.add
      .rectangle(cx, height - 13, 190, 22, 0x2a3550, 0.9)
      .setStrokeStyle(1, 0x8ab0ff, 0.9)
      .setInteractive({ useHandCursor: true })

    const back = this.add
      .text(cx, height - 13, isTouchDevice() ? 'TOQUE AQUI PARA VOLTAR' : '[ ENTER / ESPAÇO / ESC ] voltar', {
        fontFamily: 'monospace',
        fontSize: isTouchDevice() ? '8px' : '9px',
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

  private addSection(y: number, title: string, lines: string[]): void {
    this.add
      .text(26, y, title, {
        fontFamily: 'monospace',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#8fd8ff',
      })
      .setOrigin(0, 0)
      .setStroke('#0d101b', 2)

    lines.forEach((line, index) => {
      this.add
        .text(26, y + 10 + index * 9, line, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#c8d6e5',
        })
        .setOrigin(0, 0)
        .setStroke('#0d101b', 1)
    })
  }
}
