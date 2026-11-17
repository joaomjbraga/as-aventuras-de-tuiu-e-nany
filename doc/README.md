# Site — As Aventuras de Tuiu e Nany

Vitrine responsiva do jogo, com uma identidade baseada nas cores dos
personagens, título pixel art e vídeo de gameplay como fundo. A apresentação
informa a origem do jogo, as quatro fases, o cooperativo local de teclado e as
versões para navegador, Windows e Linux. O conteúdo centralizado permanece
sobreposto ao vídeo com uma camada escura para manter a leitura.

## Como jogar

- **Jogar no navegador** abre `jogo/`, publicado pelo workflow `pages.yml` com
  o build web gerado por `npm run build:web`.
- **Windows** e **Linux** baixam diretamente os artefatos portáteis da última
  release estável.

Os links de download usam `releases/latest/download/` e dependem dos nomes de
artefato definidos em `electron-builder.json5`:
`as-aventuras-de-tuiu-e-nany-windows.exe` e
`as-aventuras-de-tuiu-e-nany-linux.AppImage`. Se esses nomes mudarem, atualize
os links em `index.html`. Releases marcadas como pré-lançamento não são
selecionadas pelo alias `latest`.

## Arquivos

| Arquivo                                   | Função                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| `index.html`                              | Estrutura da página, vídeo, ações e informações.            |
| `styles.css`                              | Layout responsivo, paleta, tipografia e estados de foco.    |
| `script.js`                               | Pausa o vídeo de fundo se movimento reduzido estiver ativo. |
| `assets/as-Aventuras-de-Tuiu-e-Nany.webm` | Vídeo de fundo reproduzido mudo em loop.                    |
| `assets/gameplay-poster.jpg`              | Cena estática enquanto o vídeo não está disponível.         |
| `assets/logo-windows.png`                 | Ícone do download para Windows.                             |
| `assets/linux-512.png`                    | Ícone do download para Linux.                               |

O poster é uma cópia de `src/assets/scenes/scenes-my-home.jpg`; atualize
`doc/assets/gameplay-poster.jpg` ao substituir a imagem original.

## Identidade e acessibilidade

A paleta usa as cores já presentes em `src/game/theme.ts`: azul de Tuiu
(`TEXT.p1`), rosa de Nany (`TEXT.p2`) e dourado (`TEXT.gold`). A interface usa
fontes de sistema modernas (SF Pro em dispositivos Apple, com Manrope como
fallback); Silkscreen mantém a identidade pixel art no título.

Os links têm foco visível para navegação por teclado, informam a plataforma e o
formato do download, e se reorganizam em telas estreitas. Como o jogo só recebe
entrada de teclado, a página avisa que não há controles touch. O vídeo de fundo
reproduz automaticamente sem áudio e em loop. O poster aparece como alternativa
estática quando o vídeo não pode ser reproduzido; com `prefers-reduced-motion`,
o script pausa a reprodução. O layout também considera telas com pouca altura.

## Desenvolvimento

Abra `doc/index.html` diretamente ou sirva a pasta `doc/` localmente. Para
testar o jogo web com hot reload, use `npm run dev:web`.

`npm run verify` inclui formatação e lint da documentação; também é possível
executar `npx prettier --check doc` e `npx eslint doc`.
