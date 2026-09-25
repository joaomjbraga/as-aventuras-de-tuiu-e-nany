# Site — As Aventuras de Tuiu e Nany

Site estático de **uma tela só**: o trailer do jogo rodando em loop e sem som
como fundo, com o título e o botão de download por cima. Não há texto de
apresentação nem lista de plataformas — quem vê a página vê o jogo rodando, e
o único texto visível são os dois nomes e o botão. A descrição do jogo vive nas
meta tags, onde serve para quem chega por busca ou por link compartilhado, e
não na tela. Não faz parte do bundle do jogo e não é construído pelo
`electron-vite`: é HTML, CSS e JavaScript puros, sem framework e sem
dependências.

O jogo em si é um app Electron de desktop. Este site é a vitrine dele.

## Por que só uma tela

A versão anterior era uma ficha de loja completa — campanha, dificuldade,
elenco, simulador, requisitos, conquistas. Tudo isso continua verdadeiro, mas
o objetivo de uma vitrine é fazer a pessoa querer jogar, e a ficha comprida
fazia o contrário: obrigava a rolar oito blocos antes de chegar perto de um
botão. A versão de hoje responde a uma pergunta só, "tem o que jogar aqui?",
e responde em menos de dois segundos, sem rolagem.

## Arquivos

| Arquivo      | Função                                                                           |
| ------------ | -------------------------------------------------------------------------------- |
| `index.html` | A tela única: vídeo, filtros de pixel art, título e botões.                      |
| `styles.css` | Paleta do jogo, tipografia monoespaçada e os filtros de pixel art sobre o vídeo. |
| `script.js`  | Garante a reprodução do vídeo.                                                   |
| `assets/`    | `as-Aventuras-de-Tuiu-e-Nany.webm` — o trailer (WebM/VP9, 18,7 MB).              |
|              | `logo-windows.png` e `linux-512.png` — as marcas dos botões.                     |

## Identidade

O site não usa paleta de loja. As cores saem de `src/game/theme.ts`:

| Uso                    | Cor       | De onde vem                  |
| ---------------------- | --------- | ---------------------------- |
| Título e botão         | `#ffd54f` | `TEXT.gold`                  |
| Tuiu                   | `#8fd8ff` | `TEXT.p1` (jogador 1 no HUD) |
| Nany                   | `#ff9fc2` | `TEXT.p2` (jogador 2 no HUD) |
| Coração de pixel art   | `#ff4d5d` | `COLOR.heart`                |
| Contorno de todo texto | `#0d101b` | `COLOR.stroke`               |

Os nomes aparecem nas mesmas cores que o jogo dá a cada jogador no HUD, então
quem já jogou reconhece a tela antes de ler o texto.

O traço é de pixel art: **nenhum raio arredondado e nenhuma sombra difusa**.
Borda reta de 1 ou 2px e sombra sólida de deslocamento fixo (`--peso`), que
comprime quando o botão é clicado. Sobre o vídeo vão duas camadas: um dither
de 2px com o padrão xadrez e scanlines de 3px, mais uma vinheta radial que
escurece as bordas e joga o olho para o centro.

### As marcas dos botões

`logo-windows.png` e `linux-512.png` são PNGs **brancos com fundo transparente**,
que sozinhos não sobreviveriam ao dourado do botão. Em vez de pedir uma segunda
versão de cada imagem, o CSS usa a máscara:

```css
.botao__logo {
  background-color: currentColor;
  mask: center / contain no-repeat;
}
.botao__logo--windows {
  mask-image: url(assets/logo-windows.png);
}
.botao__logo--linux {
  mask-image: url(assets/linux-512.png);
}
```

A máscara usa o **alfa** do PNG como recorte, então o que aparece é a cor de
fundo do elemento — e como ela é `currentColor`, a marca pinta sozinha na mesma
tinta do texto e acompanha qualquer mudança de cor no botão, inclusive no
hover. O prefixo `-webkit-` cobre o Safari anterior a 15.4.

A ordem das regras importa: o atalho `mask` zera `mask-image` para `none`, então
quem define a URL precisa vir depois no arquivo. Por isso a URL não está no
atalho, e sim nos modificadores por plataforma.

Isso também removeu a requisição de imagem do HTML: não existe mais `<img>`,
os arquivos são buscados só pela folha de estilo.

Os dois botões baixam o artefato direto, sem passar pela página de releases:

```
https://github.com/joaomjbraga/as-aventuras-de-tuiu-e-nany/releases/latest/download/<arquivo>
```

