import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'path'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'As Aventuras de Tuiu e Nany',
    backgroundColor: '#151a22',
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.setMenu(null)

  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})