export type JumpAction = 'first' | 'double' | 'none'

export interface JumpInput {
  isGrounded: boolean
  /** A tecla de pulo foi pressionada neste frame, não apenas mantida. */
  justPressed: boolean
  jumpsUsed: number
  maxJumps: number
}

/** Detecta uma nova borda de pressão, ignorando a tecla que continua segurada. */
export function isNewJumpPress(wasDown: boolean, isDown: boolean): boolean {
  return isDown && !wasDown
}

/**
 * Resolve qual pulo deve acontecer neste frame.
 *
 * O segundo pulo exige uma nova pressão da tecla. Segurar a tecla desde o chão
 * não consome o pulo duplo, impedindo que um salto normal seja marcado
 * como forte por acidente.
 */
export function resolveJumpAction({ isGrounded, justPressed, jumpsUsed, maxJumps }: JumpInput): JumpAction {
  if (!justPressed) return 'none'
  if (isGrounded || jumpsUsed === 0) return 'first'
  if (jumpsUsed < maxJumps) return 'double'
  return 'none'
}

/**
 * O segundo pulo só fica pronto quando a subida já desacelerou. Isso permite
 * pressionar um pouco antes do ápice sem criar um salto longo e "flutuante".
 */
export function canTriggerDoubleJump(velocityY: number, nearApexSpeed: number): boolean {
  return velocityY >= -Math.abs(nearApexSpeed)
}

/** Aplica o impulso do segundo pulo sem aumentar uma subida que já é mais forte. */
export function doubleJumpVelocityY(currentVelocityY: number, doubleJumpForce: number): number {
  return Math.min(currentVelocityY, -Math.abs(doubleJumpForce))
}
