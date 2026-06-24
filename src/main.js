import * as PIXI from 'pixi.js'
import { Spine } from 'pixi-spine'
import './style.css'

const BOARD_COLS = 5
const BOARD_ROWS = 4
const CELL_SIZE = 104
const CELL_GAP = 8
const BOARD_WIDTH = BOARD_COLS * CELL_SIZE + (BOARD_COLS - 1) * CELL_GAP
const BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE + (BOARD_ROWS - 1) * CELL_GAP
const REEL_STEP = CELL_SIZE + CELL_GAP
const SPIN_BET = 100

const SYMBOLS = [
  {
    key: 'bank',
    label: 'Bank',
    path: '/bank/Bank/Bank.json',
    animation: 'Bank',
    scale: 0.092,
    yOffset: 24,
  },
  {
    key: 'safe',
    label: 'Safe',
    path: '/bank/Safe/Safe.json',
    animation: 'animation',
    scale: 0.118,
    yOffset: 22,
  },
  {
    key: 'handcuffs',
    label: 'Handcuffs',
    path: '/bank/Handcuffs/Handcuffs.json',
    animation: 'animation',
    scale: 0.12,
    yOffset: 18,
  },
  {
    key: 'dynamite',
    label: 'Dynamit',
    path: '/bank/Dynamit/Dynamite.json',
    animation: 'animation',
    scale: 0.086,
    yOffset: 22,
  },
]

const FOX_CONFIG = {
  key: 'fox',
  label: 'Fox',
  path: '/bank/Fox/Fox.json',
  animations: ['Idle', 'Win'],
  scale: 0.115,
}

const SPINE_3_8_75_WARNING =
  'Unsupported skeleton data, 3.8.75 is deprecated, please export with a newer version of Spine.'

const state = {
  app: null,
  assets: {},
  stage: null,
  layers: {},
  board: null,
  symbolsLayer: null,
  tiles: [],
  fox: null,
  hud: {},
  spinButton: {},
  resultPopup: null,
  animations: [],
  isSpinning: false,
  spinButtonScale: 1,
  spinButtonPulse: 0,
  effects: [],
  effectTimers: [],
  values: {
    balance: 4000,
    win: 0,
    bet: SPIN_BET,
  },
}

function setupApplication() {
  // Pixi root and fixed render layers for scene composition.
  const app = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x070509,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  })

  document.querySelector('#app').appendChild(app.view)

  state.app = app
  state.stage = new PIXI.Container()
  state.layers.background = new PIXI.Container()
  state.layers.game = new PIXI.Container()
  state.layers.ui = new PIXI.Container()

  app.stage.addChild(state.stage)
  state.stage.addChild(state.layers.background, state.layers.game, state.layers.ui)
  app.ticker.add(updateAnimations)

  return app
}

async function loadAssets() {
  // Load every Spine file used by the first playable scene.
  const assets = {}
  const configs = [...SYMBOLS, FOX_CONFIG]
  const restoreConsoleError = muteKnownSpineVersionWarning()

  try {
    for (const config of configs) {
      assets[config.key] = await PIXI.Assets.load(config.path)
    }
  } finally {
    restoreConsoleError()
  }

  for (const config of configs) {
    const animationNames = config.animations || [config.animation]
    animationNames.forEach((animationName) => {
      assertAnimation(assets[config.key], config.label, animationName)
    })
  }

  state.assets = assets
  return assets
}

function createBackground() {
  const background = new PIXI.Graphics()
  const vault = new PIXI.Graphics()
  const glow = new PIXI.Graphics()
  const vignette = new PIXI.Graphics()

  state.layers.background.addChild(background, vault, glow, vignette)
  state.background = { background, vault, glow, vignette }
}

