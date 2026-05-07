import * as PIXI from 'pixi.js'
import { Spine } from 'pixi-spine'

const app = new PIXI.Application({
  resizeTo: window,
  backgroundColor: 0x1a120d,
  antialias: true,
})

document.getElementById('app').appendChild(app.view)

const SYMBOL_SIZE = 110
const COLS = 5
const ROWS = 4
const GAP = 10

const SYMBOLS = [
  {
    name: 'Bank',
    path: '/bank/Bank/Bank.json',
    anim: 'Bank',
  },
  {
    name: 'Safe',
    path: '/bank/Safe/Safe.json',
    anim: 'animation',
  },
  {
    name: 'Handcuffs',
    path: '/bank/Handcuffs/Handcuffs.json',
    anim: 'animation',
  },
  {
    name: 'Dynamit',
    path: '/bank/Dynamit/Dynamite.json',
    anim: 'animation',
  },
]

const game = new PIXI.Container()
app.stage.addChild(game)

const bg = new PIXI.Graphics()
game.addChild(bg)

const board = new PIXI.Container()
game.addChild(board)

const boardBg = new PIXI.Graphics()
board.addChild(boardBg)

const slotsLayer = new PIXI.Container()
board.addChild(slotsLayer)

const ui = new PIXI.Container()
game.addChild(ui)

const tiles = []

function createLabel(text, size, color) {
  return new PIXI.Text(text, {
    fontFamily: 'Arial Black',
    fontSize: size,
    fill: color,
    stroke: 0x000000,
    strokeThickness: 5,
  })
}let loadedAssets = {}
let balance = 4000
let bet = 100
let win = 0
let spinning = false

const title = createLabel('BANK ROBBERY', 56, 0xffc247)
title.anchor.set(0.5)
ui.addChild(title)

const subtitle = createLabel('SLOT', 34, 0xd71920)
subtitle.anchor.set(0.5)
ui.addChild(subtitle)

const hud = new PIXI.Container()
ui.addChild(hud)

const hudBg = new PIXI.Graphics()
hud.addChild(hudBg)

const balanceLabel = createLabel('BALANCE', 15, 0xffc247)
balanceLabel.x = 25
balanceLabel.y = 10

const balanceText = createLabel('$4000', 28, 0x00ff66)
balanceText.x = 25
balanceText.y = 35

const winLabel = createLabel('WIN', 15, 0xffc247)
winLabel.x = 220
winLabel.y = 10

const winText = createLabel('$0', 28, 0xd71920)
winText.x = 220
winText.y = 35

const betLabel = createLabel('BET', 15, 0xffc247)
betLabel.x = 370
betLabel.y = 10

const betText = createLabel('$100', 28, 0xffffff)
betText.x = 370
betText.y = 35

hud.addChild(
  balanceLabel,
  balanceText,
  winLabel,
  winText,
  betLabel,
  betText
)

const spinButton = new PIXI.Container()
spinButton.eventMode = 'static'
spinButton.cursor = 'pointer'
ui.addChild(spinButton)

const spinBg = new PIXI.Graphics()
spinButton.addChild(spinBg)

const spinText = createLabel('SPIN', 28, 0xffffff)
spinText.anchor.set(0.5)
spinButton.addChild(spinText)

function updateHud() {
  balanceText.text = `$${balance}`
  winText.text = `$${win}`
  betText.text = `$${bet}`

  winText.style.fill = win > 0 ? 0x00ff66 : 0xd71920
}function drawBackground() {
  bg.clear()

  bg.beginFill(0x1a120d)
  bg.drawRect(0, 0, window.innerWidth, window.innerHeight)
  bg.endFill()

  bg.beginFill(0x3b1d12, 0.22)

  bg.drawCircle(
    window.innerWidth / 2,
    window.innerHeight / 2,
    420
  )

  bg.endFill()
}

