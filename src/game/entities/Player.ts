import Phaser from 'phaser'
import { FRAME_LAYOUT, getAnimConfigs } from '../sprites'
import { CONTROL_SCHEMES, type ControlSchemeId } from '../controls'
import type { VirtualInputState } from '../mobileControls'

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
  /** Entrada virtual opcional para controles touch. */
  virtualInput?: VirtualInputState
}

/**
 * Um jogador controlável. Cada instância lê seu próprio esquema de
 * controles (P1 = setas/espaço, P2 = A/D/W), então dá para ter vários
 * em cena simultaneamente (co-op local).
 */
const FOOT_INSET = 4

/** Cor do brilho do escudo (azul gelo). */
const SHIELD_TINT = 0x7fd4ff

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
  private virtualInput?: VirtualInputState

  private state: PlayerState = 'idle'
  private isFacingRight = true
  private immuneUntil = 0
  private shieldUntil = 0
  private speedUntil = 0
  private damageBoostUntil = 0

  // Física (ajustável para o "jeitão" do jogo)
  private moveSpeed = 160
  private jumpForce = 380
  private doubleJumpForce = 330
  private readonly speedBoostFactor = 1.5

  // Pulo duplo: conta quantos pulos já foram usados até o personagem tocar o chão.
  private jumpsUsed = 0
  private readonly maxJumps = 2

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.scene = scene
    this.id = config.id
    this.name = config.name
    this.spriteKey = config.spriteKey
    this.virtualInput = config.virtualInput

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
        this.sprite.height - config.bodyHeight - FOOT_INSET,
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

    const moveLeft = this.keys.left.isDown || this.virtualInput?.left === true
    const moveRight = this.keys.right.isDown || this.virtualInput?.right === true
    const jumpPressed = this.keys.jump.some((key) => key.isDown) || this.virtualInput?.jump === true
    const currentSpeed = this.hasSpeedBoost() ? this.moveSpeed * this.speedBoostFactor : this.moveSpeed

    if (moveLeft) {
      this.sprite.setVelocityX(-currentSpeed)
      this.sprite.flipX = true
      this.isFacingRight = false
    } else if (moveRight) {
      this.sprite.setVelocityX(currentSpeed)
      this.sprite.flipX = false
      this.isFacingRight = true
    } else {
      this.sprite.setVelocityX(0)
    }

    // ---- Pulo (simples no chão + pulo duplo no ar) ----
    const jumpJustPressed = this.jumpJustPressed()

    // Caiu ou pousou: libera os pulos de novo.
    if (body.blocked.down) this.jumpsUsed = 0

    if (jumpPressed && body.blocked.down) {
      this.jumpsUsed = 1
      this.sprite.setVelocityY(-this.jumpForce)
      this.setState('jump')
    } else if (jumpJustPressed && !body.blocked.down && this.jumpsUsed < this.maxJumps) {
      // Pulo duplo: um novo toque no ar dá um impulso extra.
      this.jumpsUsed += 1
      this.sprite.setVelocityY(-this.doubleJumpForce)
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
    if (this.state === 'jump' && !body.blocked.down && this.sprite.anims.currentFrame?.isLast) {
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

  /**
   * true enquanto a queda atual ainda vier de um pulo duplo (ou seja, até o
   * personagem tocar o chão). Usado para o pisão dar mais dano aos zumbis.
   */
  hasDoubleJumped(): boolean {
    return this.jumpsUsed >= this.maxJumps
  }

  /**
   * Botão de pulo pressionado neste frame (just-pressed: ignorado quando o
   * botão fica segurado). Consome o flag virtual para um toque = uma ação.
   * Usado pelo pulo duplo e pelo revive (who decides voltar).
   */
  private jumpJustPressed(): boolean {
    const keyboardPressed = this.keys.jump.some((key) => Phaser.Input.Keyboard.JustDown(key))
    const virtualPressed = this.virtualInput?.jumpJustPressed === true
    if (this.virtualInput) this.virtualInput.jumpJustPressed = false
    return keyboardPressed || virtualPressed
  }

  /** Ação de revive (tecla de pulo) pressionada neste frame. */
  isRevivePressed(): boolean {
    return this.jumpJustPressed()
  }

  // ---- Power-ups (efeitos temporizados) ----

  activateShield(durationMs: number): void {
    this.shieldUntil = Math.max(this.shieldUntil, this.scene.time.now + durationMs)
  }

  hasShield(): boolean {
    return this.scene.time.now < this.shieldUntil
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

  /** Tempo restante (ms) de um efeito ativo; 0 quando inativo. */
  effectTimeRemaining(effect: 'shield' | 'speed' | 'double'): number {
    const until = effect === 'shield' ? this.shieldUntil : effect === 'speed' ? this.speedUntil : this.damageBoostUntil
    return Math.max(0, until - this.scene.time.now)
  }

  /** Ressuscita o jogador em (x, y) com vida cheia e invulnerabilidade curta. */
  revive(x: number, y: number): void {
    this.hp = this.maxHp
    this.isAlive = true
    this.immuneUntil = this.scene.time.now + 1500
    this.sprite.setVisible(true)
    this.sprite.alpha = 1
    // Usa reset() para sincronizar sprite e body, e reativa o corpo físico que
    // foi desligado no die() — reset() NÃO re-habilita o body, sem isso o
    // jogador vira a direção mas não anda (a física ignora um corpo inválido).
    this.sprite.body!.enable = true
    this.sprite.body!.reset(x, y)
    this.sprite.setVelocity(0, 0)
    this.jumpsUsed = 0
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
