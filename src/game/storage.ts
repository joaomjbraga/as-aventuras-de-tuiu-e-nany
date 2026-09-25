/**
 * Persistência simples no localStorage (recordes e preferências).
 * Módulo puro (sem Phaser) para ser testável.
 */

export const STORAGE_KEYS = {
  BEST_KILLS: 'tuio.best-kills',
  BEST_SCORE: 'tuio.best-score',
  MUSIC_VOLUME: 'tuio.music-volume',
  MUTED: 'tuio.muted',
  COMPLETED_LEVELS: 'tuio.completed-levels',
} as const

function readNumber(key: string): number | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function write(key: string, value: number | boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, String(value))
}

/** Melhor recorde de zumbis derrotados numa única partida. */
export function loadBestKills(): number {
  const value = readNumber(STORAGE_KEYS.BEST_KILLS)
  return value !== null && value > 0 ? Math.floor(value) : 0
}

export function saveBestKills(value: number): void {
  write(STORAGE_KEYS.BEST_KILLS, Math.max(0, Math.floor(value)))
}

/** Melhor pontuação de uma partida (kills × multiplicador de combo). */
export function loadBestScore(): number {
  const value = readNumber(STORAGE_KEYS.BEST_SCORE)
  return value !== null && value > 0 ? Math.floor(value) : 0
}

export function saveBestScore(value: number): void {
  write(STORAGE_KEYS.BEST_SCORE, Math.max(0, Math.floor(value)))
}

export const DEFAULT_MUSIC_VOLUME = 0.4

/** Volume persistido da música, entre 0 e 1. */
export function loadMusicVolume(): number {
  const value = readNumber(STORAGE_KEYS.MUSIC_VOLUME)
  if (value === null) return DEFAULT_MUSIC_VOLUME
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
}

export function saveMusicVolume(value: number): void {
  const normalized = Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
  write(STORAGE_KEYS.MUSIC_VOLUME, normalized)
}

/** Fases já concluídas (ids), para destacar na seleção de cenários. */
export function loadCompletedLevels(): string[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED_LEVELS)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveCompletedLevels(ids: string[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.COMPLETED_LEVELS, JSON.stringify(ids))
}

export function isLevelCompleted(id: string): boolean {
  return loadCompletedLevels().includes(id)
}

export function markLevelCompleted(id: string): void {
  const list = loadCompletedLevels()
  if (list.includes(id)) return
  list.push(id)
  saveCompletedLevels(list)
}

/** Preferência de som (mudo) do jogador. */
export function isMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEYS.MUTED) === '1'
}

export function setMuted(muted: boolean): void {
  write(STORAGE_KEYS.MUTED, muted)
}
