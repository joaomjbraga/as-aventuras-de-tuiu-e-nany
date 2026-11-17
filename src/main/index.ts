import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { computeWindowSize } from './windowBounds'

const APP_ID = 'br.com.joaomjbraga.asaventurasdetuiue_nany'
const RENDERER_INDEX = join(__dirname, '../renderer/index.html')
const PRELOAD_SCRIPT = join(__dirname, '../preload/index.cjs')
const DEV_WINDOW_ICON = app.isPackaged ? undefined : join(__dirname, '../../public/Icon.png')
const DEV_RENDERER_URL = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL
const FILE_RENDERER_URL = pathToFileURL(RENDERER_INDEX).toString()

// Em Linux com Mesa/VAAPI antigos, o processo de GPU do Chromium pode falhar na
// inicialização ("GPU process isn't usable. Goodbye."), deixando a janela
// preta ou impedindo que ela apareça. O jogo é 2D e roda bem com rasterização
// por software, então desligamos a aceleração somente nesta plataforma.
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('in-process-gpu')
}

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
  // `screen` só é seguro depois de `app.whenReady()`, que é onde esta função
  // é chamada. Respeitar a área útil evita barra de título fora da tela no
  // Linux, onde o gerenciador de janelas não corrige automaticamente.
  const bounds = computeWindowSize(screen.getPrimaryDisplay().workAreaSize)

  const window = new BrowserWindow({
    ...bounds,
    center: true,
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

  // A barra de menu padrão não serve para um jogo e no Linux aparece mesmo com
  // `autoHideMenuBar` (só some ao pressionar Alt).
  window.setMenu(null)

  mainWindow = window

  const reveal = (): void => {
    if (!window.isDestroyed() && !window.isVisible()) window.show()
  }
  window.once('ready-to-show', reveal)
  // Alguns WMs Linux não disparam `ready-to-show` se o renderer demora (ou se
  // o processo de GPU falha). Sem isso a janela ficaria invisível para sempre.
  const revealFallback = setTimeout(reveal, 2000)
  window.on('closed', () => {
    clearTimeout(revealFallback)
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

  ipcMain.on('desktop:quit', () => {
    app.quit()
  })

  ipcMain.on('desktop:toggle-fullscreen', () => {
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!window) return
    window.setFullScreen(!window.isFullScreen())
  })
}
