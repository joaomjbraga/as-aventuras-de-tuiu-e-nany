import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

/**
 * API exposta ao renderer via contextBridge.
 * O renderer NÃO tem acesso direto ao Node (nodeIntegration: false,
 * contextIsolation: true) - só o que estiver aqui embaixo.
 */
const api = {
  ping: (): void => ipcRenderer.send('ping'),
  onPong: (callback: () => void): void => {
    ipcRenderer.on('pong', (_event: IpcRendererEvent) => callback())
  },
} as const

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api