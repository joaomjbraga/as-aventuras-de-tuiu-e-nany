const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')

const electronPackage = require.resolve('electron/package.json')
const electronRoot = join(electronPackage, '..')
const binaryPath =
  process.platform === 'win32' ? join(electronRoot, 'dist', 'electron.exe') : join(electronRoot, 'dist', 'electron')

if (existsSync(binaryPath)) process.exit(0)

const electronInstall = spawnSync(process.execPath, [join(electronRoot, 'install.js')], {
  stdio: 'inherit',
  env: process.env,
})

if (electronInstall.error) {
  console.error(`[ensure-electron] ${electronInstall.error.message}`)
  process.exit(1)
}

process.exit(electronInstall.status ?? 1)
