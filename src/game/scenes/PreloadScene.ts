import Phaser from 'phaser'
import { CHARACTERS, EXPLOSION, ZOMBIE_VARIANTS, ZOMBIE_TARGET_HEIGHT } from '../sprites'
import { AUDIO } from '../audio'
import { LEVELS, bgImageKey } from '../levels'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.drawLoadingBar()

    // Cenário das fases: carrega a arte estática (imagem JPG) para o fundo.
    // Chaves derivadas do id da fase (`bg-<id>-img`) — futuras fases
    // entram automaticamente ao serem adicionadas em LEVELS.
    LEVELS.forEach((level) => {
      this.load.image(bgImageKey(level), level.art.image)
    })

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
    this.load.audio(AUDIO.INTRO, 'audio/intro.mp3')
    this.load.audio(AUDIO.BGM, 'audio/background.mp3')
    this.load.audio(AUDIO.ZOMBIE_GROWL, 'audio/zumbi-gemendo.mp3')
    this.load.audio(AUDIO.ZOMBIE_ATTACK, 'audio/Small-Monster-Attack.mp3')
    this.load.audio(AUDIO.EXPLOSION, 'audio/explosion-with-debris.mp3')
    this.load.audio(AUDIO.MAN_DEATH, 'audio/man-death.mp3')
    this.load.audio(AUDIO.FEMALE_DEATH, 'audio/female-death.mp3')
    this.load.audio(AUDIO.GAME_OVER, 'audio/game-over.mp3')

    // Carrega os frames individuais (PNGs) dos 3 zumbis reais para montar
    // os spritesheets normalizados em runtime (create).
    ZOMBIE_VARIANTS.forEach((def) => {
      for (let i = 1; i <= def.frames; i++) {
        const n = String(i).padStart(2, '0')
        this.load.image(`${def.key}_${n}`, `${def.path}${n}.png`)
      }
    })

    // Frames da explosão de abate (empacotados em spritesheet em create).
    for (let i = 1; i <= EXPLOSION.frames; i++) {
      this.load.image(`${EXPLOSION.key}_${i}`, `${EXPLOSION.path}${i}.png`)
    }
  }

  create(): void {
    // Placeholder 'zombie' (fallback caso os frames reais não carreguem);
    // buildRealZombieSpritesheets sobrescreve com os spritesheets reais.
    this.generateZombiePlaceholder()
    this.buildRealZombieSpritesheets()
    this.generateBossPlaceholder()
    this.buildExplosionSpritesheet()
    this.createUiTextures()
    this.scene.start('AboutScene')
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
  private createPlaceholderSpritesheets(sprites: (typeof CHARACTERS)[keyof typeof CHARACTERS][]): void {
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

      const targetH = def.targetHeight ?? ZOMBIE_TARGET_HEIGHT
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

  /**
   * Empacota os frames da explosão (EXPLOSION) num spritesheet quadrado
   * normalizado, centralizado, preservando a proporção de cada frame.
   * Se algum frame faltar, não cria nada e o abate cai no fallback de
   * partículas no Zombie.die().
   */
  private buildExplosionSpritesheet(): void {
    if (this.textures.exists(EXPLOSION.key)) return

    const frames: HTMLImageElement[] = []
    for (let i = 1; i <= EXPLOSION.frames; i++) {
      const img = this.textures.get(`${EXPLOSION.key}_${i}`).getSourceImage() as HTMLImageElement | undefined
      if (!img || !img.width) return
      frames.push(img)
    }

    const size = EXPLOSION.frameSize
    const canvas = document.createElement('canvas')
    canvas.width = size * frames.length
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    frames.forEach((im, f) => {
      const scale = Math.min(size / im.width, size / im.height)
      const w = Math.floor(im.width * scale)
      const h = Math.floor(im.height * scale)
      ctx.drawImage(im, f * size + Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h)
    })

    this.textures.addSpriteSheet(EXPLOSION.key, canvas as unknown as HTMLImageElement, {
      frameWidth: size,
      frameHeight: size,
    })

    if (!this.anims.exists(`${EXPLOSION.key}-boom`)) {
      this.anims.create({
        key: `${EXPLOSION.key}-boom`,
        frames: this.anims.generateFrameNumbers(EXPLOSION.key, { start: 0, end: frames.length - 1 }),
        frameRate: 18,
        repeat: 0,
      })
    }
  }
  private createUiTextures(): void {
    if (!this.textures.exists('pixel')) {
      const px = document.createElement('canvas')
      px.width = 1
      px.height = 1
      const pg = px.getContext('2d')!
      pg.fillStyle = '#fff'
      pg.fillRect(0, 0, 1, 1)
      this.textures.addCanvas('pixel', px)
    }

    if (this.textures.exists('heart')) return

    const heartRows = [
      '...#.#...',
      '..#.#.#..',
      '..#####..',
      '.#######.',
      '.#######.',
      '..#####..',
      '...###...',
      '....#....',
    ]
    const c = document.createElement('canvas')
    c.width = heartRows[0].length
    c.height = heartRows.length
    const g = c.getContext('2d')!
    g.fillStyle = '#fff'
    heartRows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') g.fillRect(x, y, 1, 1)
      }
    })
    this.textures.addCanvas('heart', c)

    this.createPickupTextures()
  }

  /**
   * Texturas brancas dos power-ups temporizados (a cor da tinta é aplicada
   * por tint no uso). O coração do HUD já serve de pickup.
   */
  private createPickupTextures(): void {
    const masks: Record<string, string[]> = {
      'power-shield': ['..##..', '.####.', '.####.', '.####.', '.####.', '.####.', '.####.', '..##..'],
      'power-speed': [
        '..#...',
        '..##..',
        '.###..',
        '.####.',
        '####..',
        '####..',
        '.####.',
        '.###..',
        '..##..',
        '..#...',
      ],
      'power-double': ['....', '.##.', '#..#', '....', '.##.', '.#..', '....', '.#..', '.##.', '....'],
    }

    for (const [key, rows] of Object.entries(masks)) {
      if (this.textures.exists(key)) continue
      const c = document.createElement('canvas')
      c.width = rows[0].length
      c.height = rows.length
      const g = c.getContext('2d')!
      g.fillStyle = '#fff'
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '#') g.fillRect(x, y, 1, 1)
        }
      })
      this.textures.addCanvas(key, c)
    }

    this.createPickupHeartTexture()
  }

  /**
   * Coração de power-up: desenhado maior (16x16) e já na cor vermelha,
   * com um brilho no canto superior para dar volume. Ao contrário das outras
   * texturas de power-up, não precisa de tint no uso.
   */
  private createPickupHeartTexture(): void {
    if (this.textures.exists('pickup-heart')) return

    const rows = [
      '......####......',
      '....##++####....',
      '...##++++####...',
      '..####+++#####..',
      '.#####++######..',
      '.###############',
      '################',
      '################',
      '.##############.',
      '..############..',
      '...##########...',
      '....########....',
      '.....######.....',
      '......####......',
      '.......##.......',
      '........#.......',
    ]
    const c = document.createElement('canvas')
    c.width = rows[0].length
    c.height = rows.length
    const g = c.getContext('2d')!
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const px = row[x]
        if (px === '.') continue
        g.fillStyle = px === '+' ? '#ff9aa8' : '#ff4d5d'
        g.fillRect(x, y, 1, 1)
      }
    })
    this.textures.addCanvas('pickup-heart', c)
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

  /**
   * Placeholder procedural do boss de fase: um zumbi grande e sombrio,
   * com braços longos e olhos vermelhos (2 frames de vai-e-vem).
   */
  private generateBossPlaceholder(): void {
    if (this.textures.exists('boss')) return

    const frameWidth = 48
    const frameHeight = 64
    const frameCount = 2

    const canvas = document.createElement('canvas')
    canvas.width = frameWidth * frameCount
    canvas.height = frameHeight
    const ctx = canvas.getContext('2d')!

    const skin = '#5f6b52'
    const torso = '#272e38'
    const arms = '#20242c'
    const pants = '#15181f'
    const eye = '#e83a4a'

    for (let f = 0; f < frameCount; f++) {
      const o = f * frameWidth
      const sway = f % 2 === 0 ? 0 : 1

      // Pernas largas
      ctx.fillStyle = pants
      ctx.fillRect(o + 14 + sway, 48, 8, 16)
      ctx.fillRect(o + 26 - sway, 48, 8, 16)

      // Braços longos esticados para frente (estilo Thriller)
      ctx.fillStyle = arms
      ctx.fillRect(o + 30, 24 + sway, 18, 6)
      ctx.fillRect(o + 30, 34 - sway, 18, 6)

      // Mãos (pele)
      ctx.fillStyle = skin
      ctx.fillRect(o + 44, 22 + sway, 4, 10)
      ctx.fillRect(o + 44, 32 - sway, 4, 10)

      // Tronco volumoso
      ctx.fillStyle = torso
      ctx.fillRect(o + 8 + sway, 18, 32, 32)

      // Remendo / rasgo no peito
      ctx.fillStyle = '#4a5260'
      ctx.fillRect(o + 16 + sway, 24, 10, 5)

      // Cabeça grande
      ctx.fillStyle = skin
      ctx.fillRect(o + 12 + sway, 2, 24, 18)

      // Cicatriz
      ctx.fillStyle = '#3c4234'
      ctx.fillRect(o + 26 + sway, 6, 8, 2)

      // Olhos vermelhos brilhantes
      ctx.fillStyle = eye
      ctx.fillRect(o + 32 + sway, 10, 2, 2)
      ctx.fillRect(o + 36 + sway, 10, 2, 2)
    }

    this.textures.addSpriteSheet('boss', canvas as unknown as HTMLImageElement, {
      frameWidth,
      frameHeight,
    })
  }
}
