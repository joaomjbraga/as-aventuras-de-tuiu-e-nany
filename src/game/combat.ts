/**
 * Lógica pura do contato jogador↔zumbi (sem Phaser), para ser testável.
 *
 * Regras:
 * - Pontapé/queda no topo da cabeça do zumbi = "pisão" (stomp). Mata o zumbi
 *   (retorna true do stomp) ou apenas quica no cooldown de dano.
 * - Contato lateral = dano ao jogador.
 * - Jogador caindo rápido demais não se machuca em contato lateral
 *   (velocityY < -60 só pode pisar).
 * - Zumbi morrendo não interage.
 *
 * A margem de tolerância do pisão é proporcional à altura do sprite do zumbi
 * (20% da altura), para funcionar com zumbis de tamanhos diferentes (116px,
 * 128px, boss de 160px). Uma margem fixa deixava alguns zumbis sem morrer ao
 * serem pisados.
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
  /** Altura do sprite do zumbi (usada para calcular a margem de tolerância). */
  spriteHeight: number
  /** Dano causado pelo pisão (base 2, ×2 com power-up). */
  damageAmount: number
  /** Executa o pisão no alvo; true = o zumbi morreu deste golpe. */
  stomp(fromX: number, amount: number): boolean
}

/**
 * Resolve um contato jogador↔zumbi e devolve o desfecho. Não chama nenhuma
 * side-effect além do `stomp` do alvo; quem usa decide o que fazer com o
 * resultado (shake, hit-stop, som, quebra de combo...).
 */
export function resolvePlayerZombieContact(player: PlayerContactSource, zombie: ZombieContactTarget): ContactOutcome {
  if (zombie.isDying) return 'dead'

  // Margem proporcional à altura do zumbi: 116px → 23px, 128px → 26px, 160px → 32px.
  // Isso garante que todos os zumbis (incluindo o boss) aceitem o pisão.
  const tolerance = Math.round(zombie.spriteHeight * 0.2)

  // Pés do jogador acima da cabeça do zumbi = pisão
  if (player.feetY <= zombie.headY + tolerance && player.velocityY >= -60) {
    return zombie.stomp(player.x, zombie.damageAmount) ? 'stomp-kill' : 'stomp'
  }

  // Contato lateral só machuca se o jogador não estiver subindo rápido demais
  if (player.velocityY >= -60) return 'hit'
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