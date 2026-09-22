import Phaser from 'phaser'
import { Player } from './Player'

export interface ZombieConfig {
  x: number
  y: number
  hp?: number
  moveSpeed?: number
  players: Player[]
  onKilled?: () => void
}

/**
 * Zumbi do cemitério (Thriller style).
 * Anda em direção ao jogador mais próximo; é derrotado ao ser pisado
 * (stomp) e causa dano no contato lateral.
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  readonly hpMax: number
  hp: number
  moveSpeed: number

  isDying: boolean

  private players: Player[]
  private onKilled?: () => void
  private hurtCooldownUntil = 0
  private bobPhase: number

  constructor(scene: Phaser.Scene, config: ZombieConfig) {
    super(scene, config.x, config.y, 'zombie', 0)

    this.hpMax = config.hp ?? 3
    this.hp = this.hpMax
    this.moveSpeed = config.moveSpeed ?? 46
    this.players = config.players
    this.onKilled = config.onKilled
    this.isDying = false
    this.bobPhase = Phaser.Math.FloatBetween(0, Math.PI * 2)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setDepth(1)
    this.createAnimations()
    this.play('zombie-walk', true)
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)

    if (this.isDying) return

    const target = this.findNearestPlayer()
    if (!target) {
      this.setVelocityX(0)
      return
    }

    const dir = Math.sign(target.sprite.x - this.x) || 1
    this.setVelocityX(dir * this.moveSpeed)
    this.flipX = dir < 0
  }

  /** Dano de pisão (stomp). Respeita um pequeno cooldown para não drenar HP a cada frame. */
  stompDamage(fromX: number): boolean {
    if (this.isDying) return false
    if (this.scene.time.now < this.hurtCooldownUntil) return false
    this.hurtCooldownUntil = this.scene.time.now + 350
    return this.takeDamage(2, fromX)
  }

  takeDamage(amount: number, fromX: number): boolean {
    if (this.isDying) return false

    this.hp = Math.max(0, this.hp - amount)

    // Recuo para longe de quem bateu
    const dir = Math.sign(this.x - fromX) || 1
    this.setVelocityX(dir * 120)

    // Flash branco ao levar dano
    this.setTintFill(0xffffff)
    this.scene.time.delayedCall(90, () => {
      if (this.active) this.clearTint()
    })

    if (this.hp <= 0) {
      this.die()
      return true
    }
    return false
  }

  private findNearestPlayer(): Player | null {
    let best: Player | null = null
    let bestDist = Infinity

    for (const player of this.players) {
      if (!player.isAlive) continue
      const dist = Math.abs(player.sprite.x - this.x)
      if (dist < bestDist) {
        bestDist = dist
        best = player
      }
    }
    return best
  }

  private die(): void {
    this.isDying = true
    this.setVelocity(0, 0)
    this.disableBody(false, false)
    this.setDepth(0)

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 10,
      scale: 0.7,
      duration: 320,
      ease: 'Linear',
      onComplete: () => {
        if (this.active) this.destroy()
      },
    })

    this.onKilled?.()
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('zombie-walk')) {
      this.scene.anims.create({
        key: 'zombie-walk',
        frames: this.scene.anims.generateFrameNumbers('zombie', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      })
    }
  }
}