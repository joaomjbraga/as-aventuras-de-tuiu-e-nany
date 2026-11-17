/**
 * Diferenças de runtime entre o pacote desktop e o navegador.
 *
 * O renderer Phaser é idêntico nos dois: a ponte `window.desktop` só é
 * instalada pelo preload do Electron (src/preload/index.ts). Na web ela
 * não existe, então ações que só fazem sentido no desktop — encerrar o
 * aplicativo — precisam ser escondidas em vez de virar botões mortos.
 */

/** O jogo está rodando dentro do Electron? */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.desktop?.isElectron === true
}

/**
 * Encerra o aplicativo no desktop. Na web não existe equivalente para
 * `app.quit()` (um site não pode fechar a aba do usuário), então a
 * chamada é um no-op — as telas que oferecem SAIR não a exibem neste caso.
 */
export function quitApp(): void {
  if (typeof window !== 'undefined') window.desktop?.quit()
}

/**
 * Alterna tela cheia no desktop via IPC (a Fullscreen API do DOM costuma ser
 * rejeitada no Electron). Na web usa a API do navegador como fallback — o
 * atalho F11 do próprio navegador continua tendo prioridade.
 */
export function toggleFullscreen(): void {
  if (isDesktop()) {
    window.desktop?.toggleFullscreen()
    return
  }

  if (typeof document === 'undefined') return
  const doc = document.documentElement
  if (document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => {})
  } else {
    void doc.requestFullscreen?.().catch(() => {})
  }
}
