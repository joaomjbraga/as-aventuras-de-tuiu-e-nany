/**
 * Lógica pura do contato jogador↔zumbi (sem Phaser), para ser testável.
 *
 * Regras:
 * - Jogador no ar, descendo e acima do centro do zumbi = "pisão" (stomp).
 *   Mata o zumbi ou apenas quica no cooldown de dano.
 * - Contato lateral ou com o jogador no chão = dano ao jogador.
 * - Jogador subindo atravessa o zumbi sem causar dano.
 * - Zumbi morrendo não interage.
 *
 * A margem de tolerância é medida a partir do centro do zumbi e cresce 20% da
 * altura do sprite. Isso cobre os bodies Arcade mayores que a arte visível sem
 * transformar contatos claramente laterais em pisões.
 */

export type ContactOutcome = 'stomp-kill' | 'stomp' | 'hit' | 'falling' | 'dead'

export interface PlayerContactSource {
  /** Centro X do jogador (usado para a direção do empurrão do zumbi). */
  x: number
  /** Posição dos pés do jogador (y do sprite + halfHeight do corpo). */
  feetY: number
  /** O corpo Arcade do jogador ainda está livre do chão? */
  isAirborne: boolean
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

  const zombieCenterY = zombie.headY + zombie.spriteHeight / 2
  const tolerance = Math.round(zombie.spriteHeight * 0.2)
  const isDescending = player.isAirborne && player.velocityY >= 0
  const feetAboveStompArea = player.feetY <= zombieCenterY + tolerance

  // Um personagem descendo sobre a parte superior do zumbi só causa dano ao
  // zumbi. O collider já garante que existe sobreposição horizontal.
  if (isDescending && feetAboveStompArea) {
    return zombie.stomp(player.x, zombie.damageAmount) ? 'stomp-kill' : 'stomp'
  }

  // No chão ou descendo pela lateral/parte inferior: o jogador é ferido.
  if (!player.isAirborne || player.velocityY >= 0) return 'hit'

  // Subindo: passa pelo inimigo sem dano e sem pisão.
  return 'falling'
}

export interface StompDamageSource {
  /** Jogador com o power-up de dano em dobro. */
  damageBoost: boolean
  /** A queda atual veio de um pulo duplo (pisão mais forte). */
  doubleJump: boolean
  /** Vida atual do alvo, usada para impedir que um pisão normal mate de primeira. */
  targetHp: number
}

/**
 * Dano causado por um pisão: base 2 (×2 com o power-up de dano) e +50% quando
 * o jogador cai sobre o zumbi depois de usar o pulo duplo.
 *
 * Um pisão normal nunca zera a vida de um alvo que ainda tem 2 ou mais HP.
 * Ele pode, porém, retirar o último HP de um zumbi já ferido.
 */
export function stompDamage({ damageBoost, doubleJump, targetHp }: StompDamageSource): number {
  const base = damageBoost ? 4 : 2
  const damage = doubleJump ? Math.round(base * 1.5) : base
  if (doubleJump) return damage

  const protectedDamage = Math.max(1, targetHp - 1)
  return Math.min(damage, protectedDamage)
}
