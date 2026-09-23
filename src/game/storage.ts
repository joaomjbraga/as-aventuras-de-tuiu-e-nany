/**
 * Persistência simples no localStorage (recordes e preferências).
 * Módulo puro (sem Phaser) para ser testável.
 */

export const STORAGE_KEYS = {
  BEST_KILLS: 'tuio.best-kills',
  MUTED: 'tuio.muted',
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

/** Preferência de som (mudo) do jogador. */
export function isMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEYS.MUTED) === '1'
}

export function setMuted(muted: boolean): void {
  write(STORAGE_KEYS.MUTED, muted)
}
