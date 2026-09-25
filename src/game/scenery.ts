import Phaser from 'phaser'
import { bgImageKey, type LevelConfig } from './levels'

export interface SceneResult {
  ground: Phaser.GameObjects.Zone
}

/**
 * Cenário da fase: arte de fundo estática cobrindo a tela e zona de chão
 * invisível (para física). Tudo vindo do `LevelConfig`.
 */
export function buildScene(scene: Phaser.Scene, width: number, height: number, level: LevelConfig): SceneResult {
  const cx = width / 2

  // ---- Fundo: imagem estática em tela cheia ----
  const bg = scene.add.image(cx, height / 2, bgImageKey(level))
  bg.setDepth(0)
  bg.setDisplaySize(width, height)

  // ---- Chão invisível (zona de física, sem retângulo visual) ----
  const ground = scene.add.zone(cx, height - 48, width, 96)
  scene.physics.add.existing(ground, true)

  // ---- Névoa rasteira ----
  const groundTop = height - 96
  for (let i = 0; i < 4; i++) {
    const fog = scene.add.ellipse(
      cx + (i - 1.5) * 176,
      groundTop - 24 + (i % 2) * 20,
      340,
      24,
      level.fogColor,
      0.05 + i * 0.02,
    )
    fog.setDepth(2)
    scene.tweens.add({
      targets: fog,
      x: fog.x + 92,
      duration: 4200 + i * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  return { ground }
}
