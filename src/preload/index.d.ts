export {}

declare global {
  interface Window {
    api?: {
      quit: () => void
    }
  }
}
