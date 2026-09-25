import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { Zombie } from '../entities/Zombie'
import { Boss } from '../entities/Boss'
import { CHARACTER_FOOT_INSET, CHARACTERS, ZOMBIE_TARGET_HEIGHT, ZOMBIE_VARIANTS, type CharacterKey } from '../sprites'
import { advanceSessionLevel, getSession, getSessionLevel, setSessionPlayers, type PlayerId } from '../session'
import { buildScene, type SceneResult } from '../scenery'
import { AUDIO, applyMute, playBgm, toggleMute } from '../audio'
import { createButton } from '../ui'
import { groundTopFor, spawnXFor, spriteCenterYForGround } from '../layout'
import { canSpawnZombie, hasWon, spawnIntervalMs } from '../difficulty'
import { allLevelsCompleted, randomNextLevel, type LevelConfig } from '../levels'
import {
  loadBestKills,
  loadCompletedLevels,
  markLevelCompleted,
  saveBestKills,
  loadBestScore,
  saveBestScore,
} from '../storage'
import { multiplierFor, scoreOfKill } from '../score'
import { resolvePlayerZombieContact, stompDamage, type PlayerContactSource } from '../combat'
import { buildGameOverScreen, buildVictoryScreen } from '../ui/endScreen'
import {
  PICKUP_EFFECTS,
  PICKUP_SAFETY_INTERVAL_MS,
  pickupTextureKey,
  randomPickupKind,
  rollPickupDrop,
  type PickupKind,
} from '../powerups'

type ArcadeObject = Phaser.Types.Physics.Arcade.GameObjectWithBody

interface PlayerZombieContactSnapshot {
  player: Player
  zombie: Zombie
  playerContact: PlayerContactSource
  zombieTopY: number
  zombieSpriteHeight: number
}

export class MainScene extends Phaser.Scene {
  private level!: LevelConfig
  private players: Player[] = []
  private ground!: Phaser.GameObjects.Zone
  private playerGroup!: Phaser.Physics.Arcade.Group
  private zombieGroup!: Phaser.Physics.Arcade.Group
  private scenery!: SceneResult

  private kills = 0
  private bestKills = 0
  private score = 0
  private combo = 0
  private mult = 1
  private bestScore = 0
  private killsText!: Phaser.GameObjects.Text
  private heartsByPlayer = new Map<string, Phaser.GameObjects.Image[]>()
  private pendingRespawn = new Set<string>()
  private revivePrompts = new Map<string, Phaser.GameObjects.Text>()
  private gameOver = false
  private victory = false
  private spawnerTimer?: Phaser.Time.TimerEvent
  private matchStartTime = 0
  private enterKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private muteKey!: Phaser.Input.Keyboard.Key
  private f11Key!: Phaser.Input.Keyboard.Key
  private p2JoinKey?: Phaser.Input.Keyboard.Key
  private joinButton?: Phaser.GameObjects.Container

  private pickupGroup!: Phaser.Physics.Arcade.Group
  private lastPickupAt = 0
  private vignette?: Phaser.GameObjects.Rectangle

  private boss?: Boss
  private bossPhase = false
  private bossLabel?: Phaser.GameObjects.Text
  private bossBarBack?: Phaser.GameObjects.Rectangle
  private bossBarFill?: Phaser.GameObjects.Rectangle

  // Estado cacheado do HUD para não reescrever objetos por frame
  private lastHpByPlayer = new Map<string, number>()
  private lastKillsLabel = ''
  private lastKillsColor = ''
  private lastBossVisible = false
  private lastBossHp = -1

  // Captura o contato antes de o Arcade separar os bodies. O callback normal
  // recebe velocities/blocked.down já alterados pela própria colisão.
  private playerContactSnapshots = new WeakMap<Phaser.Physics.Arcade.Sprite, PlayerZombieContactSnapshot>()

  constructor() {
    super({ key: 'MainScene' })
  }

