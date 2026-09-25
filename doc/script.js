/* =========================================================
   As Aventuras de Tuiu e Nany — página única

   A página tem uma função só: tocar o trailer em loop como
   cenário de fundo.

   O vídeo é um <video> local em WebM, então não há player
   externo para conduzir: o autoplay e o loop saem dos próprios
   atributos do elemento, e o que poderia dar errado aqui é
   justamente o navegador decidir não tocar. A única providência
   necessária é essa.
   ========================================================= */

const video = document.querySelector('[data-video]')

/* O atributo `autoplay` cobre o caso comum, mas o navegador o
   ignora em duas situações: quando a aba estava em segundo plano
   ao abrir a página, e quando a política de economy de dados
   está ligada. Em ambos os vídeos chegam pausados e o cenário
   fica parado, sem nada na tela indicando que há algo para tocar.

   Por isso a reprodução é pedida de novo por JavaScript assim que
   o arquivo carrega, e um clique em qualquer lugar da cena serve
   de plano B para quando nem isso resolve. */
function tocar() {
  if (!video) return
  const tentativa = video.play()
  // Em navegadores antigos play() devolve undefined, não Promise.
  if (tentativa && typeof tentativa.catch === 'function') {
    tentativa.catch(() => {
      /* Bloqueado. Espera um toque; nada de mostrar aviso, porque
         o vídeo é cenário e a página não deve ganhar um banner
         por causa de um elemento decorativo. */
    })
  }
}

if (video) {
  // 'canplay' significa que já há um frame decodificável. Pedir
  // play antes disso seria a mesma espera, só com um reject a mais.
  video.addEventListener('canplay', tocar, { once: true })

  // Autoplay que funciona não precisa de nada. Se não funcionar,
  // o vídeo vai passar por 'pause' ao menos uma vez: é o sinal de
  // que o elemento está parado despite os atributos, e o clique
  // é a última chance.
  document.addEventListener(
    'pointerdown',
    () => {
      if (video.paused) tocar()
    },
    { passive: true },
  )

  // Se o arquivo não carregar (WebM sem suporte, 404), o fundo
  // continua sendo o azul-escuro da cena e a página segue legível.
  video.addEventListener('error', () => {
    video.remove()
  })
}

/* Ano no crédito, para não ficar desatualizado no Ano Novo. */
document.querySelectorAll('[data-ano]').forEach((elemento) => {
  elemento.textContent = String(new Date().getFullYear())
})
