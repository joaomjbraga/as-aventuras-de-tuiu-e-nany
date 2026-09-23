// Garante que o binário do Electron está instalado após npm install.
//
// O npm ignora o campo `allowScripts` (que é do Bun); se o postinstall do
// pacote electron não rodar (instalação parcial, cache incompleto, npm ci
// otimizado demais), o app quebra no boot com "Electron uninstall".
// Este script roda como postinstall do PROJETO e re-executa o install.js
// do electron quando o binário estiver faltando.
'use strict'

const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const electronPkg = require.resolve('electron/package.json')
const electronDir = join(electronPkg, '..')
const pathFile = join(electronDir, 'path.txt')

function electronBinaryMissing() {
  if (!existsSync(pathFile)) return true
  try {
    const rel = readFileSync(pathFile, 'utf8').trim()
    return rel.length > 0 && !existsSync(join(electronDir, rel))
  } catch {
    return true
  }
}

function main() {
  if (!electronBinaryMissing()) {
    console.log('[ensure-electron] Binário do Electron já presente.')
    return
  }

  console.log('[ensure-electron] Binário do Electron ausente — instalando...')
  const result = spawnSync(process.execPath, [join(electronDir, 'install.js')], {
    cwd: electronDir,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.error('[ensure-electron] Falha ao instalar o binário do Electron.')
    process.exit(result.status ?? 1)
  }
  console.log('[ensure-electron] Binário do Electron instalado.')
}

main()
