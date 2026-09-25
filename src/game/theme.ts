/**
 * Paleta e tipografia compartilhadas pelas telas e pelo HUD.
 *
 * Antes estas cores e `fontFamily` estavam literais espalhados por 8 arquivos
 * (a cor de fundo 0x181d29, o painel 0x131720, a borda 0x2c3350 e o contorno
 * de texto #0d101b apareciam em TitleScene, LevelSelectScene,
 * DifficultySelectScene, CharacterSelectScene, PauseScene, MainScene,
 * AboutScene, InstructionsScene e endScreen). Qualquer ajuste de identidade
 * visual exigia caçar literais; aqui é um lugar só.
 *
 * Módulo puro (sem Phaser) para poder ser importado pelos módulos testáveis.
 */

/** Cores em número (para `Rectangle`/`Graphics`/tint). */
export const COLOR = {
  /** Fundo dos menus. */
  bg: 0x181d29,
  /** Fundo das telas de texto (Sobre, Como Jogar). */
  bgText: 0x11151d,
  /** Painel sobreposto ao fundo. */
  panel: 0x131720,
  /** Painel de texto nas telas Sobre/Como Jogar. */
  panelText: 0x161c26,
  /** Borda padrão de painel/card. */
  border: 0x2c3350,
  /** Borda de painel em destaque (Sobre/Como Jogar). */
  borderText: 0x3b5486,
  /** Realce de item selecionado. */
  selectFill: 0x253047,
  /** Realce de item selecionado (pausa). */
  selectFillPause: 0x2a3550,
  /** Fundo de item de menu (pausa). */
  menuItem: 0x1c2230,
  /** Borda de item de menu não selecionado (pausa). */
  menuBorder: 0x4a5a80,
  /** Borda de item selecionado. */
  selectBorder: 0x8ab0ff,
  /** Borda de item sob o cursor do mouse / marcador do jogador 1. */
  hoverBorder: 0x4fc3f7,
  /** Borda do card com os dois jogadores apontando para ele. */
  hoverBorderBoth: 0x9adcff,
  /** Borda do card já confirmado. */
  confirmBorder: 0x3fd07a,
  /** Marcador do jogador 2. */
  p2Border: 0xffb74d,
  /** Cursor/indicador de seleção. */
  cursor: 0xffe082,
  /** Hull do jogador 1 no HUD. */
  hudP1: 0x2c3350,
  /** Hull do jogador 2 no HUD. */
  hudP2: 0x4a2c3e,
  /** Fundo translúcido do painel do HUD. */
  hudBack: 0x0a0c14,
  /** Contorno padrão de texto. */
  stroke: 0x0d101b,
  /** Coração cheio / item. */
  heart: 0xff4d5d,
  /** Coração vazio. */
  heartEmpty: 0x251f33,
  /** Barra de vida do boss. */
  bossBar: 0xff5d6c,
  /** Fundo da barra de vida do boss. */
  bossBarBack: 0x181d29,
  /** Vinheta de perigo. */
  danger: 0xff1a2e,
} as const

/** Cores em string (para `Text`). */
export const TEXT = {
  /** Texto de corpo padrão. */
  body: '#c8d6e5',
  /** Texto de corpo do item em foco (um tom acima de `body`). */
  bodyActive: '#dbe7f5',
  /** Texto principal (títulos de menu). */
  primary: '#e8edf7',
  /** Texto de destaque dourado (pista, botões, link ativo). */
  accent: '#ffe082',
  /** Título principal do jogo. */
  gold: '#ffd54f',
  /** Títulos de seção do Como Jogar. */
  section: '#8fd8ff',
  /** Nome do jogador 1. */
  p1: '#8fd8ff',
  /** Nome do jogador 2. */
  p2: '#ff9fc2',
  /** Texto de dica fraca. */
  hint: '#7a89a0',
  /** Texto secundário: um pouco mais claro que `hint`, ainda sem competir com o corpo. */
  muted: '#8fa8c8',
  /** Rodapé com os atalhos de teclado. */
  controls: '#9aa9c0',
  /** Cor do contorno (espelha COLOR.stroke). */
  stroke: '#0d101b',
  /** Confirmação / sucesso. */
  ok: '#7bed9f',
} as const

/** Famílias e pesos tipográficos usados nas telas. */
export const FONT = {
  family: 'monospace',
  bold: 'bold',
  normal: '',
} as const

/**
 * Aplica o contorno padrão do jogo a um objeto de texto.
 * Atalho para `.setStroke(TEXT.stroke, width)`, usado em todas as telas.
 */
export function strokeText<T extends Phaser.GameObjects.Text>(text: T, width = 4): T {
  return text.setStroke(TEXT.stroke, width)
}
