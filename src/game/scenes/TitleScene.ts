import Phaser from 'phaser'
import { CHARACTERS } from '../sprites'
import { playIntro } from '../audio'
import { resetSession } from '../session'
import { COLOR, FONT, TEXT } from '../theme'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    // O título é o hub de todos os caminhos de volta à arena (fim de jogo,
    // vitória, atalho T na pausa). Zera a sessão aqui para que personagens,
    // cenário e dificuldade da partida anterior não vazem para a próxima.
    resetSession()

    playIntro(this)

    // Fundo
    this.add.rectangle(cx, height / 2, width, height, COLOR.bgText)

    // "Planeta" simples no fundo: disco azul com um terminador (shadow) e borda.
    // O alpha do terminador precisa ser 0 — com 1.0 ele cobria o disco inteiro
    // e o planeta virava um círculo preto.
    this.add.circle(width - 40, 40, 22, 0x2a3a5c)
    this.add.circle(width - 30, 33, 22, 0x000000, 0.35)
    this.add.circle(width - 40, 40, 22, 0x000000, 0).setStrokeStyle(1, 0x3b5486)

    // Estrelinhas decorativas
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      this.add.rectangle(x, y, 1, 1, 0x8fa8c8, Phaser.Math.Between(3, 9) / 10)
    }

    // Título
    this.add
      .text(cx, 76, 'AS AVENTURAS DE', {
        fontFamily: FONT.family,
        fontSize: '24px',
        color: TEXT.hint,
        fontStyle: FONT.bold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 6)

    this.add
      .text(cx, 120, 'TUIU & NANY', {
        fontFamily: FONT.family,
        fontSize: '40px',
        color: TEXT.gold,
        fontStyle: FONT.bold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 8)

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
          fontFamily: FONT.family,
          fontSize: '16px',
          color: TEXT.body,
        })
        .setOrigin(0.5)
        .setStroke(TEXT.stroke, 4)
    })

    // Pista
    const hint = this.add
      .text(cx, height - 56, '[ ENTER ] para começar', {
        fontFamily: FONT.family,
        fontSize: '20px',
        color: TEXT.accent,
        fontStyle: FONT.bold,
      })
      .setOrigin(0.5)
      .setStroke(TEXT.stroke, 4)

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
          fontFamily: FONT.family,
          fontSize: '16px',
          color: TEXT.hint,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })

      const go = () => {
        if (action === 'about') this.scene.start('AboutScene')
        else if (action === 'instructions') this.scene.start('InstructionsScene')
        else this.quitGame()
      }

      t.on('pointerdown', go)
      t.on('pointerover', () => t.setColor(TEXT.accent))
      t.on('pointerout', () => t.setColor(TEXT.hint))
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