function createBoard() {
  // Board artwork is drawn once and positioned responsively by layout().
  const board = new PIXI.Container()
  const shell = new PIXI.Graphics()
  const dividers = new PIXI.Graphics()
  const cells = new PIXI.Container()
  const symbolsLayer = new PIXI.Container()
  const shine = new PIXI.Graphics()

  board.addChild(shell, cells, dividers, symbolsLayer, shine)
  state.layers.game.addChild(board)

  state.board = board
  state.symbolsLayer = symbolsLayer
  state.boardParts = { shell, dividers, cells, shine }

  drawBoard()
}

function createSymbols() {
  // Fill the 5x4 grid with reusable Spine symbol configs.
  clearSymbols()

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const config = randomSymbolConfig()
      const symbol = createTile(row, col, config)

      state.symbolsLayer.addChild(symbol)
      state.tiles.push(symbol)
    }
  }
}

function createFox() {
  const fox = new Spine(getSpineData(state.assets.fox))
  fox.state.setAnimation(0, 'Idle', true)
  fox.scale.set(FOX_CONFIG.scale)
  fox.visible = false

  state.fox = fox
  state.layers.game.addChild(fox)
}

function createHud() {
  // Bottom status strip mirrors the game reference without adding game rules yet.
  const hud = new PIXI.Container()
  const panel = new PIXI.Graphics()
  const labels = {
    balance: createText('BALANCE', 13, 0xffc247, 2),
    win: createText('WIN', 13, 0xffc247, 2),
    bet: createText('BET', 13, 0xffc247, 2),
  }
  const values = {
    balance: createText(formatMoney(state.values.balance), 28, 0x40f078, 4),
    win: createText(formatMoney(state.values.win), 28, 0xff3b35, 4),
    bet: createText(formatMoney(state.values.bet), 28, 0xffffff, 4),
  }

  hud.addChild(panel)
  Object.values(labels).forEach((label) => hud.addChild(label))
  Object.values(values).forEach((value) => hud.addChild(value))
  state.layers.ui.addChild(hud)

  state.hud = { hud, panel, labels, values }
  drawHud()
}

function createSpinButton() {
  const button = new PIXI.Container()
  const body = new PIXI.Graphics()
  const text = createText('SPIN', 24, 0xffffff, 4)

  text.anchor.set(0.5)
  button.eventMode = 'static'
  button.cursor = 'pointer'
  button.on('pointertap', handleSpin)
  button.on('pointerdown', pressSpinButton)
  button.on('pointerup', releaseSpinButton)
  button.on('pointerupoutside', releaseSpinButton)

  button.addChild(body, text)
  state.layers.ui.addChild(button)
  state.spinButton = { button, body, text }

  drawSpinButton()
}

function layout() {
  const { width, height } = state.app.screen
  const scale = Math.min(1, (height - 160) / 560, width / 1120)
  const boardOuterWidth = BOARD_WIDTH + 64
  const boardOuterHeight = BOARD_HEIGHT + 64
  const foxSpace = width - (width / 2 + boardOuterWidth / 2) - 34
  const showFox = scale > 0.82 && foxSpace > 170
  const boardCenterX = showFox ? width / 2 - 92 * scale : width / 2
  const boardTop = Math.max(118, (height - boardOuterHeight * scale) / 2 - 14)
  const boardLeft = boardCenterX - (boardOuterWidth * scale) / 2

  drawBackground()

  state.board.scale.set(scale)
  state.board.position.set(boardLeft + 32 * scale, boardTop + 32 * scale)

  state.title.position.set(boardCenterX, Math.max(44, boardTop - 84 * scale))
  state.title.scale.set(scale)
  state.subtitle.position.set(boardCenterX, state.title.y + 46 * scale)
  state.subtitle.scale.set(scale)

  const hudWidth = 520 * scale
  const hudY = Math.min(height - 80 * scale, boardTop + boardOuterHeight * scale + 24 * scale)
  state.hud.hud.scale.set(scale)
  state.hud.hud.position.set(boardCenterX - hudWidth / 2, hudY)

  state.spinButton.button.scale.set(scale)
  state.spinButtonScale = scale
  applySpinButtonVisualState()
  state.spinButton.button.position.set(
    Math.min(width - 70 * scale, boardCenterX + hudWidth / 2 + 86 * scale),
    hudY + 37 * scale,
  )

  if (state.fox) {
    state.fox.visible = showFox
    if (showFox) {
      state.fox.scale.set(FOX_CONFIG.scale * scale)
      state.fox.position.set(
        boardLeft + boardOuterWidth * scale + 98 * scale,
        boardTop + boardOuterHeight * scale - 26 * scale,
      )
    }
  }
}

