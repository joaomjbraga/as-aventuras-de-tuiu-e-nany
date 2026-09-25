import Phaser from 'phaser'
import { COLOR, FONT, TEXT } from '../theme'

/**
 * Menu vertical reutilizável: uma lista de painéis com rótulo, um cursor "▶"
 * que acompanha a seleção e navegação com wrap-around.
 *
 * Existe porque `DifficultySelectScene` e `PauseScene` implementavam a mesma
 * mecânica (índice com wrap, cursor que segue o item, realce do selecionado) em
 * dois lugares. O que é de cada tela — a cor de destaque por item, a ação,
 * a resposta ao mouse e as teclas — continua com a cena; aqui fica só o
 * desenho da coluna e a navegação.
 */

export interface VerticalMenuItem {
  label: string
  /** Cor da borda quando o item está selecionado. Cai em `style.borderActive`. */
  accent?: number
  /** Descrição opcional à direita do painel. */
  description?: string
}

export interface VerticalMenuStyle {
  /** Fundo do painel não selecionado. */
  fill: number
  /** Fundo do painel selecionado. */
  fillActive: number
  /** Borda do painel não selecionado. */
  border: number
  /** Borda do painel selecionado, quando o item não define `accent`. */
  borderActive: number
  /**
   * Espessura da borda do painel não selecionado. Padrão `1`.
   * A pausa usa `2` porque os itens são mais altos e mais espaçados.
   */
  borderInactiveWidth?: number
  /** Opacidade da borda do painel não selecionado. Padrão `0.9`. */
  borderInactiveAlpha?: number
  /** Cor do rótulo não selecionado. */
  label: string
  /** Cor do rótulo selecionado. */
  labelActive: string
  /**
   * Cor da descrição não selecionada. Fica um tom abaixo do rótulo para
   * preservar a hierarquia: o nome é o que se lê primeiro.
   */
  description: string
  /** Cor da descrição selecionada. */
  descriptionActive: string
  /** Cor do painel de fundo do rótulo. */
  labelStroke: string
}

export interface VerticalMenuLayout {
  /** Y do primeiro item. */
  firstY: number
  /** Distância vertical entre itens. */
  spacing: number
  /** Largura do painel. */
  width: number
  /** Altura do painel. */
  height: number
  /** X do cursor "▶". */
  cursorX: number
  /** Profundidade comum a todos os elementos. */
  depth: number
  /** Tamanho de fonte do rótulo. */
  fontSize: string
  /** Alinha o rótulo à esquerda em `labelX`; centralizado quando omitido. */
  labelX?: number
  /** X do texto da descrição. Só usado quando algum item define `description`. */
  descriptionX?: number
  /** Largura da quebra de linha da descrição. */
  descriptionWrap?: number
  /** Cor de destaque do cursor. */
  cursorColor: string
  /**
   * Chamado quando o painel é clicado. Recebe o índice e o botão do ponteiro,
   * para a cena tratar o botão direito (usado no volume da pausa).
   */
  onActivate?: (index: number, pointer: Phaser.Input.Pointer) => void
}

const CURSOR_GLYPH = '▶'

