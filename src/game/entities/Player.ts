import Phaser from 'phaser'
import { CHARACTER_FOOT_INSET, FRAME_LAYOUT, getAnimConfigs } from '../sprites'
import { CONTROL_SCHEMES, type ControlSchemeId } from '../controls'
import { canTriggerDoubleJump, doubleJumpVelocityY, isNewJumpPress, resolveJumpAction } from '../jump'

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
  /** Escala do sprite em jogo (1 = tamanho original do frame). */
  scale?: number
}

/** Cor do brilho do escudo (azul gelo). */
const SHIELD_TINT = 0x7fd4ff

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
  private immuneUntil = 0
  private shieldUntil = 0
  private speedUntil = 0
  private damageBoostUntil = 0

  // Física (ajustável para o "jeitão" do jogo)
  private moveSpeed = 320
  private jumpForce = 900
  private doubleJumpForce = 520
  private readonly doubleJumpTriggerSpeed = 300
  private readonly speedBoostFactor = 1.5

  // Pulo duplo: conta quantos pulos já foram usados até o personagem tocar o chão.
  private jumpsUsed = 0
  private readonly maxJumps = 2
  private doubleJumpBuffered = false

  /** Estado anterior da tecla de pulo (para detectar borda de pressão). */
  private wasJumpDown = false

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.scene = scene
    this.id = config.id
    this.name = config.name
    this.spriteKey = config.spriteKey

    this.sprite = scene.physics.add.sprite(config.x, config.y, config.spriteKey)
    this.sprite.setCollideWorldBounds(true)

    // O Arcade Body escala sourceWidth/sourceHeight e o offset pelo scale do
    // sprite, então basta definir a escala antes do corpo de colisão.
    this.sprite.setScale(config.scale ?? 1)

    if (config.bodyWidth && config.bodyHeight) {
      // Corpo de colisão menor que o frame (margem transparente) e ancorado
      // na LINHA DOS PÉS, não no fundo do frame: os sprites têm 4px de
      // margem transparente abaixo dos pés, e ancorar no frame deixava o
      // personagem flutuando ~4px acima do chão.
      this.sprite.setBodySize(config.bodyWidth, config.bodyHeight, false)
      this.sprite.body!.setOffset(
        (this.sprite.width - config.bodyWidth) / 2,
        this.sprite.height - config.bodyHeight - CHARACTER_FOOT_INSET,
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
    const currentSpeed = this.hasSpeedBoost() ? this.moveSpeed * this.speedBoostFactor : this.moveSpeed

    if (moveLeft) {
      this.sprite.setVelocityX(-currentSpeed)
      this.sprite.flipX = true
    } else if (moveRight) {
      this.sprite.setVelocityX(currentSpeed)
      this.sprite.flipX = false
    } else {
      this.sprite.setVelocityX(0)
    }

    // ---- Pulo (simples no chão + pulo duplo no ar) ----
    // blocked.down pode continuar marcado por um frame depois de aplicar a
    // velocidade do salto. Considerar apenas o bloqueio com velocidade não
    // negativa evita que o primeiro pulo seja consumido como se ainda estivesse
    // no chão.
    const isGrounded = body.blocked.down && body.velocity.y >= 0
    if (isGrounded) {
      this.jumpsUsed = 0
      this.doubleJumpBuffered = false
    }

    const jumpAction = resolveJumpAction({
      isGrounded,
      justPressed: this.jumpJustPressed(),
      jumpsUsed: this.jumpsUsed,
      maxJumps: this.maxJumps,
    })
    const doubleJumpReady = canTriggerDoubleJump(body.velocity.y, this.doubleJumpTriggerSpeed)
    let jumpedThisFrame = false

    if (jumpAction === 'first') {
      this.jumpsUsed += 1
      this.sprite.setVelocityY(-this.jumpForce)
      this.setState('jump')
      jumpedThisFrame = true
    } else if (jumpAction === 'double') {
      if (doubleJumpReady) {
        this.performDoubleJump()
        jumpedThisFrame = true
      } else {
        // Uma pressionada muito cedo fica registrada e dispara perto do ápice.
        this.doubleJumpBuffered = true
      }
    } else if (this.doubleJumpBuffered && !isGrounded && this.jumpsUsed < this.maxJumps && doubleJumpReady) {
      this.performDoubleJump()
      jumpedThisFrame = true
    }

    // ---- Máquina de estados ----
    if (jumpedThisFrame || !isGrounded) {
      // No ar (pulou ou caiu de uma plataforma)
      if (this.state !== 'jump') this.setState('jump')
    } else if (moveLeft || moveRight) {
      if (this.state !== 'walk') this.setState('walk')
    } else if (this.state !== 'idle') {
      this.setState('idle')
    }

    // Se a animação de pulo está no frame de aterrissagem (8) mas o
    // personagem ainda está no ar, segura no frame "ar" (7).
    if (this.state === 'jump' && !isGrounded && this.sprite.anims.currentFrame?.isLast) {
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

    // Brilho azulado enquanto estiver com escudo
    const shieldActive = this.scene.time.now < this.shieldUntil
    if (shieldActive && this.sprite.tintTopLeft !== SHIELD_TINT) {
      this.sprite.setTint(SHIELD_TINT)
    } else if (!shieldActive && this.sprite.tintTopLeft === SHIELD_TINT) {
      this.sprite.clearTint()
    }
  }

  /**
   * Aplica dano se o jogador não estiver invulnerável nem com escudo.
   * Retorna true se o dano foi aplicado.
   */
  damage(amount: number): boolean {
    if (!this.isAlive) return false
    if (this.scene.time.now < this.shieldUntil) return false // escudo bloqueia o dano
    if (this.scene.time.now < this.immuneUntil) return false

    this.hp = Math.max(0, this.hp - amount)
    this.immuneUntil = this.scene.time.now + 2000

    this.sprite.setTintFill(0xff8888)
    this.scene.time.delayedCall(300, () => {
      if (this.sprite.active) this.sprite.clearTint()
    })

    if (this.hp <= 0) this.die()
    return true
  }

  /** Quique usado ao pisar em um zumbi. */
  bounce(forceY: number): void {
    if (this.isAlive) this.sprite.setVelocityY(forceY)
  }

  private performDoubleJump(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.jumpsUsed += 1
    this.doubleJumpBuffered = false
    this.sprite.setVelocityY(doubleJumpVelocityY(body.velocity.y, this.doubleJumpForce))
    this.setState('jump')
  }

  /**
   * true enquanto a queda atual ainda vier de um pulo duplo (ou seja, até o
   * personagem tocar o chão). Usado para o pisão dar mais dano aos zumbis.
   */
  hasDoubleJumped(): boolean {
    return this.jumpsUsed >= this.maxJumps
  }

  /**
   * true quando a tecla de pulo acabou de ser pressionada. Usa um rastreador
   * interno de estado (wasJumpDown) em vez de Phaser.Input.Keyboard.JustDown,
   * que pode disparar falsos positivos quando a janela perde o foco (ex.:
   * ao trocar de aba) — justamente o caso em que o bug de "flutuação"
   * reaparecia após a primeira correção.
   */
  private jumpJustPressed(): boolean {
    const isDown = this.keys.jump.some((key) => key.isDown)
    const justPressed = isNewJumpPress(this.wasJumpDown, isDown)
    this.wasJumpDown = isDown
    return justPressed
  }

  /** Ação de revive (tecla de pulo) pressionada neste frame. */
  isRevivePressed(): boolean {
    return this.jumpJustPressed()
  }

  // ---- Power-ups (efeitos temporizados) ----

  activateShield(durationMs: number): void {
    this.shieldUntil = Math.max(this.shieldUntil, this.scene.time.now + durationMs)
  }

  activateSpeed(durationMs: number): void {
    this.speedUntil = Math.max(this.speedUntil, this.scene.time.now + durationMs)
  }

  hasSpeedBoost(): boolean {
    return this.scene.time.now < this.speedUntil
  }

  activateDamageBoost(durationMs: number): void {
    this.damageBoostUntil = Math.max(this.damageBoostUntil, this.scene.time.now + durationMs)
  }

  hasDamageBoost(): boolean {
    return this.scene.time.now < this.damageBoostUntil
  }

  /** Ressuscita o jogador em (x, y) com vida cheia e invulnerabilidade curta. */
  revive(x: number, y: number): void {
    this.hp = this.maxHp
    this.isAlive = true
    this.immuneUntil = this.scene.time.now + 1500
    this.sprite.setVisible(true)
    this.sprite.alpha = 1
    // Usa reset() para sincronizar sprite e body, e reativa o corpo físico que
    // foi desligado no die() reset() NÃO re-habilita o body, sem isso o
    // jogador vira a direção mas não anda (a física ignora um corpo inválido).
    this.sprite.body!.enable = true
    this.sprite.body!.reset(x, y)
    this.sprite.setVelocity(0, 0)
    this.jumpsUsed = 0
    this.doubleJumpBuffered = false
    this.wasJumpDown = false
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
