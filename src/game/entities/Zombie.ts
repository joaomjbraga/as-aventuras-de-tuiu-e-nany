import Phaser from 'phaser'
import { Player } from './Player'

export interface ZombieConfig {
  x: number
  y: number
  hp?: number
  moveSpeed?: number
  /** Sorteia automaticamente a variante visual (1-3) se omitida. */
  variant?: number
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
  private readonly textureKey: string

  constructor(scene: Phaser.Scene, config: ZombieConfig) {
    // Sorteia a variante (1-3) se não vier definida no spawn. Calculado em
    // constante local pois não podemos tocar 'this' antes do super().
    const variant = (config.variant ?? Phaser.Math.Between(1, 3)) as 1 | 2 | 3

    // Textura real normalizada (zombie1/2/3) se tiver sido montada pela
    // PreloadScene; caso contrário usa o placeholder procedural 'zombie'.
    const textureKey = scene.textures.exists(`zombie${variant}`) ? `zombie${variant}` : 'zombie'

    super(scene, config.x, config.y, textureKey, 0)

    // Agora que o super foi chamado, gravamos a textura nos campos.
    this.textureKey = textureKey

    this.hpMax = config.hp ?? 3
    this.hp = this.hpMax
    this.moveSpeed = config.moveSpeed ?? 46
    this.players = config.players
    this.onKilled = config.onKilled
    this.isDying = false
    this.bobPhase = Phaser.Math.FloatBetween(0, Math.PI * 2)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // O mundo tem gravidade global (y=1000) para o jogador; o zumbi é
    // terrestre e anda no próprio par — zera a gravidade para não despencar
    // ao entrar em cena (e eleva só o X no preUpdate).
    this.setGravityY(0)

    // Corpo de colisão menor que o frame: os frames reais têm muito espaço
    // vazio (braços abertos / margem), e o corpo inteiro (ex.: 144px de
    // largura no zombie1) fazia o jogador tomar dano longe do sprite.
    // ~55% da largura e ~85% da altura, ancorado na base (pés).
    const bodyW = Math.max(16, Math.round(this.width * 0.55))
    const bodyH = Math.round(this.height * 0.85)
    this.setBodySize(bodyW, bodyH, false)
    this.body!.setOffset((this.width - bodyW) / 2, this.height - bodyH)

    this.setCollideWorldBounds(true)
    this.setDepth(1)
    this.createAnimations()
    this.play(`${this.textureKey}-walk`, true)
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

  /**
   * Dano de pisão (stomp). Respeita um pequeno cooldown para não drenar HP a
   * cada frame. `amount` permite o power-up de dano em dobro (padrão 2).
   */
  stompDamage(fromX: number, amount = 2): boolean {
    if (this.isDying) return false
    if (this.scene.time.now < this.hurtCooldownUntil) return false
    this.hurtCooldownUntil = this.scene.time.now + 350
    return this.takeDamage(amount, fromX)
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

    this.spawnDeathParticles()

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

  /** Pequena explosão de partículas no local do abate (juiciness). */
  private spawnDeathParticles(): void {
    const emitter = this.scene.add.particles(this.x, this.y, 'pixel', {
      speedX: { min: -70, max: 70 },
      speedY: { min: -70, max: -10 },
      gravityY: 520,
      scale: { start: 1.4, end: 0 },
      lifespan: 520,
      tint: [0xff5d6c, 0x9aa980, 0x6b707e, 0xe8edf7],
    })
    emitter.setDepth(1)
    emitter.explode(14)
    this.scene.time.delayedCall(650, () => emitter.destroy())
  }

  private createAnimations(): void {
    const walkKey = `${this.textureKey}-walk`

    if (!this.scene.anims.exists(walkKey)) {
      // Usa a contagem real de frames da textura (spritesheet real normalizado
      // ou o placeholder 'zombie' de 4 frames) para o fallback nunca estourar.
      const frameTotal = this.scene.textures.get(this.textureKey).frameTotal
      this.scene.anims.create({
        key: walkKey,
        frames: this.scene.anims.generateFrameNumbers(this.textureKey, {
          start: 0,
          end: frameTotal - 1,
        }),
        frameRate: Math.min(12, frameTotal),
        repeat: -1,
      })
    }
  }
}