function drawBoard() {
  const width =
    COLS * SYMBOL_SIZE +
    (COLS - 1) * GAP

  const height =
    ROWS * SYMBOL_SIZE +
    (ROWS - 1) * GAP

  boardBg.clear()

  boardBg.beginFill(0x1b1618)

  boardBg.drawRoundedRect(
    -20,
    -20,
    width + 40,
    height + 40,
    24
  )

  boardBg.endFill()

  boardBg.lineStyle(6, 0xd71920)

  boardBg.drawRoundedRect(
    -20,
    -20,
    width + 40,
    height + 40,
    24
  )

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x =
        col * (SYMBOL_SIZE + GAP)

      const y =
        row * (SYMBOL_SIZE + GAP)

      const cell = new PIXI.Graphics()

      cell.beginFill(0x24222b)

      cell.drawRoundedRect(
        x,
        y,
        SYMBOL_SIZE,
        SYMBOL_SIZE,
        14
      )

      cell.endFill()

      cell.lineStyle(2, 0x5b2323)

      cell.drawRoundedRect(
        x,
        y,
        SYMBOL_SIZE,
        SYMBOL_SIZE,
        14
      )

      slotsLayer.addChild(cell)
    }
  }
}

async function loadAssets() {
  for (const symbol of SYMBOLS) {
    loadedAssets[symbol.name] =
      await PIXI.Assets.load(symbol.path)
  }
}function createSpineSymbol(data) {
  const spine = new Spine(
    data.asset.spineData || data.asset
  )

  spine.state.setAnimation(
    0,
    data.anim,
    true
  )

  spine.scale.set(data.scale)

  return spine
}

function buildGrid() {
  tiles.length = 0

  const items = slotsLayer.children.filter(
    (c) => c instanceof Spine
  )

  items.forEach((i) => {
    slotsLayer.removeChild(i)
    i.destroy()
  })

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {

      const random =
        SYMBOLS[
          Math.floor(
            Math.random() * SYMBOLS.length
          )
        ]

      const asset =
        loadedAssets[random.name]

      const symbol = createSpineSymbol({
        asset,
        anim: random.anim,
        scale:
          random.name === 'Bank'
            ? 0.085
            : 0.12,
      })

      symbol.x =
        col * (SYMBOL_SIZE + GAP) +
        SYMBOL_SIZE / 2

      symbol.y =
        row * (SYMBOL_SIZE + GAP) +
        SYMBOL_SIZE / 2 + 28

      slotsLayer.addChild(symbol)

      tiles.push(symbol)
    }
  }
}

function drawSpinButton(enabled = true) {
  spinBg.clear()

  spinBg.beginFill(
    enabled ? 0xd71920 : 0x444444
  )

  spinBg.drawCircle(0, 0, 58)

  spinBg.endFill()

  spinBg.lineStyle(
    5,
    enabled ? 0xffffff : 0x999999
  )

  spinBg.drawCircle(0, 0, 58)
}const popup = new PIXI.Container()
popup.visible = false
popup.eventMode = 'static'
ui.addChild(popup)

const popupOverlay = new PIXI.Graphics()
popup.addChild(popupOverlay)

const popupBox = new PIXI.Graphics()
popup.addChild(popupBox)

const popupTitle = createLabel('BIG WIN', 62, 0xffc247)
popupTitle.anchor.set(0.5)
popupTitle.y = -60
popup.addChild(popupTitle)

const popupValue = createLabel('$0', 54, 0x00ff66)
popupValue.anchor.set(0.5)
popupValue.y = 20
popup.addChild(popupValue)

const popupHint = new PIXI.Text('click to continue', {
  fontFamily: 'Arial',
  fontSize: 16,
  fill: 0xffffff,
})
popupHint.anchor.set(0.5)
popupHint.y = 100
popup.addChild(popupHint)

popup.on('pointertap', () => {
  popup.visible = false
})

function drawPopup() {
  popupOverlay.clear()
  popupOverlay.beginFill(0x000000, 0.82)
  popupOverlay.drawRect(-2000, -2000, 4000, 4000)
  popupOverlay.endFill()

  popupBox.clear()
  popupBox.beginFill(0x160d08)
  popupBox.drawRoundedRect(-260, -155, 520, 310, 28)
  popupBox.endFill()

  popupBox.lineStyle(7, 0xd71920)
  popupBox.drawRoundedRect(-260, -155, 520, 310, 28)
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

    if (popup.alpha < 1) {
      requestAnimationFrame(animate)
    }
  }

  animate()
}

