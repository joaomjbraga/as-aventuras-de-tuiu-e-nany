;(function () {
  'use strict'

  var LARGURA = 224
  var ALTURA = 126
  var CHAO = 104
  var GRAVIDADE = 0.34
  var VELOCIDADE = 1.35
  var PULO = -4.5
  var VELOCIDADE_BOUNCE = -3.1
  var VIDA_MAXIMA = 3
  var COMBO_MAXIMO = 10
  var IFRAME_MS = 1500
  var APEX = 0.9

  var CORES = {
    ceu: '#1b2233',
    ceu2: '#141a28',
    chao: '#2c3350',
    chao2: '#232a42',
    grama: '#4fc3f7',
    jogador: '#8ab0ff',
    jogadorEscuro: '#5b7fd4',
    zumbi: '#7bed9f',
    zumbiEscuro: '#4fa877',
    sombra: '#0d101b',
    combo: '#ffe082',
    coracao: '#ff4d5d',
  }

  var canvas = document.querySelector('[data-demo]')
  if (!canvas) return

  var ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false

  var vidasEl = document.querySelector('[data-demo-vidas]')
  var comboEl = document.querySelector('[data-demo-combo]')
  var abatesEl = document.querySelector('[data-demo-abates]')
  var avisoEl = document.querySelector('[data-demo-aviso]')

  var teclas = Object.create(null)
  var jogador
  var zumbis
  var particles
  var combs
  var camera
  var combo
  var abates
  var ultimoNow
  var correAte

  function criarJogador() {
    return {
      x: 46,
      y: CHAO - 14,
      largura: 8,
      altura: 14,
      vx: 0,
      vy: 0,
      noChao: true,
      pulos: 0,
      pulouDuplo: false,
      vida: VIDA_MAXIMA,
      invulneravelAte: 0,
      olhando: 1,
      passo: 0,
    }
  }

  function criarZumbi(x, velocidade) {
    return {
      x: x,
      y: CHAO - 12,
      largura: 8,
      altura: 12,
      vx: -velocidade,
      vida: 3,
      passo: Math.random() * 6,
    }
  }

  function esconderAviso() {
    if (avisoEl) avisoEl.hidden = true
  }

  function reiniciar() {
    jogador = criarJogador()
    zumbis = [criarZumbi(150, 0.28), criarZumbi(196, 0.22)]
    particles = []
    combs = []
    camera = 0
    combo = 0
    abates = 0
    correAte = 0
    atualizarHud()
  }

  function atualizarHud() {
    if (vidasEl)
      vidasEl.textContent = 'I'.repeat(Math.max(0, jogador.vida)) + '_'.repeat(VIDA_MAXIMA - Math.max(0, jogador.vida))
    if (comboEl) {
      comboEl.textContent = 'COMBO x' + combo
      comboEl.style.color = combo > 0 ? CORES.combo : ''
    }
    if (abatesEl) abatesEl.textContent = 'ABATES ' + abates
  }

  function emitir(x, y, quantidade) {
    for (var i = 0; i < quantidade; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -Math.random() * 1.9 - 0.3,
        vida: 18 + Math.random() * 12,
      })
    }
  }

  function sobrepoe(a, b) {
    return a.x < b.x + b.largura && a.x + a.largura > b.x && a.y < b.y + b.altura && a.y + a.altura > b.y
  }

  function pisao(zumbi) {
    abates++
    combo = Math.min(COMBO_MAXIMO, combo + 1)
    emitir(zumbi.x + zumbi.largura / 2, zumbi.y + zumbi.altura, 7)
    combs.push({ x: zumbi.x, y: zumbi.y - 6, vida: 40, texto: 'x' + combo })
    jogador.vy = VELOCIDADE_BOUNCE
    jogador.pulos = 0
    jogador.pulouDuplo = false
    jogador.noChao = false
    camera = Math.min(6, camera + 1.2)
    atualizarHud()
  }

  function machucar() {
    if (performance.now() < jogador.invulneravelAte) return
    jogador.vida--
    combo = 0
    jogador.invulneravelAte = performance.now() + IFRAME_MS
    emitir(jogador.x + jogador.largura / 2, jogador.y + jogador.altura / 2, 5)
    camera = 0
    if (jogador.vida <= 0) {
      jogador.vida = VIDA_MAXIMA
      jogador.x = 46
      jogador.y = CHAO - jogador.altura
      jogador.vx = 0
      jogador.vy = 0
      combs.push({ x: jogador.x, y: jogador.y - 8, vida: 70, texto: 'GAME OVER' })
    }
    atualizarHud()
  }

  function passo(now) {
    if (!ultimoNow) ultimoNow = now
    var dt = Math.min(3, (now - ultimoNow) / 16.67)
    ultimoNow = now

    var direita = teclas.ArrowRight || teclas.KeyD
    var esquerda = teclas.ArrowLeft || teclas.KeyA
    var pulo = teclas.Space || teclas.ArrowUp || teclas.KeyW

    jogador.vx = 0
    if (direita) {
      jogador.vx = VELOCIDADE
      jogador.olhando = 1
    } else if (esquerda) {
      jogador.vx = -VELOCIDADE
      jogador.olhando = -1
    }

    if (pulo && !jogador.puloAnterior) {
      if (jogador.noChao) {
        jogador.vy = PULO
        jogador.pulos = 1
        jogador.pulouDuplo = false
        jogador.noChao = false
      } else if (jogador.pulos < 2 && Math.abs(jogador.vy) < APEX) {
        jogador.vy = PULO
        jogador.pulos = 2
        jogador.pulouDuplo = true
      }
    }
    jogador.puloAnterior = pulo

    jogador.vy += GRAVIDADE
    jogador.x += jogador.vx * dt
    jogador.y += jogador.vy * dt

    if (jogador.x < 6) jogador.x = 6
    if (jogador.x + jogador.largura > LARGURA - 6) jogador.x = LARGURA - 6 - jogador.largura

    jogador.noChao = false
    if (jogador.y + jogador.altura >= CHAO) {
      jogador.y = CHAO - jogador.altura
      jogador.vy = 0
      jogador.pulos = 0
      jogador.pulouDuplo = false
      jogador.noChao = true
    }

    if (Math.abs(jogador.vx) > 0.1 && jogador.noChao) jogador.passo += 0.22 * dt

    if (now > correAte && zumbis.length < 3) {
      correAte = now + 1400
      var lado = Math.random() > 0.5 ? 1 : -1
      var px = lado > 0 ? LARGURA + 10 : -10
      if (Math.abs(px - jogador.x) > 70) zumbis.push(criarZumbi(px, 0.24 + Math.random() * 0.16))
    }

    for (var i = zumbis.length - 1; i >= 0; i--) {
      var z = zumbis[i]
      z.x += z.vx * dt
      z.passo += 0.16 * dt
      if (z.x < -14 || z.x > LARGURA + 14) {
        zumbis.splice(i, 1)
        continue
      }
      if (!sobrepoe(jogador, z)) continue

      var descendo = jogador.vy > 0
      var acima = jogador.y + jogador.altura - jogador.vy * 2 < z.y + 4

      if (descendo && acima) {
        z.vida -= jogador.pulouDuplo ? 3 : 2
        if (z.vida <= 0) {
          pisao(z)
          zumbis.splice(i, 1)
        } else {
          jogador.vy = VELOCIDADE_BOUNCE
          jogador.pulos = 0
          jogador.pulouDuplo = false
          emitir(z.x + z.largura / 2, z.y + z.altura, 3)
        }
      } else {
        machucar()
      }
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var q = particles[p]
      q.x += q.vx * dt
      q.y += q.vy * dt
      q.vy += 0.14 * dt
      q.vida -= dt
      if (q.vida <= 0) particles.splice(p, 1)
    }

    for (var c = combs.length - 1; c >= 0; c--) {
      combs[c].y -= 0.35 * dt
      combs[c].vida -= dt
      if (combs[c].vida <= 0) combs.splice(c, 1)
    }

    camera *= 0.92
    if (jogador.noChao) camera *= 0.8

    desenhar()
    window.requestAnimationFrame(passo)
  }

  function retangulo(x, y, largura, altura, cor) {
    ctx.fillStyle = cor
    ctx.fillRect(Math.round(x), Math.round(y), largura, altura)
  }

  function desenhar() {
    retangulo(0, 0, LARGURA, ALTURA, CORES.ceu)
    retangulo(0, 0, LARGURA, CHAO, CORES.ceu2)

    for (var i = 0; i < 6; i++) {
      var x = ((((i * 44 - camera * 0.4) % (LARGURA + 44)) + LARGURA + 44) % (LARGURA + 44)) - 22
      retangulo(x, CHAO - 26 - (i % 3) * 9, 20, 26 + (i % 3) * 9, '#1a2133')
    }

    retangulo(0, CHAO, LARGURA, ALTURA - CHAO, CORES.chao)
    retangulo(0, CHAO, LARGURA, 2, CORES.grama)
    retangulo(0, CHAO + 2, LARGURA, 1, CORES.chao2)

    var tremor = Math.round(camera)
    ctx.save()
    ctx.translate(-tremor, 0)

    retangulo(jogador.x + 2, CHAO, jogador.largura - 4, 2, CORES.sombra)

    for (var z = 0; z < zumbis.length; z++) {
      var zz = zumbis[z]
      var balanco = zz.passo % 2 < 1 ? 0 : 1
      retangulo(zz.x + 2, CHAO, zz.largura - 4, 2, CORES.sombra)
      retangulo(zz.x, zz.y, zz.largura, zz.altura - 3, CORES.zumbi)
      retangulo(zz.x, zz.y, zz.largura, 2, CORES.zumbiEscuro)
      retangulo(zz.x + 1, zz.y + 4, 2, 2, CORES.sombra)
      retangulo(zz.x + (zz.vx < 0 ? 1 : 5), zz.y + 4, 2, 2, CORES.sombra)
      retangulo(zz.x + 1, zz.y + zz.altura - 3, 2, 2 + balanco, CORES.zumbiEscuro)
      retangulo(zz.x + 5, zz.y + zz.altura - 3, 2, 3 - balanco, CORES.zumbiEscuro)
    }

    if (performance.now() > jogador.invulneravelAte || Math.floor(performance.now() / 70) % 2 === 0) {
      var passo = jogador.passo % 2 < 1 ? 0 : 1
      retangulo(jogador.x, jogador.y, jogador.largura, jogador.altura - 2, CORES.jogador)
      retangulo(jogador.x, jogador.y, jogador.largura, 2, CORES.jogadorEscuro)
      retangulo(jogador.x + (jogador.olhando > 0 ? 5 : 1), jogador.y + 3, 2, 2, CORES.sombra)
      retangulo(jogador.x + 1, jogador.y + jogador.altura - 2, 2, 2 + passo, CORES.jogadorEscuro)
      retangulo(jogador.x + 5, jogador.y + jogador.altura - 2, 2, 3 - passo, CORES.jogadorEscuro)
    }

    if (jogador.pulouDuplo) {
      retangulo(jogador.x - 2, jogador.y - 3, jogador.largura + 4, 1, CORES.combo)
    }

    for (var p = 0; p < particles.length; p++) {
      var q = particles[p]
      retangulo(q.x, q.y, 2, 2, q.vida > 14 ? CORES.combo : CORES.jogadorEscuro)
    }
    ctx.restore()

    ctx.font = '7px ui-monospace, monospace'
    ctx.textAlign = 'center'
    for (var c = 0; c < combs.length; c++) {
      var t = combs[c]
      ctx.globalAlpha = Math.min(1, t.vida / 25)
      ctx.fillStyle = t.texto === 'GAME OVER' ? CORES.coracao : CORES.combo
      ctx.fillText(t.texto, t.x + 4, t.y)
    }
    ctx.globalAlpha = 1
  }

  function simuladorAtivo() {
    return document.activeElement === canvas
  }

  window.addEventListener('keydown', function (evento) {
    if (!simuladorAtivo()) return
    if (evento.code === 'KeyR') {
      reiniciar()
      esconderAviso()
      return
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].indexOf(evento.code) === -1) return
    teclas[evento.code] = true
    esconderAviso()
    if (evento.code === 'Space' || evento.code === 'ArrowUp') evento.preventDefault()
  })

  window.addEventListener('keyup', function (evento) {
    teclas[evento.code] = false
  })

  window.addEventListener('blur', function () {
    teclas = Object.create(null)
  })

  canvas.addEventListener('blur', function () {
    teclas = Object.create(null)
  })

  canvas.addEventListener('pointerdown', function () {
    canvas.focus()
    esconderAviso()
  })

  reiniciar()
  window.requestAnimationFrame(passo)
})()
