/**
 * Registro das fases do jogo (cenários).
 *
 * Cada fase declara sua arte de fundo (vídeo com fallback de imagem),
 * visual do chão e da névoa, meta de vitória e curva de dificuldade.
 *
 * Para adicionar uma nova fase: crie um `LevelConfig` e inclua-o em `LEVELS`,
 * na ordem em que deve ser jogada. Os assets são carregados automaticamente
 * pela PreloadScene (chaves derivadas de `id`), e o encaminhamento
 * "vitória → próxima fase" já existe na MainScene.
 */

import { DEFAULT_DIFFICULTY, VICTORY_KILLS, type DifficultyParams } from './difficulty'

export interface LevelArt {
  /** Arte estática do fundo (fallback quando não há vídeo ou codec indisponível). */
  image: string
  /** Vídeo de fundo opcional (autoplay no Electron). */
  video?: string
}

export interface LevelBossConfig {
  /** Nome exibido na barra de vida do boss. */
  name: string
  /** Pontos de vida (pisões para derrotar, considerando dano em dobro). */
  hp: number
  /** Velocidade de deslocamento (padrão: mais lento que o zumbi comum). */
  moveSpeed?: number
}

export interface LevelConfig {
  /** Identificador único (usado nas chaves de assets: `bg-<id>`, `bg-<id>-img`). */
  id: string
  /** Nome exibido na tela de vitória (ex.: "CASA"). */
  name: string
  art: LevelArt
  groundColor: number
  groundStrokeColor: number
  fogColor: number
  /** Abates necessários para vencer esta fase (sem boss). */
  victoryKills: number
  difficulty: DifficultyParams
  /** Quando definido, ao atingir a meta de abates surge um boss; só se vence ao derrotá-lo. */
  boss?: LevelBossConfig
}

export const HOUSE_LEVEL_ID = 'home'

export const LEVELS: LevelConfig[] = [
  {
    id: HOUSE_LEVEL_ID,
    name: 'CASA',
    art: {
      video: 'scenes/scenes-my-home.mp4',
      image: 'scenes/scenes-my-home.jpg',
    },
    groundColor: 0x232633,
    groundStrokeColor: 0x2f3245,
    fogColor: 0xd8d8c8,
    victoryKills: VICTORY_KILLS,
    difficulty: DEFAULT_DIFFICULTY,
    boss: { name: 'ZUMBI-CHEFE', hp: 20, moveSpeed: 26 },
  },
  {
    id: 'ieab',
    name: 'IEAB',
    art: {
      video: 'scenes/IEAB.mp4',
      image: 'scenes/IEAB.jpg',
    },
    groundColor: 0x1e2a3a,
    groundStrokeColor: 0x2a3f5a,
    fogColor: 0x8ab4d8,
    victoryKills: 25,
    difficulty: {
      maxSimultaneousZombies: 14,
      spawnStartDelay: 2200,
      spawnMinDelay: 400,
      difficultyRampMs: 100_000,
    },
    boss: { name: 'GUARDIÃO DO IEAB', hp: 28, moveSpeed: 28 },
  },
  {
    id: 'castro-alves',
    name: 'CASTRO ALVES',
    art: {
      video: 'scenes/Castro_Alves.mp4',
      image: 'scenes/Castro_Alves.jpg',
    },
    groundColor: 0x2d1e2a,
    groundStrokeColor: 0x4a2a3f,
    fogColor: 0xd8a8c8,
    victoryKills: 30,
    difficulty: {
      maxSimultaneousZombies: 16,
      spawnStartDelay: 1800,
      spawnMinDelay: 350,
      difficultyRampMs: 90_000,
    },
    boss: { name: 'POETA SOMBRIO', hp: 35, moveSpeed: 30 },
  },
  {
    id: 'cetep',
    name: 'CETEP',
    art: {
      video: 'scenes/CETEP.mp4',
      image: 'scenes/CETEP.jpg',
    },
    groundColor: 0x1a2a1e,
    groundStrokeColor: 0x2a4a2f,
    fogColor: 0xa8d8b8,
    victoryKills: 35,
    difficulty: {
      maxSimultaneousZombies: 18,
      spawnStartDelay: 1500,
      spawnMinDelay: 300,
      difficultyRampMs: 80_000,
    },
    boss: { name: 'MESTRE TÉCNICO', hp: 42, moveSpeed: 32 },
  },
]

/** Resolve a fase pelo id; ids desconhecidos caem na primeira fase. */
export function getLevel(id: string): LevelConfig {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0]
}

/** Chave da textura do vídeo de fundo de uma fase (`bg-<id>`). */
export function bgVideoKey(level: LevelConfig): string {
  return `bg-${level.id}`
}

/** Chave da imagem de fundo de uma fase (`bg-<id>-img`). */
export function bgImageKey(level: LevelConfig): string {
  return `bg-${level.id}-img`
}

/** Próxima fase na ordem da campanha; `null` quando é a última. */
export function nextLevel(current: LevelConfig): LevelConfig | null {
  const index = LEVELS.findIndex((level) => level.id === current.id)
  if (index === -1 || index + 1 >= LEVELS.length) return null
  return LEVELS[index + 1]
}

/**
 * Sorteia a próxima fase entre as DEMAIS (sem repetir a atual).
 * `null` quando não há outra fase para sortear. O RNG fica injetável
 * para testes determinísticos.
 */
export function randomNextLevel(current: LevelConfig, rng: () => number = Math.random): LevelConfig | null {
  return pickRandomLevel(current, LEVELS, rng)
}

/** Lógica pura do sorteio (usada por `randomNextLevel` e pelos testes). */
export function pickRandomLevel(
  current: LevelConfig,
  pool: readonly LevelConfig[],
  rng: () => number = Math.random,
): LevelConfig | null {
  const others = pool.filter((level) => level.id !== current.id)
  if (others.length === 0) return null
  const index = Math.min(others.length - 1, Math.floor(rng() * others.length))
  return others[index]
}
