import Phaser from 'phaser'
import { CHARACTERS } from '../sprites'
import { playBgm } from '../audio'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    playBgm(this)

    // Fundo
    this.add.rectangle(cx, height / 2, width, height, 0x151a22)

    // "Planeta" simples no fundo
    this.add.circle(width - 40, 40, 22, 0x2a3a5c)
    this.add.circle(width - 40, 40, 22, 0x000000, 1.0).setStrokeStyle(1, 0x3b5486)

    // Estrelinhas decorativas
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      this.add.rectangle(x, y, 1, 1, 0x8fa8c8, Phaser.Math.Between(3, 9) / 10)
    }

    // Título
    this.add
      .text(cx, 58, 'AS AVENTURAS DE', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9fb4cd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(cx, 78, 'TUIU & NANY', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffd54f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    // Personagens lado a lado
    const chars = Object.values(CHARACTERS)
    const gap = 84
    chars.forEach((def, i) => {
      const x = cx - gap / 2 + i * gap
      const sprite = this.add.sprite(x, 132, def.key, 0)
      sprite.setScale(1.6)
      this.tweens.add({
        targets: sprite,
        y: 128,
        duration: 900 + i * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      this.add
        .text(x, 176, def.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#c8d6e5',
        })
        .setOrigin(0.5)
    })

    // Pista
    const hint = this.add
      .text(cx, height - 34, '[ ENTER ] para começar', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffe082',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: hint,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('CharacterSelectScene')
    })
  }
}