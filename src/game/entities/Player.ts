import Phaser from 'phaser'
import { FRAME_LAYOUT, getAnimConfigs } from '../sprites'
import { CONTROL_SCHEMES, type ControlSchemeId } from '../controls'

export type PlayerState = 'idle' | 'walk' | 'jump'

export interface PlayerConfig {
  id: string
  name: string
  x: number
  y: number
  spriteKey: string
  controls: ControlSchemeId
  bodyWidth?: number
  bodyHeight?: number
}

/**
 * Um jogador controlável. Cada instância lê seu próprio esquema de
 * controles (P1 = setas/espaço, P2 = A/D/W), então dá para ter vários
 * em cena simultaneamente (co-op local).
 */
export class Player {
  readonly id: string
  readonly name: string
  readonly spriteKey: string
  readonly sprite: Phaser.Physics.Arcade.Sprite

  readonly maxHp = 3
  hp = this.maxHp
  isAlive = true

  private scene: Phaser.Scene
  private keys: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    jump: Phaser.Input.Keyboard.Key[]
  }

  private state: PlayerState = 'idle'
  private isFacingRight = true
  private immuneUntil = 0

  // Física (ajustável para o "jeitão" do jogo)
  private moveSpeed = 160
  private jumpForce = 380

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.scene = scene
    this.id = config.id
    this.name = config.name
    this.spriteKey = config.spriteKey

    this.sprite = scene.physics.add.sprite(config.x, config.y, config.spriteKey)
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setDepth(1)

    if (config.bodyWidth && config.bodyHeight) {
      // Corpo de colisão menor que o frame (margem transparente) e alinhado
      // embaixo, porque os pés ficam na base do frame.
      this.sprite.setBodySize(config.bodyWidth, config.bodyHeight, false)
      this.sprite.body!.setOffset(
        (this.sprite.width - config.bodyWidth) / 2,
        this.sprite.height - config.bodyHeight,
      )
    }

    const scheme = CONTROL_SCHEMES[config.controls]
    const kb = scene.input.keyboard
    if (!kb) {
      throw new Error('Keyboard input indisponível. Ative input em gameConfig.')
    }
    this.keys = {
      left: kb.addKey(scheme.left),
      right: kb.addKey(scheme.right),
      jump: scheme.jump.map((key) => kb.addKey(key)),
    }

    this.createAnimations()
    this.playState('idle')
  }

  update(): void {
    if (!this.isAlive) {
      this.sprite.setVelocity(0, 0)
      return
    }

    const body = this.sprite.body as Phaser.Physics.Arcade.Body

    const moveLeft = this.keys.left.isDown
    const moveRight = this.keys.right.isDown
    const jumpPressed = this.keys.jump.some((key) => key.isDown)

    // ---- Movimento horizontal ----
    if (moveLeft) {
      this.sprite.setVelocityX(-this.moveSpeed)
      this.sprite.flipX = true
      this.isFacingRight = false
    } else if (moveRight) {
      this.sprite.setVelocityX(this.moveSpeed)
      this.sprite.flipX = false
      this.isFacingRight = true
    } else {
      this.sprite.setVelocityX(0)
    }

    // ---- Pulo ----
    if (jumpPressed && body.blocked.down) {
      this.sprite.setVelocityY(-this.jumpForce)
      this.setState('jump')
    }

    // ---- Máquina de estados ----
    if (!body.blocked.down) {
      // No ar (pulou ou caiu de uma plataforma)
      if (this.state !== 'jump') this.setState('jump')
    } else if (moveLeft || moveRight) {
      if (this.state !== 'walk') this.setState('walk')
    } else if (this.state !== 'idle') {
      this.setState('idle')
    }

    // Se a animação de pulo está no frame de aterrissagem (8) mas o
    // personagem ainda está no ar, segura no frame "ar" (7).
    if (
      this.state === 'jump' &&
      !body.blocked.down &&
      this.sprite.anims.currentFrame?.isLast
    ) {
      this.sprite.setFrame(FRAME_LAYOUT.JUMP[1])
    }

    // Trava o jogador na área visível (reforço além do collideWorldBounds)
    const { width, height } = this.scene.scale
    const hw = body.halfWidth
    const hh = body.halfHeight
    if (this.sprite.x < hw) this.sprite.x = hw
    else if (this.sprite.x > width - hw) this.sprite.x = width - hw
    if (this.sprite.y < hh) this.sprite.y = hh
    else if (this.sprite.y > height - hh) this.sprite.y = height - hh

    // Pisca enquanto estiver invulnerável (após levar dano)
    if (this.scene.time.now < this.immuneUntil) {
      this.sprite.alpha = Math.floor(this.scene.time.now / 90) % 2 === 0 ? 0.35 : 1
    } else if (this.sprite.alpha !== 1) {
      this.sprite.alpha = 1
    }
  }

  /**
   * Aplica dano se o jogador não estiver invulnerável.
   * Retorna true se o dano foi aplicado.
   */
  damage(amount: number): boolean {
    if (!this.isAlive || this.scene.time.now < this.immuneUntil) return false

    this.hp = Math.max(0, this.hp - amount)
    this.immuneUntil = this.scene.time.now + 1000

    this.sprite.setTintFill(0xff8888)
    this.scene.time.delayedCall(150, () => {
      if (this.sprite.active) this.sprite.clearTint()
    })

    if (this.hp <= 0) this.die()
    return true
  }

  /** Quique usado ao pisar em um zumbi. */
  bounce(forceY: number): void {
    if (this.isAlive) this.sprite.setVelocityY(forceY)
  }

  /** Ressuscita o jogador em (x, y) com vida cheia e invulnerabilidade curta. */
  revive(x: number, y: number): void {
    this.hp = this.maxHp
    this.isAlive = true
    this.immuneUntil = this.scene.time.now + 1500
    this.sprite.setPosition(x, y)
    this.sprite.setVelocity(0, 0)
    this.sprite.setVisible(true)
    this.sprite.body!.enable = true
    this.sprite.alpha = 1
    this.setState('idle')
  }

  private die(): void {
    this.isAlive = false
    this.sprite.setVisible(false)
    this.sprite.body!.enable = false
    this.sprite.setVelocity(0, 0)
  }

  setState(state: PlayerState): void {
    if (this.state === state) return
    this.state = state
    this.playState(state)
  }

  getState(): PlayerState {
    return this.state
  }

  isFacingDirection(direction: 'left' | 'right'): boolean {
    return direction === 'right' ? this.isFacingRight : !this.isFacingRight
  }

  /** Cria uma vez as animações do personagem no AnimationManager global. */
  private createAnimations(): void {
    const anims = this.scene.anims

    getAnimConfigs(this.spriteKey).forEach((config) => {
      if (!anims.exists(config.key)) {
        anims.create({
          key: config.key,
          frames: config.frames,
          frameRate: config.frameRate,
          repeat: config.repeat,
        })
      }
    })
  }

  private playState(state: PlayerState): void {
    const key = `${this.spriteKey}-${state}`
    if (this.scene.anims.exists(key)) {
      this.sprite.play(key, true)
    }
  }
}