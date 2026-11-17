import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const builderConfig = readFileSync(new URL('../../electron-builder.json5', import.meta.url), 'utf8')

// Os comentários do arquivo citam "nsis", então ler apenas os alvos declarados
// evita confundir documentação com configuração efetiva.
const declaredTargets = [...builderConfig.matchAll(/target:\s*'([^']+)'/g)].map((match) => match[1])

describe('empacotamento desktop', () => {
  it('gera somente os dois executáveis portáteis', () => {
    expect(declaredTargets).toEqual(['portable', 'AppImage'])
  })

  it('não declara nenhum alvo instalador', () => {
    for (const installer of ['nsis', 'msi', 'deb', 'rpm', 'flatpak', 'snap', 'dmg']) {
      expect(declaredTargets).not.toContain(installer)
    }
  })

  it('mantém os nomes de arquivo usados pelos links de download da vitrine', () => {
    expect(builderConfig).toContain("artifactName: '${name}-windows.${ext}'")
    expect(builderConfig).toContain("artifactName: '${name}-linux.${ext}'")
  })
})
