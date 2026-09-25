/**
 * Cálculo dos limites verticais de conteúdo de um frame de sprite.
 *
 * Separado de `PreloadScene` de propósito: esta parte é aritmética pura sobre
 * "quais linhas têm pixel opaco" e não precisa de canvas nem de Phaser, então
 * fica testável no ambiente node do Vitest. A leitura dos pixels (que exige
 * DOM) vive em `PreloadScene.visibleVerticalBounds`, que só monta a lista de
 * flags e delega o cálculo para cá.
 */

export interface VerticalBounds {
  /** Primeira linha com conteúdo. */
  y: number
  /** Quantidade de linhas da primeira à última com conteúdo. */
  height: number
}

/**
 * Converte "esta linha tem conteúdo opaco?" em limites verticais.
 *
 * @param rowHasContent Uma entrada por linha, na ordem do topo para a base.
 * @returns `{ y, height }` da faixa com conteúdo. Um frame totalmente
 *   transparente devolve a área inteira (`y: 0`, `height: total`), que é o
 *   fallback usado para não quebrar a normalização do spritesheet.
 */
export function boundsFromRowFlags(rowHasContent: readonly boolean[]): VerticalBounds {
  const total = rowHasContent.length

  if (total === 0) return { y: 0, height: 0 }

  let first = -1
  let last = -1
  for (let i = 0; i < total; i++) {
    if (!rowHasContent[i]) continue
    if (first < 0) first = i
    last = i
  }

  if (first < 0) return { y: 0, height: total }
  return { y: first, height: last - first + 1 }
}
