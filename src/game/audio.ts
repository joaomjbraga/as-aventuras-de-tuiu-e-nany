import { isMuted, loadMusicVolume, saveMusicVolume, setMuted } from './storage'

/** Chaves dos efeitos sonoros e música. */
export const AUDIO = {
  INTRO: 'intro',
  BGM: 'bgm',
  ZOMBIE_GROWL: 'zombie-growl',
  ZOMBIE_ATTACK: 'zombie-attack',
  EXPLOSION: 'explosion',
  MAN_DEATH: 'man-death',
  FEMALE_DEATH: 'female-death',
  GAME_OVER: 'game-over',
} as const

export const MUSIC_VOLUME_STEP = 0.1

const MUSIC_KEYS = [AUDIO.INTRO, AUDIO.BGM] as const

function setSceneMusicVolume(scene: Phaser.Scene, volume: number): void {
  MUSIC_KEYS.forEach((key) => {
    scene.sound.getAll(key).forEach((sound) => {
      const music = sound as Phaser.Sound.WebAudioSound
      music.setVolume(volume)
    })
  })
}

/** Inicia a música em loop ou aplica o volume persistido à instância ativa. */
function playLooping(scene: Phaser.Scene, key: string): void {
  for (const stale of scene.sound.getAll(key)) {
    if (!stale.isPlaying) scene.sound.remove(stale)
  }

  const volume = loadMusicVolume()
  const playing = scene.sound.getAll(key)
  if (playing.length === 0) {
    scene.sound.play(key, { loop: true, volume })
    return
  }

  const music = playing[0] as Phaser.Sound.WebAudioSound
  music.setVolume(volume)
}

/** Música de fundo da tela inicial e menus. */
export function playIntro(scene: Phaser.Scene): void {
  scene.sound.stopByKey(AUDIO.BGM)
  playLooping(scene, AUDIO.INTRO)
}

/** Música de fundo das fases. */
export function playBgm(scene: Phaser.Scene): void {
  scene.sound.stopByKey(AUDIO.INTRO)
  playLooping(scene, AUDIO.BGM)
}

/** Aplica o volume persistido às músicas ativas da cena. */
export function applyMusicVolume(scene: Phaser.Scene): number {
  const volume = loadMusicVolume()
  setSceneMusicVolume(scene, volume)
  return volume
}

/** Define e persiste o volume da música. Retorna o valor normalizado. */
export function setMusicVolume(scene: Phaser.Scene, volume: number): number {
  saveMusicVolume(volume)
  return applyMusicVolume(scene)
}

/** Ajusta o volume em passos de 10%. Retorna o valor normalizado. */
export function adjustMusicVolume(scene: Phaser.Scene, delta: number): number {
  return setMusicVolume(scene, loadMusicVolume() + delta)
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
