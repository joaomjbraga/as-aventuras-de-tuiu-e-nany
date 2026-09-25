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

type BossAttack = 'golpe' | 'investida'

/** Alcance do golpe (balanço parado no lugar). */
const GOLPE_RANGE = 112
/** Cooldown entre golpes (abre janela para o jogador se aproximar e pisar). */
const GOLPE_COOLDOWN_MS = 3200
/** Alcance e velocidade da investida (dash em linha reta) e cooldown entre investidas. */
const INVESTIDA_RANGE = 300
const INVESTIDA_SPEED = 300
const INVESTIDA_COOLDOWN_MS = 7500

/**
 * Boss de fase (final wave): o zumbi-chefe. Maior que os zumbis comuns (o
 * spritesheet é normalizado para BOSS_TARGET_HEIGHT), lento e com muita vida.
 * Anda até o jogador, golpeia quando chega perto e, de vez em quando, investe
 * numa carga (dash) para fechar distância. Ao atingir a meta de abates a arena
 * "vira" para a luta de boss, e a fase só termina quando ele for derrotado.
 */
export class Boss extends Zombie {
  private attacking: BossAttack | null = null
  private attackCooldownUntil = 0
  private nextDashAt = 0

  constructor(scene: Phaser.Scene, config: BossConfig) {
    super(scene, {
      x: config.x,
      y: config.y,
      hp: config.hp,
      moveSpeed: config.moveSpeed ?? 60,
      variant: 1,
      textureKey: 'boss',
      players: config.players,
      onKilled: config.onKilled,
    })
  }

  /**
   * Cria as animações do zumbi-chefe. Com os sprites reais montados pela
   * PreloadScene (chave 'boss-idle' presente), usa um spritesheet por animação
   * (walk/idle/golpe/investida). No fallback procedural (12 frames: 6 walk + 6
   * ataque), mapeia as mesmas chaves para os frames do placeholder.
   */
  protected createAnimations(): void {
    const anims = this.scene.anims
    const real = this.scene.textures.exists('boss-idle')

    if (!anims.exists('boss-walk')) {
      const lastFrame = real ? this.scene.textures.get('boss').frameTotal - 1 : 5
      anims.create({
        key: 'boss-walk',
        frames: anims.generateFrameNumbers('boss', { start: 0, end: lastFrame }),
        frameRate: real ? 10 : 8,
        repeat: -1,
      })
    }

    if (real) {
      if (!anims.exists('boss-idle')) {
        anims.create({
          key: 'boss-idle',
          frames: anims.generateFrameNumbers('boss-idle', { start: 0, end: 7 }),
          frameRate: 8,
          repeat: -1,
        })
      }
      if (!anims.exists('boss-attack')) {
        anims.create({
          key: 'boss-attack',
          frames: anims.generateFrameNumbers('boss-attack', { start: 0, end: 2 }),
          frameRate: 12,
          repeat: 0,
        })
      }
      if (!anims.exists('boss-investida')) {
        anims.create({
          key: 'boss-investida',
          frames: anims.generateFrameNumbers('boss-investida', { start: 0, end: 3 }),
          frameRate: 12,
          repeat: 0,
        })
      }
    } else {
      if (!anims.exists('boss-idle')) {
        anims.create({ key: 'boss-idle', frames: [{ key: 'boss', frame: 0 }], repeat: -1 })
      }
      if (!anims.exists('boss-attack')) {
        anims.create({
          key: 'boss-attack',
          frames: anims.generateFrameNumbers('boss', { start: 6, end: 11 }),
          frameRate: 12,
          repeat: 0,
        })
      }
      if (!anims.exists('boss-investida')) {
        anims.create({
          key: 'boss-investida',
          frames: anims.generateFrameNumbers('boss', { start: 6, end: 11 }),
          frameRate: 12,
          repeat: 0,
        })
      }
    }
  }

  preUpdate(time: number, delta: number): void {
    // O base atualiza as animações e o movimento normal (andar em direção ao
    // jogador mais próximo); as regras de ataque são aplicadas por cima.
    super.preUpdate(time, delta)
    if (this.isDying) return

    if (this.attacking) {
      // Golpe fixa o boss no lugar; a investida mantém o dash em linha reta.
      if (this.attacking === 'golpe') this.setVelocityX(0)

      // A animação one-shot terminou → volta ao comportamento normal.
      if (!this.anims.isPlaying) {
        this.attacking = null
        this.playIdleOrWalk()
      }
      return
    }

    const target = this.findNearestPlayer()
    if (!target) return // sem alvo: o base já zerou a velocidade; idle

    const dist = Math.abs(target.sprite.x - this.x)

    if (time >= this.attackCooldownUntil) {
      if (dist < GOLPE_RANGE) {
        this.attacking = 'golpe'
        this.attackCooldownUntil = time + GOLPE_COOLDOWN_MS
        this.setVelocityX(0)
        this.play('boss-attack', true)
        return
      }

      if (time >= this.nextDashAt && dist <= INVESTIDA_RANGE) {
        this.attacking = 'investida'
        this.attackCooldownUntil = time + 1400
        this.nextDashAt = time + INVESTIDA_COOLDOWN_MS
        this.flipX = target.sprite.x < this.x
        this.setVelocityX((target.sprite.x > this.x ? 1 : -1) * INVESTIDA_SPEED)
        this.play('boss-investida', true)
        return
      }
    }

    // Andando em direção ao alvo (movimento já veio do super).
    this.playIdleOrWalk()
  }

  private playIdleOrWalk(): void {
    const target = this.findNearestPlayer()
    const anim = target ? 'boss-walk' : 'boss-idle'
    if (this.anims.currentAnim?.key !== anim) this.play(anim, true)
  }
}
