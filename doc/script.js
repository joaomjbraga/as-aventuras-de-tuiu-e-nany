const FASES = [
  {
    id: 'casa',
    indice: 'cenário 01',
    nome: 'CASA',
    meta: 20,
    chefe: 'ZUMBI-CHEFE',
    vida: 56,
    velocidade: 60,
    zumbis: 14,
    frase: 'O começo de tudo, no lugar onde a aventura nasceu.',
  },
  {
    id: 'ieab',
    indice: 'cenário 02',
    nome: 'IEAB',
    meta: 25,
    chefe: 'GUARDIÃO DO IEAB',
    vida: 72,
    velocidade: 68,
    zumbis: 16,
    frase: 'Corredor, sala de aula e o barulho de sempre no intervalo.',
  },
  {
    id: 'castro-alves',
    indice: 'cenário 03',
    nome: 'CASTRO ALVES',
    meta: 30,
    chefe: 'POETA SOMBRIO',
    vida: 96,
    velocidade: 76,
    zumbis: 18,
    frase: 'A praça onde a brisa era a única coisa boa do fim de semana.',
  },
  {
    id: 'cetep',
    indice: 'cenário 04',
    nome: 'CETEP',
    meta: 35,
    chefe: 'MESTRE TÉCNICO',
    vida: 120,
    velocidade: 84,
    zumbis: 20,
    frase: 'O último cenário. Quem chegou até aqui já conhece o final.',
  },
]

/* Teto de cada medidor, para transformar o valor em porcentagem de barra. */
const TETOS = { vida: 120, velocidade: 84, zumbis: 20, meta: 35 }

const CAPTURAS = [
  { arquivo: 'assets/casa.jpg', legenda: 'Casa' },
  { arquivo: 'assets/ieab.jpg', legenda: 'IEAB' },
  { arquivo: 'assets/castro-alves.jpg', legenda: 'Castro Alves' },
  { arquivo: 'assets/cetep.jpg', legenda: 'CETEP' },
  { arquivo: 'assets/video-thumb.jpg', legenda: 'Trailer' },
]

const BUSCA = [
  { termos: ['missao', 'missão', 'historia', 'história', 'sobre', 'jogo', 'por que'], alvo: 'missao' },
  {
    termos: ['campanha', 'fase', 'cenario', 'cenário', 'casa', 'ieab', 'castro', 'cetep', 'chefe', 'stage'],
    alvo: 'campanha',
  },
  { termos: ['dificuldade', 'dificil', 'facil', 'medio', 'preset', 'multiplicador'], alvo: 'dificuldade' },
  { termos: ['equipe', 'elenco', 'tuiu', 'nany', 'jogador', 'co-op', 'teclado'], alvo: 'equipe' },
  { termos: ['armamento', 'mecanica', 'mecânica', 'pulo', 'pisao', 'pisão', 'combo', 'simulador'], alvo: 'armamento' },
  {
    termos: [
      'suporte',
      'requisito',
      'sistema',
      'windows',
      'linux',
      'node',
      'instalar',
      'instalador',
      'conquista',
      'medalha',
      'codigo',
      'código',
    ],
    alvo: 'suporte',
  },
]

let relogioPista = null
let ultimaFoca = null

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------
   Aviso temporário
   ------------------------------------------------------------------ */

function pista(mensagem) {
  const elemento = document.querySelector('[data-pista]')
  if (!elemento) return
  elemento.textContent = mensagem
  elemento.hidden = false
  window.clearTimeout(relogioPista)
  relogioPista = window.setTimeout(() => {
    elemento.hidden = true
  }, 2600)
}

/* ------------------------------------------------------------------
   Vídeo do trailer

   O player é controlado por postMessage, que exige enablejsapi=1 na URL.
   Trocar o src por about:blank funciona para parar, mas destrói a posição
   do vídeo e deixa o retorno frágil. O postMessage mantém o player vivo.

   Se o canal não responder (cookie de third-party bloqueado, navegador sem
   suporte), caímos na troca de src, que é mais lenta mas funciona.
   ------------------------------------------------------------------ */

let videoPausado = false
let urlVideo = ''
let canalPronto = false
let handshakeFeito = false
let relogioAutoplay = null

function quadro() {
  const iframe = document.querySelector('[data-video]')
  if (!iframe) return null
  return { iframe: iframe, url: iframe.getAttribute('src') || '' }
}

function comando(acao, argumentos) {
  const caixa = quadro()
  if (!caixa || !caixa.iframe.contentWindow) return false
  caixa.iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: acao, args: argumentos || [] }), '*')
  return true
}

