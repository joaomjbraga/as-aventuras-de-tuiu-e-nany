import Phaser from 'phaser'
import { Player } from '../entities/Player'
import { Zombie } from '../entities/Zombie'
import { CHARACTERS, ZOMBIE_TARGET_HEIGHT, ZOMBIE_VARIANTS, type CharacterKey } from '../sprites'
import { getSession, setSessionPlayers, type PlayerId } from '../session'
import { buildScene, type SceneResult } from '../scenery'
import { AUDIO, applyMute, playBgm, toggleMute } from '../audio'
import { createButton } from '../ui'
import { groundCenterYFor, groundTopFor, spawnXFor } from '../layout'
import { canSpawnZombie, hasWon, spawnIntervalMs, VICTORY_KILLS } from '../difficulty'
import { loadBestKills, saveBestKills } from '../storage'

type ArcadeObject = Phaser.Types.Physics.Arcade.GameObjectWithBody

export class MainScene extends Phaser.Scene {
  private players: Player[] = []
  private ground!: Phaser.GameObjects.Rectangle
  private playerGroup!: Phaser.Physics.Arcade.Group
  private zombieGroup!: Phaser.Physics.Arcade.Group
  private scenery!: SceneResult

  private kills = 0
  private bestKills = 0
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
  private p2JoinKey?: Phaser.Input.Keyboard.Key
  private joinButton?: Phaser.GameObjects.Container

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
    this.spawnerTimer = undefined
    this.joinButton = undefined

    // Restaura o relógio da cena: um hit-stop (timeScale 0.25) pode ter sido
    // cancelado por um restart/shutdown antes do reset; sem isso a nova
    // partida rodaria inteira em câmera lenta (Clock.shutdown não zera o
    // timeScale). Também zera a referência do início da partida (a rampa de
    // dificuldade é relativa a esta partida, não ao relógio global do app).
    this.time.timeScale = 1
    this.matchStartTime = this.time.now

    const { width, height } = this.scale

    applyMute(this)

    this.scenery = buildScene(this, width, height)
    this.ground = this.scenery.ground

    this.createPlayers()
    this.createCombat()
    this.createHud()

