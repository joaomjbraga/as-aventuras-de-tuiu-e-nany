import Phaser from 'phaser'
import {
  BOSS_ANIMATIONS,
  BOSS_TARGET_HEIGHT,
  CHARACTERS,
  EXPLOSION,
  ZOMBIE_VARIANTS,
  ZOMBIE_TARGET_HEIGHT,
} from '../sprites'
import { AUDIO } from '../audio'
import { LEVELS, bgImageKey } from '../levels'

/**
 * Limites verticais dos pixels não-transparentes de um frame. Normalizar o
 * canvas inteiro pelo topo fazia pés "dançarem" quando as margens
 * transparentes mudavam de frame para frame; ancorar pelo fim do conteúdo
 * mantém os pés fixos no chão entre as animações.
 */
function visibleVerticalBounds(img: HTMLImageElement): { y: number; height: number } {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

  let minY = canvas.height
  let maxY = -1
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 0) {
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // Frame totalmente transparente: usa o canvas inteiro como fallback.
  if (maxY < minY) return { y: 0, height: canvas.height }
  return { y: minY, height: maxY - minY + 1 }
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.drawLoadingBar()

    // Cenário das fases: carrega a arte estática (imagem JPG) para o fundo.
    // Chaves derivadas do id da fase (`bg-<id>-img`) futuras fases
    // entram automaticamente ao serem adicionadas em LEVELS.
    LEVELS.forEach((level) => {
      this.load.image(bgImageKey(level), level.art.image)
    })

    // Carrega os spritesheets dos personagens
    Object.values(CHARACTERS).forEach((def) => {
      this.load.spritesheet(def.key, def.path, {
        frameWidth: def.frameWidth,
        frameHeight: def.frameHeight,
      })
    })

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

    // Frames do zumbi-chefe (empacotados em spritesheets por animação em create).
    Object.values(BOSS_ANIMATIONS).forEach((def) => {
      for (let i = 1; i <= def.frames; i++) {
        const n = String(i).padStart(2, '0')
        this.load.image(`${def.key}_${n}`, `${def.path}${n}.png`)
      }
    })
  }

  create(): void {
    // Personagens: se algum spritesheet não carregou (arquivo ausente ou
    // dimensões erradas, ex.: em dev), cria o placeholder procedural AQUI,
    // depois que o load terminou. Antes isso era feito no evento 'loaderror',
    // que disparava com outros arquivos ainda carregando em paralelo: o
    // placeholder criado ocupava a chave e o spritesheet real era descartado
    // pelo TextureManager ('key already in use'), deixando os personagens
    // permanentemente como caixas azuis mesmo com os PNGs válidos.
    this.createPlaceholderSpritesheets(Object.values(CHARACTERS))

    // Placeholder 'zombie' (fallback caso os frames reais não carreguem);
    // buildRealZombieSpritesheets sobrescreve com os spritesheets reais.
    this.generateZombiePlaceholder()
    this.buildRealZombieSpritesheets()
    this.generateBossPlaceholder()
    this.buildBossSpritesheets()
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
   * os pés ancorados na base preservando a colisão de pisão (stomp).
   * Se algum frame faltar, mantém o placeholder procedural já existente.
   */
  private buildRealZombieSpritesheets(): void {
    ZOMBIE_VARIANTS.forEach((def) => {
      if (this.textures.exists(def.key)) return

      const frames: HTMLImageElement[] = []
      for (let i = 1; i <= def.frames; i++) {
        const n = String(i).padStart(2, '0')
        const textureKey = `${def.key}_${n}`
        // IMPORTANTE: usar textures.exists() e não textures.get()  para chave
        // inexistente, get() devolve a textura __MISSING (32px, width > 0), que
        // passaria na antiga guarda `!img || !img.width` e montaria o
        // spritesheet com frame quadriculado roxo em vez do fallback.
        if (!this.textures.exists(textureKey)) return // frame ausente → fallback placeholder
        const img = this.textures.get(textureKey).getSourceImage() as HTMLImageElement
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
        const scale = h / im.height
        const w = im.width * scale
        const x = f * frameW + (frameW - w) / 2
        // Pés ancorados na base do CONTEÚDO (e não no topo do canvas): com as
        // margens transparentes variando entre frames, desenhar em y=0 fazia
        // os pés subirem e descerem durante a caminhada.
        const bounds = visibleVerticalBounds(im)
        const y = targetH - (bounds.y + bounds.height) * scale
        ctx.drawImage(im, x, y, w, h)
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
   * Monta os spritesheets do zumbi-chefe (BOSS_ANIMATIONS): um spritesheet por
   * animação (idle, walk, golpe e investida), normalizado para
   * BOSS_TARGET_HEIGHT (maior que os zumbis comuns), com os pés ancorados na
   * base. A animação de walk substitui a textura-padrão 'boss'. Se faltar
   * qualquer frame, mantém o placeholder procedural já gerado.
   */
  private buildBossSpritesheets(): void {
    const sheets: Array<{ key: string; frames: HTMLImageElement[] }> = []

    for (const def of Object.values(BOSS_ANIMATIONS)) {
      const frames: HTMLImageElement[] = []
      for (let i = 1; i <= def.frames; i++) {
        const n = String(i).padStart(2, '0')
        const textureKey = `${def.key}_${n}`
        if (!this.textures.exists(textureKey)) return // frame ausente → mantém o placeholder 'boss'
        const img = this.textures.get(textureKey).getSourceImage() as HTMLImageElement
        frames.push(img)
      }
      sheets.push({ key: def.key, frames })
    }

    for (const sheet of sheets) {
      // Descarta o placeholder procedural 'boss' para entrar o spritesheet real.
      if (this.textures.exists(sheet.key)) this.textures.remove(sheet.key)
      this.buildSpritesheetFromFrames(sheet.key, sheet.frames, BOSS_TARGET_HEIGHT)
    }
  }

  /** Normaliza uma lista de frames (alturas variadas) num spritesheet único. */
  private buildSpritesheetFromFrames(textureKey: string, frames: HTMLImageElement[], targetHeight: number): void {
    const maxW = Math.max(...frames.map((im) => (im.width * targetHeight) / im.height))
    const frameW = Math.ceil(maxW)

    const canvas = document.createElement('canvas')
    canvas.width = frameW * frames.length
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')!

    frames.forEach((im, f) => {
      const h = targetHeight
      const scale = h / im.height
      const w = im.width * scale
      const x = f * frameW + (frameW - w) / 2
      // Ancoragem pela base do conteúdo (ver visibleVerticalBounds).
      const bounds = visibleVerticalBounds(im)
      const y = targetHeight - (bounds.y + bounds.height) * scale
      ctx.drawImage(im, x, y, w, h)
    })

    this.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: targetHeight,
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
      const textureKey = `${EXPLOSION.key}_${i}`
      if (!this.textures.exists(textureKey)) return
      const img = this.textures.get(textureKey).getSourceImage() as HTMLImageElement
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

    const frameWidth = 64
    const frameHeight = 80
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
      const sway = f % 2 === 0 ? 0 : 2 // pequeno balanço p/ caminhada
      const legShift = f % 2 === 0 ? 0 : 2

      // Perna de trás e da frente
      ctx.fillStyle = pants
      ctx.fillRect(o + 20 + legShift, 60, 10, 20)
      ctx.fillRect(o + 36 - legShift, 60, 10, 20)

      // Braços esticados para frente (estilo Thriller)
      ctx.fillStyle = arms
      ctx.fillRect(o + 48, 36 + sway, 16, 8)
      ctx.fillRect(o + 48, 48 - sway, 16, 8)

      // Mãos (pele)
      ctx.fillStyle = skin
      ctx.fillRect(o + 60, 36 + sway, 4, 8)
      ctx.fillRect(o + 60, 48 - sway, 4, 8)

      // Tronco (terno esfarrapado)
      ctx.fillStyle = torso
      ctx.fillRect(o + 16 + sway, 30, 32, 30)

      // Camisa rasgada
      ctx.fillStyle = '#6b707e'
      ctx.fillRect(o + 24 + sway, 36, 16, 6)

      // Cabeça
      ctx.fillStyle = skin
      ctx.fillRect(o + 22 + sway, 8, 20, 22)

      // Olhos
      ctx.fillStyle = eye
      if (f < 3) {
        ctx.fillRect(o + 34 + sway, 16, 2, 2)
        ctx.fillRect(o + 38 + sway, 16, 2, 2)
      }
    }

    this.textures.addSpriteSheet('zombie', canvas as unknown as HTMLImageElement, {
      frameWidth,
      frameHeight,
    })
  }

  /**
   * Sprite procedural pixel art do boss (fallback): seis frames de caminhada e
   * seis de ataque, com braços longos, olhos vermelhos e silhueta maior. É
   * usado apenas quando os frames reais do zumbi-chefe não carregam
   * buildBossSpritesheets o substitui pelos sprites reais quando disponíveis.
   */
  private generateBossPlaceholder(): void {
    if (this.textures.exists('boss')) return

    const frameWidth = 112
    const frameHeight = 144
    const walkFrames = 6
    const attackFrames = 6
    const frameCount = walkFrames + attackFrames

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
      const attack = f >= walkFrames
      const phase = attack ? f - walkFrames : f
      const sway = phase % 2 === 0 ? 0 : 2
      const legShift = attack ? 0 : (phase % 3) - 1
      const reach = attack ? Math.min(20, phase * 4) : 0

      // Pernas largas
      ctx.fillStyle = pants
      ctx.fillRect(o + 28 + sway + legShift, 108, 16, 36)
      ctx.fillRect(o + 60 - sway - legShift, 108, 16, 36)

      // Braços longos: avançam durante o golpe de ataque.
      ctx.fillStyle = arms
      ctx.fillRect(o + 68 + reach, 56 + sway, 36, 12)
      ctx.fillRect(o + 68 + reach, 80 - sway, 36, 12)

      // Mãos (pele)
      ctx.fillStyle = skin
      ctx.fillRect(o + 96 + reach, 52 + sway, 10, 22)
      ctx.fillRect(o + 96 + reach, 76 - sway, 10, 22)

      // Tronco volumoso
      ctx.fillStyle = torso
      ctx.fillRect(o + 16 + sway, 44, 72, 64)

      // Remendo / rasgo no peito
      ctx.fillStyle = '#4a5260'
      ctx.fillRect(o + 36 + sway, 58, 24, 10)

      // Cabeça grande
      ctx.fillStyle = skin
      ctx.fillRect(o + 26 + sway, 8, 54, 36)

      // Cicatriz
      ctx.fillStyle = '#3c4234'
      ctx.fillRect(o + 56 + sway, 16, 18, 4)

      // Olhos vermelhos brilhantes
      ctx.fillStyle = eye
      ctx.fillRect(o + 68 + sway, 24, 4, 4)
      ctx.fillRect(o + 76 + sway, 24, 4, 4)
    }

    this.textures.addSpriteSheet('boss', canvas as unknown as HTMLImageElement, {
      frameWidth,
      frameHeight,
    })
  }
}