function anunciando() {
  const caixa = quadro()
  if (!caixa || !caixa.iframe.contentWindow) return
  caixa.iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 0, channel: 'widget' }), '*')
}

function marcarVideo(pausado) {
  videoPausado = pausado
  const botao = document.querySelector('[data-parar-video]')
  const icone = document.querySelector('[data-parar-icone]')
  if (botao) {
    botao.setAttribute('aria-pressed', String(pausado))
    botao.setAttribute('aria-label', pausado ? 'Reproduzir o vídeo de apresentação' : 'Pausar o vídeo de apresentação')
  }
  if (icone) icone.textContent = pausado ? '▶' : 'II'
}

function recarregarVideo() {
  const caixa = quadro()
  if (!caixa) return
  if (!urlVideo) urlVideo = caixa.url
  canalPronto = false
  caixa.iframe.setAttribute('src', urlVideo)
  marcarVideo(false)
  prepararEscuta()
}

function tocarVideo() {
  if (canalPronto && comando('playVideo')) {
    marcarVideo(false)
    return
  }
  recarregarVideo()
}

function pausarVideo() {
  if (canalPronto && comando('pauseVideo')) {
    marcarVideo(true)
    return
  }
  const caixa = quadro()
  if (!caixa) return
  if (!urlVideo) urlVideo = caixa.url
  caixa.iframe.setAttribute('src', 'about:blank')
  marcarVideo(true)
}

function prepararEscuta() {
  window.clearTimeout(relogioAutoplay)
  relogioAutoplay = window.setTimeout(() => {
    if (!canalPronto) pista('O navegador bloqueou o autoplay. Clique em II para tocar.')
  }, 2500)

  if (!handshakeFeito) {
    handshakeFeito = true
    anunciando()
    window.setTimeout(anunciando, 700)
    window.setTimeout(anunciando, 2000)
  }
}

function prepararVideo() {
  const botao = document.querySelector('[data-parar-video]')
  if (botao) {
    botao.addEventListener('click', () => {
      if (videoPausado) tocarVideo()
      else pausarVideo()
      pista(videoPausado ? 'Trailer pausado' : 'Trailer em loop, sem som')
    })
  }

  window.addEventListener('message', (evento) => {
    const caixa = quadro()
    if (!caixa || evento.source !== caixa.iframe.contentWindow) return
    let dados
    try {
      dados = JSON.parse(evento.data)
    } catch {
      return
    }
    if (!dados || typeof dados.event !== 'string') return

    canalPronto = true
    window.clearTimeout(relogioAutoplay)

    if (dados.event === 'onStateChange' && typeof dados.info === 'number') {
      if (dados.info === 1) marcarVideo(false)
      else if (dados.info === 0 || dados.info === 2) marcarVideo(true)
    }
  })

  const caixa = quadro()
  if (caixa) urlVideo = caixa.url

  if (movimentoReduzido) pausarVideo()
  else prepararEscuta()
}

/* ------------------------------------------------------------------
   Seletor de cenário
   ------------------------------------------------------------------ */

const abasFase = Array.from(document.querySelectorAll('[data-fase]'))
const painelFase = document.querySelector('[data-detalhe-fase]')

const detalhe = {
  foto: document.querySelector('[data-fase-foto]'),
  indice: document.querySelector('[data-fase-indice]'),
  nome: document.querySelector('[data-fase-nome]'),
  frase: document.querySelector('[data-fase-frase]'),
  meta: document.querySelector('[data-fase-meta]'),
  chefe: document.querySelector('[data-fase-chefe]'),
  vida: document.querySelector('[data-fase-vida]'),
  vidaBarra: document.querySelector('[data-fase-vida-barra]'),
  velocidade: document.querySelector('[data-fase-velocidade]'),
  velBarra: document.querySelector('[data-fase-vel-barra]'),
  zumbis: document.querySelector('[data-fase-zumbis]'),
  zumbisBarra: document.querySelector('[data-fase-zumbis-barra]'),
  metaBarra: document.querySelector('[data-fase-meta-barra]'),
}

function largura(valor, teto) {
  return `${Math.max(4, Math.round((valor / teto) * 100))}%`
}

