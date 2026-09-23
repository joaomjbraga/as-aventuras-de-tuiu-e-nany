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
    .text(width / 2, height / 2 - 46, 'FIM DE JOGO', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#e8385a',
    })
    .setOrigin(0.5)
    .setStroke('#0d101b', 4)
    .setDepth(21)
  scene.add
    .text(
      width / 2,
      height / 2 - 22,
      `ABATES: ${stats.kills}    PONTOS: ${stats.score}    RECORDE: ${stats.bestScore}`,
      {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e8edf7',
      },
    )
    .setOrigin(0.5)
    .setStroke('#0d101b', 3)
    .setDepth(21)

  createEndButtons(scene, width, height, 16, false, onPrimary, onMenu)
}

/**
 * Overlay de vitória (verde): VITÓRIA + placar + confete + recado de
 * aniversário (homenagem ao casal Tuiu & Nany). O botão principal avança
 * para a próxima fase quando existe.
 */
export function buildVictoryScreen(opts: EndScreenOptions): void {
  const { scene, width, height, levelName, levelVictoryKills, stats, hasNextLevel, onPrimary, onMenu } = opts

  scene.add.rectangle(width / 2, height / 2, width, height, 0x0a2318, 0.75).setDepth(20)
  scene.add
    .text(width / 2, height / 2 - 52, 'VITÓRIA!', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#7cfc8a',
    })
    .setOrigin(0.5)
    .setStroke('#0d101b', 4)
    .setDepth(21)

  if (levelName != null && levelVictoryKills != null) {
    scene.add
      .text(width / 2, height / 2 - 32, `${levelName} CONCLUÍDA — ${levelVictoryKills} ZUMBIS`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#c8e6c9',
      })
      .setOrigin(0.5)
      .setDepth(21)
  }

  scene.add
    .text(
      width / 2,
      height / 2 - 16,
      `ABATES: ${stats.kills}    PONTOS: ${stats.score}    RECORDE: ${stats.bestScore}`,
      {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e8edf7',
      },
    )
    .setOrigin(0.5)
    .setStroke('#0d101b', 3)
    .setDepth(21)

  scene.add
    .text(width / 2, height / 2 - 2, 'FELIZ 5 ANOS, ANNE C C BRAGA!', {
      fontFamily: 'monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#ffd54f',
    })
    .setOrigin(0.5)
    .setStroke('#0d101b', 3)
    .setDepth(21)
  scene.add
    .text(width / 2, height / 2 + 8, 'COM AMOR, TUIU & NANY', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#ff9fc2',
    })
    .setOrigin(0.5)
    .setStroke('#0d101b', 3)
    .setDepth(21)

  spawnConfetti(scene, width)
  const hasNext = hasNextLevel ?? false
  createEndButtons(scene, width, height, 22, hasNext, onPrimary, onMenu)
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
    width: 180,
  }).setDepth(21)

  createButton(scene, width / 2, height / 2 + offsetY + 46, 'MENU INICIAL', onMenu, { width: 170 }).setDepth(21)

  scene.add
    .text(
      width / 2,
      height - 10,
      hasNextLevel ? 'ENTER: próxima fase   ESC: menu' : 'ENTER: jogar novamente   ESC: menu',
      {
        fontFamily: 'monospace',
        fontSize: '8px',
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
