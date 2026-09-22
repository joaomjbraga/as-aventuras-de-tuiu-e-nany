import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { Zombie } from '../entities/Zombie'
import { CHARACTERS } from '../sprites'
import { getSession } from '../session'
import { buildGraveyard, type GraveyardResult } from '../scenery'
import { AUDIO, playBgm } from '../audio'

export class MainScene extends Phaser.Scene {
  private players: Player[] = []
  private ground!: Phaser.GameObjects.Rectangle
  private playerGroup!: Phaser.Physics.Arcade.Group
  private zombieGroup!: Phaser.Physics.Arcade.Group
  private scenery!: GraveyardResult

  private kills = 0
  private killsText!: Phaser.GameObjects.Text
  private heartsByPlayer = new Map<string, Phaser.GameObjects.Rectangle[]>()
  private pendingRespawn = new Set<string>()
  private gameOver = false
  private spawnerTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'MainScene' })
  }

  create(): void {
    const { width, height } = this.scale

    this.scenery = buildGraveyard(this, width, height)
    this.ground = this.scenery.ground

    this.createPlayers()
    this.createCombat()
    this.createHud()

    // Música de fundo em volume baixo (continua se já estava tocando)
    playBgm(this)
  }

  shutdown(): void {
    this.sound.stopByKey(AUDIO.BGM)
    this.sound.stopByKey(AUDIO.GAME_OVER)
  }

  update(): void {
    this.players.forEach((player) => {
      player.update()

      // Ressuscita o jogador morto após um tempo
      if (!player.isAlive && !this.pendingRespawn.has(player.id)) {
        this.pendingRespawn.add(player.id)
        const { x, y } = this.spawnPointFor(player.id)
        this.time.delayedCall(1800, () => {
          if (this.gameOver) return
          player.revive(x, y)
          this.pendingRespawn.delete(player.id)
        })
      }
    })

    // Fim de jogo: todos os jogadores caíram ao mesmo tempo
    if (!this.gameOver && this.players.length > 0 && this.players.every((p) => !p.isAlive)) {
      this.triggerGameOver()
    }

    this.refreshHud()
  }

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------

  private createPlayers(): void {
    const session = getSession()
    const entries = session.players.length > 0 ? session.players : []

    if (entries.length === 0) {
      entries.push({ id: 'P1', characterKey: 'tuio', controls: 'p1' })
    }

    this.playerGroup = this.physics.add.group()

    entries.forEach((entry, i) => {
      const def = CHARACTERS[entry.characterKey]
      const { x } = this.spawnPointFor(entry.id, i)

      const player = new Player(this, {
        id: entry.id,
        name: def.name,
        x,
        y: this.groundTop - (def.bodyHeight ?? 0) / 2,
        spriteKey: def.key,
        controls: entry.controls,
        bodyWidth: def.bodyWidth,
        bodyHeight: def.bodyHeight,
      })

      this.players.push(player)
      this.playerGroup.add(player.sprite)
    })

    this.physics.add.collider(this.playerGroup, this.ground)
    this.physics.add.collider(this.playerGroup, this.scenery.tombstones)

    if (this.players.length === 2) {
      this.physics.add.collider(this.players[0].sprite, this.players[1].sprite)
    }

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height)
  }

  private spawnPointFor(playerId: string, index?: number): { x: number; y: number } {
    const { width, height } = this.scale
    const i = index ?? this.players.findIndex((p) => p.id === playerId)
    const x = width * (i === 0 ? 0.3 : 0.7)
    return { x, y: this.groundTop - (CHARACTERS.tuio.bodyHeight ?? 0) / 2 }
  }

  private get groundTop(): number {
    return this.scale.height - 48
  }

  // ------------------------------------------------------------------
  // Zumbis + combate
  // ------------------------------------------------------------------

  private createCombat(): void {
    this.zombieGroup = this.physics.add.group()

    this.physics.add.collider(this.zombieGroup, this.ground)
    // Zumbis atravessam as lápides (não colidem com elas)
    this.physics.add.collider(this.zombieGroup, this.zombieGroup)
    this.physics.add.collider(this.playerGroup, this.zombieGroup, (a, b) => this.onPlayerZombieContact(a, b))

    const { width } = this.scale

    this.spawnerTimer = this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        const side = Phaser.Math.Between(0, 1)
        this.spawnZombie(side === 0 ? -16 : width + 16)
      },
    })
  }

  private spawnZombie(x: number): void {
    const zombie = new Zombie(this, {
      x,
      y: this.groundTop - 20,
      players: this.players,
      onKilled: () => {
        this.kills += 1
        this.sound.play(AUDIO.ZOMBIE_ATTACK, { volume: 0.7 })
      },
    })

    this.zombieGroup.add(zombie)
    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.5 })
  }

  private onPlayerZombieContact(object1: unknown, object2: unknown): void {
    const playerSpr = object1 as Phaser.GameObjects.Sprite
    const zombieSpr = object2 as Phaser.Physics.Arcade.Sprite
    const player = this.players.find((p) => p.sprite === playerSpr)
    const zombie = zombieSpr as Zombie
    if (!player || zombie.isDying) return

    const playerBody = playerSpr.body as Phaser.Physics.Arcade.Body
    const zombieBody = zombieSpr.body as Phaser.Physics.Arcade.Body

    // Pés do jogador vs cabeça do zumbi (o jogador é mais alto que o zumbi,
    // então comparar os centros fazia todo contato virar pisão).
    const playerFeet = playerSpr.y + playerBody.halfHeight
    const zombieHead = zombieSpr.y - zombieBody.halfHeight

    // Pisão (stomp): os pés estão acima da cabeça do zumbi
    if (playerFeet <= zombieHead + 6 && playerBody.velocity.y >= -20) {
      if (zombie.stompDamage(playerSpr.x)) {
        player.bounce(-160)
      } else {
        player.bounce(-90) // continua "quicando" mesmo no cooldown de dano
      }
    } else if (playerBody.velocity.y >= -20) {
      // Contato lateral (ou queda lateral): zumbi machuca o jogador
      if (player.damage(1)) {
        this.sound.play(AUDIO.ZOMBIE_ATTACK, { volume: 0.7 })
      }
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true
    this.pendingRespawn.clear()
    this.spawnerTimer?.remove(false)

    this.sound.stopByKey(AUDIO.BGM)
    this.sound.play(AUDIO.GAME_OVER, { volume: 0.75 })

    const { width, height } = this.scale
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setDepth(20)
    this.add
      .text(width / 2, height / 2 - 10, 'FIM DE JOGO', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#e8385a',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 4)
      .setDepth(21)
    this.add
      .text(width / 2, height / 2 + 16, `ZOMBIES: ${this.kills}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e8edf7',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 3)
      .setDepth(21)

    this.time.delayedCall(2500, () => {
      this.scene.restart()
    })
  }

  // ------------------------------------------------------------------
  // HUD
  // ------------------------------------------------------------------

  private createHud(): void {
    const { width } = this.scale

    this.players.forEach((player, i) => {
      const isP1 = i === 0
      const nameColor = isP1 ? '#8fd8ff' : '#ff9fc2'
      const hearts: Phaser.GameObjects.Rectangle[] = []
      const originX = isP1 ? 12 : width - 12
      const dir = isP1 ? 1 : -1

      // Nome do personagem (medido antes para posicionar os corações)
      const name = this.add
        .text(originX, 4, player.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '9px',
          fontStyle: 'bold',
          color: nameColor,
        })
        .setOrigin(isP1 ? 0 : 1, 0)
        .setDepth(11)
      name.setStroke('#0d101b', 3)

      // Painel atrás do nome + corações
      const panelW = name.width + player.maxHp * 11 + 20
      this.add
        .rectangle(isP1 ? 0 : width, 0, panelW, 26, 0x0a0c14, 0.6)
        .setOrigin(isP1 ? 0 : 1, 0)
        .setStrokeStyle(1, isP1 ? 0x2c3350 : 0x4a2c3e, 0.9)
        .setDepth(9)

      // Corações lado a lado com o nome
      const heartStart = originX + dir * (name.width + 9)
      for (let h = 0; h < player.maxHp; h++) {
        const heart = this.add
          .rectangle(heartStart + dir * (h * 11), 13, 7, 7, 0xff4d5d, 1)
          .setOrigin(0.5)
          .setDepth(11)
        hearts.push(heart)
      }

      this.heartsByPlayer.set(player.id, hearts)
    })

    // Placar de abates (topo central)
    this.killsText = this.add
      .text(width / 2, 4, 'ZOMBIES: 999', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#e8edf7',
        letterSpacing: 1,
      })
      .setOrigin(0.5, 0)
      .setDepth(11)
    this.killsText.setStroke('#0d101b', 3)

    this.add
      .rectangle(width / 2, 0, this.killsText.width + 18, 26, 0x0a0c14, 0.45)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x2c3350, 0.7)
      .setDepth(9)

    this.killsText.setText('ZOMBIES: 0')
  }

  private refreshHud(): void {
    this.players.forEach((player) => {
      const hearts = this.heartsByPlayer.get(player.id)
      if (!hearts) return
      hearts.forEach((heart, h) => {
        const full = h < player.hp
        heart.setFillStyle(full ? 0xff4d5d : 0x251f33, full ? 1 : 0.85)
        heart.setStrokeStyle(full ? 0 : 1, 0xff5060, 0.4)
      })
    })

    this.killsText.setText(`ZUMBIES: ${this.kills}`)
  }
}