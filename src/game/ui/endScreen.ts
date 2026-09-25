import Phaser from 'phaser'
import { createButton } from '../ui'

export interface MatchStats {
  kills: number
  score: number
  bestScore: number
}

export interface EndScreenOptions {
  scene: Phaser.Scene
  width: number
  height: number
  levelName?: string
  levelVictoryKills?: number
  hasNextLevel?: boolean
  /** Todas as fases já foram concluídas (campanha zerada): mostra a saudação final. */
  campaignComplete?: boolean
  stats: MatchStats
  onPrimary: () => void
  onMenu: () => void
}

/**
 * Overlay de fim de jogo (vermelho): FIM DE JOGO + placar + botões.
 * Os botões são criados com createButton (cena já é filha da MainScene).
 */
export function buildGameOverScreen(opts: EndScreenOptions): void {
  const { scene, width, height, stats, onPrimary, onMenu } = opts

scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(20)
    scene.add
      .text(width / 2, height / 2 - 92, 'FIM DE JOGO', {
        fontFamily: 'monospace',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#e8385a',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 8)
      .setDepth(21)
    scene.add
      .text(
        width / 2,
        height / 2 - 44,
        `ABATES: ${stats.kills}    PONTOS: ${stats.score}    RECORDE: ${stats.bestScore}`,
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#e8edf7',
        },
      )
      .setOrigin(0.5)
      .setStroke('#0d101b', 6)
      .setDepth(21)

    createEndButtons(scene, width, height, 32, false, onPrimary, onMenu)
}

/**
 * Overlay de vitória (verde): VITÓRIA + placar + confete. O botão principal
 * avança para a próxima fase quando existe.
 */
export function buildVictoryScreen(opts: EndScreenOptions): void {
  const {
    scene,
    width,
    height,
    levelName,
    levelVictoryKills,
    stats,
    hasNextLevel,
    campaignComplete,
    onPrimary,
    onMenu,
  } = opts

scene.add.rectangle(width / 2, height / 2, width, height, 0x0a2318, 0.75).setDepth(20)
    scene.add
      .text(width / 2, height / 2 - 112, 'VITÓRIA!', {
        fontFamily: 'monospace',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#7cfc8a',
      })
      .setOrigin(0.5)
      .setStroke('#0d101b', 8)
      .setDepth(21)

    if (campaignComplete) {
      // Zerou o jogo: realça a conquista em vez da linha habitual de fase.
      scene.add
        .text(width / 2, height / 2 - 80, 'TODAS AS FASES CONCLUÍDAS!', {
          fontFamily: 'monospace',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffd54f',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 6)
        .setDepth(21)
      scene.add
        .text(width / 2, height / 2 - 32, 'PARABÉNS, você venceu a campanha!', {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#c8e6c9',
        })
        .setOrigin(0.5)
        .setStroke('#0d101b', 4)
        .setDepth(21)
    } else if (levelName != null && levelVictoryKills != null) {
      scene.add
        .text(width / 2, height / 2 - 80, `${levelName} CONCLUÍDA  ${levelVictoryKills} ZUMBIS`, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#c8e6c9',
        })
        .setOrigin(0.5)
        .setDepth(21)
    }

    scene.add
      .text(
        width / 2,
        height / 2 - 27,
        `ABATES: ${stats.kills}    PONTOS: ${stats.score}    RECORDE: ${stats.bestScore}`,
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#e8edf7',
        },
      )
      .setOrigin(0.5)
      .setStroke('#0d101b', 6)
      .setDepth(21)

    spawnConfetti(scene, width)
    const hasNext = hasNextLevel ?? false
    createEndButtons(scene, width, height, 52, hasNext, onPrimary, onMenu)
}

/** Botões da tela final (mesma dupla "principal + menu inicial" em ambos). */
function createEndButtons(
  scene: Phaser.Scene,
  width: number,
  height: number,
  offsetY: number,
  hasNextLevel: boolean,
  onPrimary: () => void,
  onMenu: () => void,
): void {
  createButton(scene, width / 2, height / 2 + offsetY, hasNextLevel ? 'PRÓXIMA FASE' : 'JOGAR NOVAMENTE', onPrimary, {
    width: 360,
    height: 60,
    fontSize: '20px',
  }).setDepth(21)

  createButton(scene, width / 2, height / 2 + offsetY + 92, 'MENU INICIAL', onMenu, {
    width: 340,
    height: 60,
    fontSize: '20px',
  }).setDepth(21)

  scene.add
    .text(
      width / 2,
      height - 20,
      hasNextLevel ? 'ENTER: próxima fase   ESC: menu' : 'ENTER: jogar novamente   ESC: menu',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#7a89a0',
      },
    )
    .setOrigin(0.5, 0.5)
    .setDepth(21)
}

/** Chuva de confete colorido cobrindo a arena na vitória. */
function spawnConfetti(scene: Phaser.Scene, width: number): void {
  const confetti = scene.add.particles(width / 2, 0, 'pixel', {
    x: { min: 10, max: width - 10 },
    y: -10,
    speedY: { min: 40, max: 110 },
    speedX: { min: -30, max: 30 },
    gravityY: 60,
    angle: { min: 0, max: 360 },
    rotate: { min: -180, max: 180 },
    lifespan: 2800,
    frequency: 70,
    quantity: 2,
    scale: { start: 1.6, end: 0.8 },
    tint: [0xff5d8f, 0xffd54f, 0x7cfc8a, 0x53c1ff, 0xff9fc2],
  })
  confetti.setDepth(22)
}
