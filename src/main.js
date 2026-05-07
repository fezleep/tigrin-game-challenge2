import * as PIXI from 'pixi.js'
import { Spine } from 'pixi-spine'

const app = new PIXI.Application({
  resizeTo: window,
  backgroundColor: 0x1a120d,
  antialias: true,
})

document.getElementById('app').appendChild(app.view)

const COLS = 5
const ROWS = 4
const SYMBOL_SIZE = 130
const GAP = 10

const BOARD_W = COLS * SYMBOL_SIZE + (COLS - 1) * GAP
const BOARD_H = ROWS * SYMBOL_SIZE + (ROWS - 1) * GAP

const SYMBOLS = [
  { name: 'Bank', path: '/bank/Bank/Bank.json', anim: 'Bank', scale: 0.105 },
  { name: 'Safe', path: '/bank/Safe/Safe.json', anim: 'animation', scale: 0.145 },
  { name: 'Handcuffs', path: '/bank/Handcuffs/Handcuffs.json', anim: 'animation', scale: 0.145 },
  { name: 'Dynamit', path: '/bank/Dynamit/Dynamite.json', anim: 'animation', scale: 0.145 },
]

let assets = {}
let tiles = []
let balance = 4000
let bet = 100
let win = 0
let spinning = false
let fox = null

const root = new PIXI.Container()
const bgLayer = new PIXI.Container()
const gameLayer = new PIXI.Container()
const fxLayer = new PIXI.Container()
const uiLayer = new PIXI.Container()

app.stage.addChild(root)
root.addChild(bgLayer, gameLayer, fxLayer, uiLayer)

const bg = new PIXI.Graphics()
bgLayer.addChild(bg)

const glow = new PIXI.Graphics()
bgLayer.addChild(glow)

const board = new PIXI.Container()
gameLayer.addChild(board)

const boardBg = new PIXI.Graphics()
board.addChild(boardBg)

const slotsLayer = new PIXI.Container()
board.addChild(slotsLayer)

const title = makeText('BANK ROBBERY', 58, 0xffc247)
title.anchor.set(0.5)
uiLayer.addChild(title)

const subtitle = makeText('SLOT', 34, 0xd71920)
subtitle.anchor.set(0.5)
uiLayer.addChild(subtitle)

const hud = new PIXI.Container()
uiLayer.addChild(hud)

const hudBg = new PIXI.Graphics()
hud.addChild(hudBg)

const balanceLabel = makeText('BALANCE', 15, 0xffc247)
balanceLabel.position.set(25, 10)

const balanceText = makeText('$4000', 28, 0x00ff66)
balanceText.position.set(25, 35)

const winLabel = makeText('WIN', 15, 0xffc247)
winLabel.position.set(220, 10)

const winText = makeText('$0', 28, 0xd71920)
winText.position.set(220, 35)

const betLabel = makeText('BET', 15, 0xffc247)
betLabel.position.set(370, 10)

const betText = makeText('$100', 28, 0xffffff)
betText.position.set(370, 35)

hud.addChild(balanceLabel, balanceText, winLabel, winText, betLabel, betText)

const spinButton = new PIXI.Container()
spinButton.eventMode = 'static'
spinButton.cursor = 'pointer'
uiLayer.addChild(spinButton)

const spinBg = new PIXI.Graphics()
spinButton.addChild(spinBg)

const spinText = makeText('SPIN', 28, 0xffffff)
spinText.anchor.set(0.5)
spinButton.addChild(spinText)

const popup = new PIXI.Container()
popup.visible = false
popup.eventMode = 'static'
uiLayer.addChild(popup)

const popupOverlay = new PIXI.Graphics()
const popupBox = new PIXI.Graphics()

const popupTitle = makeText('BIG WIN', 66, 0xffc247)
popupTitle.anchor.set(0.5)
popupTitle.y = -65

const popupValue = makeText('$0', 56, 0x00ff66)
popupValue.anchor.set(0.5)
popupValue.y = 20

const popupHint = new PIXI.Text('click to continue', {
  fontFamily: 'Arial',
  fontSize: 16,
  fill: 0xffffff,
})
popupHint.anchor.set(0.5)
popupHint.y = 105

