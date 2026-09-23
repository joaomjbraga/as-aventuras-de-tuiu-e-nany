import type Phaser from 'phaser'
import { Zombie } from './Zombie'
import type { Player } from './Player'

export interface BossConfig {
  x: number
  y: number
  hp: number
  moveSpeed?: number
  players: Player[]
  onKilled?: () => void
}

/**
 * Boss de fase (final wave): um zumbi gigante procedural, lento e com muita
 * vida. Ao atingir a meta de abates a arena "vira" para a luta de boss, e a
 * fase só termina quando ele for derrotado.
 */
export class Boss extends Zombie {
  constructor(scene: Phaser.Scene, config: BossConfig) {
    super(scene, {
      x: config.x,
      y: config.y,
      hp: config.hp,
      moveSpeed: config.moveSpeed ?? 24,
      variant: 1,
      textureKey: 'boss',
      players: config.players,
      onKilled: config.onKilled,
    })
  }
}
