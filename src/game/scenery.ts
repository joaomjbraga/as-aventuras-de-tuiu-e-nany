import Phaser from 'phaser'

export interface GraveyardResult {
  ground: Phaser.GameObjects.Rectangle
  tombstones: Phaser.Physics.Arcade.StaticGroup
}

/**
 * Cenário do cemitério inspirado em "Thriller" (Michael Jackson):
 * céu noturno, lua cheia, colinas escuras, árvore morta, névoa,
 * morcegos e lápides com física.
 */
export function buildGraveyard(scene: Phaser.Scene, width: number, height: number): GraveyardResult {
  const groundTop = height - 48
  const cx = width / 2

  // ---- Céu noturno em faixas ----
  const skyColors = [0x06070f, 0x0b0e1c, 0x111530, 0x171d3d, 0x202747]
  const skyBandH = Math.ceil((groundTop - 30) / skyColors.length)
  skyColors.forEach((color, i) => {
    scene.add.rectangle(cx, 30 + i * skyBandH + skyBandH / 2, width, skyBandH + 1, color)
  })

  // ---- Lua cheia com halo ----
  const moonX = width - 84
  const moonY = 52
  scene.add.circle(moonX, moonY, 36, 0xd8d8c8, 0.1)
  const moon = scene.add.circle(moonX, moonY, 22, 0xe8e8d8)
  scene.add.circle(moonX - 7, moonY - 4, 4, 0xccccbc)
  scene.add.circle(moonX + 6, moonY + 5, 3, 0xccccbc)
  scene.add.circle(moonX + 9, moonY - 7, 2, 0xccccbc)

  // ---- Colinas distantes ----
  scene.add.rectangle(width * 0.22, groundTop - 16, width * 0.5, 32, 0x12141f)
  scene.add.rectangle(width * 0.78, groundTop - 22, width * 0.42, 44, 0x0f111a)

  // ---- Árvore morta (esquerda) ----
  const tree = scene.add.graphics()
  tree.fillStyle(0x0c0e16)
  tree.fillRect(16, groundTop - 74, 5, 74)
  tree.fillRect(12, groundTop - 66, 3, 7)
  tree.fillRect(20, groundTop - 60, 4, 6)
  tree.fillRect(14, groundTop - 50, 2, 5)
  tree.fillRect(8, groundTop - 44, 3, 4)

  // ---- Morcegos ----
  for (let i = 0; i < 3; i++) {
    const bat = scene.add.triangle(-10, Phaser.Math.Between(40, 95), 0, 0, 9, 3, 0, 6, 0x0a0c14)
    scene.tweens.add({
      targets: bat,
      x: width + 20,
      duration: 9000 + i * 2200,
      delay: i * 1800,
      repeat: -1,
      ease: 'Linear',
    })
    scene.tweens.add({
      targets: bat,
      y: bat.y + 16,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  // ---- Chão do cemitério ----
  const ground = scene.add.rectangle(cx, height - 24, width, 48, 0x232633)
  ground.setStrokeStyle(2, 0x2f3245)
  scene.physics.add.existing(ground, true)

  // ---- Lápides (com física) ----
  const tombstones = scene.physics.add.staticGroup()
  const stones = [
    { x: 110, w: 16, h: 30, angle: 0 },
    { x: 200, w: 14, h: 26, angle: -10 },
    { x: 292, w: 18, h: 34, angle: 0 },
    { x: 26, w: 12, h: 22, angle: 8 },
  ]
  stones.forEach((s) => {
    // Monte de terra
    scene.add.ellipse(s.x, groundTop + 3, s.w + 12, 8, 0x1a1c26)

    const stone = scene.add.rectangle(s.x, groundTop, s.w, s.h, 0x74788a)
    stone.setOrigin(0.5, 1)
    stone.setRotation(Phaser.Math.DegToRad(s.angle))
    stone.setStrokeStyle(1, 0x484b5c)
    scene.physics.add.existing(stone, true)
    tombstones.add(stone)

    scene.add
      .text(s.x, groundTop - s.h + 7, 'R.I.P.', {
        fontFamily: 'monospace',
        fontSize: '6px',
        fontStyle: 'bold',
        color: '#e9ecf5',
        stroke: '#161926',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setAngle(s.angle)
  })

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

  return { ground, tombstones }
}