function init() {
  setupApplication()

  const title = createText('bank robbery', 54, 0xffc247, 6)
  const subtitle = createText('slot', 34, 0xd92323, 5)
  title.anchor.set(0.5)
  subtitle.anchor.set(0.5)
  state.title = title
  state.subtitle = subtitle

  createBackground()
  state.layers.ui.addChild(title, subtitle)

  loadAssets()
    .then(() => {
      createBoard()
      createSymbols()
      createFox()
      createHud()
      createSpinButton()
      layout()
      window.addEventListener('resize', layout)
    })
    .catch((error) => {
      console.error(error)
    })
}

function createText(text, size, fill, strokeThickness) {
  return new PIXI.Text(text, {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: size,
    fill,
    fontWeight: '900',
    letterSpacing: 0,
    stroke: 0x080407,
    strokeThickness,
    dropShadow: true,
    dropShadowAlpha: 0.45,
    dropShadowBlur: 3,
    dropShadowDistance: 3,
  })
}

function getSpineData(asset) {
  return asset.spineData || asset
}

function assertAnimation(asset, assetLabel, animationName) {
  const animations = getSpineData(asset).animations || []
  const exists = animations.some((animation) => animation.name === animationName)

  if (!exists) {
    throw new Error(`Animation "${animationName}" was not found in ${assetLabel}.`)
  }
}

function muteKnownSpineVersionWarning() {
  const originalConsoleError = console.error

  console.error = (...args) => {
    if (args[0] === SPINE_3_8_75_WARNING) {
      return
    }

    originalConsoleError(...args)
  }

  return () => {
    console.error = originalConsoleError
  }
}

function createSpine(config) {
  const spine = new Spine(getSpineData(state.assets[config.key]))
  spine.state.setAnimation(0, config.animation, true)
  spine.scale.set(config.scale)
  return spine
}

function createTile(row, col, config) {
  const symbol = createSpine(config)
  symbol.config = config
  symbol.row = row
  symbol.col = col
  symbol.baseX = col * REEL_STEP + CELL_SIZE / 2
  symbol.baseY = row * REEL_STEP + CELL_SIZE / 2 + config.yOffset
  symbol.baseScale = config.scale
  symbol.position.set(symbol.baseX, symbol.baseY)
  return symbol
}

function clearSymbols() {
  const previousTiles = state.symbolsLayer.removeChildren()
  previousTiles.forEach((tile) => tile.destroy())
  state.tiles = []
}

function randomSymbolConfig() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

function handleSpin() {
  spin()
}

async function spin() {
  if (state.isSpinning) {
    return
  }

  state.isSpinning = true
  state.values.win = 0
  updateHudValues()
  hideResultPopup()
  clearEffects()
  setSpinButtonEnabled(false)

  const didWin = Math.random() > 0.55
  const winMultiplier = didWin ? Math.floor(Math.random() * 5) + 1 : 0
  const finalGrid = createFinalGrid(didWin)
  const columnAnimations = []

  if (state.fox) {
    state.fox.state.setAnimation(0, 'Idle', true)
  }

  for (let col = 0; col < BOARD_COLS; col += 1) {
    const delay = col * 120
    columnAnimations.push(wait(delay).then(() => animateColumn(col, finalGrid[col])))
  }

  await Promise.all(columnAnimations)

  state.values.balance -= state.values.bet
  state.values.win = state.values.bet * winMultiplier
  state.values.balance += state.values.win
  updateHudValues()

  if (didWin) {
    if (state.fox) {
      state.fox.state.setAnimation(0, 'Win', false)
      state.fox.state.addAnimation(0, 'Idle', true, 0)
    }
    highlightWinningSymbols(finalGrid.winningTiles)
    showResultPopup('BIG WIN', state.values.win, true)
  } else {
    shakeBoard()
    showResultPopup('NO WIN', 0, false)
  }

  resetSpinState()
}

