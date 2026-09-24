import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const APP_ID = 'br.com.joaomjbraga.asaventurasdetuiue_nany'
const RENDERER_INDEX = join(__dirname, '../renderer/index.html')
const PRELOAD_SCRIPT = join(__dirname, '../preload/index.cjs')
const DEV_WINDOW_ICON = app.isPackaged ? undefined : join(__dirname, '../../public/icon.ico')
const DEV_RENDERER_URL = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL
const FILE_RENDERER_URL = pathToFileURL(RENDERER_INDEX).toString()

let mainWindow: BrowserWindow | null = null

function isRendererUrl(url: string): boolean {
  if (url === FILE_RENDERER_URL) return true
  if (!DEV_RENDERER_URL) return false

  try {
    return new URL(url).origin === new URL(DEV_RENDERER_URL).origin
  } catch {
    return false
  }
}

function openExternalUrl(url: string): void {
  if (/^https?:\/\//i.test(url)) {
    void shell.openExternal(url)
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#151a22',
    title: 'As Aventuras de Tuiu e Nany',
    icon: DEV_WINDOW_ICON,
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow = window

  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (isRendererUrl(url)) return
    event.preventDefault()
    openExternalUrl(url)
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, failedUrl) => {
    console.error(`[Main] Falha ao carregar ${failedUrl}: ${errorDescription} (${errorCode})`)
  })

  if (DEV_RENDERER_URL) {
    void window.loadURL(DEV_RENDERER_URL)
  } else {
    void window.loadFile(RENDERER_INDEX)
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId(APP_ID)
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