    // Música de fundo em volume baixo (continua se já estava tocando)
    playBgm(this)

    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.escKey = this.input.keyboard!.addKey('ESC')
    this.muteKey = this.input.keyboard!.addKey('M')

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
    // próxima partida — Clock.shutdown destrói os timers mas não reseta o scale.
    this.time.timeScale = 1
  }

  update(): void {
    // Mudo (tecla M) a qualquer momento durante a partida
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      toggleMute(this)
    }

    // Pausa (ESC): abre o menu de pausa
    if (!this.gameOver && !this.victory && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.pause()
      this.scene.launch('PauseScene')
      return
    }

    // Fim de jogo / vitória: atalhos de teclado para os botões
    if (this.gameOver || this.victory) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.scene.restart()
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
    const entries = session.players.length > 0 ? session.players : []

    if (entries.length === 0) {
      entries.push({ id: 'P1', characterKey: 'tuio', controls: 'p1' })
    }

    this.playerGroup = this.physics.add.group()

    entries.forEach((entry, i) => {
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

    this.spawnerTimer?.remove()

    // Dificuldade progressiva: o intervalo de spawn começa devagar e acelera
    // ao longo da PARTIDA (relativo a matchStartTime, não ao relógio global —
    // do contrário a 2ª partida já abriria no teto de dificuldade). O próximo
    // ciclo re-agenda com o delay novo.
    const tick = () => {
      if (!canSpawnZombie(this.zombieGroup.countActive(true))) return
      const side = Phaser.Math.Between(0, 1)
      this.spawnZombie(side === 0 ? -16 : width + 16)
      this.spawnerTimer?.reset({
        delay: spawnIntervalMs(this.time.now - this.matchStartTime),
        loop: true,
        callback: tick,
      })
    }

    this.spawnerTimer = this.time.addEvent({ delay: spawnIntervalMs(0), loop: true, callback: tick })
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
      onKilled: () => this.registerKill(),
    })

    this.zombieGroup.add(zombie)
    this.sound.play(AUDIO.ZOMBIE_GROWL, { volume: 0.5 })
  }

  /** Registra um abate: atualiza placar, recorde, som de morte e vitória. */
  private registerKill(): void {
    this.kills += 1
    if (this.kills > this.bestKills) {
      this.bestKills = this.kills
      saveBestKills(this.bestKills)
    }
    this.sound.play(AUDIO.ZOMBIE_DEATH, { volume: 0.7 })

    if (hasWon(this.kills)) this.triggerVictory()
  }

  private onPlayerZombieContact(object1: ArcadeObject, object2: ArcadeObject): void {
    const playerSpr = object1 as Phaser.Physics.Arcade.Sprite
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
        this.cameras.main.shake(90, 0.012)
        this.hitStop()
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

  private createEndButtons(offsetY: number): void {
    const { width, height } = this.scale
    createButton(
      this,
      width / 2,
      height / 2 + offsetY,
      'JOGAR NOVAMENTE',
      () => {
        this.scene.restart()
      },
      { width: 180 },
    ).setDepth(21)

    createButton(
      this,
      width / 2,
      height / 2 + offsetY + 46,
      'MENU INICIAL',
      () => {
        this.scene.start('TitleScene')
      },
      { width: 170 },
    ).setDepth(21)

    this.add
      .text(width / 2, height - 10, 'ENTER: jogar novamente   ESC: menu', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#7a89a0',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(21)
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
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(20)
    this.add
      .text(width / 2, height / 2 - 46, 'FIM DE JOGO', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#e8385a',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 4)
      .setDepth(21)
    this.add
      .text(width / 2, height / 2 - 22, `ZOMBIES: ${this.kills}    RECORDE: ${this.bestKills}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e8edf7',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 3)
      .setDepth(21)

    this.createEndButtons(16)
  }

  /** Condição de vitória alcançada (VICTORY_KILLS abates): overlay verde. */
  private triggerVictory(): void {
    if (this.victory || this.gameOver) return
    this.victory = true
    this.pendingRespawn.clear()
    this.hideAllRevivePrompts()
    this.spawnerTimer?.remove(false)
    this.staticEndScreen()

    const { width, height } = this.scale
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a2318, 0.75).setDepth(20)
    this.add
      .text(width / 2, height / 2 - 52, 'VITÓRIA!', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#7cfc8a',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 4)
      .setDepth(21)
    this.add
      .text(width / 2, height / 2 - 32, `MISSÃO CUMPRIDA — ${VICTORY_KILLS} ZUMBIS`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#c8e6c9',
      })
      .setOrigin(0.5)
      .setDepth(21)
    this.add
      .text(width / 2, height / 2 - 16, `ABATES: ${this.kills}    RECORDE: ${this.bestKills}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e8edf7',
      })
      .setOrigin(0.5)
      .setDepth(21)

    this.createEndButtons(16)
  }

  // ------------------------------------------------------------------
  // HUD
  // ------------------------------------------------------------------

  private createHud(): void {
    const { width } = this.scale

    this.players.forEach((player, i) => this.addPlayerHud(player, i))

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
        // Coração inteiro vermelho, vazio escuro (tintFill sobre a textura branca)
        heart.setTintFill(h < player.hp ? 0xff4d5d : 0x251f33)
      })
    })

    // Realça o placar em dourado enquanto o recorde da sessão está empatado/à frente
    const isRecord = this.kills > 0 && this.kills >= this.bestKills
    this.killsText.setText(`ZOMBIES: ${this.kills}`)
    this.killsText.setColor(isRecord ? '#ffe082' : '#e8edf7')
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