function animateColumn(col, finalConfigs) {
  const duration = 720 + col * 145
  const lastSwap = { value: 0 }

  return animate(duration, (progress, elapsed) => {
    const eased = easeOutCubic(progress)
    const speed = 920 * (1 - eased) + 180
    const roll = (elapsed / 1000) * speed

    if (elapsed - lastSwap.value > 72 && progress < 0.82) {
      swapColumnSymbols(col)
      lastSwap.value = elapsed
    }

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const tile = getTile(row, col)
      const wrapped = (roll + row * REEL_STEP) % (BOARD_HEIGHT + REEL_STEP)
      tile.y = tile.baseY + wrapped - REEL_STEP
      tile.alpha = 0.72 + 0.28 * eased
    }
  }).then(() => {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      replaceTile(row, col, finalConfigs[row])
    }

    return animate(220, (progress) => {
      const bounce = Math.sin(progress * Math.PI) * 14 * (1 - progress)
      for (let row = 0; row < BOARD_ROWS; row += 1) {
        const tile = getTile(row, col)
        tile.y = tile.baseY - bounce
        tile.alpha = 1
      }
    })
  })
}

function highlightWinningSymbols(winningTiles) {
  winningTiles.forEach(({ row, col }, index) => {
    const tile = getTile(row, col)
    const glow = new PIXI.Graphics()

    glow.blendMode = PIXI.BLEND_MODES.ADD
    glow.beginFill(0xfff1a8, 0.5)
    glow.drawCircle(tile.baseX, tile.baseY - tile.config.yOffset, 46)
    glow.endFill()
    state.symbolsLayer.addChildAt(glow, Math.max(0, state.symbolsLayer.getChildIndex(tile)))
    state.effects.push(glow)

    animate(900, (progress) => {
      if (glow.destroyed || tile.destroyed) {
        return
      }

      const pulse = Math.sin(progress * Math.PI * 4)
      const scale = tile.baseScale * (1 + 0.12 * Math.max(0, pulse))
      tile.scale.set(scale)
      glow.alpha = (1 - progress) * (0.6 + Math.max(0, pulse) * 0.35)
      glow.scale.set(1 + progress * 0.55)
    }, () => {
      if (!tile.destroyed) {
        tile.scale.set(tile.baseScale)
      }
      destroyEffect(glow)
    })

    const timer = setTimeout(() => createExplosion(tile.baseX, tile.baseY - tile.config.yOffset), index * 70)
    state.effectTimers.push(timer)
  })
}

function createExplosion(x, y) {
  const particles = []

  for (let index = 0; index < 14; index += 1) {
    const particle = new PIXI.Graphics()
    const angle = (Math.PI * 2 * index) / 14
    const speed = 28 + Math.random() * 34

    particle.beginFill(index % 2 ? 0xffc247 : 0xffffff, 0.95)
    particle.drawCircle(0, 0, 2 + Math.random() * 2.5)
    particle.endFill()
    particle.position.set(x, y)
    particle.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed - 18,
    }

    particles.push(particle)
    state.effects.push(particle)
    state.symbolsLayer.addChild(particle)
  }

  animate(620, (progress) => {
    particles.forEach((particle) => {
      if (particle.destroyed) {
        return
      }

      particle.x = x + particle.velocity.x * progress
      particle.y = y + particle.velocity.y * progress + 28 * progress * progress
      particle.alpha = 1 - progress
      particle.scale.set(1 + progress * 0.8)
    })
  }, () => {
    particles.forEach((particle) => destroyEffect(particle))
  })
}

