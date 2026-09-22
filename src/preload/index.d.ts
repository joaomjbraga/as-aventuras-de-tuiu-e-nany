export interface ElectronAPI {
  ping: () => void
  onPong: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}