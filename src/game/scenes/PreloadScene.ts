import Phaser from 'phaser'
import { CHARACTERS, ZOMBIE_VARIANTS, ZOMBIE_TARGET_HEIGHT } from '../sprites'
import { AUDIO } from '../audio'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.drawLoadingBar()

    // Cenário de fundo: vídeo da casa (noAudio habilita autoplay) com
    // fallback para a arte estática caso o codec não esteja disponível.
    this.load.video('bg-home', 'scenes/scenes-my-home.mp4', true)
    this.load.image('bg-home-img', 'scenes/scenes-my-home.jpg')

    const sprites = Object.values(CHARACTERS)

    // Carrega os spritesheets dos personagens
    sprites.forEach((def) => {
      this.load.spritesheet(def.key, def.path, {
        frameWidth: def.frameWidth,
        frameHeight: def.frameHeight,
      })
    })

    // Se algum carregar falhar (arquivo ainda não existe / dimensões erradas),
    // cria um placeholder em runtime para o jogo não quebrar em dev.
    this.load.once('loaderror', () => this.createPlaceholderSpritesheets(sprites))

    // Áudio: música de fundo + efeitos dos zumbis
    this.load.audio(AUDIO.BGM, 'audio/background.mp3')
    this.load.audio(AUDIO.ZOMBIE_GROWL, 'audio/zumbi-gemendo.mp3')
    this.load.audio(AUDIO.ZOMBIE_ATTACK, 'audio/Small-Monster-Attack.mp3')
    this.load.audio(AUDIO.GAME_OVER, 'audio/game-over.mp3')

    // Carrega os frames individuais (PNGs) dos 3 zumbis reais para montar
    // os spritesheets normalizados em runtime (create).
    ZOMBIE_VARIANTS.forEach((def) => {
      for (let i = 1; i <= def.frames; i++) {
        const n = String(i).padStart(2, '0')
        this.load.image(`${def.key}_${n}`, `${def.path}${n}.png`)
      }
    })
  }

  create(): void {
    // Placeholder 'zombie' (fallback caso os frames reais não carreguem);
    // buildRealZombieSpritesheets sobrescreve com os spritesheets reais.
    this.generateZombiePlaceholder()
    this.buildRealZombieSpritesheets()
    this.scene.start('TitleScene')
  }

  private drawLoadingBar(): void {
    const x = this.scale.width / 2
    const y = this.scale.height / 2

    const bg = this.add.rectangle(x, y, 160, 12, 0x1a1a2e)
    bg.setStrokeStyle(1, 0x444444)

    const bar = this.add.rectangle(x - 80, y, 1, 6, 0x00bcd4).setOrigin(0, 0.5)
    this.load.on('progress', (value: number) => {
      bar.width = 160 * value
    })
  }

  /**
   * Cria spritesheets placeholder (9 frames: 6 walk + 3 jump) para
   * um personagem cujo arquivo real ainda não existe.
   */
  private createPlaceholderSpritesheets(sprites: typeof CHARACTERS[keyof typeof CHARACTERS][]): void {
    sprites.forEach((def) => {
      if (this.textures.exists(def.key)) return

      const frameCount = 9
      const canvas = document.createElement('canvas')
      canvas.width = def.frameWidth * frameCount
      canvas.height = def.frameHeight

      const ctx = canvas.getContext('2d')!
      for (let i = 0; i < frameCount; i++) {
        ctx.fillStyle = '#4a9eff'
        ctx.fillRect(i * def.frameWidth, 0, def.frameWidth, def.frameHeight)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.strokeRect(i * def.frameWidth, 0, def.frameWidth, def.frameHeight)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px monospace'
        ctx.fillText(String(i), i * def.frameWidth + 6, 14)
      }

      this.textures.addSpriteSheet(def.key, canvas as unknown as HTMLImageElement, {
        frameWidth: def.frameWidth,
        frameHeight: def.frameHeight,
      })

      console.warn(`[PreloadScene] Placeholder gerado para "${def.key}" (${def.path}).`)
    })
  }

  /**
   * Gera um spritesheet placeholder de zumbi (4 frames de caminhada,
   * 32x40 cada). Substituir por arte real quando existir.
   */
  /**
   * Monta os 3 spritesheets reais de zumbi (zombie1/2/3) a partir dos frames
   * individuais pré-carregados (ZOMBIE_VARIANTS: PNGs de tamanhos variados).
   * Cada frame é normalizado para a altura-alvo (ZOMBIE_TARGET_HEIGHT), com
   * os pés ancorados na base — preservando a colisão de pisão (stomp).
   * Se algum frame faltar, mantém o placeholder procedural já existente.
   */
  private buildRealZombieSpritesheets(): void {
    ZOMBIE_VARIANTS.forEach((def) => {
      if (this.textures.exists(def.key)) return

      const frames: HTMLImageElement[] = []
      for (let i = 1; i <= def.frames; i++) {
        const n = String(i).padStart(2, '0')
        const img = this.textures.get(`${def.key}_${n}`).getSourceImage() as HTMLImageElement | undefined
        if (!img || !img.width) return // frame ausente → fallback placeholder
        frames.push(img)
      }

      const targetH = ZOMBIE_TARGET_HEIGHT
      const maxW = Math.max(...frames.map((im) => (im.width * targetH) / im.height))
      const frameW = Math.ceil(maxW)

      const canvas = document.createElement('canvas')
      canvas.width = frameW * def.frames
      canvas.height = targetH
      const ctx = canvas.getContext('2d')!

      frames.forEach((im, f) => {
        const h = targetH
        const w = (im.width * h) / im.height
        const x = f * frameW + (frameW - w) / 2
        ctx.drawImage(im, x, 0, w, h)
      })

      this.textures.addSpriteSheet(def.key, canvas as unknown as HTMLImageElement, {
        frameWidth: frameW,
        frameHeight: targetH,
      })

      if (!this.anims.exists(`${def.key}-walk`)) {
        this.anims.create({
          key: `${def.key}-walk`,
          frames: this.anims.generateFrameNumbers(def.key, { start: 0, end: def.frames - 1 }),
          frameRate: 8,
          repeat: -1,
        })
      }
    })
  }

  private generateZombiePlaceholder(): void {
    if (this.textures.exists('zombie')) return

    const frameWidth = 32
    const frameHeight = 40
    const frameCount = 4

    const canvas = document.createElement('canvas')
    canvas.width = frameWidth * frameCount
    canvas.height = frameHeight
    const ctx = canvas.getContext('2d')!

    const skin = '#8a9177'
    const torso = '#3c4250'
    const arms = '#2f3440'
    const pants = '#20242e'
    const eye = '#c23535'

    for (let f = 0; f < frameCount; f++) {
      const o = f * frameWidth
      const sway = f % 2 === 0 ? 0 : 1 // pequeno balanço p/ caminhada
      const legShift = f % 2 === 0 ? 0 : 1

      // Perna de trás e da frente
      ctx.fillStyle = pants
      ctx.fillRect(o + 10 + legShift, 30, 5, 10)
      ctx.fillRect(o + 18 - legShift, 30, 5, 10)

      // Braços esticados para frente (estilo Thriller)
      ctx.fillStyle = arms
      ctx.fillRect(o + 24, 18 + sway, 8, 4)
      ctx.fillRect(o + 24, 24 - sway, 8, 4)

      // Mãos (pele)
      ctx.fillStyle = skin
      ctx.fillRect(o + 30, 18 + sway, 2, 4)
      ctx.fillRect(o + 30, 24 - sway, 2, 4)

      // Tronco (terno esfarrapado)
      ctx.fillStyle = torso
      ctx.fillRect(o + 8 + sway, 15, 16, 15)

      // Camisa rasgada
      ctx.fillStyle = '#6b707e'
      ctx.fillRect(o + 12 + sway, 18, 8, 3)

      // Cabeça
      ctx.fillStyle = skin
      ctx.fillRect(o + 11 + sway, 4, 10, 11)

      // Olhos
      ctx.fillStyle = eye
      if (f < 3) {
        ctx.fillRect(o + 17 + sway, 8, 1, 1)
        ctx.fillRect(o + 19 + sway, 8, 1, 1)
      }
    }

    this.textures.addSpriteSheet('zombie', canvas as unknown as HTMLImageElement, {
      frameWidth,
      frameHeight,
    })
  }
}