# Site — As Aventuras de Tuiu e Nany

Site estático de apresentação, no formato de uma página de loja. Não faz
parte do bundle do jogo e não é construído pelo `electron-vite`: é HTML, CSS
e JavaScript puros, sem framework e sem dependências.

O jogo em si é um app Electron de desktop. Este site é a vitrine dele.

## Conceito

A página imita a anatomia de uma ficha de loja: capa em destaque com abas,
galeria de capturas com visor em tela cheia, "sobre este jogo", tags,
requisitos de sistema por plataforma, conquistas, avaliações e uma caixa
lateral com as informações e o botão de download. A identidade é a do
jogo, não a da loja: as cores e o nome saem do próprio projeto, e nenhum
elemento usa marca de terceiro.

## Arquivos

| Arquivo      | Função                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| `index.html` | Estrutura da ficha: capa, grade em duas colunas e todos os blocos.     |
| `styles.css` | Sistema visual: barra, capa, caixas, tabelas, visor e rodapé.          |
| `script.js`  | Capa com abas, visor, requisitos, lista de desejos, busca e avisos.    |
| `demo.js`    | Simulador jogável da mecânica de pisão, em canvas 224×126.             |
| `assets/`    | Fotos dos quatro cenários e miniatura usada como favicon e `og:image`. |

## Comportamento

- **Capa.** Abas de destaque, setas, pontos e rotação automática a cada 7 s.
  A rotação para no hover e é desligada em `prefers-reduced-motion`.
- **Visor.** Abre a partir das miniaturas, navega com as setas do teclado,
  fecha com `Esc` ou no clique fora, e devolve o foco ao miniatura de origem.
- **Lista de desejos.** O estado fica em `localStorage`, então sobrevive ao
  recarregar. A chave é `tuiue-nany:desejo`.
- **Busca.** Procura entre termos das seções e rola até a seção. O que não
  bate com nada devolve "nada encontrado" em vez de um resultado vazio.
- **Simulador.** Roda a mesma regra implementada no jogo: pisão normal tira 2
  de dano, pulo duplo tira 3, o zumbi comum tem 3 de vida, o combo vai até
  x10 e o contato lateral custa um coração com 1,5 s de invulnerabilidade.
  Só recebe o teclado quando está em foco, para não disputar as setas com a
  navegação da página.

## Vídeo

O trailer é um `iframe` de `youtube-nocookie.com` em loop, silencioso e sem
controles. O botão no canto pausa e retoma, e há um botão grande que aparece
sozinho se o navegador bloquear o autoplay. Sair da capa pausa o vídeo;
voltar retoma, a menos que a pausa tenha sido manual ou que o sistema peça
movimento reduzido.

O player é controlado por `postMessage`, o que exige `enablejsapi=1` na URL.
Se o canal não responder, o código cai na troca do `src` por `about:blank`.
Trocar o `src` funciona para parar, mas destrói a posição do vídeo e deixa o
retorno frágil, então é só reserva.

**A página precisa ser servida por HTTP.** O YouTube recusa o player com o
Erro 153 (`PLAYABILITY_ERROR_CODE_EMBEDDER_IDENTITY_MISSING_REFERRER`) quando
o embed é pedido sem cabeçalho `Referer`, e é exatamente o que acontece ao
abrir `index.html` por `file://`. Não há como adicionar esse cabeçalho via
JavaScript. Por isso a página detecta `file:` e mostra o aviso de cima com o
comando para servir a pasta. Verificado contra a página de embed do YouTube:
origem isolada e URL completa são aceitas, ausência de `Referer` não.

## O que é real e o que não é

Real, copiado do código: especificações técnicas, requisitos, as quatro
fases com meta de abates, chefe e vida, a mecânica de pisão, os controles,
os ícones de instalador por plataforma e os comandos de build.

Inventado na medida, e marcado como tal na página: o texto do subtítulo, a
lista de conquistas (o jogo não tem sistema de conquistas — a seção diz
isso) e as porcentagens globais, que aparecem como `—`. A seção de avaliações
mostra zero em todas as barras, com a observação de que o jogo nunca foi
distribuído. Preferimos mostrar zero a inventar números.

## Verificar

`npm run verify` roda Prettier e ESLint também sobre `doc/`, então
formatação e lint do site entram no mesmo gate do jogo. Para conferir
localmente com as âncoras e os assets resolvendo:

```sh
npx prettier --check doc
npx eslint doc
python3 -m http.server 8000 --directory doc
```