function mostrarFase(id, moverFoco) {
  const fase = FASES.find((item) => item.id === id)
  if (!fase) return

  abasFase.forEach((aba) => {
    const ativa = aba.dataset.fase === id
    aba.setAttribute('aria-selected', String(ativa))
    aba.tabIndex = ativa ? 0 : -1
  })

  if (detalhe.foto) {
    detalhe.foto.src = `assets/${fase.id}.jpg`
    detalhe.foto.alt = `Cenário ${fase.nome}`
  }
  if (detalhe.indice) detalhe.indice.textContent = fase.indice
  if (detalhe.nome) detalhe.nome.textContent = fase.nome
  if (detalhe.frase) detalhe.frase.textContent = fase.frase
  if (detalhe.chefe) detalhe.chefe.textContent = fase.chefe

  const numeros = [
    [detalhe.vida, detalhe.vidaBarra, fase.vida, TETOS.vida],
    [detalhe.velocidade, detalhe.velBarra, fase.velocidade, TETOS.velocidade],
    [detalhe.zumbis, detalhe.zumbisBarra, fase.zumbis, TETOS.zumbis],
    [detalhe.meta, detalhe.metaBarra, fase.meta, TETOS.meta],
  ]
  numeros.forEach(([texto, barra, valor, teto]) => {
    if (texto) texto.textContent = valor
    if (barra) barra.style.width = largura(valor, teto)
  })

  if (painelFase) painelFase.dataset.faseAtiva = id

  if (moverFoco) {
    const aba = abasFase.find((item) => item.dataset.fase === id)
    if (aba) aba.focus()
  }
}

function prepararSeletor() {
  abasFase.forEach((aba, posicao) => {
    aba.addEventListener('click', () => mostrarFase(aba.dataset.fase, false))
    aba.addEventListener('keydown', (evento) => {
      const passos = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
      const passo = passos[evento.key]
      if (!passo) return
      evento.preventDefault()
      mostrarFase(abasFase[(posicao + passo + abasFase.length) % abasFase.length].dataset.fase, true)
    })
  })
  mostrarFase('casa', false)
}

/* ------------------------------------------------------------------
   Requisitos
   ------------------------------------------------------------------ */

function prepararRequisitos() {
  const abas = Array.from(document.querySelectorAll('[data-req]'))
  const paineis = Array.from(document.querySelectorAll('[data-req-painel]'))

  abas.forEach((aba) => {
    aba.addEventListener('click', () => {
      abas.forEach((outra) => {
        const ativa = outra === aba
        outra.classList.toggle('ativa', ativa)
        outra.setAttribute('aria-selected', String(ativa))
      })
      paineis.forEach((painel) => {
        painel.hidden = painel.dataset.reqPainel !== aba.dataset.req
      })
    })
  })
}

/* ------------------------------------------------------------------
   Visor de capturas
   ------------------------------------------------------------------ */

const visor = {
  raiz: document.querySelector('[data-visor]'),
  img: document.querySelector('[data-visor-img]'),
  legenda: document.querySelector('[data-visor-legenda]'),
  cont: document.querySelector('[data-visor-cont]'),
  fechar: document.querySelector('[data-visor-fechar]'),
  indice: 0,
}

function mostrarCaptura(indice, legenda) {
  if (!visor.raiz || !CAPTURAS[indice]) return
  visor.indice = indice
  const captura = CAPTURAS[indice]
  if (visor.img) {
    visor.img.src = captura.arquivo
    visor.img.alt = `Captura de tela: ${captura.legenda}`
  }
  if (visor.legenda) visor.legenda.textContent = legenda || captura.legenda
  if (visor.cont) visor.cont.textContent = `${indice + 1} / ${CAPTURAS.length}`
}

function abrirVisor(indice, legenda) {
  if (!visor.raiz) return
  ultimaFoca = document.activeElement
  mostrarCaptura(indice, legenda)
  visor.raiz.hidden = false
  document.body.style.overflow = 'hidden'
  if (visor.fechar) visor.fechar.focus()
}

function fecharVisor() {
  if (!visor.raiz) return
  visor.raiz.hidden = true
  document.body.style.overflow = ''
  if (ultimaFoca instanceof HTMLElement) ultimaFoca.focus()
}

function prepararVisor() {
  document.querySelectorAll('[data-captura]').forEach((miniatura) => {
    miniatura.addEventListener('click', () => {
      const indice = CAPTURAS.findIndex((item) => item.arquivo === miniatura.dataset.captura)
      abrirVisor(indice === -1 ? 0 : indice, miniatura.dataset.legenda)
    })
  })

  const verTodas = document.querySelector('[data-ver-todas]')
  if (verTodas) verTodas.addEventListener('click', () => abrirVisor(0))

  if (visor.fechar) visor.fechar.addEventListener('click', fecharVisor)
  const anterior = document.querySelector('[data-visor-ant]')
  const proximo = document.querySelector('[data-visor-prox]')
  if (anterior)
    anterior.addEventListener('click', () => mostrarCaptura((visor.indice - 1 + CAPTURAS.length) % CAPTURAS.length))
  if (proximo) proximo.addEventListener('click', () => mostrarCaptura((visor.indice + 1) % CAPTURAS.length))
  if (visor.raiz) {
    visor.raiz.addEventListener('click', (evento) => {
      if (evento.target === visor.raiz) fecharVisor()
    })
  }

  window.addEventListener('keydown', (evento) => {
    if (!visor.raiz || visor.raiz.hidden) return
    if (evento.key === 'Escape') {
      evento.preventDefault()
      fecharVisor()
    }
    if (evento.key === 'ArrowRight') mostrarCaptura((visor.indice + 1) % CAPTURAS.length)
    if (evento.key === 'ArrowLeft') mostrarCaptura((visor.indice - 1 + CAPTURAS.length) % CAPTURAS.length)
  })
}

