import Phaser from 'phaser'
import { CHARACTERS } from '../sprites'
import { playIntro } from '../audio'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    playIntro(this)

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
      .text(cx, 76, 'AS AVENTURAS DE', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#9fb4cd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 6)

    this.add
      .text(cx, 120, 'TUIU & NANY', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffd54f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 8)

    // Personagens lado a lado (normalizados, alinhados pelos pés)
    const chars = Object.values(CHARACTERS)
    const gap = 168
    const targetHeight = 184
    const feetY = 300

    chars.forEach((def, i) => {
      const x = cx - gap / 2 + i * gap
      const sprite = this.add.sprite(x, feetY - targetHeight / 2, def.key, 0)
      sprite.setScale(targetHeight / def.frameHeight)
this.tweens.add({
      targets: sprite,
      y: feetY - targetHeight / 2 - 10,
      duration: 1800 + i * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
      this.add
        .text(x, 340, def.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#c8d6e5',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 4)
    })

    // Pista
    const hint = this.add
      .text(cx, height - 56, '[ ENTER ] para começar', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffe082',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 4)

    // Também dá para clicar
    hint.setInteractive({ useHandCursor: true })
    hint.on('pointerdown', () => this.scene.start('CharacterSelectScene'))

    this.tweens.add({
      targets: hint,
      alpha: 0.25,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Links Inferiores (horizontal) — "sair" fica logo depois de "como jogar"
    const links = [
      { label: '[ A ] sobre', x: cx - 240, action: 'about' },
      { label: '[ I ] como jogar', x: cx, action: 'instructions' },
      { label: 'SAIR [S]', x: cx + 240, action: 'quit' },
    ] as const

    links.forEach(({ label, x, action }) => {
      const t = this.add
        .text(x, height - 16, label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#7a89a0',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })

      const go = () => {
        if (action === 'about') this.scene.start('AboutScene')
        else if (action === 'instructions') this.scene.start('InstructionsScene')
        else this.quitGame()
      }

      t.on('pointerdown', go)
      t.on('pointerover', () => t.setColor('#ffe082'))
      t.on('pointerout', () => t.setColor('#7a89a0'))
    })

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('CharacterSelectScene')
    })
    this.input.keyboard!.once('keydown-A', () => {
      this.scene.start('AboutScene')
    })
    this.input.keyboard!.once('keydown-I', () => {
      this.scene.start('InstructionsScene')
    })
    this.input.keyboard!.once('keydown-S', () => this.quitGame())
  }

  private quitGame(): void {
    window.desktop?.quit()
  }
}
