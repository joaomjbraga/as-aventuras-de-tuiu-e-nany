import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { Zombie } from '../entities/Zombie'
import { Boss } from '../entities/Boss'
import { CHARACTERS, ZOMBIE_TARGET_HEIGHT, ZOMBIE_VARIANTS, type CharacterKey } from '../sprites'
import { advanceSessionLevel, getSession, getSessionLevel, setSessionPlayers, type PlayerId } from '../session'
import { buildScene, type SceneResult } from '../scenery'
import { AUDIO, applyMute, playBgm, toggleMute } from '../audio'
import { createButton } from '../ui'
import { groundCenterYFor, groundTopFor, spawnXFor } from '../layout'
import { canSpawnZombie, hasWon, spawnIntervalMs } from '../difficulty'
import { randomNextLevel, type LevelConfig } from '../levels'
import { loadBestKills, markLevelCompleted, saveBestKills, loadBestScore, saveBestScore } from '../storage'
import { multiplierFor, scoreOfKill } from '../score'
import { resolvePlayerZombieContact, stompDamage } from '../combat'
import { buildGameOverScreen, buildVictoryScreen } from '../ui/endScreen'
import { createMobileControls, type MobileControls } from '../mobileControls'
import { isTouchDevice } from '../mobile'
import {
  PICKUP_EFFECT_DURATION_MS,
  PICKUP_EFFECTS,
  PICKUP_SAFETY_INTERVAL_MS,
  pickupTextureKey,
  randomPickupKind,
  rollPickupDrop,
  type PickupKind,
} from '../powerups'

type ArcadeObject = Phaser.Types.Physics.Arcade.GameObjectWithBody

interface HudEffect {
  kind: 'shield' | 'speed' | 'double'
  icon: Phaser.GameObjects.Image
  bar: Phaser.GameObjects.Rectangle
  until: number
  duration: number
  barWidth: number
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
  private mobileControls?: MobileControls

  private pickupGroup!: Phaser.Physics.Arcade.Group
  private lastPickupAt = 0
  private effectsByPlayer = new Map<string, HudEffect[]>()
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
    this.effectsByPlayer = new Map()
    this.lastPickupAt = this.time.now
    this.boss = undefined
    this.bossPhase = false
    this.lastHpByPlayer = new Map()
    this.lastKillsLabel = ''
    this.lastKillsColor = ''
    this.lastBossVisible = false
    this.lastBossHp = -1

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
    this.mobileControls = createMobileControls(this, {
      onPause: () => this.openPauseMenu(),
      onMute: () => toggleMute(this),
    })
    this.events.on('resume', this.showMobileControls, this)

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
    this.mobileControls?.destroy()
    this.mobileControls = undefined
    this.events.off('resume', this.showMobileControls, this)
    this.sound.stopByKey(AUDIO.BGM)
    this.sound.stopByKey(AUDIO.GAME_OVER)