/* ------------------------------------------------------------------
   Favoritos
   ------------------------------------------------------------------ */

function prepararFavoritos() {
  const botao = document.querySelector('[data-lista-desejos]')
  if (!botao) return

  const CHAVE = 'tuiue-nany:favoritos'
  const icone = botao.querySelector('[data-desejo-icone]')
  const rotulo = botao.querySelector('[data-desejo-texto]')

  let salvo
  try {
    salvo = window.localStorage.getItem(CHAVE) === '1'
  } catch {
    salvo = false
  }

  function pintar(estado) {
    botao.setAttribute('aria-pressed', String(estado))
    if (icone) icone.textContent = estado ? '✓' : '+'
    if (rotulo) rotulo.textContent = estado ? 'Salvo nos favoritos' : 'Salvar nos favoritos'
  }

  pintar(salvo)

  botao.addEventListener('click', () => {
    const proximo = botao.getAttribute('aria-pressed') !== 'true'
    pintar(proximo)
    try {
      window.localStorage.setItem(CHAVE, proximo ? '1' : '0')
    } catch {
      pista('Este navegador bloqueou o armazenamento local')
    }
    pista(proximo ? 'Salvo nos favoritos deste navegador' : 'Removido dos favoritos')
  })
}

/* ------------------------------------------------------------------
   Copiar comando
   ------------------------------------------------------------------ */

function prepararCopia() {
  document.querySelectorAll('[data-copiar]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const alvo = document.querySelector(botao.dataset.copiar)
      if (!alvo) return
      try {
        await navigator.clipboard.writeText(alvo.textContent.trim())
        pista('Comando copiado')
      } catch {
        pista('Não foi possível copiar; selecione o texto manualmente')
      }
    })
  })
}

/* ------------------------------------------------------------------
   Busca
   ------------------------------------------------------------------ */

function prepararBusca() {
  const campo = document.querySelector('[data-busca]')
  const aviso = document.querySelector('[data-busca-aviso]')
  if (!campo || !aviso) return

  campo.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const termo = campo.value.trim().toLowerCase()
    if (!termo) {
      aviso.hidden = true
      return
    }
    const achado = BUSCA.find((item) => item.termos.some((palavra) => termo.includes(palavra)))
    if (!achado) {
      aviso.textContent = `Nada encontrado para "${campo.value.trim()}"`
      aviso.hidden = false
      return
    }
    aviso.hidden = true
    const destino = document.getElementById(achado.alvo)
    if (destino) destino.scrollIntoView({ behavior: movimentoReduzido ? 'auto' : 'smooth' })
  })
}

/* ------------------------------------------------------------------
   Navegação, file:// e rodapé
   ------------------------------------------------------------------ */

function marcarSecaoAtiva(id) {
  document.querySelectorAll('.topo__nav a, .rodape__nav a').forEach((link) => {
    link.classList.toggle('ativo', link.getAttribute('href') === `#${id}`)
  })
}

function prepararNavegacao() {
  const secoes = Array.from(document.querySelectorAll('main section[id]'))
  if (!secoes.length || !('IntersectionObserver' in window)) return

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) marcarSecaoAtiva(entrada.target.id)
      })
    },
    { rootMargin: '-80px 0px -70% 0px' },
  )
  secoes.forEach((secao) => observador.observe(secao))
}

function prepararAvisoLocal() {
  const aviso = document.querySelector('[data-aviso-local]')
  if (!aviso) return
  if (window.location.protocol !== 'file:') return
  aviso.hidden = false
}

function prepararAno() {
  document.querySelectorAll('[data-ano]').forEach((elemento) => {
    elemento.textContent = String(new Date().getFullYear())
  })
}

prepararVideo()
prepararSeletor()
prepararRequisitos()
prepararVisor()
prepararFavoritos()
prepararCopia()
prepararBusca()
prepararNavegacao()
prepararAvisoLocal()
prepararAno()
