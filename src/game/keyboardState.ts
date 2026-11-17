/**
 * Estado físico das teclas, independente do ciclo de vida das cenas.
 *
 * A KeyboardPlugin do Phaser reseta as teclas quando uma cena é pausada e
 * deixa de processar o evento `keyup` enquanto ela está parada. Para não
 * resurrect um "segurando →" que foi solto no menu de pausa, acompanhamos os
 * eventos nativos da janela e restauramos o estado real ao retomar.
 */

const pressed = new Set<number>()
let installed = false

/** Instala os listeners uma única vez (chamado pela BootScene). */
export function installKeyboardState(): void {
  if (installed || typeof window === 'undefined') return

  window.addEventListener('keydown', (event) => pressed.add(event.keyCode))
  window.addEventListener('keyup', (event) => pressed.delete(event.keyCode))
  window.addEventListener('blur', () => pressed.clear())
  installed = true
}

/** A tecla está fisicamente pressionada agora? */
export function isKeyPhysicallyDown(keyCode: number): boolean {
  return pressed.has(keyCode)
}
