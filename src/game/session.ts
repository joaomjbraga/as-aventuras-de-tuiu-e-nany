import type { ControlSchemeId } from './controls'
import type { CharacterKey } from './sprites'
import { HOUSE_LEVEL_ID, getLevel, randomNextLevel, type LevelConfig } from './levels'
import {
  DEFAULT_MATCH_DIFFICULTY,
  resolveLevelForDifficulty,
  type MatchDifficultyId,
  type ResolvedMatchLevel,
} from './difficultyPresets'

export type PlayerId = 'P1' | 'P2'

export interface SessionPlayer {
  id: PlayerId
  characterKey: CharacterKey
  controls: ControlSchemeId
}

/**
 * Estado da partida atual: personagens escolhidos e fase em andamento.
 * Preenchido na CharacterSelectScene / MainScene e lido pela próxima cena.
 */
export interface GameSession {
  players: SessionPlayer[]
  /** Fase atual da campanha (id em `LEVELS`). */
  levelId: string
  /** Dificuldade escolhida para a partida atual. */
  difficultyId: MatchDifficultyId
}

const session: GameSession = {
  players: [],
  levelId: HOUSE_LEVEL_ID,
  difficultyId: DEFAULT_MATCH_DIFFICULTY,
}

/** Devolve uma cópia da sessão (evita mutação acidental pelos chamadores). */
export function getSession(): GameSession {
  return { players: [...session.players], levelId: session.levelId, difficultyId: session.difficultyId }
}

export function setSessionPlayers(players: SessionPlayer[]): void {
  session.players = players
}

/** Config da fase atual da sessão. */
export function getSessionLevel(): ResolvedMatchLevel {
  return resolveLevelForDifficulty(getLevel(session.levelId), session.difficultyId)
}

export function setSessionLevel(levelId: string): void {
  session.levelId = levelId
}

export function getSessionDifficulty(): MatchDifficultyId {
  return session.difficultyId
}

export function setSessionDifficulty(difficultyId: MatchDifficultyId): void {
  session.difficultyId = difficultyId
}

/**
 * Avança para a próxima fase (sorteada entre as demais, sem repetir a atual).
 * Persiste na sessão. Retorna a nova fase ou `null` na última.
 */
export function advanceSessionLevel(): LevelConfig | null {
  const next = randomNextLevel(getSessionLevel())
  if (!next) return null
  session.levelId = next.id
  return next
}

export function resetSession(): void {
  session.players = []
  session.levelId = HOUSE_LEVEL_ID
  session.difficultyId = DEFAULT_MATCH_DIFFICULTY
}
