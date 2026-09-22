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
 *
 * TODO IMPORTANTE: informar o tamanho real dos frames
 * (frameWidth/frameHeight) e os nomes de arquivo reais abaixo.
 * Enquanto não estiverem definidos, o jogo usa um placeholder gerado
 * em runtime na PreloadScene.
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
 * Spritesheets gerados a partir dos PNGs em assets/sprites/boy e /girl
 * (frames 01-06 = walk, 07-09 = jump: agachar/ar/aterrissagem), reduzidos
 * a 25% para caber na resolução base 384x216. Os arquivos originais não
 * foram alterados.
 */
export const CHARACTERS = {
  tuio: {
    key: 'tuio',
    name: 'Tuiu',
    path: 'sprites/tuio.png', // gerado de assets/sprites/boy
    frameWidth: 43,
    frameHeight: 74,
    bodyWidth: 30,
    bodyHeight: 68,
  },
  nany: {
    key: 'nany',
    name: 'Nany',
    path: 'sprites/nany.png', // gerado de assets/sprites/girl
    frameWidth: 48,
    frameHeight: 84,
    bodyWidth: 34,
    bodyHeight: 80,
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
}

export const ZOMBIE_VARIANTS: ZombieVariantDef[] = [
  { key: 'zombie1', path: 'sprites/zombie1_frames/zombie1_', frames: 15 },
  { key: 'zombie2', path: 'sprites/zombie2_frames/zombie2_', frames: 17 },
  { key: 'zombie3', path: 'sprites/zombie3_frames/zombie3_', frames: 17 },
]

/** Altura alvo (px) do zumbi normalizado, na mesma escala do placeholder antigo (40px). */
export const ZOMBIE_TARGET_HEIGHT = 64

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