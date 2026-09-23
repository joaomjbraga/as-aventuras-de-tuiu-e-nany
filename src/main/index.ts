import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

// Libera o autoplay do vídeo de fundo (O cenário toca sem gesto do usuário).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Ícone da janela (barra, taskbar, alt+tab): .ico no Windows, .png no Linux.
// Busca dentro do app (dev = raiz do projeto; empacotado = recursos do app).
// Retorna undefined se o arquivo não existir para o Electron não reclamar.
function windowIconPath(): string | undefined {
  const name = process.platform === 'win32' ? 'icon.ico' : 'Icon.png'
  const candidate = join(app.getAppPath(), 'public', name)
  return existsSync(candidate) ? candidate : undefined
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true, // o jogo abre direto em tela cheia (ideal para o jogo)
    title: 'As Aventuras de Tuiu e Nany',
    backgroundColor: '#151a22',
    icon: windowIconPath(),
    show: false, // evita flash branco: janela aparece só no primeiro frame
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Só mostra no first-paint do renderer; fallback por segurança.
  win.once('ready-to-show', () => win.show())
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  }, 2000)

  win.setMenu(null)

  // F11 alterna o modo tela cheia (o jogo abre em tela cheia; o F11 permite
  // sair/voltar). Não expõe nada ao renderer e funciona em qualquer cena.
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
    }
  })

  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Instância única: se já houver outro processo rodando, a 2ª tentativa
// foca a janela existente em vez de abrir uma cópia (evita jogar com som
// duplicado / 2 janelas).
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
}

app.whenReady().then(() => {
  createWindow()

  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
