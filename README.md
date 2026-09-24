# As Aventuras de Tuiu & Nany

Jogo desktop 2D em pixel art (co-op local) no qual Tuiu e Nany enfrentam zumbis. O projeto usa **Electron**, Phaser 3, TypeScript e electron-vite. Não há versão web, PWA nem modo mobile.

## Plataformas suportadas

- **Windows:** instalador NSIS e executável portátil `.exe`
- **Linux:** AppImage

O AppImage deve ser gerado em um ambiente Linux nativo ou pelo workflow de CI.

## Por que este jogo existe

Este jogo foi desenvolvido para **comemorar os 5 anos de união de mim e minha esposa** — celebramos o dia em que começamos a namorar. Tuiu e Nany somos nós dois, sobrevivendo juntos (e comemorando com muita aventura).

## Pré-requisitos

- Node.js `22.12+` ou Node.js `24+`
- npm
- Windows ou Linux para gerar o artefato final

## Desenvolvimento desktop

```sh
npm install
npm run dev
```

O comando inicia o Electron com hot reload do renderer. O processo principal, o preload e o renderer são compilados pelo `electron-vite`.

## Build

```sh
npm run build
```

O build é colocado em `out/`:

```text
out/
├── main/
├── preload/
└── renderer/
```

Para executar o build localmente:

```sh
npm run preview
```

## Gerar os pacotes

### Windows

```sh
npm run dist:win
```

Gera:

- Instalador NSIS `.exe`
- Executável portátil `.exe`

### Linux

```sh
npm run dist:appimage
```

Gera o AppImage em `release/`.

### Verificações

```sh
npm run check
npm test
npm run build
```

Ou:

```sh
npm run verify
```

O workflow `.github/workflows/desktop.yml` valida o projeto e gera os artefatos em runners nativos do Windows e do Linux.

## Controles

| Jogador | Mover | Pular       | Confirmar |
| ------- | ----- | ----------- | --------- |
| J1      | ← / → | ↑ ou ESPAÇO | ENTER     |
| J2      | A / D | W           | W         |

- **ESC**: pausa o jogo (menu com continuar/reiniciar/título).
- **M**: ativa/desativa o som.
- **F11**: alterna tela cheia.
- Na seleção: J1 confirma com ENTER e inicia; J2 confirma com W.
- Em uma partida já iniciada, J2 pode entrar pela tecla **W** ou pelo botão na tela.

## Mecânica

- Pise em cima do zumbi para derrotá-lo; contato lateral tira vida.
- **Pulo duplo**: aperte o pulo de novo no ar para um impulso extra (ajuda a alcançar a cabeça do chefão).
- **Pisão forte**: cair sobre um zumbi logo depois de usar o pulo duplo causa 50% mais dano.
- Os abates valem pontos multiplicados pela sequência de abates sem levar dano (combo): cada abate sobe o multiplicador (x1 → x10); levar dano zera o combo.
- Cada jogador tem 3 corações; ao cair, o jogador reviverá quando escolher (pulo do próprio personagem) se ainda houver companheiro em pé.
- Todos os jogadores caídos ao mesmo tempo = fim de jogo.
- A dificuldade aumenta ao longo de cada partida. Cada fase define sua própria meta de abates e, depois dela, exige a derrota do boss.

## Fases

O jogo é dirigido por um registro de fases (`src/game/levels.ts`), cada uma com arte de fundo, névoa, meta de abates, curva de dificuldade e boss.

- Na seleção de personagem, após confirmar, o jogo abre a seleção de cenário.
- Na vitória, o jogo oferece **PRÓXIMA FASE**: a próxima fase é sorteada entre os cenários disponíveis, sem repetir a atual.
- O progresso de fases concluídas é salvo no `localStorage` do aplicativo.

Para adicionar uma nova fase:

1. Coloque a arte em `src/assets/scenes/`.
2. Adicione um novo `LevelConfig` ao array `LEVELS` em `src/game/levels.ts`, informando `id`, `name`, `art`, `fogColor`, `victoryKills`, `difficulty` e, se necessário, `boss`.
3. A `PreloadScene`, a `LevelSelectScene` e a `MainScene` usam a nova configuração automaticamente.

## Estrutura

- `src/main/index.ts`: processo principal, janela, ciclo de vida, instância única e navegação segura.
- `src/preload/index.ts`: ponte mínima via `contextBridge`.
- `src/game/`: renderer Phaser, entidades, regras, telas e UI.
- `src/assets/`: cenários, sprites, áudio e demais assets do jogo.
- `public/`: ícones usados pelo `electron-builder` (`Icon.png`, `icon.ico` e `linux-icon.png`).
- `electron.vite.config.ts`: builds separados de main, preload e renderer.
- `electron-builder.yml`: alvos Windows (NSIS/portátil) e Linux (AppImage).
- `scripts/ensure-electron.cjs`: garante o download do binário do Electron após a instalação.

O renderer é carregado por URL durante o desenvolvimento e por `file://` no pacote de produção. Os caminhos de assets do HTML são relativos.

## Segurança do Electron

O processo principal usa:

- `contextIsolation: true`
- `nodeIntegration: false`
- preload em sandbox
- bloqueio de navegação para URLs externas
- abertura de links externos no navegador padrão

O renderer não recebe acesso direto ao Node.js.

## Autor

[![João M J Braga](https://github.com/joaomjbraga.png?size=100)](https://github.com/joaomjbraga)

Se você gostou, considere deixar uma ⭐ no repositório!