function showResultPopup(title, value, isBigWin) {
  hideResultPopup()

  const popup = new PIXI.Container()
  const overlay = new PIXI.Graphics()
  const panel = new PIXI.Graphics()
  const titleText = createText(title, isBigWin ? 70 : 42, isBigWin ? 0xffc247 : 0xffffff, 7)
  const valueText = createText(formatMoney(value), isBigWin ? 46 : 30, isBigWin ? 0x40f078 : 0xff3b35, 5)
  const { width, height } = state.app.screen

  overlay.beginFill(0x000000, isBigWin ? 0.68 : 0.42)
  overlay.drawRect(0, 0, width, height)
  overlay.endFill()

  panel.beginFill(0x120909, isBigWin ? 0.96 : 0.88)
  panel.drawRoundedRect(-220, -92, 440, isBigWin ? 184 : 144, 8)
  panel.endFill()
  panel.lineStyle(4, isBigWin ? 0xffc247 : 0x82181a, isBigWin ? 0.95 : 0.75)
  panel.drawRoundedRect(-220, -92, 440, isBigWin ? 184 : 144, 8)

  titleText.anchor.set(0.5)
  valueText.anchor.set(0.5)
  titleText.position.set(0, isBigWin ? -22 : -16)
  valueText.position.set(0, isBigWin ? 48 : 38)

  popup.addChild(overlay, panel, titleText, valueText)
  popup.position.set(width / 2, height / 2)
  overlay.position.set(-width / 2, -height / 2)
  popup.eventMode = 'static'
  popup.cursor = 'pointer'
  popup.on('pointertap', hideResultPopup)
  state.layers.ui.addChild(popup)
  state.resultPopup = popup

  animate(220, (progress) => {
    if (popup.destroyed) {
      return
    }

    popup.alpha = progress
    popup.scale.set(0.88 + 0.12 * easeOutBack(progress))
  })
}

function resetSpinState() {
  state.isSpinning = false
  setSpinButtonEnabled(true)
}

function createFinalGrid(didWin) {
  const grid = []
  const winningTiles = []
  const winningRow = Math.floor(Math.random() * BOARD_ROWS)
  const winningConfig = randomSymbolConfig()

  for (let col = 0; col < BOARD_COLS; col += 1) {
    grid[col] = []
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      grid[col][row] = didWin && row === winningRow ? winningConfig : randomSymbolConfig()
    }

    if (didWin) {
      winningTiles.push({ row: winningRow, col })
    }
  }

  grid.winningTiles = winningTiles
  return grid
}

function swapColumnSymbols(col) {
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    const previous = getTile(row, col)
    const y = previous.y
    const alpha = previous.alpha
    const next = replaceTile(row, col, randomSymbolConfig())

    next.y = y
    next.alpha = alpha
  }
}

function replaceTile(row, col, config) {
  const index = tileIndex(row, col)
  const previous = state.tiles[index]
  const childIndex = state.symbolsLayer.getChildIndex(previous)
  const next = createTile(row, col, config)

  state.symbolsLayer.removeChild(previous)
  previous.destroy()
  state.symbolsLayer.addChildAt(next, childIndex)
  state.tiles[index] = next
  return next
}

function getTile(row, col) {
  return state.tiles[tileIndex(row, col)]
}

function tileIndex(row, col) {
  return row * BOARD_COLS + col
}

function setSpinButtonEnabled(enabled) {
  const { button, text } = state.spinButton

  button.eventMode = enabled ? 'static' : 'none'
  button.cursor = enabled ? 'pointer' : 'default'
  button.alpha = enabled ? 1 : 0.62
  text.text = enabled ? 'SPIN' : '...'
  applySpinButtonVisualState()
}

function pressSpinButton() {
  if (state.isSpinning) {
    return
  }

  state.spinButtonPressed = true
  applySpinButtonVisualState()
}

function releaseSpinButton() {
  state.spinButtonPressed = false
  applySpinButtonVisualState()
}

