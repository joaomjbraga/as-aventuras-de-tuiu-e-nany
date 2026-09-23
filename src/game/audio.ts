import { isMuted, setMuted } from './storage'

/**
 * Chaves dos efeitos sonoros e música.
 * Os arquivos ficam em assets/audio/ (servidos como audio/<arquivo>).
 */
export const AUDIO = {
  /** Música da tela inicial / menus. */
  INTRO: 'intro',
  /** Música das fases (gameplay). */
  BGM: 'bgm',
  ZOMBIE_GROWL: 'zombie-growl',
  ZOMBIE_ATTACK: 'zombie-attack',
  EXPLOSION: 'explosion',
  MAN_DEATH: 'man-death',
  FEMALE_DEATH: 'female-death',
  GAME_OVER: 'game-over',
} as const

const INTRO_VOLUME = 0.45
const BGM_VOLUME = 0.4

/** Inicia a música (loop) se ainda não estiver tocando ou ajusta o volume. */
function playLooping(scene: Phaser.Scene, key: string, volume: number): void {
  // stopByKey não remove o som do gerenciador: sons parados da mesma chave
  // (ex.: bgm silenciado no game over) "bloqueariam" um novo play. Descarta-os.
  for (const stale of scene.sound.getAll(key)) {
    if (!stale.isPlaying) scene.sound.remove(stale)
  }

  const playing = scene.sound.getAll(key)
  if (playing.length === 0) {
    scene.sound.play(key, { loop: true, volume })
    return
  }
  // Ajusta o volume da instância já ativa (WebAudio é o padrão no Electron)
  const sound = playing[0] as Phaser.Sound.WebAudioSound
  sound.setVolume(volume)
}

/**
 * Música de fundo da tela inicial. Para qualquer música de fase que esteja
 * tocando antes de começar a intro (troca de trilha entre menus e jogo).
 */
export function playIntro(scene: Phaser.Scene): void {
  scene.sound.stopByKey(AUDIO.BGM)
  playLooping(scene, AUDIO.INTRO, INTRO_VOLUME)
}

/**
 * Música das fases: inicia se ainda não estiver tocando ou ajusta o volume
 * da instância já ativa. Para a intro (trilha dos menus) antes de tocar.
 */
export function playBgm(scene: Phaser.Scene): void {
  scene.sound.stopByKey(AUDIO.INTRO)
  playLooping(scene, AUDIO.BGM, BGM_VOLUME)
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
