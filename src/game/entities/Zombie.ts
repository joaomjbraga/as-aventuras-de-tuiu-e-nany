import Phaser from 'phaser'
import { DEFAULT_ZOMBIE_SPEED } from '../difficulty'
import { zombieTextureKey } from '../sprites'
import { Player } from './Player'

export const ZOMBIE_DEFAULT_SPEED = DEFAULT_ZOMBIE_SPEED

export interface ZombieConfig {
  x: number
  y: number
  hp?: number
  moveSpeed?: number
  /** Sorteia automaticamente a variante visual (1-3) se omitida. */
  variant?: number
  /** Textura específica (ex.: 'boss'); sem ela, usa a variante visual sorteada. */
  textureKey?: string
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

  protected players: Player[]
  private onKilled?: () => void
  private hurtCooldownUntil = 0
  protected readonly textureKey: string

  constructor(scene: Phaser.Scene, config: ZombieConfig) {
    // Sorteia a variante (1-3) se não vier definida no spawn. Calculado em
    // constante local pois não podemos tocar 'this' antes do super().
    const variant = (config.variant ?? Phaser.Math.Between(1, 3)) as 1 | 2 | 3

    // Textura real normalizada (zombie1/2/3) se tiver sido montada pela
    // PreloadScene; caso contrário usa o placeholder procedural 'zombie'. A
    // mesma resolução roda na MainScene, que precisa da altura real para
    // posicionar o spawn (ver zombieTextureKey).
    const textureKey = config.textureKey ?? zombieTextureKey(variant, (key) => scene.textures.exists(key))

    super(scene, config.x, config.y, textureKey, 0)

    // Agora que o super foi chamado, gravamos a textura nos campos.
    this.textureKey = textureKey

    this.hpMax = config.hp ?? 3
    this.hp = this.hpMax
    this.moveSpeed = config.moveSpeed ?? ZOMBIE_DEFAULT_SPEED
    this.players = config.players
    this.onKilled = config.onKilled
    this.isDying = false

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // O mundo tem gravidade global (ver `gameConfig.physics.arcade.gravity`)
    // para o jogador; o zumbi é terrestre e anda no próprio par, então zera a
    // gravidade para não despencar ao entrar em cena (e eleva só o X no
    // preUpdate).
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
   * cada frame. `amount` permite que a regra de combate aplique o dano forte.
   */
  stompDamage(fromX: number, amount = 2): boolean {
    if (this.isDying) return false
    if (this.scene.time.now < this.hurtCooldownUntil) return false
    // Cooldown curto (200ms): impede drenar HP a cada frame de colisão, mas
    // permite que o jogador pise novamente em um zumbi que sobreviveu ao
    // primeiro pisão (ex.: zumbi com 3 HP e pulo simples de 2 dano).
    this.hurtCooldownUntil = this.scene.time.now + 200
    return this.takeDamage(amount, fromX)
  }

  takeDamage(amount: number, fromX: number): boolean {
    if (this.isDying) return false

    this.hp = Math.max(0, this.hp - amount)

    // Recuo para longe de quem bateu
    const dir = Math.sign(this.x - fromX) || 1
    this.setVelocityX(dir * 240)

    // Flash branco ao levar dano
    this.setTintFill(0xffffff)
    this.scene.time.delayedCall(180, () => {
      if (this.active) this.clearTint()
    })

    if (this.hp <= 0) {
      this.die()
      return true
    }
    return false
  }

  protected findNearestPlayer(): Player | null {
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

    this.spawnDeathEffect()

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 20,
      scale: 1.4,
      duration: 640,
      ease: 'Linear',
      onComplete: () => {
        if (this.active) this.destroy()
      },
    })

    this.onKilled?.()
  }

  /**
   * Efeito de abate: explosão animada (spritesheet 'explosion') quando o
   * asset foi montado pela PreloadScene; senão cai nas partículas simples.
   */
  private spawnDeathEffect(): void {
    if (this.scene.textures.exists('explosion')) {
      const boom = this.scene.add.sprite(this.x, this.y, 'explosion').setOrigin(0.5).setDepth(1)
      boom.play('explosion-boom')
      boom.once('animationcomplete', () => boom.destroy())
      return
    }

    const emitter = this.scene.add.particles(this.x, this.y, 'pixel', {
      speedX: { min: -140, max: 140 },
      speedY: { min: -140, max: -20 },
      gravityY: 1040,
      scale: { start: 2.8, end: 0 },
      lifespan: 1040,
      tint: [0xff5d6c, 0x9aa980, 0x6b707e, 0xe8edf7],
    })
    emitter.setDepth(1)
    emitter.explode(28)
    this.scene.time.delayedCall(1300, () => emitter.destroy())
  }

  protected createAnimations(): void {
    const walkKey = `${this.textureKey}-walk`

    if (!this.scene.anims.exists(walkKey)) {
      // Usa a contagem real de frames da textura (spritesheet real normalizado
      // ou o placeholder 'zombie' de 4 frames) para o fallback nunca estourar.
      const frameTotal = this.scene.textures.get(this.textureKey).frameTotal
      const lastFrame = frameTotal - 1
      this.scene.anims.create({
        key: walkKey,
        frames: this.scene.anims.generateFrameNumbers(this.textureKey, {
          start: 0,
          end: lastFrame,
        }),
        frameRate: Math.min(12, frameTotal),
        repeat: -1,
      })
    }
  }
}
