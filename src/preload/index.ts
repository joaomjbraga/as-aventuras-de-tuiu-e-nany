import { contextBridge, ipcRenderer } from 'electron'

// Expõe ao renderer apenas o mínimo necessário. O jogo usa um único canal:
// 'game-quit' fecha o aplicativo (botão SAIR do título/pausa).
contextBridge.exposeInMainWorld('api', {
  quit: () => ipcRenderer.send('game-quit'),
})
