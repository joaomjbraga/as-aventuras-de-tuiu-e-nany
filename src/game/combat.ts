/**
 * Lógica pura do contato jogador↔zumbi (sem Phaser), para ser testável.
 *
 * Regras:
 * - Pontapé/queda no topo da cabeça do zumbi = "pisão" (stomp). Mata o zumbi
 *   (retorna true do stomp) ou apenas quica no cooldown de dano.
 * - Contato lateral = dano ao jogador.
 * - Jogador caindo rápido demais não se machuca em contato lateral
 *   (velocityY < -20 só pode pisar).
 * - Zumbi morrendo não interage.
 */

export type ContactOutcome = 'stomp-kill' | 'stomp' | 'hit' | 'falling' | 'dead'

export interface PlayerContactSource {
  /** Centro X do jogador (usado para a direção do empurrão do zumbi). */
  x: number
  /** Posição dos pés do jogador (y do sprite + halfHeight do corpo). */
  feetY: number
  /** Velocidade vertical atual do jogador. */
  velocityY: number
}

export interface ZombieContactTarget {
  isDying: boolean
  x: number
  /** Posição do topo da cabeça (y do sprite − halfHeight do corpo). */
  headY: number
  /** Dano causado pelo pisão (base 2, ×2 com power-up). */
  damageAmount: number
  /** Executa o pisão no alvo; true = o zumbi morreu neste golpe. */
  stomp(fromX: number, amount: number): boolean
}

/**
 * Resolve um contato jogador↔zumbi e devolve o desfecho. Não chama nenhuma
 * side-effect além do `stomp` do alvo; quem usa decide o que fazer com o
 * resultado (shake, hit-stop, som, quebra de combo...).
 */
export function resolvePlayerZombieContact(player: PlayerContactSource, zombie: ZombieContactTarget): ContactOutcome {
  if (zombie.isDying) return 'dead'

  // Pés do jogador acima da cabeça do zumbi = pisão
  if (player.feetY <= zombie.headY + 6 && player.velocityY >= -20) {
    return zombie.stomp(player.x, zombie.damageAmount) ? 'stomp-kill' : 'stomp'
  }

  // Contato lateral só machuca se o jogador não estiver subindo rápido demais
  if (player.velocityY >= -20) return 'hit'
  return 'falling'
}

export interface StompDamageSource {
  /** Jogador com o power-up de dano em dobro. */
  damageBoost: boolean
  /** A queda atual veio de um pulo duplo (pisão mais forte). */
  doubleJump: boolean
}

/**
 * Dano causado por um pisão: base 2 (×2 com o power-up de dano) e +50% quando
 * o jogador cai sobre o zumbi depois de usar o pulo duplo.
 */
export function stompDamage({ damageBoost, doubleJump }: StompDamageSource): number {
  const base = damageBoost ? 4 : 2
  return doubleJump ? Math.round(base * 1.5) : base
}
