import Phaser from 'phaser'
import { GROUND_HEIGHT, groundTopFor } from './layout'
import { bgImageKey, bgVideoKey, type LevelConfig } from './levels'

export interface SceneResult {
  ground: Phaser.GameObjects.Rectangle
}

/**
 * Cenário da fase: arte de fundo (vídeo com fallback de imagem) cobrindo a
 * tela, chão jogável com física e névoa ambiente — tudo vindo do `LevelConfig`.
 */
export function buildScene(scene: Phaser.Scene, width: number, height: number, level: LevelConfig): SceneResult {
  const groundTop = groundTopFor(height)
  const cx = width / 2

  // ---- Fundo: vídeo em tela cheia (fallback: imagem) ----
  // O Phaser guarda vídeos no CacheManager.video (a textura só existe após o
  // add.video), então a checagem de disponibilidade é cache.video, não textures.
  const hasVideo = !!level.art.video && scene.cache.video.exists(bgVideoKey(level))
  const bg: Phaser.GameObjects.Image | Phaser.GameObjects.Video = hasVideo
    ? scene.add.video(cx, height / 2, bgVideoKey(level))
    : scene.add.image(cx, height / 2, bgImageKey(level))
  bg.setDepth(0)

  if (hasVideo) {
    const video = bg as Phaser.GameObjects.Video
    video.setLoop(true)
    // Antes do 'created' o vídeo usa 256x256 e o setDisplaySize calcularia uma
    // escala errada; redimensiona só quando o frame real (1248x704) existir.
    video.once('created', () => {
      video.setDisplaySize(width, height)
    })
    video.play(true)
  } else {
    bg.setDisplaySize(width, height)
  }

  // ---- Chão jogável ----
  const ground = scene.add.rectangle(cx, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, level.groundColor)
  ground.setStrokeStyle(2, level.groundStrokeColor)
  ground.setDepth(0)
  scene.physics.add.existing(ground, true)

  // ---- Névoa rasteira ----
  for (let i = 0; i < 4; i++) {
    const fog = scene.add.ellipse(
      cx + (i - 1.5) * 88,
      groundTop - 12 + (i % 2) * 10,
      170,
      12,
      level.fogColor,
      0.05 + i * 0.02,
    )
    fog.setDepth(2)
    scene.tweens.add({
      targets: fog,
      x: fog.x + 46,
      duration: 4200 + i * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  return { ground }
}
