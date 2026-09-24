import { contextBridge } from 'electron'

/**
 * Ponte mínima e segura entre o processo principal e o renderer.
 * O jogo atual não depende de APIs do Node; esta API existe para que o
 * renderer possa identificar o runtime desktop sem habilitar nodeIntegration.
 */
contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  platform: process.platform,
})