function applySpinButtonVisualState() {
  const { button } = state.spinButton

  if (!button) {
    return
  }

  const pulse = state.isSpinning ? 0 : Math.sin(state.spinButtonPulse) * 0.035
  const press = state.spinButtonPressed ? 0.92 : 1
  button.scale.set(state.spinButtonScale * (1 + pulse) * press)
}

function shakeBoard() {
  const startX = state.board.x

  animate(360, (progress) => {
    const shake = Math.sin(progress * Math.PI * 8) * (1 - progress) * 7
    state.board.x = startX + shake
  }, () => {
    state.board.x = startX
  })
}

function hideResultPopup() {
  if (!state.resultPopup) {
    return
  }

  state.resultPopup.destroy({ children: true })
  state.resultPopup = null
}

function clearEffects() {
  state.effectTimers.forEach((timer) => clearTimeout(timer))
  state.effectTimers = []

  state.effects.forEach((effect) => {
    if (!effect.destroyed) {
      effect.destroy()
    }
  })
  state.effects = []

  state.tiles.forEach((tile) => {
    if (!tile.destroyed) {
      tile.alpha = 1
      tile.scale.set(tile.baseScale)
      tile.filters = null
    }
  })
}

function destroyEffect(effect) {
  if (!effect.destroyed) {
    effect.destroy()
  }

  state.effects = state.effects.filter((item) => item !== effect)
}

function wait(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

function animate(duration, onUpdate, onComplete) {
  return new Promise((resolve) => {
    state.animations.push({
      start: performance.now(),
      duration,
      onUpdate,
      onComplete,
      resolve,
    })
  })
}

function updateAnimations() {
  const now = performance.now()

  state.spinButtonPulse += state.app?.ticker.deltaMS / 1000 || 0.016
  applySpinButtonVisualState()

  for (let index = state.animations.length - 1; index >= 0; index -= 1) {
    const animation = state.animations[index]
    const elapsed = now - animation.start
    const progress = Math.min(1, elapsed / animation.duration)

    animation.onUpdate(progress, elapsed)

    if (progress >= 1) {
      state.animations.splice(index, 1)
      animation.onComplete?.()
      animation.resolve()
    }
  }
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3)
}

function easeOutBack(value) {
  const c1 = 1.70158
  const c3 = c1 + 1

  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

function drawBackground() {
  const { width, height } = state.app.screen
  const { background, vault, glow, vignette } = state.background
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.max(width, height) * 0.46

  background.clear()
  background.beginFill(0x070509)
  background.drawRect(0, 0, width, height)
  background.endFill()
  background.beginFill(0x120a0a)
  background.drawRect(0, height * 0.7, width, height * 0.3)
  background.endFill()

  vault.clear()
  vault.lineStyle(24, 0x141014, 0.75)
  vault.drawCircle(centerX, centerY + 40, radius)
  vault.lineStyle(5, 0x33201a, 0.65)
  vault.drawCircle(centerX, centerY + 40, radius - 52)
  vault.lineStyle(2, 0x9a2626, 0.28)
  vault.drawCircle(centerX, centerY + 40, radius - 112)

  glow.clear()
  glow.beginFill(0xffc247, 0.09)
  glow.drawEllipse(centerX, centerY + 40, width * 0.34, height * 0.33)
  glow.endFill()
  glow.beginFill(0xd92323, 0.09)
  glow.drawEllipse(centerX, centerY + 100, width * 0.28, height * 0.22)
  glow.endFill()

  vignette.clear()
  vignette.beginFill(0x000000, 0.28)
  vignette.drawRect(0, 0, width, height)
  vignette.endFill()
  vignette.beginHole()
  vignette.drawEllipse(centerX, centerY + 32, width * 0.42, height * 0.45)
  vignette.endHole()
}

function drawBoard() {
  const { shell, dividers, cells, shine } = state.boardParts
  const outerX = -32
  const outerY = -32
  const outerW = BOARD_WIDTH + 64
  const outerH = BOARD_HEIGHT + 64

  shell.clear()
  shell.beginFill(0x070505)
  shell.drawRoundedRect(outerX, outerY, outerW, outerH, 8)
  shell.endFill()
  shell.beginFill(0x1b1111)
  shell.drawRoundedRect(outerX + 8, outerY + 8, outerW - 16, outerH - 16, 8)
  shell.endFill()
  shell.lineStyle(8, 0x7f1719, 1)
  shell.drawRoundedRect(outerX + 7, outerY + 7, outerW - 14, outerH - 14, 8)
  shell.lineStyle(3, 0xffc247, 0.85)
  shell.drawRoundedRect(outerX + 19, outerY + 19, outerW - 38, outerH - 38, 6)
  shell.lineStyle(2, 0x2b0b0b, 1)
  shell.drawRoundedRect(-6, -6, BOARD_WIDTH + 12, BOARD_HEIGHT + 12, 6)

  cells.removeChildren()
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const x = col * (CELL_SIZE + CELL_GAP)
      const y = row * (CELL_SIZE + CELL_GAP)
      cells.addChild(createCell(x, y))
    }
  }

  dividers.clear()
  for (let col = 1; col < BOARD_COLS; col += 1) {
    const x = col * CELL_SIZE + (col - 0.5) * CELL_GAP
    dividers.beginFill(0xff2d2d, 0.18)
    dividers.drawRoundedRect(x - 2, -2, 4, BOARD_HEIGHT + 4, 3)
    dividers.endFill()
  }

  shine.clear()
  shine.beginFill(0xffffff, 0.05)
  shine.drawRoundedRect(-16, -16, BOARD_WIDTH + 32, 46, 8)
  shine.endFill()
}

