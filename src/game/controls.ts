/**
 * Esquemas de controle por jogador.
 * Nomes de teclas seguem os KeyCodes do Phaser 3
 * (ex: 'LEFT', 'RIGHT', 'UP', 'SPACE', 'A', 'D', 'W').
 */
export type ControlSchemeId = 'p1' | 'p2'

export interface ControlScheme {
  id: ControlSchemeId
  label: string
  left: string
  right: string
  jump: string[]
}

export const CONTROL_SCHEMES: Record<ControlSchemeId, ControlScheme> = {
  p1: {
    id: 'p1',
    label: 'Jogador 1',
    left: 'LEFT',
    right: 'RIGHT',
    jump: ['UP', 'SPACE'],
  },
  p2: {
    id: 'p2',
    label: 'Jogador 2',
    left: 'A',
    right: 'D',
    jump: ['W'],
  },
}
