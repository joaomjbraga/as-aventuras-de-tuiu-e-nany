/**
 * ============================================================
 * CONFIGURAÇÃO DOS SPRITESHEETS
 * ============================================================
 *
 * Layout de frames assumido (9 frames, organizados na horizontal):
 *
 *   [0] [1] [2] [3] [4] [5]  |  [6]      [7]      [8]
 *   --------- walk ---------  |  -- jump ---------------
 *   ciclo de caminhada (6)    |  agachar, ar, aterrissagem
 *
 * Idle: repete o frame 0 (primeiro frame do walk).
 */

export interface SpritesheetDef {
  key: string
  path: string
  frameWidth: number
  frameHeight: number
}

export interface CharacterDef extends SpritesheetDef {
  name: string
  /** Tamanho do corpo de colisão (arcade), menor que o frame por causa da margem transparente. */
  bodyWidth: number
  bodyHeight: number
  /** Escala aplicada ao sprite em jogo (física é ajustada automaticamente). */
  scale: number
}

/**
 * Índices de frames no spritesheet.
 * Ajuste aqui se o layout dos seus sprites for diferente.
 */
export const FRAME_LAYOUT = {
  WALK: [0, 1, 2, 3, 4, 5],
  JUMP: [6, 7, 8],
  IDLE: [0], // repete primeiro frame do walk
} as const

/**
 * Personagens.
 * Spritesheets tuio.png/nany.png (9 frames: 6 walk + 3 jump: agachar/ar/aterrissagem),
 * reduzidos a 25% para caber na resolução base 384x216.
 */
export const CHARACTERS = {
  tuio: {
    key: 'tuio',
    name: 'Tuiu',
    path: 'sprites/tuio.png',
    frameWidth: 43,
    frameHeight: 74,
    bodyWidth: 30,
    bodyHeight: 68,
    scale: 0.85,
  },
  nany: {
    key: 'nany',
    name: 'Nany',
    path: 'sprites/nany.png',
    frameWidth: 48,
    frameHeight: 84,
    bodyWidth: 34,
    bodyHeight: 80,
    // Menor que o Tuiu para compensar o frame mais alto (84 vs 74) e ficarem
    // com a mesma altura em jogo: 84 * 0.75 ≈ 74 * 0.85.
    scale: 0.75,
  },
} satisfies Record<string, CharacterDef>

export type CharacterKey = keyof typeof CHARACTERS

/**
 * Zumbis reais: cada variante é uma pasta com N frames individuais (PNGs
 * de tamanhos variados). Eles são empacotados em runtime (PreloadScene)
 * num spritesheet normalizado, para caber no pipeline de animações do Phaser.
 */
export interface ZombieVariantDef {
  key: string
  path: string
  frames: number
  /** Altura-alvo (px) da normalização desta variante. Padrão: ZOMBIE_TARGET_HEIGHT. */
  targetHeight?: number
}

/**
 * Zumbis 1 e 2 são normalizados um pouco menores (58px) para ficarem no
 * mesmo tamanho dos personagens; o zumbi 3 mantém a altura padrão (64px).
 */
export const ZOMBIE_VARIANTS: ZombieVariantDef[] = [
  { key: 'zombie1', path: 'sprites/zombie1_frames/zombie1_', frames: 15, targetHeight: 58 },
  { key: 'zombie2', path: 'sprites/zombie2_frames/zombie2_', frames: 17, targetHeight: 58 },
  { key: 'zombie3', path: 'sprites/zombie3_frames/zombie3_', frames: 17 },
]

/** Altura alvo (px) do zumbi normalizado, na mesma escala do placeholder antigo (40px). */
export const ZOMBIE_TARGET_HEIGHT = 64

/**
 * Explosão de abate dos zumbis: 6 frames individuais (PNGs de tamanhos
 * variados) empacotados em runtime num spritesheet quadrado normalizado
 * (PreloadScene), exibido no local da morte no lugar das partículas.
 */
export const EXPLOSION = {
  key: 'explosion',
  path: 'sprites/explosao/explosao_',
  frames: 6,
  /** Lado (px) do quadrado alvo da normalização, maior que o zumbi (~64px). */
  frameSize: 96,
} as const

/** Altura-alvo (px) da normalização do boss, maior que a dos zumbis comuns (58–64),
 * mas baixa o suficiente para o pulo alcançar a cabeça e permitir o pisão (stomp). */
export const BOSS_TARGET_HEIGHT = 80

export interface BossAnimationDef {
  /** Chave da textura do spritesheet (a de walk também é a textura-padrão 'boss'). */
  key: string
  /** Caminho da pasta dos frames individuais (com prefixo do frame). */
  path: string
  /** Quantidade de PNGs da animação. */
  frames: number
}

/**
 * Animações do zumbi-chefe (src/assets/sprites/zumbi_chefe). Cada animação é
 * empacotada em runtime (PreloadScene) num spritesheet normalizado para
 * BOSS_TARGET_HEIGHT. A de walk usa a chave 'boss'  a textura-padrão do Boss
 *  e as demais ganham chaves próprias (boss-idle/-attack/-investida).
 */
export const BOSS_ANIMATIONS = {
  idle: { key: 'boss-idle', path: 'sprites/zumbi_chefe/idle/idle_', frames: 8 },
  walk: { key: 'boss', path: 'sprites/zumbi_chefe/walk/walk_', frames: 11 },
  attack: { key: 'boss-attack', path: 'sprites/zumbi_chefe/attack_golpe/attack_golpe_', frames: 3 },
  investida: { key: 'boss-investida', path: 'sprites/zumbi_chefe/attack_investida/attack_investida_', frames: 4 },
} as const

/**
 * Configuração das animações por personagem.
 * frameRate pode ser ajustado por personagem se necessário.
 */
export function getAnimConfigs(spriteKey: string): {
  key: string
  frames: Phaser.Types.Animations.AnimationFrame[]
  frameRate?: number
  repeat: number
}[] {
  return [
    {
      key: `${spriteKey}-idle`,
      frames: [{ key: spriteKey, frame: FRAME_LAYOUT.IDLE[0] }],
      frameRate: 1,
      repeat: -1,
    },
    {
      key: `${spriteKey}-walk`,
      frames: FRAME_LAYOUT.WALK.map((frame) => ({ key: spriteKey, frame })),
      frameRate: 10,
      repeat: -1,
    },
    {
      key: `${spriteKey}-jump`,
      frames: FRAME_LAYOUT.JUMP.map((frame) => ({
        key: spriteKey,
        frame,
        duration: frame === FRAME_LAYOUT.JUMP[1] ? 90 : 120,
      })),
      frameRate: undefined,
      repeat: 0,
    },
  ]
}
