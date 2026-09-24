export {}

declare global {
  interface Window {
    desktop?: {
      isElectron: true
      platform: NodeJS.Platform
    }
  }
}
