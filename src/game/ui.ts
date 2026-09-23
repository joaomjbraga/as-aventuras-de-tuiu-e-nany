import Phaser from 'phaser'

export interface ButtonOptions {
  width?: number
  height?: number
  fontSize?: string
  color?: string
  bgColor?: number
  bgHover?: number
  strokeColor?: number
}

/**
 * Cria um botão clicável (retângulo + texto) e devolve o container.
 * Use um keydown no update da cena se quiser também suporte a teclado.
 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const {
    width = 160,
    height = 30,
    fontSize = '10px',
    color = '#e8edf7',
    bgColor = 0x1c2230,
    bgHover = 0x2a3550,
    strokeColor = 0x4a5a80,
  } = opts

  const bg = scene.add.rectangle(0, 0, width, height, bgColor).setStrokeStyle(1, strokeColor)
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize,
      fontStyle: 'bold',
      color,
    })
    .setOrigin(0.5)
    .setStroke('#0d101b', 2)

  const container = scene.add.container(x, y, [bg, text])
  container.setSize(width, height)

  container.setInteractive({ useHandCursor: true })
  container.on('pointerover', () => bg.setFillStyle(bgHover))
  container.on('pointerout', () => bg.setFillStyle(bgColor))
  container.on('pointerdown', () => {
    container.setScale(0.96)
    scene.time.delayedCall(70, () => container.setScale(1))
    onClick()
  })

  return container
}