O `releases/latest` é um alias do GitHub que resolve sozinho qual é a release
mais recente, então **estas URLs não precisam ser atualizadas a cada release**.
O `<arquivo>` é o `artifactName` do `electron-builder.json5`:
`as-aventuras-de-tuiu-e-nany-windows.exe` e `as-aventuras-de-tuiu-e-nany-linux.AppImage`.

O `latest` só funciona porque o `artifactName` **não** tem `${version}`. Com a
versão no nome do arquivo, cada release renomearia o artefato e o `latest` deixaria
de encontrar o que servir, porque ele resolve a release mas ainda exige o nome
exato do arquivo. As duas metades andam juntas: se mudar o `artifactName`, os
`href` daqui precisam mudar junto.

**Pré-lançamento não sai por este link.** O `release.yml` marca versão com
sufixo (`0.1.0-beta.1`) como prerelease, e o GitHub pula prereleases no
`latest`. Publicar um beta não muda o que a vitrine baixa; ela continua
servindo a última versão estável. Isso é de propósito, mas se um dia quiser
divulgar beta pela vitrine, o caminho é outro (link com a tag, ou o badge de
prerelease apontando para a release específica).

## Ajustar o quanto o vídeo aparece

Duas variáveis em `:root` regulam isso, e são o primeiro lugar a mexer quando
o trailer estiver claro demais ou escuro demais:

| Variável         | Efeito                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `--video-filtro` | Filtro do vídeo. `brightness` abaixo de 1 escurece, acima de 1 clareia. |
| `--scanline`     | Opacidade da linha de scanline. Mais alto escurece a imagem toda.       |

A vinheta (`.cena__vinheta`) tem um terceiro controle, em opacidade dentro do
gradiente, mas ela é a rede de segurança do texto sobre o vídeo. Se o título
dourado perder leitura, mexa no `--video-filtro`; deixe a vinheta para o último
recurso.

O coração abaixo do título é o mesmo desenho de 9x8 que o `PreloadScene`
gera no jogo, redesenhado em SVG (`viewBox="0 0 33 8"`, três instâncias).

## O vídeo

O trailer é um arquivo local em **WebM (VP9)**, em
`assets/as-Aventuras-de-Tuiu-e-Nany.webm`, e não um embed do YouTube. Isso
trocou um player externo e toda a fragilidade de player por um elemento
`<video>`. O arquivo tem track de áudio Opus, que o atributo `muted` silencia
na página.

### Atributos que não são decoração

```html
<video autoplay muted loop playsinline preload="auto" disablepictureinpicture></video>
```

- **`muted`** é obrigatório. O Chrome e o Safari **bloqueiam** o autoplay de
  qualquer vídeo com som; sem ele a página abre com o vídeo parado.
- **`playsinline`** evita que o iOS assuma a tela cheia no primeiro play.
- **`disablepictureinpicture`** esconde o botão de picture-in-picture.
- **`aria-hidden` + `tabindex="-1"`**: o vídeo é cenário, não conteúdo. Sem
  `controls` e sem tabindex ele não entra na ordem de tabulação e não é
  anunciado por leitor de tela.

Não há atributo `controls` de propósito: a página não oferece pausa. É uma
decisão de design, com o custo de que quem usa `prefers-reduced-motion` não tem
como parar o movimento pela interface.

### O que o JavaScript ainda faz

O atributo `autoplay` cobre o caso comum, mas o navegador o ignora quando a aba
estava em segundo plano ao abrir a página, e quando a política de economy de
dados está ligada. Nesses dois casos o vídeo chega pausado e o cenário fica
parado sem nada indicando o contrário. `script.js` pede a reprodução de novo no
evento `canplay` e usa um `pointerdown` em qualquer lugar da cena como plano B.
Se o arquivo não carregar, o `<video>` é removido e o fundo continua sendo o
azul-escuro da cena.

### Abrir sem servidor

O vídeo é local e a única requisição externa é a fonte do Google, então a
página funciona aberta direto do disco por `file://`:

```sh
doc/index.html
```

Para conferir com o servidor (o que o GitHub Pages faz, e o que evita
diferenças de `file://` entre navegadores):

```sh
npx serve doc
```

## Verificar

`npm run verify` roda Prettier e ESLint também sobre `doc/`, então formatação
e lint do site entram no mesmo gate do jogo. Para conferir localmente:

```sh
npx prettier --check doc
npx eslint doc
```