export class VerticalMenu {
  private readonly rects: Phaser.GameObjects.Rectangle[] = []
  private readonly labels: Phaser.GameObjects.Text[] = []
  private readonly descriptions: Array<Phaser.GameObjects.Text | undefined> = []
  private readonly cursor: Phaser.GameObjects.Text
  private readonly items: VerticalMenuItem[]
  private selectedIndex = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: VerticalMenuLayout,
    private readonly style: VerticalMenuStyle,
    items: VerticalMenuItem[],
    initialIndex = 0,
  ) {
    this.items = items
    this.selectedIndex = this.clamp(initialIndex, items.length)

    items.forEach((item, i) => {
      const y = this.itemY(i)

      const rect = this.scene.add
        .rectangle(this.centerX(), y, layout.width, layout.height, style.fill)
        .setStrokeStyle(1, style.border)
        .setDepth(layout.depth)
        .setInteractive({ useHandCursor: true })
      rect.on('pointerover', () => this.select(i))
      if (layout.onActivate) {
        rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.select(i)
          layout.onActivate?.(i, pointer)
        })
      }
      this.rects.push(rect)

      this.labels.push(this.buildLabel(item.label, y))

      if (item.description !== undefined) {
        this.descriptions.push(
          this.scene.add
            .text(layout.descriptionX ?? this.centerX(), y, item.description, {
              fontFamily: FONT.family,
              fontSize: '15px',
              color: style.description,
              wordWrap: layout.descriptionWrap ? { width: layout.descriptionWrap } : undefined,
            })
            .setOrigin(0, 0.5)
            .setDepth(layout.depth),
        )
      } else {
        this.descriptions.push(undefined)
      }
    })

    this.cursor = this.scene.add
      .text(layout.cursorX, this.itemY(this.selectedIndex), CURSOR_GLYPH, {
        fontFamily: FONT.family,
        fontSize: '24px',
        fontStyle: FONT.bold,
        color: layout.cursorColor,
      })
      .setOrigin(0.5)
      .setDepth(layout.depth)

    this.refresh()
  }

  /** Quantidade de itens. */
  get count(): number {
    return this.rects.length
  }

  /** Índice do item em foco. */
  get index(): number {
    return this.selectedIndex
  }

  /** Item em foco, ou `undefined` se a lista estiver vazia. */
  get selected(): VerticalMenuItem | undefined {
    return this.items[this.selectedIndex]
  }

  /** Move a seleção com wrap-around (o topo emenda com a base). */
  move(delta: number): boolean {
    if (this.count === 0) return false
    this.selectedIndex = this.clamp(this.selectedIndex + delta, this.count)
    this.refresh()
    return true
  }

  /** Coloca a seleção em um índice específico (mouse, valor persistido). */
  select(index: number): boolean {
    if (index < 0 || index >= this.count) return false
    this.selectedIndex = index
    this.refresh()
    return true
  }

  /** Substitui o rótulo de um item (ex.: volume e mudo mudam de valor). */
  setLabel(index: number, label: string): void {
    this.items[index].label = label
    this.labels[index]?.setText(label)
  }

  private refresh(): void {
    this.rects.forEach((_, i) => this.paint(i))
    this.cursor.setY(this.itemY(this.selectedIndex))
  }

  private paint(index: number): void {
    const active = index === this.selectedIndex
    const accent = this.items[index]?.accent ?? this.style.borderActive

    this.rects[index].setFillStyle(active ? this.style.fillActive : this.style.fill)
    this.rects[index].setStrokeStyle(
      active ? 2 : (this.style.borderInactiveWidth ?? 1),
      active ? accent : this.style.border,
      active ? 1 : (this.style.borderInactiveAlpha ?? 0.9),
    )
    this.labels[index]?.setColor(active ? this.style.labelActive : this.style.label)
    this.descriptions[index]?.setColor(active ? this.style.descriptionActive : this.style.description)
  }

  private buildLabel(label: string, y: number): Phaser.GameObjects.Text {
    const { labelX } = this.layout
    return this.scene.add
      .text(labelX ?? this.centerX(), y, label, {
        fontFamily: FONT.family,
        fontSize: this.layout.fontSize,
        fontStyle: FONT.bold,
        color: this.style.label,
      })
      .setOrigin(labelX === undefined ? 0.5 : 0, 0.5)
      .setStroke(this.style.labelStroke, 4)
      .setDepth(this.layout.depth)
  }

  private centerX(): number {
    return this.scene.scale.width / 2
  }

  private itemY(index: number): number {
    return this.layout.firstY + index * this.layout.spacing
  }

  private clamp(index: number, count: number): number {
    if (count <= 0) return 0
    return ((index % count) + count) % count
  }
}

/** Estilo padrão dos menus verticais (usado pela pausa e pela dificuldade). */
export const MENU_STYLE: VerticalMenuStyle = {
  fill: COLOR.menuItem,
  fillActive: COLOR.selectFillPause,
  border: COLOR.menuBorder,
  borderActive: COLOR.selectBorder,
  // Itens da pausa são altos e espaçados, então a borda não selecionada é
  // mais grossa que a dos painéis compactos de dificuldade.
  borderInactiveWidth: 2,
  borderInactiveAlpha: 0.8,
  label: TEXT.primary,
  labelActive: '#ffffff',
  description: TEXT.hint,
  descriptionActive: TEXT.bodyActive,
  labelStroke: TEXT.stroke,
}
