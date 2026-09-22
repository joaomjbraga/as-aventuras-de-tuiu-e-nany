import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { TitleScene } from './scenes/TitleScene'
import { CharacterSelectScene } from './scenes/CharacterSelectScene'
import { MainScene } from './scenes/MainScene'
import { PauseScene } from './scenes/PauseScene'

/**
 * Resolução base do pixel art (16:9).
 * A 5x de zoom inteiro vira 1920x1080.
 */
export const BASE_WIDTH = 384
export const BASE_HEIGHT = 216

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL com fallback automático para Canvas
  parent: 'game-container',

  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  backgroundColor: '#151a22',

  // Pixel art: desliga anti-aliasing para texturas não ficarem borradas
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1000 },
      debug: false,
    },
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },

  scene: [BootScene, PreloadScene, TitleScene, CharacterSelectScene, MainScene, PauseScene],
}