function createCell(x, y) {
  const cell = new PIXI.Graphics()

  cell.beginFill(0x15141c)
  cell.drawRoundedRect(x, y, CELL_SIZE, CELL_SIZE, 7)
  cell.endFill()
  cell.lineStyle(2, 0x662023, 0.65)
  cell.drawRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 7)
  cell.beginFill(0xffc247, 0.05)
  cell.drawRoundedRect(x + 8, y + 8, CELL_SIZE - 16, 20, 6)
  cell.endFill()
  cell.beginFill(0x000000, 0.16)
  cell.drawRoundedRect(x + 9, y + CELL_SIZE - 24, CELL_SIZE - 18, 14, 7)
  cell.endFill()

  return cell
}

function drawHud() {
  const { panel, labels, values } = state.hud

  panel.clear()
  panel.beginFill(0x0e0909, 0.96)
  panel.drawRoundedRect(0, 0, 520, 72, 8)
  panel.endFill()
  panel.lineStyle(4, 0x82181a)
  panel.drawRoundedRect(0, 0, 520, 72, 8)
  panel.lineStyle(2, 0xffc247, 0.65)
  panel.drawRoundedRect(10, 10, 500, 52, 5)

  placeHudItem(labels.balance, values.balance, 24)
  placeHudItem(labels.win, values.win, 205)
  placeHudItem(labels.bet, values.bet, 363)
}

function placeHudItem(label, value, x) {
  label.position.set(x, 9)
  value.position.set(x, 29)
}

function drawSpinButton() {
  const { body } = state.spinButton

  body.clear()
  body.beginFill(0x9f171a)
  body.drawCircle(0, 0, 48)
  body.endFill()
  body.lineStyle(6, 0x2a0808)
  body.drawCircle(0, 0, 49)
  body.lineStyle(4, 0xffc247, 0.9)
  body.drawCircle(0, 0, 39)
  body.beginFill(0xffffff, 0.1)
  body.drawCircle(-14, -16, 16)
  body.endFill()
}

function updateHudValues() {
  const { values } = state.hud

  values.balance.text = formatMoney(state.values.balance)
  values.win.text = formatMoney(state.values.win)
  values.win.style.fill = state.values.win > 0 ? 0x40f078 : 0xff3b35
  values.bet.text = formatMoney(state.values.bet)
}

function formatMoney(value) {
  return `$${value.toLocaleString('en-US')}`
}

init()
