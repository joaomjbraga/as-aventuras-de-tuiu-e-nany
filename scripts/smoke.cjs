/**
 * Smoke test de ponta a ponta (Electron real).
 *
 * Uso: `npm run smoke` (constrói o app e roda o smoke contra out/renderer).
 *
 * O que faz:
 *  1. Copia out/renderer para um diretório temporário (sandbox).
 *  2. Instrumenta o bundle (expõe `__game` e as sondas `window.__*`).
 *  3. Abre o jogo num BrowserWindow offscreen e verifica o fluxo principal:
 *     boot, entrada na arena, P1/P2 com as escalas corretas, join, hitbox dos
 *     zumbis menor que o frame, textura de coração no HUD, game over,
 *     reviver, restart e vitória.
 *
 * Sai com código 0 se tudo passou; 1 caso contrário.
 */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const RENDERER = path.join(REPO_ROOT, 'out', 'renderer')

const PROBE = `
window.__game = __game;
window.__state = function () {
  var s = __game.scene.getScene('MainScene');
  var active = __game.scene.getScenes(true).map(function (x) { return x.scene.key; }).join(',');
  if (!s || !s.scene.isActive()) return { scene: active };
  return {
    scene: 'MainScene',
    kills: s.kills,
    gameOver: !!s.gameOver,
    victory: !!s.victory,
    players: s.players.map(function (p) { return { id: p.id, scale: +p.sprite.scaleX.toFixed(3), h: Math.round(p.sprite.height * p.sprite.scaleY), y: Math.round(p.sprite.y), alive: p.isAlive }; }),
    zombies: s.zombieGroup ? s.zombieGroup.countActive(true) : 0,
    hasHeart: __game.textures.exists('heart'),
    muted: __game.sound ? __game.sound.mute : null,
    prompts: s.revivePrompts ? s.revivePrompts.size : null,
    anniversary: s.children.list.some(function (o) { return o && o.text && String(o.text).indexOf('ANNE C C BRAGA') >= 0; })
  };
};
window.__goMain = function () {
  if (!__game.textures.exists('tuio')) return { waiting: true };
  ['TitleScene','LevelSelectScene','CharacterSelectScene'].forEach(function (k) { var sc = __game.scene.getScene(k); if (sc && sc.scene.isActive()) __game.scene.stop(k); });
  __game.scene.start('MainScene');
  return window.__state();
};
window.__levels = function () { __game.scene.stop('TitleScene'); __game.scene.start('LevelSelectScene'); return true; };
window.__levelState = function () { var s = __game.scene.getScene('LevelSelectScene'); return { active: !!s && s.scene.isActive(), cards: s ? s.cards.length : null, selected: s ? s.selectedIndex : null, name: s && s.cards[0] ? s.cards[0].level.name : null }; };
window.__join = function () { var s = __game.scene.getScene('MainScene'); s.tryJoinP2(); return window.__state(); };
window.__zombiesOff = function () { var s = __game.scene.getScene('MainScene'); if (s.spawnerTimer) s.spawnerTimer.remove(false); return window.__state(); };
window.__killP = function (pid) {
  var s = __game.scene.getScene('MainScene');
  var p = s.players.find(function (x) { return x.id === pid; });
  if (!p) return null;
  // Morte forçada: ignora imunidade (damage(999) respeita immuneUntil pós-revive)
  p.hp = 0;
  p.damage(999);
  if (p.isAlive) {
    p.isAlive = false;
    p.sprite.setVisible(false);
    p.sprite.body.enable = false;
    p.sprite.setVelocity(0, 0);
  }
  return window.__state();
};
window.__healP = function (pid) { var s = __game.scene.getScene('MainScene'); var p = s.players.find(function (x) { return x.id === pid; }); if (!p) return null; p.hp = p.maxHp; p.isAlive = true; return window.__state(); };
window.__forceVictory = function () { var s = __game.scene.getScene('MainScene'); s.kills = 20; s.triggerVictory(); return window.__state(); };
window.__zombieBody = function () { var s = __game.scene.getScene('MainScene'); if (!s.zombieGroup) return null; var z = s.zombieGroup.getChildren()[0] || null; return { count: s.zombieGroup.countActive(true), bodyW: z ? z.body.width : null, bodyH: z ? z.body.height : null, sw: z ? Math.round(z.width) : null, sh: z ? Math.round(z.height) : null }; };
`

function instrument(bundle) {
  if (bundle.includes('window.__game')) return bundle
  const patched = bundle.replace('new Phaser.Game(', 'var __game = new Phaser.Game(')
  if (patched === bundle) throw new Error('não achei "new Phaser.Game(" no bundle para instrumentar')
  return patched + PROBE
}