popup.addChild(popupOverlay, popupBox, popupTitle, popupValue, popupHint)

popup.on('pointertap', () => {
  popup.visible = false
})

function makeText(text, size, color) {
  return new PIXI.Text(text, {
    fontFamily: 'Arial Black',
    fontSize: size,
    fill: color,
    stroke: 0x000000,
    strokeThickness: 5,
  })
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

async function loadAssets() {
  for (const symbol of SYMBOLS) {
    assets[symbol.name] = await PIXI.Assets.load(symbol.path)
  }

  assets.Fox = await PIXI.Assets.load('/bank/Fox/Fox.json')
}

function getSpineData(resource) {
  return resource.spineData || resource
}

function createSpineSymbol(symbolConfig) {
  const spine = new Spine(getSpineData(assets[symbolConfig.name]))

  spine.state.setAnimation(0, symbolConfig.anim, true)
  spine.scale.set(symbolConfig.scale)
  spine.baseScale = symbolConfig.scale
  spine.symbolName = symbolConfig.name

  return spine
}

function drawBackground() {
  const w = window.innerWidth
  const h = window.innerHeight

  bg.clear()
  bg.beginFill(0x1a120d)
  bg.drawRect(0, 0, w, h)
  bg.endFill()

  bg.beginFill(0x291306, 0.8)
  bg.drawRect(0, h * 0.72, w, h * 0.28)
  bg.endFill()

  glow.clear()
  glow.beginFill(0xd71920, 0.1)
  glow.drawCircle(w / 2, h / 2 + 60, Math.min(w, h) * 0.42)
  glow.endFill()

  glow.beginFill(0xffc247, 0.06)
  glow.drawCircle(w * 0.18, h * 0.35, Math.min(w, h) * 0.3)
  glow.endFill()
}

function drawBoard() {
  boardBg.clear()

  boardBg.beginFill(0x070707)
  boardBg.drawRoundedRect(-28, -28, BOARD_W + 56, BOARD_H + 56, 28)
  boardBg.endFill()

  boardBg.beginFill(0x24150d)
  boardBg.drawRoundedRect(-18, -18, BOARD_W + 36, BOARD_H + 36, 24)
  boardBg.endFill()

  boardBg.lineStyle(7, 0xd71920)
  boardBg.drawRoundedRect(-18, -18, BOARD_W + 36, BOARD_H + 36, 24)

  boardBg.beginFill(0x000000, 0.28)
  boardBg.drawRoundedRect(4, 4, BOARD_W - 8, BOARD_H - 8, 18)
  boardBg.endFill()

  slotsLayer.removeChildren()

  for (let c = 1; c < COLS; c++) {
    const divider = new PIXI.Graphics()
    divider.beginFill(0xd71920, 0.25)
    divider.drawRoundedRect(c * (SYMBOL_SIZE + GAP) - GAP / 2 - 2, 0, 4, BOARD_H, 4)
    divider.endFill()
    slotsLayer.addChild(divider)
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * (SYMBOL_SIZE + GAP)
      const y = row * (SYMBOL_SIZE + GAP)

      const cell = new PIXI.Graphics()

      cell.beginFill(0x19171f)
      cell.drawRoundedRect(x, y, SYMBOL_SIZE, SYMBOL_SIZE, 14)
      cell.endFill()

      cell.lineStyle(2, 0xff2d2d, 0.65)
      cell.drawRoundedRect(x, y, SYMBOL_SIZE, SYMBOL_SIZE, 14)

      cell.beginFill(0xffffff, 0.05)
      cell.drawRoundedRect(x + 8, y + 8, SYMBOL_SIZE - 16, 25, 10)
      cell.endFill()

      slotsLayer.addChild(cell)
    }
  }
}

function clearSymbols() {
  for (const tile of tiles) {
    if (tile.parent) tile.parent.removeChild(tile)
    tile.destroy()
  }

  tiles = []
}

function buildGrid() {
  clearSymbols()

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const config = randomSymbol()
      const symbol = createSpineSymbol(config)

      symbol.x = col * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2
      symbol.y = row * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2 + 28

      slotsLayer.addChild(symbol)
      tiles.push(symbol)
    }
  }
}