  create(): void {
    // scene.restart() reutiliza a MESMA instância da cena, então os
    // field-initializers NÃO rodam de novo. Sem esse reset, o estado da
    // partida anterior (players, gameOver, kills, ...) vaza para a nova
    // partida: após "JOGAR NOVAMENTE" o update() fica preso no branch de
    // gameOver e o personagem não se move.
    this.players = []
    this.pendingRespawn = new Set()
    this.revivePrompts = new Map()
    this.heartsByPlayer = new Map()
    this.gameOver = false
    this.victory = false
    this.kills = 0
    this.bestKills = loadBestKills()
    this.score = 0
    this.combo = 0
    this.mult = 1
    this.bestScore = loadBestScore()
    this.spawnerTimer = undefined
    this.joinButton = undefined
    this.lastPickupAt = this.time.now
    this.boss = undefined
    this.bossPhase = false
    this.lastHpByPlayer = new Map()
    this.lastKillsLabel = ''
    this.lastKillsColor = ''
    this.lastBossVisible = false
    this.lastBossHp = -1
    this.playerContactSnapshots = new WeakMap()

    // Fase atual da campanha (vinda da sessão: seleção/avanço de fase).
    this.level = getSessionLevel()

    // Restaura o relógio da cena: um hit-stop (timeScale 0.25) pode ter sido
    // cancelado por um restart/shutdown antes do reset; sem isso a nova
    // partida rodaria inteira em câmera lenta (Clock.shutdown não zera o
    // timeScale). Também zera a referência do início da partida (a rampa de
    // dificuldade é relativa a esta partida, não ao relógio global do app).
    this.time.timeScale = 1
    this.matchStartTime = this.time.now

    const { width, height } = this.scale

    applyMute(this)

    this.scenery = buildScene(this, width, height, this.level)
    this.ground = this.scenery.ground

    this.createPlayers()
    this.createCombat()
    this.createPickups()
    this.createHud()

    // Música de fundo em volume baixo (continua se já estava tocando)
    playBgm(this)

    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.escKey = this.input.keyboard!.addKey('ESC')
    this.muteKey = this.input.keyboard!.addKey('M')
    this.f11Key = this.input.keyboard!.addKey('F11')

    this.setupJoinP2()
  }

  shutdown(): void {
    // Evita vazamento de memória: remove o timer de spawn na saída da cena
    // (restart/replay criava um novo addEvent sem remover o anterior,
    // acumulando timers a cada "JOGAR NOVAMENTE").
    this.spawnerTimer?.remove()
    this.sound.stopByKey(AUDIO.BGM)
    this.sound.stopByKey(AUDIO.GAME_OVER)

    // Garante que um hit-stop pendente (timeScale 0.25) nunca vaze para a
    // próxima partida Clock.shutdown destrói os timers mas não reseta o scale.
    this.time.timeScale = 1
  }

  /**
   * Alterna o modo tela cheia do renderer Electron.
   */
  private toggleFullscreen(): void {
    const doc = document.documentElement
    if (!document.fullscreenElement) {
      doc.requestFullscreen().catch(() => {
        // O renderer Electron rejeitou silencioso
      })
    } else {
      document.exitFullscreen()
    }
  }

  private openPauseMenu(): void {
    if (this.gameOver || this.victory) return
    this.scene.pause()
    this.scene.launch('PauseScene')
  }

  update(): void {
    // Mudo (tecla M) a qualquer momento durante a partida
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      toggleMute(this)
    }

    // F11 alterna o modo tela cheia do renderer Electron.
    if (Phaser.Input.Keyboard.JustDown(this.f11Key)) {
      this.toggleFullscreen()
    }

    // Pausa (ESC): abre o menu de pausa
    if (!this.gameOver && !this.victory && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.openPauseMenu()
      return
    }