drawPopup()
function createExplosion(x, y) {
  const particles = []

  for (let i = 0; i < 26; i++) {
    const p = new PIXI.Graphics()

    const color =
      Math.random() > 0.5
        ? 0xffc247
        : Math.random() > 0.5
          ? 0xff6a00
          : 0xd71920

    p.beginFill(color)
    p.drawCircle(0, 0, Math.random() * 4 + 2)
    p.endFill()

    p.x = x
    p.y = y
    p.vx = (Math.random() - 0.5) * 12
    p.vy = (Math.random() - 0.5) * 12
    p.life = 28

    ui.addChild(p)
    particles.push(p)
  }

  const tick = () => {
    particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.14
      p.alpha = p.life / 28
      p.life--
    })

    if (particles.some((p) => p.life > 0)) {
      requestAnimationFrame(tick)
    } else {
      particles.forEach((p) => {
        ui.removeChild(p)
        p.destroy()
      })
    }
  }

  tick()
}

function explodeTiles(count = 5) {
  return new Promise((resolve) => {
    const selected = [...tiles]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)

    let done = 0

    selected.forEach((tile, index) => {
      setTimeout(() => {
        const pos = tile.getGlobalPosition()

        createExplosion(pos.x, pos.y)

        let frame = 0

        const animate = () => {
          frame++

          tile.alpha = Math.max(0, 1 - frame / 24)
          tile.scale.set(tile.scale.x * 1.02)

          if (frame < 24) {
            requestAnimationFrame(animate)
          } else {
            tile.alpha = 1
            tile.scale.set(0.12)

            done++

            if (done === selected.length) {
              resolve()
            }
          }
        }

        animate()
      }, index * 90)
    })
  })
}async function spin() {
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
      tile.alpha = 0.25
      tile.scale.set(tile.scale.x * 0.85)
    }, index * 15)
  })

  await new Promise((resolve) => setTimeout(resolve, 450))

  buildGrid()

  tiles.forEach((tile, index) => {
    tile.alpha = 0
    tile.scale.set(tile.scale.x * 0.7)

    setTimeout(() => {
      let frame = 0

      const animate = () => {
        frame++

        tile.alpha = Math.min(1, frame / 12)
        tile.scale.set(tile.scale.x * 1.045)

        if (frame < 12) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }, index * 18)
  })

  await new Promise((resolve) => setTimeout(resolve, 900))

  const hasWin = Math.random() > 0.45

  if (hasWin) {
    win = bet * (Math.floor(Math.random() * 18) + 5)
    balance += win
    updateHud()

    await explodeTiles(6)

    showPopup('BIG WIN', win, true)
  } else {
    await explodeTiles(3)

    showPopup('NO WIN', 0, false)
  }

  spinning = false
  spinButton.eventMode = 'static'
  spinButton.cursor = 'pointer'
  drawSpinButton(true)
}

spinButton.on('pointertap', spin)
function layout() {
  const w = window.innerWidth
  const h = window.innerHeight

  app.renderer.resize(w, h)

  drawBackground()

  const boardWidth =
    COLS * SYMBOL_SIZE +
    (COLS - 1) * GAP

  const boardHeight =
    ROWS * SYMBOL_SIZE +
    (ROWS - 1) * GAP

  const centerX = w / 2

  board.x = centerX - boardWidth / 2
  board.y = Math.max(115, h / 2 - boardHeight / 2 - 45)

  title.x = centerX
  title.y = Math.max(60, board.y - 85)

  subtitle.x = centerX
  subtitle.y = title.y + 48

  hud.x = centerX - 270
  hud.y = board.y + boardHeight + 38

  spinButton.x = centerX + 395
  spinButton.y = board.y + boardHeight + 80

  popup.x = w / 2
  popup.y = h / 2
}

async function init() {
  drawBackground()
  drawBoard()
  drawSpinButton(true)
  updateHud()

  await loadAssets()

  buildGrid()

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