function createFox() {
  fox = new Spine(getSpineData(assets.Fox))
  fox.state.setAnimation(0, 'Idle', true)
  fox.scale.set(0.115)
  gameLayer.addChild(fox)
}

function drawHud() {
  hudBg.clear()

  hudBg.beginFill(0x120b07, 0.95)
  hudBg.drawRoundedRect(0, 0, 560, 84, 18)
  hudBg.endFill()

  hudBg.lineStyle(4, 0xd71920)
  hudBg.drawRoundedRect(0, 0, 560, 84, 18)

  hudBg.beginFill(0xffffff, 0.05)
  hudBg.drawRoundedRect(8, 8, 544, 18, 10)
  hudBg.endFill()
}

function drawSpinButton(enabled = true) {
  spinBg.clear()

  spinBg.beginFill(enabled ? 0xd71920 : 0x444444)
  spinBg.drawCircle(0, 0, 60)
  spinBg.endFill()

  spinBg.lineStyle(6, enabled ? 0xffffff : 0x999999)
  spinBg.drawCircle(0, 0, 60)

  spinBg.lineStyle(3, 0xffc247, 0.85)
  spinBg.drawCircle(0, 0, 48)
}

function updateHud() {
  balanceText.text = `$${balance}`
  betText.text = `$${bet}`
  winText.text = `$${win}`
  winText.style.fill = win > 0 ? 0x00ff66 : 0xd71920
}

function drawPopup() {
  popupOverlay.clear()
  popupOverlay.beginFill(0x000000, 0.82)
  popupOverlay.drawRect(-3000, -3000, 6000, 6000)
  popupOverlay.endFill()

  popupBox.clear()
  popupBox.beginFill(0x160d08)
  popupBox.drawRoundedRect(-280, -160, 560, 320, 30)
  popupBox.endFill()

  popupBox.lineStyle(8, 0xd71920)
  popupBox.drawRoundedRect(-280, -160, 560, 320, 30)

  popupBox.lineStyle(3, 0xffc247, 0.8)
  popupBox.drawRoundedRect(-260, -140, 520, 280, 24)
}

function showPopup(title, value, isWin) {
  popupTitle.text = title
  popupValue.text = isWin ? `$${value}` : 'TRY AGAIN'

  popupTitle.style.fill = isWin ? 0xffc247 : 0xffffff
  popupValue.style.fill = isWin ? 0x00ff66 : 0xd71920

  popup.visible = true
  popup.alpha = 0
  popup.scale.set(0.72)

  let frame = 0

  const animate = () => {
    if (!popup.visible) return

    frame++
    popup.alpha = Math.min(1, popup.alpha + 0.08)

    const scale = Math.min(1, popup.scale.x + 0.03)
    popup.scale.set(scale + Math.sin(frame * 0.18) * 0.012)

    if (popup.alpha < 1) requestAnimationFrame(animate)
  }

  animate()
}

function createExplosion(x, y) {
  const particles = []

  for (let i = 0; i < 30; i++) {
    const p = new PIXI.Graphics()

    const color =
      Math.random() > 0.5 ? 0xffc247 : Math.random() > 0.5 ? 0xff6a00 : 0xd71920

    p.beginFill(color)
    p.drawCircle(0, 0, Math.random() * 4 + 2)
    p.endFill()

    p.x = x
    p.y = y
    p.vx = (Math.random() - 0.5) * 13
    p.vy = (Math.random() - 0.5) * 13
    p.life = 30

    fxLayer.addChild(p)
    particles.push(p)
  }

  const flash = new PIXI.Graphics()
  flash.beginFill(0xffc247, 0.35)
  flash.drawCircle(x, y, 24)
  flash.endFill()
  fxLayer.addChild(flash)

  let flashLife = 12

  const tick = () => {
    flashLife--
    flash.alpha = Math.max(0, flashLife / 12)
    flash.scale.set(1 + (12 - flashLife) * 0.08)

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.14
      p.alpha = p.life / 30
      p.life--
    }

    if (particles.some((p) => p.life > 0)) {
      requestAnimationFrame(tick)
    } else {
      for (const p of particles) {
        fxLayer.removeChild(p)
        p.destroy()
      }

      fxLayer.removeChild(flash)
      flash.destroy()
    }
  }

  tick()
}