    // Fim de jogo / vitória: atalhos de teclado para os botões
    if (this.gameOver || this.victory) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.retryOrAdvance()
      } else if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.scene.start('TitleScene')
      }
      this.refreshHud()
      return
    }

    // P2 pode entrar numa partida já iniciada (tecla W = mesma da confirmação na
    // seleção). Só checa enquanto não há P2 W também é o pulo do P2, e chamar
    // tryJoinP2 a cada pulo era redundante.
    if (this.players.length === 1 && this.p2JoinKey && Phaser.Input.Keyboard.JustDown(this.p2JoinKey)) {
      this.tryJoinP2()
    }

    // Segurança dos power-ups: se não houver drop há um bom tempo, garante um
    // pickup na arena para o jogador não ficar sem opções.
    if (this.kills > 0 && this.time.now - this.lastPickupAt > PICKUP_SAFETY_INTERVAL_MS) {
      this.spawnPickup(Phaser.Math.Between(96, this.scale.width - 96), this.groundTop - 60)
    }

    this.players.forEach((player) => {
      player.update()
      if (!player.isAlive && !this.pendingRespawn.has(player.id)) {
        // Oferece reviver só se ainda há companheiro em pé (senão é game over)
        if (this.players.some((p) => p.id !== player.id && p.isAlive)) {
          this.pendingRespawn.add(player.id)
          this.showRevivePrompt(player)
        }
      } else if (!player.isAlive) {
        // O morto escolhe: mantém o aviso acompanhando o corpo até ele decidir
        const prompt = this.revivePrompts.get(player.id)
        if (prompt) prompt.setPosition(player.sprite.x, player.sprite.y - 74)
        if (player.isRevivePressed()) {
          this.hideRevivePrompt(player.id)
          this.pendingRespawn.delete(player.id)
          const { x, y } = this.spawnPointFor(
            player.spriteKey as CharacterKey,
            Math.max(
              0,
              this.players.findIndex((p) => p.id === player.id),
            ),
          )
          player.revive(x, y)
        }
      }
    })

    // Fim de jogo: todos os jogadores caíram ao mesmo tempo
    if (!this.gameOver && !this.victory && this.players.length > 0 && this.players.every((p) => !p.isAlive)) {
      this.triggerGameOver()
    }

    this.refreshHud()
  }

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------

  private createPlayers(): void {
    const session = getSession()
    const entries = session.players

    if (entries.length === 0) {
      entries.push({ id: 'P1', characterKey: 'tuio', controls: 'p1' })
    }

    this.playerGroup = this.physics.add.group()

    entries.forEach((entry, i) => {
      const def = CHARACTERS[entry.characterKey]
      const { x, y } = this.spawnPointFor(entry.characterKey, i)

      const player = new Player(this, {
        id: entry.id,
        name: def.name,
        x,
        y,
        spriteKey: def.key,
        controls: entry.controls,
        bodyWidth: def.bodyWidth,
        bodyHeight: def.bodyHeight,
        scale: def.scale,
      })

      this.players.push(player)
      this.playerGroup.add(player.sprite)
    })

    this.physics.add.collider(this.playerGroup, this.ground)

    if (this.players.length === 2) {
      this.physics.add.collider(this.players[0].sprite, this.players[1].sprite)
    }

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height)
  }

  /**
   * Prepara a entrada do P2 numa partida já iniciada: botão + tecla W.
   */
  private setupJoinP2(): void {
    this.p2JoinKey = this.input.keyboard!.addKey('W')

    if (this.players.length === 1) {
      this.joinButton = createButton(
        this,
        this.scale.width / 2,
        this.scale.height - 44,
        'J2: ENTRAR  [W]',
        () => this.tryJoinP2(),
        {
          width: 300,
          height: 52,
          fontSize: '18px',
          color: '#ffe082',
          bgColor: 0x2a2f22,
          bgHover: 0x3a4230,
          strokeColor: 0x8a7a3a,
        },
      ).setDepth(12)
    }
  }

  private tryJoinP2(): void {
    if (this.gameOver || this.victory) return
    if (this.players.some((p) => p.id === 'P2')) return

    const p1Char = this.players[0].spriteKey
    const remainingKey = (Object.keys(CHARACTERS) as CharacterKey[]).find((k) => k !== p1Char)!
    const def = CHARACTERS[remainingKey]

    const { x, y } = this.spawnPointFor(remainingKey, 1)
    const player = new Player(this, {
      id: 'P2',
      name: def.name,
      x,
      y,
      spriteKey: def.key,
      controls: 'p2',
      bodyWidth: def.bodyWidth,
      bodyHeight: def.bodyHeight,
      scale: def.scale,
    })

    this.players.push(player)
    this.playerGroup.add(player.sprite)
    this.addPlayerHud(player, 1)
    this.physics.add.collider(this.players[0].sprite, player.sprite)

    // Mantém o P2 também nos restarts
    setSessionPlayers(
      this.players.map((p, i) => ({
        id: p.id as PlayerId,
        characterKey: p.spriteKey as CharacterKey,
        controls: i === 0 ? 'p1' : 'p2',
      })),
    )

    this.joinButton?.destroy(true)
    this.joinButton = undefined

    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.5 })
  }

  private spawnPointFor(characterKey: CharacterKey, index: number): { x: number; y: number } {
    const { width } = this.scale
    // Spawns com margem segura, longe das bordas e do meio da arena, para um
    // personagem não nascer em cima de nenhum obstáculo do cenário.
    const x = spawnXFor(width, index)
    // O body é ancorado um pouco acima da base do frame. Alinhar o sprite pelo
    // centro do body afundaria Tuiu/Nany no chão; usamos a base real do body.
    const def = CHARACTERS[characterKey] ?? CHARACTERS.tuio
    const y = spriteCenterYForGround(this.groundTop, def.frameHeight, def.scale, CHARACTER_FOOT_INSET)
    return { x, y }
  }

  private get groundTop(): number {
    return groundTopFor(this.scale.height)
  }

  // ------------------------------------------------------------------
  // Zumbis + combate
  // ------------------------------------------------------------------

  private createCombat(): void {
    this.zombieGroup = this.physics.add.group()

    this.physics.add.collider(this.zombieGroup, this.ground)
    this.physics.add.collider(this.zombieGroup, this.zombieGroup)
    this.physics.add.collider(
      this.playerGroup,
      this.zombieGroup,
      (a, b) => {
        this.onPlayerZombieContact(a as ArcadeObject, b as ArcadeObject)
      },
      (a, b) => {
        this.capturePlayerZombieContact(a as ArcadeObject, b as ArcadeObject)
      },
    )

    const { width } = this.scale
    const diff = this.level.difficulty

    this.spawnerTimer?.remove()

    // Dificuldade progressiva: o intervalo de spawn começa devagar e acelera
    // ao longo da PARTIDA (relativo a matchStartTime, não ao relógio global
    // do contrário a 2ª partida já abriria no teto de dificuldade). O próximo
    // ciclo re-agenda com o delay novo. Os parâmetros vêm da fase atual.
    const tick = () => {
      if (!canSpawnZombie(this.zombieGroup.countActive(true), diff.maxSimultaneousZombies)) return
      const side = Phaser.Math.Between(0, 1)
      this.spawnZombie(side === 0 ? -16 : width + 16)
      this.spawnerTimer?.reset({
        delay: spawnIntervalMs(this.time.now - this.matchStartTime, diff),
        loop: true,
        callback: tick,
      })
    }

    this.spawnerTimer = this.time.addEvent({ delay: spawnIntervalMs(0, diff), loop: true, callback: tick })
  }

  private spawnZombie(x: number): void {
    // Sorteia a variante aqui para alinhar a altura do spawn com a
    // normalização do spritesheet (cada zumbi pode ter altura própria).
    const variant = Phaser.Math.Between(1, 3) as 1 | 2 | 3
    const targetH = ZOMBIE_VARIANTS[variant - 1]?.targetHeight ?? ZOMBIE_TARGET_HEIGHT

    const zombie = new Zombie(this, {
      x,
      y: this.groundTop - targetH / 2,
      players: this.players,
      variant,
      onKilled: () => this.registerKill(zombie),
    })

    this.zombieGroup.add(zombie)
    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.5 })
  }

  // ------------------------------------------------------------------
  // Power-ups (drop dos zumbis)
  // ------------------------------------------------------------------

  private createPickups(): void {
    this.pickupGroup = this.physics.add.group({ allowGravity: false, immovable: true })

    this.physics.add.overlap(this.playerGroup, this.pickupGroup, (a, b) => {
      this.onPickupCollect(a as ArcadeObject, b as ArcadeObject)
    })
  }

  private onPickupCollect(object1: ArcadeObject, object2: ArcadeObject): void {
    if (this.gameOver || this.victory) return
    const playerSpr = object1 as Phaser.Physics.Arcade.Sprite
    const player = this.players.find((p) => p.sprite === playerSpr)
    if (!player) return

    const pickup = object2 as Phaser.Physics.Arcade.Image
    const kind = pickup.getData('kind') as PickupKind

    this.applyHeartPickup(player)
    pickup.destroy()

    // Pequena explosão de partículas na coleta
    const emitter = this.add.particles(pickup.x, pickup.y, 'pixel', {
      speedX: { min: -100, max: 100 },
      speedY: { min: -160, max: -40 },
      gravityY: 680,
      scale: { start: 2.4, end: 0 },
      lifespan: 840,
      tint: [PICKUP_EFFECTS[kind].tint, 0xe8edf7],
    })
    emitter.setDepth(2)
    emitter.explode(20)
    this.time.delayedCall(1040, () => emitter.destroy())

    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.35 })
  }

  private applyHeartPickup(player: Player): void {
    if (player.hp < player.maxHp) {
      player.hp += 1
      this.sound.play(AUDIO.ZOMBIE_ATTACK, { volume: 0.4 })
      return
    }

    // Vida cheia: o coração vira um bônus de pontos.
    const bonus = 5 * this.mult
    this.score += bonus
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      saveBestScore(this.bestScore)
    }
    this.sound.play(AUDIO.ZOMBIE_ATTACK, { volume: 0.3 })
  }

  /**
   * Sorteia um drop de power-up ao abater um zumbi (na posição dele).
   * Percentual configurável em PICKUP_DROP_CHANCE.
   */
  private maybeDropPickup(x: number, y: number): void {
    if (this.gameOver || this.victory) return
    if (!rollPickupDrop()) return
    this.spawnPickup(x, y)
  }

  private spawnPickup(x: number, y: number): void {
    const kind = randomPickupKind()
    const groundedY = Math.min(y, this.groundTop - 30)
    const img = this.pickupGroup.create(x, groundedY, pickupTextureKey()) as Phaser.Physics.Arcade.Image
    img.setDepth(2)
    img.setData('kind', kind)

    // Flutuação suave (visual; o corpo de colisão permanece parado)
    this.tweens.add({ targets: img, y: groundedY - 4, duration: 700, yoyo: true, repeat: -1 })
    this.lastPickupAt = this.time.now
  }

  /** Registra um abate: atualiza combo/placar, recorde, som de morte e vitória. */
  private registerKill(killed?: Zombie): void {
    this.kills += 1
    if (this.kills > this.bestKills) {
      this.bestKills = this.kills
      saveBestKills(this.bestKills)
    }

    // Combo: cada abate sem levar dano sobe o multiplicador (x1 → x10)
    this.combo += 1
    this.mult = multiplierFor(this.combo)
    this.score += scoreOfKill(this.mult)
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      saveBestScore(this.bestScore)
    }

    this.sound.play(AUDIO.EXPLOSION, { volume: 0.7 })

    // Popup do quanto o abate valeu (multiplicado pelo combo) no local da morte
    if (killed) {
      this.maybeDropPickup(killed.x, killed.y)
      this.showFloatingScore(killed.x, killed.y, this.mult)
    }

    // Meta de abates: abre a luta do boss (se houver) ou vence direto
    if (!this.bossPhase && hasWon(this.kills, this.level.victoryKills)) this.onLevelCleared()
  }

  /**
   * Meta de abates alcançada. Com boss configurado na fase, abre a "final
   * wave" (barra de vida); sem boss, a vitória é imediata.
   */
  private onLevelCleared(): void {
    if (this.level.boss) {
      this.startBossFight()
    } else {
      this.triggerVictory()
    }
  }

  private startBossFight(): void {
    if (this.bossPhase || this.boss) return
    this.bossPhase = true
    this.spawnerTimer?.remove(false)

    const { width } = this.scale
    const bossConf = this.level.boss!
    const boss = new Boss(this, {
      x: width / 2,
      y: this.groundTop - 30,
      hp: bossConf.hp,
      moveSpeed: bossConf.moveSpeed,
      players: this.players,
      onKilled: () => this.onBossKilled(boss),
    })
    // Apoia os pés do boss no chão (a altura real só é conhecida após criar)
    boss.setPosition(width / 2, this.groundTop - boss.displayHeight / 2)

    this.zombieGroup.add(boss)
    this.boss = boss

    this.createBossBar(bossConf.name)
    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.6 })
    this.cameras.main.shake(300, 0.012)
  }

  /** Barra de vida do boss, abaixo do placar. */
  private createBossBar(name: string): void {
    const { width } = this.scale

    this.bossLabel = this.add
      .text(width / 2, 112, `${name.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ff5d6c',
      })
      .setOrigin(0.5, 0)
      .setStroke('#0d101b', 4)
      .setDepth(11)

    this.bossBarBack = this.add
      .rectangle(width / 2, 136, 340, 14, 0x181d29)
      .setStrokeStyle(2, 0xff5d6c, 0.9)
      .setDepth(10)

    this.bossBarFill = this.add
      .rectangle(width / 2 - 170, 136, 340, 10, 0xff5d6c)
      .setOrigin(0, 0.5)
      .setDepth(11)
  }

  /** O boss foi derrotado: conta como abate (pontos de combo) e vence a fase. */
  private onBossKilled(boss: Boss): void {
    if (!this.boss) return
    this.registerKill(boss)
    this.boss = undefined
    this.bossPhase = false
    this.lastHpByPlayer = new Map()
    this.lastKillsLabel = ''
    this.lastKillsColor = ''
    this.lastBossVisible = false
    this.lastBossHp = -1
    this.triggerVictory()
  }

  /** O jogador levou dano: a sequência de combo é zerada (volta para x1). */
  private breakCombo(): void {
    if (this.mult === 1) return
    this.combo = 0
    this.mult = 1
  }

  /** Popup flutuante no local do abate com os pontos ganhos (× combo). */
  private showFloatingScore(x: number, y: number, value: number): void {
    const label = this.add
      .text(x, y - 44, `+${value}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffe082',
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setStroke('#0d101b', 6)
    this.tweens.add({
      targets: label,
      y: y - 92,
      alpha: 0,
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private resolvePlayerZombiePair(
    object1: ArcadeObject,
    object2: ArcadeObject,
  ): { player: Player; zombie: Zombie; playerSprite: Phaser.Physics.Arcade.Sprite } | null {
    const zombie = object1 instanceof Zombie ? object1 : object2 instanceof Zombie ? object2 : null
    if (!zombie) return null

    const playerSprite = (zombie === object1 ? object2 : object1) as Phaser.Physics.Arcade.Sprite
    const player = this.players.find((candidate) => candidate.sprite === playerSprite)
    return player ? { player, zombie, playerSprite } : null
  }

  /**
   * O processCallback roda antes de o Arcade separar os bodies. Guardar este
   * snapshot evita que blocked.down/velocity já alterados pela colisão fazem
   * um pisão ser classificado como dano ao jogador.
   */
  private capturePlayerZombieContact(object1: ArcadeObject, object2: ArcadeObject): void {
    const pair = this.resolvePlayerZombiePair(object1, object2)
    if (!pair || pair.zombie.isDying || !pair.playerSprite.body || !pair.zombie.body) return

    const playerBody = pair.playerSprite.body as Phaser.Physics.Arcade.Body
    const zombieBody = pair.zombie.body as Phaser.Physics.Arcade.Body

    this.playerContactSnapshots.set(pair.playerSprite, {
      player: pair.player,
      zombie: pair.zombie,
      playerContact: {
        x: playerBody.center.x,
        feetY: playerBody.bottom,
        isAirborne: !playerBody.blocked.down,
        velocityY: playerBody.velocity.y,
      },
      zombieTopY: zombieBody.top,
      zombieSpriteHeight: zombieBody.height,
    })
  }

  private onPlayerZombieContact(object1: ArcadeObject, object2: ArcadeObject): void {
    const pair = this.resolvePlayerZombiePair(object1, object2)
    if (!pair) return

    const snapshot = this.playerContactSnapshots.get(pair.playerSprite)
    this.playerContactSnapshots.delete(pair.playerSprite)
    if (!snapshot || snapshot.zombie.isDying || pair.zombie.isDying) return

    const { player, zombie } = snapshot
    const outcome = resolvePlayerZombieContact(snapshot.playerContact, {
      isDying: zombie.isDying,
      x: zombie.x,
      headY: snapshot.zombieTopY,
      spriteHeight: snapshot.zombieSpriteHeight,
      damageAmount: stompDamage({
        doubleJump: player.hasDoubleJumped(),
        targetHp: zombie.hp,
      }),
      stomp: (fromX, amount) => zombie.stompDamage(fromX, amount),
    })

    if (outcome === 'stomp-kill') {
      player.bounce(-240)
      this.cameras.main.shake(180, 0.012)
      this.hitStop()
    } else if (outcome === 'stomp') {
      player.bounce(-120)
    } else if (outcome === 'hit') {
      if (player.damage(1)) {
        this.sound.play(player.spriteKey === 'nany' ? AUDIO.FEMALE_DEATH : AUDIO.MAN_DEATH, { volume: 0.7 })
        this.breakCombo()
      }
    }
  }

  /** Micro-congelamento (hit-stop) ao abater um zumbi para dar "peso" ao golpe. */
  private hitStop(): void {
    this.time.timeScale = 0.25
    this.time.delayedCall(180, () => {
      this.time.timeScale = 1
    })
  }

  // ------------------------------------------------------------------
  // Reviver (escolha do jogador morto)
  // ------------------------------------------------------------------

  /** Mostra o aviso "CAIU! APERTE X PARA REVIVER" flutuando sobre o corpo. */
  private showRevivePrompt(player: Player): void {
    const label = player.id === 'P2' ? 'W' : '↑ / ESPAÇO'
    const prompt = this.add
      .text(
        player.sprite.x,
        player.sprite.y - 148,
        `${player.name.toUpperCase()} CAIU!\nAPERTE ${label} PARA REVIVER`,
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#ffd54f',
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(12)
      .setStroke('#0d101b', 6)
    this.tweens.add({ targets: prompt, alpha: 0.55, duration: 960, yoyo: true, repeat: -1 })
    this.revivePrompts.set(player.id, prompt)
  }

  private hideRevivePrompt(playerId: string): void {
    const prompt = this.revivePrompts.get(playerId)
    if (prompt) prompt.destroy()
    this.revivePrompts.delete(playerId)
  }

  private hideAllRevivePrompts(): void {
    for (const id of [...this.revivePrompts.keys()]) this.hideRevivePrompt(id)
  }

  // ------------------------------------------------------------------
  // Fim de partida
  // ------------------------------------------------------------------

  private staticEndScreen(): void {
    // Congela os zumbis restantes para não ficarem "atropelando" os jogadores
    // no fundo da tela de vitória.
    if (!this.zombieGroup) return
    this.zombieGroup.children.each((child) => {
      const zombie = child as Zombie
      if (zombie.active) {
        zombie.setVelocity(0, 0)
        zombie.disableBody(false, false)
      }
      return true
    })
  }

  /** ENTER no fim de partida: avança para a próxima fase (vitória) ou rejoga. */
  private retryOrAdvance(): void {
    const campaignComplete = allLevelsCompleted(loadCompletedLevels())
    if (this.victory && !campaignComplete && randomNextLevel(this.level)) {
      this.startNextLevel()
      return
    }
    this.scene.restart()
  }

  /** Avança a sessão para a próxima fase e recomeça a arena nela. */
  private startNextLevel(): void {
    if (advanceSessionLevel()) this.scene.restart()
  }

  private triggerGameOver(): void {
    if (this.gameOver || this.victory) return
    this.gameOver = true
    this.pendingRespawn.clear()
    this.hideAllRevivePrompts()
    this.spawnerTimer?.remove(false)
    this.staticEndScreen()

    this.sound.stopByKey(AUDIO.BGM)
    this.sound.play(AUDIO.GAME_OVER, { volume: 0.75 })

    const { width, height } = this.scale
    buildGameOverScreen({
      scene: this,
      width,
      height,
      stats: { kills: this.kills, score: this.score, bestScore: this.bestScore },
      onPrimary: () => this.retryOrAdvance(),
      onMenu: () => this.scene.start('TitleScene'),
    })
  }

  /** Condição de vitória alcançada (meta de abates da fase): overlay verde. */
  private triggerVictory(): void {
    if (this.victory || this.gameOver) return
    this.victory = true
    markLevelCompleted(this.level.id)
    const campaignComplete = allLevelsCompleted(loadCompletedLevels())
    this.pendingRespawn.clear()
    this.hideAllRevivePrompts()
    this.spawnerTimer?.remove(false)
    this.staticEndScreen()

    const { width, height } = this.scale
    buildVictoryScreen({
      scene: this,
      width,
      height,
      levelName: this.level.name,
      levelVictoryKills: this.level.victoryKills,
      hasNextLevel: !campaignComplete,
      campaignComplete,
      stats: { kills: this.kills, score: this.score, bestScore: this.bestScore },
      onPrimary: () => this.retryOrAdvance(),
      onMenu: () => this.scene.start('TitleScene'),
    })
  }

  // ------------------------------------------------------------------
  // HUD
  // ------------------------------------------------------------------

  private createHud(): void {
    const { width, height } = this.scale

    this.players.forEach((player, i) => this.addPlayerHud(player, i))

    // Vinheta de perigo: pulsa quando alguém está com o último coração
    this.vignette = this.add
      .rectangle(width / 2, height / 2, width, height, 0xff1a2e, 0.14)
      .setDepth(8)
      .setVisible(false)
    this.tweens.add({
      targets: this.vignette,
      alpha: 0.05,
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Placar de abates (topo central) com o multiplicador de combo
    this.killsText = this.add
      .text(width / 2, 8, 'ZOMBIES: 999  x10', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#e8edf7',
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(11)
    this.killsText.setStroke('#0d101b', 6)

    this.add
      .rectangle(width / 2, 0, 300, 52, 0x0a0c14, 0.45)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x2c3350, 0.7)
      .setDepth(9)

    this.killsText.setText('ZOMBIES: 0')
  }

  private refreshHud(): void {
    this.players.forEach((player) => {
      const hearts = this.heartsByPlayer.get(player.id)
      if (!hearts) return

      // Corações só re-pintam quando o HP mudou
      if (this.lastHpByPlayer.get(player.id) !== player.hp) {
        hearts.forEach((heart, h) => {
          heart.setTintFill(h < player.hp ? 0xff4d5d : 0x251f33)
        })
        this.lastHpByPlayer.set(player.id, player.hp)
      }
    })

    // Realça o placar: dourado quando o recorde da sessão está à frente/igual,
    // ou quando o multiplicador de combo está acima de x1
    const isRecord = this.kills > 0 && this.kills >= this.bestKills
    const boosted = this.mult > 1
    const color = isRecord || boosted ? '#ffe082' : '#e8edf7'
    const label = `ZOMBIES: ${this.kills}${boosted ? `  x${this.mult}` : ''}`
    if (label !== this.lastKillsLabel) {
      this.killsText.setText(label)
      this.lastKillsLabel = label
    }
    if (color !== this.lastKillsColor) {
      this.killsText.setColor(color)
      this.lastKillsColor = color
    }

    // Vinheta apenas durante o combate e com algum jogador no último coração
    const lowHp = this.players.some((p) => p.isAlive && p.hp <= 1)
    if (!this.gameOver && !this.victory && lowHp) {
      if (this.vignette && !this.vignette.visible) this.vignette.setVisible(true)
    } else if (this.vignette && this.vignette.visible) {
      this.vignette.setVisible(false)
    }

    this.refreshBossBar()
  }

  /** Atualiza/esconde a barra de vida do boss (só reescreve quando muda). */
  private refreshBossBar(): void {
    const show = !!this.boss && !this.boss.isDying && !this.victory
    if (show !== this.lastBossVisible) {
      this.bossLabel?.setVisible(show)
      this.bossBarBack?.setVisible(show)
      this.bossBarFill?.setVisible(show)
      this.lastBossVisible = show
    }
    if (show && this.boss && this.bossBarFill) {
      const hp = this.boss.hp
      if (hp !== this.lastBossHp) {
        this.bossBarFill.width = Math.max(1, 340 * (hp / this.boss.hpMax))
        this.lastBossHp = hp
      }
    }
  }

  /**
   * Cria o painel (nome + corações) de um jogador no HUD.
   * Reutilizado na entrada do P2 em partida já iniciada.
   */
  private addPlayerHud(player: Player, index: number): void {
    const { width } = this.scale
    const isP1 = index === 0
    const nameColor = isP1 ? '#8fd8ff' : '#ff9fc2'
    const hearts: Phaser.GameObjects.Image[] = []
    const originX = isP1 ? 24 : width - 24
    const dir = isP1 ? 1 : -1

    const name = this.add
      .text(originX, 8, player.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: nameColor,
      })
      .setOrigin(isP1 ? 0 : 1, 0)
      .setDepth(11)
    name.setStroke('#0d101b', 6)

    const panelW = name.width + player.maxHp * 24 + 40
    this.add
      .rectangle(isP1 ? 0 : width, 0, panelW, 52, 0x0a0c14, 1)
      .setOrigin(isP1 ? 0 : 1, 0)
      .setStrokeStyle(2, isP1 ? 0x2c3350 : 0x4a2c3e, 0.9)
      .setDepth(9)

    const heartStart = originX + dir * (name.width + 18)
    for (let h = 0; h < player.maxHp; h++) {
      const heart = this.add
        .image(heartStart + dir * (h * 24), 28, 'heart')
        .setOrigin(0.5)
        .setDepth(11)
        .setScale(2)
      hearts.push(heart)
    }

    this.heartsByPlayer.set(player.id, hearts)
  }
}
