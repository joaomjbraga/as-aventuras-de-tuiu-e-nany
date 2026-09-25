/**
 * Registro das fases do jogo (cenários).
 *
 * Cada fase declara sua arte de fundo estática, visual do chão e da névoa,
 * meta de vitória e curva de dificuldade.
 *
 * Para adicionar uma nova fase: crie um `LevelConfig` e inclua-o em `LEVELS`,
 * na ordem em que deve ser jogada. Os assets são carregados automaticamente
 * pela PreloadScene (chaves derivadas de `id`), e o encaminhamento
 * "vitória → próxima fase" já existe na MainScene.
 */

import { DEFAULT_DIFFICULTY, VICTORY_KILLS, type DifficultyParams } from './difficulty'

export interface LevelArt {
  /** Arte estática do fundo (imagem JPG). */
  image: string
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
  /** Identificador único (usado nas chaves de assets: `bg-<id>-img`). */
  id: string
  /** Nome exibido na tela de vitória (ex.: "CASA"). */
  name: string
  art: LevelArt
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
      image: 'scenes/scenes-my-home.jpg',
    },
    fogColor: 0xd8d8c8,
    victoryKills: VICTORY_KILLS,
    difficulty: DEFAULT_DIFFICULTY,
    boss: { name: 'ZUMBI-CHEFE', hp: 14, moveSpeed: 48 },
  },
  {
    id: 'ieab',
    name: 'IEAB',
    art: {
      image: 'scenes/IEAB.jpg',
    },
    fogColor: 0x8ab4d8,
    victoryKills: 25,
    difficulty: {
      maxSimultaneousZombies: 14,
      spawnStartDelay: 2200,
      spawnMinDelay: 400,
      difficultyRampMs: 100_000,
    },
    boss: { name: 'GUARDIÃO DO IEAB', hp: 18, moveSpeed: 52 },
  },
  {
    id: 'castro-alves',
    name: 'CASTRO ALVES',
    art: {
      image: 'scenes/Castro_Alves.jpg',
    },
    fogColor: 0xd8a8c8,
    victoryKills: 30,
    difficulty: {
      maxSimultaneousZombies: 16,
      spawnStartDelay: 1800,
      spawnMinDelay: 350,
      difficultyRampMs: 90_000,
    },
    boss: { name: 'POETA SOMBRIO', hp: 24, moveSpeed: 56 },
  },
  {
    id: 'cetep',
    name: 'CETEP',
    art: {
      image: 'scenes/CETEP.jpg',
    },
    fogColor: 0xa8d8b8,
    victoryKills: 35,
    difficulty: {
      maxSimultaneousZombies: 18,
      spawnStartDelay: 1500,
      spawnMinDelay: 300,
      difficultyRampMs: 80_000,
    },
    boss: { name: 'MESTRE TÉCNICO', hp: 28, moveSpeed: 60 },
  },
]

/** Resolve a fase pelo id; ids desconhecidos caem na primeira fase. */
export function getLevel(id: string): LevelConfig {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0]
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

/** Fases disponíveis para sorteio (todas, exceto a atual). */
export function pickRandomLevel(
  current: LevelConfig,
  pool: LevelConfig[] = LEVELS,
  rng: () => number = Math.random,
): LevelConfig | null {
  const others = pool.filter((level) => level.id !== current.id)
  if (others.length === 0) return null
  return others[Math.floor(rng() * others.length)]
}

/** Próxima fase aleatória (sem repetir a atual). */
export function randomNextLevel(current: LevelConfig): LevelConfig | null {
  return pickRandomLevel(current)
}

/** Todas as fases do jogo já foram concluídas ao menos uma vez (campanha zerada). */
export function allLevelsCompleted(completedIds: string[]): boolean {
  return LEVELS.every((level) => completedIds.includes(level.id))
}
