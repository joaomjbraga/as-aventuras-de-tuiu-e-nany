import Phaser from 'phaser'

export interface GraveyardResult {
  ground: Phaser.GameObjects.Rectangle
}

/**
 * Cenário do jogo: arte de fundo (scenes-my-home.jpg) cobrindo a tela,
 * chão jogável com física e névoa ambiente.
 */
export function buildGraveyard(scene: Phaser.Scene, width: number, height: number): GraveyardResult {
  const groundTop = height - 48
  const cx = width / 2

  // ---- Fundo: vídeo da casa em tela cheia (fallback: imagem) ----
  // O Phaser guarda vídeos no CacheManager.video (a textura só existe após o
  // add.video), então a checagem de disponibilidade é cache.video, não textures.
  const hasVideo = scene.cache.video.exists('bg-home')
  const bg: Phaser.GameObjects.Image | Phaser.GameObjects.Video = hasVideo
    ? scene.add.video(cx, height / 2, 'bg-home')
    : scene.add.image(cx, height / 2, 'bg-home-img')
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

  // ---- Chão do cemitério ----
  const ground = scene.add.rectangle(cx, height - 24, width, 48, 0x232633)
  ground.setStrokeStyle(2, 0x2f3245)
  ground.setDepth(0)
  scene.physics.add.existing(ground, true)

  // ---- Névoa rasteira ----
  for (let i = 0; i < 4; i++) {
    const fog = scene.add.ellipse(
      cx + (i - 1.5) * 88,
      groundTop - 12 + (i % 2) * 10,
      170,
      12,
      0xd8d8c8,
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