function explodeTiles(count = 5) {
  return new Promise((resolve) => {
    const selected = [...tiles].sort(() => Math.random() - 0.5).slice(0, count)
    let done = 0

    selected.forEach((tile, index) => {
      setTimeout(() => {
        const pos = tile.getGlobalPosition()
        createExplosion(pos.x, pos.y)

        let frame = 0
        const baseScale = tile.baseScale || 0.12

        const animate = () => {
          frame++

          tile.alpha = Math.max(0, 1 - frame / 24)
          tile.scale.set(baseScale * (1 + frame * 0.025))

          if (frame < 24) {
            requestAnimationFrame(animate)
          } else {
            tile.alpha = 1
            tile.scale.set(baseScale)

            done++
            if (done === selected.length) resolve()
          }
        }

        animate()
      }, index * 85)
    })
  })
}

async function spin() {
  if (spinning) return

  if (balance < bet) {
    showPopup('NO BALANCE', 0, false)
    return
  }

  spinning = true
  spinButton.eventMode = 'none'
  spinButton.cursor = 'default'
  drawSpinButton(false)

  balance -= bet
  win = 0
  updateHud()

  tiles.forEach((tile, index) => {
    setTimeout(() => {
      tile.alpha = 0.2
      tile.scale.set((tile.baseScale || 0.12) * 0.75)
    }, index * 12)
  })

  await wait(420)

  buildGrid()

  tiles.forEach((tile, index) => {
    tile.alpha = 0
    tile.scale.set((tile.baseScale || 0.12) * 0.65)

    setTimeout(() => {
      let frame = 0

      const animate = () => {
        frame++
        tile.alpha = Math.min(1, frame / 12)
        tile.scale.set((tile.baseScale || 0.12) * Math.min(1, 0.65 + frame * 0.04))

        if (frame < 12) requestAnimationFrame(animate)
      }

      animate()
    }, index * 18)
  })

  await wait(880)

  const hasWin = Math.random() > 0.45

  if (hasWin) {
    win = bet * (Math.floor(Math.random() * 18) + 5)
    balance += win
    updateHud()

    await explodeTiles(6)

    if (fox) fox.state.setAnimation(0, 'Win', false)
    showPopup('BIG WIN', win, true)
  } else {
    await explodeTiles(3)
    showPopup('NO WIN', 0, false)
  }

  if (fox) fox.state.setAnimation(0, 'Idle', true)

  spinning = false
  spinButton.eventMode = 'static'
  spinButton.cursor = 'pointer'
  drawSpinButton(true)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

spinButton.on('pointertap', spin)

function layout() {
  const w = window.innerWidth
  const h = window.innerHeight

  app.renderer.resize(w, h)

  drawBackground()

  const centerX = w / 2

  board.x = centerX - BOARD_W / 2
  board.y = Math.max(105, h / 2 - BOARD_H / 2 - 55)

  title.x = centerX
  title.y = Math.max(58, board.y - 90)

  subtitle.x = centerX
  subtitle.y = title.y + 48

  hud.x = centerX - 280
  hud.y = board.y + BOARD_H + 38

  spinButton.x = centerX + 420
  spinButton.y = board.y + BOARD_H + 80

  popup.x = w / 2
  popup.y = h / 2

  if (fox) {
    fox.x = board.x + BOARD_W + 170
    fox.y = board.y + BOARD_H / 2 + 125
    fox.visible = w > 1250
  }
}

async function init() {
  drawBackground()
  drawBoard()
  drawHud()
  drawPopup()
  drawSpinButton(true)
  updateHud()

  await loadAssets()

  buildGrid()
  createFox()

  layout()

  window.addEventListener('resize', layout)

  app.ticker.add(() => {
    const time = Date.now()

    if (!spinning) {
      const scale = 1 + Math.sin(time * 0.004) * 0.025
      spinButton.scale.set(scale)
    } else {
      spinButton.scale.set(0.95)
    }

    spinButton.rotation = Math.sin(time * 0.003) * 0.025
  })
}

init()