import { isMuted, setMuted } from './storage'

/**
 * Chaves dos efeitos sonoros e música.
 * Os arquivos ficam em assets/audio/ (servidos como audio/<arquivo>).
 */
export const AUDIO = {
  BGM: 'bgm',
  ZOMBIE_GROWL: 'zombie-growl',
  ZOMBIE_ATTACK: 'zombie-attack',
  ZOMBIE_DEATH: 'zombie-death',
  GAME_OVER: 'game-over',
} as const

const BGM_VOLUME = 0.4

/**
 * Música de fundo: inicia se ainda não estiver tocando ou ajusta o volume
 * da instância já ativa (a música continua tocando entre as cenas).
 */
export function playBgm(scene: Phaser.Scene): void {
  const playing = scene.sound.getAll(AUDIO.BGM)
  if (playing.length === 0) {
    scene.sound.play(AUDIO.BGM, { loop: true, volume: BGM_VOLUME })
    return
  }
  // Ajusta o volume da instância já ativa (WebAudio é o padrão no Electron)
  const sound = playing[0] as Phaser.Sound.WebAudioSound
  sound.setVolume(BGM_VOLUME)
}

/** Aplica a preferência persistida de mudo ao gerenciador de som da cena. */
export function applyMute(scene: Phaser.Scene): void {
  scene.sound.mute = isMuted()
}

/** Alterna mudo on/off (aplica na cena e persiste). Retorna o novo estado. */
export function toggleMute(scene: Phaser.Scene): boolean {
  const next = !scene.sound.mute
  setMuted(next)
  scene.sound.mute = next
  return next
}
