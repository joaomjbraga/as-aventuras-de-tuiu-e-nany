import Phaser from 'phaser'
import { isTouchDevice } from './mobile'

export interface VirtualInputState {
  left: boolean
  right: boolean
  jump: boolean
  jumpJustPressed: boolean
}

export interface MobileControls {
  readonly states: Map<string, VirtualInputState>
  addPlayer(playerId: string): void
  getState(playerId: string): VirtualInputState
  setVisible(visible: boolean): void
  destroy(): void
}

export interface MobileControlsOptions {
  onPause?: () => void
  onMute?: () => void
}

const BUTTON_SIZE = 42
const BUTTON_GAP = 10
const EDGE = 12
const BOTTOM = 12

/** Cria os controles touch da arena somente em dispositivos com toque. */
export function createMobileControls(
  scene: Phaser.Scene,
  options: MobileControlsOptions = {},
): MobileControls | undefined {
  if (!isTouchDevice()) return undefined

  const states = new Map<string, VirtualInputState>()
  const objects = createPlayerControls(scene, 'P1', states, EDGE, scene.scale.height - BOTTOM)
  if (options.onPause)
    objects.push(...createActionButton(scene, scene.scale.width / 2, EDGE + 18, 'Ⅱ', options.onPause))
  if (options.onMute)
    objects.push(...createActionButton(scene, scene.scale.width / 2 + 38, EDGE + 18, '♪', options.onMute))

  const controls: MobileControls = {
    states,
    addPlayer(playerId: string): void {
      if (states.has(playerId)) return
      objects.push(...createPlayerControls(scene, playerId, states, EDGE, 60))
    },
    getState(playerId: string): VirtualInputState {
      let state = states.get(playerId)
      if (!state) {
        state = { left: false, right: false, jump: false, jumpJustPressed: false }
        states.set(playerId, state)
      }
      return state
    },
    setVisible(visible: boolean): void {
      objects.forEach((object) => {
        ;(object as Phaser.GameObjects.GameObject & { setVisible: (value: boolean) => void }).setVisible(visible)
      })
    },
    destroy(): void {
      objects.forEach((object) => object.destroy())
      states.clear()
    },
  }

  return controls
}

function createPlayerControls(
  scene: Phaser.Scene,
  playerId: string,
  states: Map<string, VirtualInputState>,
  left: number,
  bottom: number,
): Phaser.GameObjects.GameObject[] {
  const state: VirtualInputState = { left: false, right: false, jump: false, jumpJustPressed: false }
  states.set(playerId, state)

  return [
    ...createButton(
      scene,
      left + BUTTON_SIZE / 2,
      bottom,
      '◀',
      () => (state.left = true),
      () => (state.left = false),
    ),
    ...createButton(
      scene,
      left + BUTTON_SIZE + BUTTON_GAP + BUTTON_SIZE / 2,
      bottom,
      '▶',
      () => (state.right = true),
      () => (state.right = false),
    ),
    ...createButton(
      scene,
      scene.scale.width - EDGE - BUTTON_SIZE,
      bottom,
      '▲',
      () => {
        state.jump = true
        state.jumpJustPressed = true
      },
      () => (state.jump = false),
    ),
  ]
}

function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onDown: () => void,
  onUp: () => void,
): Phaser.GameObjects.GameObject[] {
  const button = scene.add
    .rectangle(x, y, BUTTON_SIZE, BUTTON_SIZE, 0x121a2a, 0.78)
    .setStrokeStyle(2, 0x8ab0ff, 0.9)
    .setDepth(30)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: false })

  const text = scene.add
    .text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    })
    .setOrigin(0.5)
    .setDepth(31)
    .setScrollFactor(0)

  button.on('pointerdown', () => {
    button.setFillStyle(0x31527a, 0.95)
    onDown()
  })
  button.on('pointerup', () => {
    button.setFillStyle(0x121a2a, 0.78)
    onUp()
  })
  button.on('pointerupoutside', () => {
    button.setFillStyle(0x121a2a, 0.78)
    onUp()
  })

  return [button, text]
}

function createActionButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  action: () => void,
): Phaser.GameObjects.GameObject[] {
  const button = scene.add
    .rectangle(x, y, 32, 28, 0x121a2a, 0.78)
    .setStrokeStyle(1, 0x8ab0ff, 0.9)
    .setDepth(30)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: false })
  const text = scene.add
    .text(x, y, label, { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
    .setOrigin(0.5)
    .setDepth(31)
    .setScrollFactor(0)
  button.on('pointerdown', () => {
    button.setFillStyle(0x31527a, 0.95)
    action()
  })
  button.on('pointerup', () => button.setFillStyle(0x121a2a, 0.78))
  button.on('pointerupoutside', () => button.setFillStyle(0x121a2a, 0.78))
  button.on('pointerout', () => button.setFillStyle(0x121a2a, 0.78))
  return [button, text]
}
