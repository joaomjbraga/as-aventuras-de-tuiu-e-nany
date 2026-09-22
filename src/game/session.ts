import type { ControlSchemeId } from './controls'
import type { CharacterKey } from './sprites'

export type PlayerId = 'P1' | 'P2'

export interface SessionPlayer {
  id: PlayerId
  characterKey: CharacterKey
  controls: ControlSchemeId
}

/**
 * Estado da partida atual: quais personagens cada jogador escolheu.
 * Preenchido na CharacterSelectScene e lido pela MainScene.
 */
export interface GameSession {
  players: SessionPlayer[]
}

const session: GameSession = {
  players: [],
}

export function getSession(): GameSession {
  return session
}

export function setSessionPlayers(players: SessionPlayer[]): void {
  session.players = players
}

export function resetSession(): void {
  session.players = []
}