    // Garante que um hit-stop pendente (timeScale 0.25) nunca vaze para a
    // próxima partida — Clock.shutdown destrói os timers mas não reseta o scale.
    this.time.timeScale = 1
  }

  /**
   * Alterna o modo tela cheia (web). Requer gesture do usuário (tecla F11
   * conta como gesture). Se o navegador não suportar, não faz nada.
   */
  private toggleFullscreen(): void {
    const doc = document.documentElement
    if (!document.fullscreenElement) {
      doc.requestFullscreen().catch(() => {
        // Navegador rejeitou — silencioso
      })
    } else {
      document.exitFullscreen()
    }
  }

  private openPauseMenu(): void {
    if (this.gameOver || this.victory) return
    this.mobileControls?.setVisible(false)
    this.scene.pause()
    this.scene.launch('PauseScene')
  }

  private showMobileControls(): void {
    this.mobileControls?.setVisible(true)
  }

  update(): void {
    // Mudo (tecla M) a qualquer momento durante a partida
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      toggleMute(this)
    }

    // F11 alterna o modo tela cheia (web: requestFullscreen / exitFullscreen)
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
    // seleção). Só checa enquanto não há P2 — W também é o pulo do P2, e chamar
    // tryJoinP2 a cada pulo era redundante.
    if (this.players.length === 1 && this.p2JoinKey && Phaser.Input.Keyboard.JustDown(this.p2JoinKey)) {
      this.tryJoinP2()
    }

    // Segurança dos power-ups: se não houver drop há um bom tempo, garante um
    // pickup na arena para o jogador não ficar sem opções.
    if (this.kills > 0 && this.time.now - this.lastPickupAt > PICKUP_SAFETY_INTERVAL_MS) {
      this.spawnPickup(Phaser.Math.Between(48, this.scale.width - 48), this.groundTop - 30)
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
          const { x, y } = this.spawnPointFor(player.id)
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
    const entries = isTouchDevice() ? session.players.slice(0, 1) : session.players

    if (entries.length === 0) {
      entries.push({ id: 'P1', characterKey: 'tuio', controls: 'p1' })
    }

    this.playerGroup = this.physics.add.group()

    entries.forEach((entry, i) => {
      this.mobileControls?.addPlayer(entry.id)
      const def = CHARACTERS[entry.characterKey]
      const { x, y } = this.spawnPointFor(entry.id, i)

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
        virtualInput: this.mobileControls?.getState(entry.id),
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
    if (isTouchDevice()) return
    this.p2JoinKey = this.input.keyboard!.addKey('W')

    if (this.players.length === 1) {
      this.joinButton = createButton(
        this,
        this.scale.width / 2,
        this.scale.height - 22,
        'J2: ENTRAR  [W]',
        () => this.tryJoinP2(),
        {
          width: 150,
          height: 26,
          fontSize: '9px',
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

    const { x, y } = this.spawnPointFor('P2', 1)
    this.mobileControls?.addPlayer('P2')
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
      virtualInput: this.mobileControls?.getState('P2'),
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

  private spawnPointFor(playerId: string, index?: number): { x: number; y: number } {
    const { width } = this.scale
    const i = index ?? this.players.findIndex((p) => p.id === playerId)
    // Spawns com margem segura, longe das bordas e do meio da arena, para um
    // personagem não nascer em cima de nenhum obstáculo do cenário.
    const x = spawnXFor(width, i)
    // A altura do corpo é por personagem (Nany tem frame maior que o Tuiu,
    // mas as escalas em jogo são calibradas para a mesma altura); usar sempre
    // a do Tuiu afundava a Nany alguns pixels dentro do chão.
    const player = this.players[i]
    const def = CHARACTERS[(player?.spriteKey as CharacterKey) ?? 'tuio'] ?? CHARACTERS.tuio
    return { x, y: groundCenterYFor(this.groundTop, def.bodyHeight * def.scale) }
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
    this.physics.add.collider(this.playerGroup, this.zombieGroup, (a, b) => {
      this.onPlayerZombieContact(a as ArcadeObject, b as ArcadeObject)
    })

    const { width } = this.scale
    const diff = this.level.difficulty

    this.spawnerTimer?.remove()

    // Dificuldade progressiva: o intervalo de spawn começa devagar e acelera
    // ao longo da PARTIDA (relativo a matchStartTime, não ao relógio global —
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

    this.applyPickup(player, kind)
    pickup.destroy()

    // Pequena explosão de partículas na coleta
    const emitter = this.add.particles(pickup.x, pickup.y, 'pixel', {
      speedX: { min: -50, max: 50 },
      speedY: { min: -80, max: -20 },
      gravityY: 340,
      scale: { start: 1.2, end: 0 },
      lifespan: 420,
      tint: [PICKUP_EFFECTS[kind].tint, 0xe8edf7],
    })
    emitter.setDepth(2)
    emitter.explode(10)
    this.time.delayedCall(520, () => emitter.destroy())

    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.35 })
  }

  private applyPickup(player: Player, kind: PickupKind): void {
    const effect = PICKUP_EFFECTS[kind]

    if (kind === 'heart') {
      if (player.hp < player.maxHp) {
        player.hp += 1
        this.sound.play(AUDIO.ZOMBIE_ATTACK, { volume: 0.4 })
      } else {
        // Vida cheia: o coração vira uns pontinhos de bônus
        const bonus = 5 * this.mult
        this.score += bonus
        if (this.score > this.bestScore) {
          this.bestScore = this.score
          saveBestScore(this.bestScore)
        }
        this.sound.play(AUDIO.ZOMBIE_ATTACK, { volume: 0.3 })
      }
      return
    }

    if (kind === 'shield') player.activateShield(effect.durationMs ?? PICKUP_EFFECT_DURATION_MS)
    else if (kind === 'speed') player.activateSpeed(effect.durationMs ?? PICKUP_EFFECT_DURATION_MS)
    else player.activateDamageBoost(effect.durationMs ?? PICKUP_EFFECT_DURATION_MS)

    this.upsertEffectSlot(player, kind, effect.durationMs ?? PICKUP_EFFECT_DURATION_MS)
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
    const img = this.pickupGroup.create(x, groundedY, pickupTextureKey(kind)) as Phaser.Physics.Arcade.Image
    img.setDepth(2)
    if (kind !== 'heart') img.setTint(PICKUP_EFFECTS[kind].tint)
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

  /** Barra de vida do boss (topo central, abaixo do placar). */
  private createBossBar(name: string): void {
    const { width } = this.scale

    this.bossLabel = this.add
      .text(width / 2, 30, `${name.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#ff5d6c',
      })
      .setOrigin(0.5, 0)
      .setStroke('#0d101b', 2)
      .setDepth(11)

    this.bossBarBack = this.add
      .rectangle(width / 2, 42, 170, 7, 0x181d29)
      .setStrokeStyle(1, 0xff5d6c, 0.9)
      .setDepth(10)

    this.bossBarFill = this.add
      .rectangle(width / 2 - 85, 42, 170, 5, 0xff5d6c)
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
      .text(x, y - 22, `+${value}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffe082',
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setStroke('#0d101b', 2)
    this.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private onPlayerZombieContact(object1: ArcadeObject, object2: ArcadeObject): void {
    const playerSpr = object1 as Phaser.Physics.Arcade.Sprite
    const zombieSpr = object2 as Phaser.Physics.Arcade.Sprite
    const player = this.players.find((p) => p.sprite === playerSpr)
    const zombie = zombieSpr as Zombie
    if (!player || zombie.isDying) return

    const playerBody = playerSpr.body as Phaser.Physics.Arcade.Body
    const zombieBody = zombieSpr.body as Phaser.Physics.Arcade.Body

    // Regras de pisão × contato lateral ficam na lógica pura (combat.ts),
    // testável sem Phaser; aqui só traduzimos o desfecho em efeitos.
    const outcome = resolvePlayerZombieContact(
      {
        x: playerSpr.x,
        feetY: playerSpr.y + playerBody.halfHeight,
        velocityY: playerBody.velocity.y,
      },
      {
        isDying: zombie.isDying,
        x: zombieSpr.x,
        headY: zombieSpr.y - zombieBody.halfHeight,
        damageAmount: stompDamage({
          damageBoost: player.hasDamageBoost(),
          doubleJump: player.hasDoubleJumped(),
        }),
        stomp: (fromX, amount) => zombie.stompDamage(fromX, amount),
      },
    )

    if (outcome === 'stomp-kill') {
      player.bounce(-160)
      this.cameras.main.shake(90, 0.012)
      this.hitStop()
    } else if (outcome === 'stomp') {
      player.bounce(-90) // continua "quicando" mesmo no cooldown de dano
    } else if (outcome === 'hit') {
      if (player.damage(1)) {
        // Som de ferido específico por personagem (Tuiu/Nany)
        this.sound.play(player.spriteKey === 'nany' ? AUDIO.FEMALE_DEATH : AUDIO.MAN_DEATH, { volume: 0.7 })
        // Dano quebra a sequência de abates sem levar dano (combo)
        this.breakCombo()
      }
    }
  }

  /** Micro-congelamento (hit-stop) ao abater um zumbi para dar "peso" ao golpe. */
  private hitStop(): void {
    this.time.timeScale = 0.25
    this.time.delayedCall(90, () => {
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
      .text(player.sprite.x, player.sprite.y - 74, `${player.name.toUpperCase()} CAIU!\nAPERTE ${label} PARA REVIVER`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffd54f',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setStroke('#0d101b', 3)
    this.tweens.add({ targets: prompt, alpha: 0.55, duration: 480, yoyo: true, repeat: -1 })
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
    if (this.victory && randomNextLevel(this.level)) {
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
    this.mobileControls?.setVisible(false)

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
    this.pendingRespawn.clear()
    this.hideAllRevivePrompts()
    this.spawnerTimer?.remove(false)
    this.staticEndScreen()
    this.mobileControls?.setVisible(false)

    const { width, height } = this.scale
    buildVictoryScreen({
      scene: this,
      width,
      height,
      levelName: this.level.name,
      levelVictoryKills: this.level.victoryKills,
      hasNextLevel: !!randomNextLevel(this.level),
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
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Placar de abates (topo central) com o multiplicador de combo
    this.killsText = this.add
      .text(width / 2, 4, 'ZOMBIES: 999  x10', {
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
      .rectangle(width / 2, 0, 150, 26, 0x0a0c14, 0.45)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x2c3350, 0.7)
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
    this.refreshEffectIcons()
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
        this.bossBarFill.width = Math.max(1, 170 * (hp / this.boss.hpMax))
        this.lastBossHp = hp
      }
    }
  }

  /**
   * Ícones dos power-ups ativos (escudo/veloz/dano x2) com barra do tempo
   * restante, logo abaixo do painel de cada jogador.
   */
  private refreshEffectIcons(): void {
    this.players.forEach((player) => {
      const slots = this.effectsByPlayer.get(player.id)
      if (!slots || slots.length === 0) return
      for (let i = slots.length - 1; i >= 0; i--) {
        const slot = slots[i]
        const remaining = slot.until - this.time.now
        if (remaining <= 0) {
          slot.icon.destroy()
          slot.bar.destroy()
          slots.splice(i, 1)
          continue
        }
        const fraction = Math.max(0, Math.min(1, remaining / slot.duration))
        slot.icon.setVisible(true)
        slot.bar.setVisible(true)
        const barWidth = Math.max(1, 16 * fraction)
        if (barWidth !== slot.barWidth) {
          slot.bar.width = barWidth
          slot.barWidth = barWidth
        }
      }
    })
  }

  /**
   * Cria (ou estende) o indicador de um efeito temporizado do jogador.
   * Reutilizado sempre que o mesmo power-up é coletado de novo.
   */
  private upsertEffectSlot(player: Player, kind: 'shield' | 'speed' | 'double', duration: number): void {
    const { width } = this.scale
    const slots = this.effectsByPlayer.get(player.id) ?? []
    const existing = slots.find((s) => s.kind === kind)
    if (existing) {
      existing.until = this.time.now + duration
      existing.duration = duration
      return
    }

    const isP1 = this.players[0]?.id === player.id
    const dir = isP1 ? 1 : -1
    const originX = isP1 ? 12 : width - 12
    const x = originX + dir * (8 + slots.length * 17)

    const tint = PICKUP_EFFECTS[kind].tint
    const icon = this.add.image(x, 34, pickupTextureKey(kind)).setDepth(11).setScale(1.4)
    icon.setTint(tint)
    const bar = this.add.rectangle(x, 43, 16, 2, tint, 0.9).setOrigin(0.5, 0).setDepth(11)

    slots.push({ kind, icon, bar, until: this.time.now + duration, duration, barWidth: 16 })
    this.effectsByPlayer.set(player.id, slots)
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
    const originX = isP1 ? 12 : width - 12
    const dir = isP1 ? 1 : -1

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

    const panelW = name.width + player.maxHp * 12 + 20
    this.add
      .rectangle(isP1 ? 0 : width, 0, panelW, 26, 0x0a0c14, 1)
      .setOrigin(isP1 ? 0 : 1, 0)
      .setStrokeStyle(1, isP1 ? 0x2c3350 : 0x4a2c3e, 0.9)
      .setDepth(9)

    const heartStart = originX + dir * (name.width + 9)
    for (let h = 0; h < player.maxHp; h++) {
      const heart = this.add
        .image(heartStart + dir * (h * 12), 14, 'heart')
        .setOrigin(0.5)
        .setDepth(11)
      hearts.push(heart)
    }

    this.heartsByPlayer.set(player.id, hearts)
  }
}