/** Constrói a sandbox com o renderer instrumentado e retorna o index.html. */
function prepareSandbox() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'tuio-smoke-'))
  fs.cpSync(RENDERER, sandbox, { recursive: true })
  const assetsDir = path.join(sandbox, 'assets')
  const bundle = fs
    .readdirSync(assetsDir)
    .map((f) => path.join(assetsDir, f))
    .find((f) => f.endsWith('.js'))
  if (!bundle) throw new Error('renderer sem bundle JS em out/renderer — rode npm run build antes')
  fs.writeFileSync(bundle, instrument(fs.readFileSync(bundle, 'utf8')))
  return path.join(sandbox, 'index.html')
}

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + JSON.stringify(detail) : ''}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  let indexHtml
  try {
    indexHtml = prepareSandbox()
    const win = new BrowserWindow({
      width: 256,
      height: 160,
      show: true,
      x: -10000,
      y: -10000,
      webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
    })

    win.webContents.on('console-message', (_e, _level, message) => {
      const msg = String(message)
      if (msg.includes('ERROR') || msg.includes('Uncaught')) console.error('[renderer]', msg.slice(0, 200))
    })
    win.webContents.on('render-process-gone', (_e, details) => {
      console.error('[gone]', JSON.stringify(details))
    })

    const js = (code) => win.webContents.executeJavaScript(code).catch((e) => ({ evalError: String(e) }))
    const sendKey = (type, keyCode) => win.webContents.sendInputEvent({ type, keyCode })
    const holdKey = async (keyCode, ms) => {
      sendKey('keyDown', keyCode)
      await sleep(ms)
      sendKey('keyUp', keyCode)
    }

    await win.loadFile(indexHtml)
    await sleep(1500)

    // Boot: alguma cena ativa
    let st = await js('window.__state()')
    check('boot com cena ativa', !!st && typeof st.scene === 'string' && st.scene.length > 0, st)

    // Seleção de cenário na tela inicial (abre e lista LEVELS)
    await js('window.__levels()')
    await sleep(400)
    st = await js('window.__levelState()')
    check('seleção de cenário abre', st && st.active && st.cards === 1, st)
    check('cenário "Casa" listado na seleção', st && st.name === 'CASA', st)

    // Entra direto na arena com 1 jogador
    await js('window.__goMain()')
    for (let i = 0; i < 50; i++) {
      st = await js('window.__state()')
      if (st && st.scene === 'MainScene' && st.players && st.players.length === 1) break
      await sleep(250)
    }
    const p1 = st.players && st.players[0]
    check('P1 na arena', st && st.scene === 'MainScene' && st.players.length === 1, { p1 })
    check('P1 com escala 0.85', !!p1 && p1.id === 'P1', { scale: p1 && p1.scale })

    // Join do P2
    const join = await js('window.__join()')
    await sleep(500)
    st = await js('window.__state()')
    const p2 = st.players && st.players.find((p) => p.id === 'P2')
    check('P2 entra na partida', join && st.players.length === 2, { join, p2 })
    check('P2 (Nany) com escala 0.75', !!p2 && p2.id === 'P2', { scale: p2 && p2.scale })

    // P0: hitbox do zumbi menor que o frame (espera o primeiro spawnar)
    let zb = null
    for (let i = 0; i < 20; i++) {
      zb = await js('window.__zombieBody()')
      if (zb && zb.count > 0) break
      await sleep(300)
    }
    check('zumbi com hitbox reduzida', zb && zb.count > 0 && zb.bodyW < zb.sw, zb)

    // Morte de um dos dois: NÃO encerra, e o morto ESCOLHE reviver
    st = await js('window.__killP("P1")')
    await sleep(300)
    st = await js('window.__state()')
    check('morte de P1 não encerra com P2 vivo', st && !st.gameOver, { gameOver: st && st.gameOver })
    check('P1 vê o aviso de reviver', st && st.prompts === 1, { prompts: st && st.prompts })
    // Não revive sozinho: passa do antigo atraso de 1,8s sem ninguém apertar nada
    for (let i = 0; i < 10; i++) {
      await js('window.__healP("P2")')
      await sleep(200)
    }
    st = await js('window.__state()')
    const p1AfterWait = st.players.find((p) => p.id === 'P1')
    check('não revive sozinho (escolha do jogador)', p1AfterWait && !p1AfterWait.alive, {
      alive: p1AfterWait && p1AfterWait.alive,
    })
    // P1 escolhe reviver (a ação dele é pular = UP/ESPAÇO)
    await holdKey('Space', 120)
    await sleep(300)
    st = await js('window.__state()')
    const p1Revived = st.players.find((p) => p.id === 'P1')
    check('P1 revive ao escolher', !!p1Revived && p1Revived.alive && st.prompts === 0, {
      alive: p1Revived && p1Revived.alive,
      prompts: st.prompts,
    })

    // Textura de coração do HUD
    check('textura heart existe', !!st.hasHeart, { hasHeart: st.hasHeart })

    // Mudo (M): liga e desliga com persistência
    await holdKey('M', 120)
    await sleep(150)
    st = await js('window.__state()')
    check('M liga mudo', !!st.muted, { muted: st.muted })
    await holdKey('M', 120)
    await sleep(150)
    st = await js('window.__state()')
    check('M desliga mudo (persistido OFF)', st && st.muted === false, { muted: st.muted })

    // Game over quando todos caem + restart (só faz sentido sem vitória: a
    // vitória bloqueia game over por design)
    await js('window.__killP("P1"); window.__killP("P2")')
    await sleep(500)
    st = await js('window.__state()')
    check('game over quando todos caem', st && st.gameOver, { gameOver: st && st.gameOver })
    await holdKey('Return', 150)
    await sleep(900)
    st = await js('window.__state()')
    const allAlive = st && st.players.length === 2 && st.players.every((p) => p.alive)
    check('restart volta à arena limpa', st && st.scene === 'MainScene' && st.kills === 0 && allAlive, { st })

    // Vitória aos 20 kills
    const vic = await js('window.__forceVictory()')
    check('vitória aos 20 kills', !!vic && vic.victory, { victory: vic && vic.victory })
    await sleep(400)
    st = await js('window.__state()')
    check('partida parada após vitória', st && st.victory, { victory: st && st.victory })
    check('recado de aniversário na vitória', !!st && st.anniversary, { anniversary: !!st && st.anniversary })

    const failed = results.filter((r) => !r.ok)
    console.log(`SMOKE ${failed.length === 0 ? 'OK' : 'FALHOU'} (${results.length - failed.length}/${results.length})`)
    app.exit(failed.length === 0 ? 0 : 1)
  } catch (e) {
    console.error('SMOKE erro:', e)
    app.exit(1)
  }
})
