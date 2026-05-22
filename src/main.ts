import * as THREE from 'three'
import { Renderer } from './engine/renderer'
import { Board, HexBox } from './engine/board'
import { Player } from './engine/player'
import { EnemyManager } from './engine/enemies'
import { FloorManager } from './engine/floors'
import { triggerScreenFlash, CameraShake, ParticleBurst, ShockwaveRing, MultiplierBurst, ShrinkAura } from './engine/vfx'
import { CasinoSystem } from './systems/casino'
import { Leaderboard } from './systems/leaderboard'
import { getLevelConfig, getTierFrustumSize, getMysteryCount } from './systems/levels'
import { audioManager } from './systems/audio'
import {
  buildSplashScreen,
  buildLeaderboardScreen,
  buildBetScreen,
  buildHUD,
  updateHUD,
  showSafeZoneDialog,
  showSafeZoneResult,
  showLifeLostToast,
  showMysteryToast,
  buildLevelCompleteScreen,
  buildGameOverScreen,
  setHUDEnemies,
  markHUDEnemyDied,
  buildTouchControls,
} from './ui/screens'

type GameScreen = 'splash' | 'leaderboard' | 'bet' | 'gameplay' | 'levelComplete' | 'gameOver'

const SESSION_KEY = 'quackstack_session'

function saveSession(level: number, bankroll: number, seed: number, lives: number): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ level, bankroll, seed, lives }))
}

function loadSession(): { level: number; bankroll: number; seed: number; lives: number } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { ...parsed, lives: parsed.lives ?? 3 }
  } catch { return null }
}

class Game {
  private renderer: Renderer
  private floorManager: FloorManager
  private player!: Player
  private casino: CasinoSystem
  private leaderboard: Leaderboard
  private uiRoot: HTMLElement

  private currentScreen: GameScreen = 'splash'
  private currentLevel: number = 1
  private runSeed: number = 0
  private timeLeft: number = 120
  private timerRunning: boolean = false
  private lastTimestamp: number = 0

  private hud!: HTMLElement
  private touchControls?: HTMLElement
  private readonly isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window)
  private activeScreenEl: HTMLElement | null = null
  private levelTotalTime: number = 120
  private tierFrustumSize: number = 12
  private tierFrustumByTier = new Map<string, number>()
  private safeZoneCooldown: boolean = false
  private dialogOpen: boolean = false
  private dying: boolean = false
  private gameStarted: boolean = false
  private livesRemaining: number = 3

  // Active VFX
  private cameraShake: CameraShake | null = null
  private particleBurst: ParticleBurst | null = null
  private shockwave: ShockwaveRing | null = null
  private shrinkAura: ShrinkAura | null = null
  private multiplierBursts: MultiplierBurst[] = []

  private speedResetTimer: ReturnType<typeof setTimeout> | null = null

  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()

  constructor() {
    const container = document.getElementById('canvas-container')!
    this.uiRoot = document.getElementById('ui-root')!

    this.renderer = new Renderer(container)
    this.floorManager = new FloorManager(this.renderer.scene, 1)
    this.casino = new CasinoSystem()
    this.leaderboard = new Leaderboard()
    this.leaderboard.load()

    this.buildPersistentUI()
    this.showSplash()
    this.bindInput()

    requestAnimationFrame(ts => this.loop(ts))
  }

  // ── Persistent UI ─────────────────────────────────────────────────────────
  private buildPersistentUI(): void {
    this.hud = buildHUD()
    this.uiRoot.appendChild(this.hud)

    if (this.isTouch) {
      document.body.classList.add('touch-device')
      this.touchControls = buildTouchControls()
      this.uiRoot.appendChild(this.touchControls)
    }
  }

  // ── Screen transitions ────────────────────────────────────────────────────
  private setScreen(screen: HTMLElement): void {
    this.activeScreenEl?.remove()
    this.uiRoot.appendChild(screen)
    this.activeScreenEl = screen
  }

  private showSplash(): void {
    this.currentScreen = 'splash'
    this.hud.classList.add('hidden')
    this.touchControls?.classList.add('hidden')
    audioManager.playIntro()
    const session = loadSession()
    const screen = buildSplashScreen(
      () => this.startNewGame(),
      () => this.showLeaderboard(),
      session,
      () => this.continueSession(session),
      (level) => this.debugJumpToLevel(level),
    )
    this.setScreen(screen)
  }

  private continueSession(session: { level: number; bankroll: number; seed: number; lives: number } | null): void {
    if (!session) { this.startNewGame(); return }
    audioManager.playAccept()
    this.currentLevel = session.level
    this.casino.bankroll = session.bankroll
    this.runSeed = session.seed
    this.livesRemaining = session.lives
    this.tierFrustumByTier.clear()
    this.showBetScreen()
  }

  private debugJumpToLevel(level: number): void {
    this.casino.reset()
    this.currentLevel = level
    this.runSeed = Math.floor(Math.random() * 2_000_000_000)
    this.tierFrustumByTier.clear()
    this.startLevel(this.casino.minBet)
  }

  private showLeaderboard(): void {
    const top = this.leaderboard.getTop(10)
    const best = this.leaderboard.getPlayerBest()
    const rank = best ? this.leaderboard.getRank(best.score) : null
    const screen = buildLeaderboardScreen(top, rank, best, () => this.showSplash())
    this.setScreen(screen)
  }

  private startNewGame(): void {
    audioManager.playAccept()
    this.casino.reset()
    this.currentLevel = 1
    this.runSeed = Math.floor(Math.random() * 2_000_000_000)
    this.livesRemaining = 3
    this.tierFrustumByTier.clear()
    this.showBetScreen()
  }

  private showBetScreen(): void {
    saveSession(this.currentLevel, this.casino.bankroll, this.runSeed, this.livesRemaining)
    this.currentScreen = 'bet'
    this.hud.classList.add('hidden')
    this.touchControls?.classList.add('hidden')
    const config = getLevelConfig(this.currentLevel)
    const screen = buildBetScreen(
      config,
      this.casino.bankroll,
      this.casino.minBet,
      this.casino.maxBet,
      (bet) => this.startLevel(bet),
      () => { audioManager.playAccept(); this.showSplash() },
      this.livesRemaining,
    )
    this.setScreen(screen)
  }

  private startLevel(bet: number): void {
    if (!this.casino.placeBet(bet)) return
    audioManager.playAccept()
    const bgIndex = ((this.currentLevel - 1) % 6) + 1
    const bgNum = String(bgIndex).padStart(2, '0')
    this.renderer.setBackground(`${import.meta.env.BASE_URL}assets/images/UI_bgImage${bgNum}.png`)
    this.currentScreen = 'gameplay'
    this.activeScreenEl?.remove()
    this.activeScreenEl = null

    const config = getLevelConfig(this.currentLevel)

    // Reconfigure floor manager for this level's floor count
    this.floorManager.reconfigure(config.floorCount, config.hexRadius)

    this.generateFloors(config)
    this.levelTotalTime = config.timeLimit
    this.timeLeft = config.timeLimit
    this.timerRunning = false
    this.gameStarted = false
    this.safeZoneCooldown = false
    this.shrinkAura?.dispose()
    this.shrinkAura = null

    if (this.player) this.player.dispose()
    this.player = new Player(this.renderer.scene, this.floorManager.board)
    const topBox = this.floorManager.board.getBox(0, 0)!
    this.player.spawnAt(topBox)
    this.floorManager.board.highlightBox(topBox)
    this.casino.revealBox(topBox)

    this.player.setOnLand(box => this.onPlayerLand(box))
    this.player.setOnMove(() => this.onFirstMove())

    this.floorManager.spawnAll(config.enemySpawns, config.enemySpeed, config.seed, this.player.currentBoxId)

    this.hud.classList.remove('hidden')
    this.touchControls?.classList.remove('hidden')
    this.refreshHUD()
    setHUDEnemies(config.enemySpawns)
    audioManager.playGameplayBgm(config.level === 50)

    const levelBadge = document.getElementById('hud-level-badge')
    if (levelBadge) {
      levelBadge.onclick = () => {
        this.timerRunning = false
        const result = this.casino.completeLevelPayout(this.floorManager.totalBoxes)
        this.showLevelComplete(result)
      }
    }
  }

  private generateFloors(config: import('./systems/levels').LevelConfig): void {
    const seed = (this.runSeed ^ (config.level * 2_654_435_761)) >>> 0
    this.floorManager.generateFloors(seed, config.tilesPerFloor, getMysteryCount(config.tier))

    // Safe-frame guarantee: frustum must be at least the tier minimum (for
    // consistent tile size), and large enough to fully show every floor's board.
    // Within a tier we carry forward the running max so all levels in the tier
    // use the same frustum (the worst-case board encountered so far), preventing
    // level N from appearing larger than level N-1 when its board is more compact.
    let frustum = this.tierFrustumByTier.get(config.tier) ?? getTierFrustumSize(config.tier)
    for (const board of this.floorManager.boards) {
      this.renderer.fitCamera(board.boxes.map(b => b.worldPos), board.hexRadius)
      frustum = Math.max(frustum, this.renderer.lockFrustum())
    }
    this.tierFrustumByTier.set(config.tier, frustum)
    this.tierFrustumSize = frustum
    this.renderer.applyLockedFrustum(this.tierFrustumSize)
  }

  // ── Floor transition ──────────────────────────────────────────────────────
  private transitionFloor(targetFloor: number): void {
    if (targetFloor < 0 || targetFloor >= this.floorManager.floorCount) return
    this.dying = true

    // Shockwave at current portal
    const isGoingDown = targetFloor > this.floorManager.currentFloor
    const currentPortalId = isGoingDown
      ? this.floorManager.board.portalDownId
      : this.floorManager.board.portalUpId
    const portalBox = this.floorManager.board.getBoxById(currentPortalId)
    if (portalBox) {
      this.shockwave = new ShockwaveRing(this.renderer.scene, portalBox.worldPos.clone())
    }

    setTimeout(() => {
      // Freeze all floors during transition
      for (const em of this.floorManager.enemyManagers) em.freeze()

      this.floorManager.setCurrentFloor(targetFloor)
      this.renderer.applyLockedFrustum(this.tierFrustumSize)

      const newBoard = this.floorManager.board
      // Spawn on the complementary portal of the target floor
      const spawnId = isGoingDown ? newBoard.portalUpId : newBoard.portalDownId
      const spawnBox = newBoard.getBoxById(spawnId) ?? newBoard.getBox(0, 0)!
      this.player.setBoard(newBoard)
      this.player.spawnAt(spawnBox)

      // Highlight spawn on new floor if not yet visited (portals are excluded by highlightBox)
      if (spawnBox.state === 'default') {
        newBoard.highlightBox(spawnBox)
        this.casino.revealBox(spawnBox)
      }

      // Unfreeze current floor but keep movement disabled — wait for first move
      this.floorManager.enemyManager.unfreeze()
      this.floorManager.enemyManager.disableMovement()
      this.player.setOnMove(() => {
        this.floorManager.enemyManager.enableMovement()
        // Restore the no-op first-move callback
        this.player.setOnMove(() => this.onFirstMove())
      })

      this.dying = false
      this.refreshHUD()
    }, 400)
  }

  // ── Gameplay events ───────────────────────────────────────────────────────
  private onPlayerLand(box: HexBox): void {
    audioManager.playJump()
    const board = this.floorManager.board

    // Portal checks
    if (box.id === board.portalDownId) {
      this.transitionFloor(this.floorManager.currentFloor + 1)
      return
    }
    if (box.id === board.portalUpId) {
      this.transitionFloor(this.floorManager.currentFloor - 1)
      return
    }

    if (box.id === board.safeZoneId) {
      this.onSafeZoneLand()
      return
    }

    if (box.state === 'mystery') {
      this.onMysteryLand(box)
      return
    }

    if (box.state !== 'highlighted') {
      board.highlightBox(box)
      const mult = this.casino.revealBox(box)
      if (mult !== null) {
        audioManager.playMultiplier(mult)
        this.multiplierBursts.push(new MultiplierBurst(this.renderer.scene, box.worldPos.clone(), mult, this.floorManager.board.hexRadius))
      }
    }

    this.refreshHUD()

    if (this.floorManager.isComplete) {
      this.timerRunning = false
      const result = this.casino.completeLevelPayout(this.floorManager.totalBoxes)
      this.showLevelComplete(result)
    }
  }

  private onSafeZoneLand(): void {
    if (this.safeZoneCooldown) return
    this.safeZoneCooldown = true
    this.timerRunning = false
    this.dialogOpen = true
    this.floorManager.enemyManager.freeze()

    const elapsed = this.levelTotalTime - this.timeLeft
    const elapsedRatio = Math.min(1, elapsed / this.levelTotalTime)
    const avgMult = this.casino.runningAvgMultiplier
    // Preview payout without committing
    const previewPayout = Math.round(
      this.casino.currentBet * elapsedRatio * (avgMult > 0 ? avgMult : 0)
    )

    showSafeZoneDialog(
      this.uiRoot,
      previewPayout,
      elapsedRatio,
      avgMult > 0 ? avgMult : 0,
      () => {
        // Cash Out — darken tile, then reset level
        audioManager.playAccept()
        this.dialogOpen = false
        this.floorManager.board.markSafeZoneUsed()
        const payout = this.casino.safeZoneCashOut(elapsed, this.levelTotalTime)
        showSafeZoneResult(this.uiRoot, payout)
        setTimeout(() => this.resetLevelInPlace(), 2200)
      },
      () => {
        // Keep Playing — darken tile, cooldown stays true (once per level)
        audioManager.playAccept()
        this.dialogOpen = false
        this.floorManager.board.markSafeZoneUsed()
        this.timerRunning = true
        this.floorManager.enemyManager.unfreeze()
        this.floorManager.enemyManager.enableMovement()
      },
    )
  }

  private drawMysteryReward(): { label: string; positive: boolean; apply: () => void } {
    const rng = Math.random
    const r = rng()
    // Cumulative weights: bonus_mult 18, bomb 15, freeze 15, slow 12, boost 12, bonus_cash 15, enemy_drop 8, life 5
    if (r < 0.18) {
      const mult = [1.5, 2.0, 3.0][Math.floor(rng() * 3)]
      return {
        label: `+${mult}× Multiplier!`,
        positive: true,
        apply: () => {
          const bonus = Math.round(this.casino.currentBet * mult)
          this.casino.bankroll += bonus
        },
      }
    }
    if (r < 0.33) return {
      label: '💣 Bomb!',
      positive: false,
      apply: () => { this.onPlayerHit() },
    }
    if (r < 0.48) return {
      label: '❄️ Enemy Freeze (2s)',
      positive: true,
      apply: () => {
        this.floorManager.enemyManager.freeze()
        setTimeout(() => {
          if (this.currentScreen === 'gameplay' && !this.dying && !this.dialogOpen)
            this.floorManager.enemyManager.unfreeze()
        }, 2000)
      },
    }
    if (r < 0.60) return {
      label: '🐢 Player Slow (2s)',
      positive: false,
      apply: () => {
        this.player.jumpSpeedMultiplier = 0.4
        if (this.speedResetTimer) clearTimeout(this.speedResetTimer)
        this.speedResetTimer = setTimeout(() => { this.player.jumpSpeedMultiplier = 1.0 }, 2000)
      },
    }
    if (r < 0.72) return {
      label: '⚡ Speed Boost (2s)',
      positive: true,
      apply: () => {
        this.player.jumpSpeedMultiplier = 2.5
        if (this.speedResetTimer) clearTimeout(this.speedResetTimer)
        this.speedResetTimer = setTimeout(() => { this.player.jumpSpeedMultiplier = 1.0 }, 2000)
      },
    }
    if (r < 0.87) {
      const bonus = Math.round(this.casino.currentBet * 0.3)
      return {
        label: `+$${bonus.toLocaleString()} Bonus`,
        positive: true,
        apply: () => { this.casino.bankroll += bonus },
      }
    }
    if (r < 0.95) {
      const count = Math.random() < 0.5 ? 1 : Math.random() < 0.67 ? 2 : 3
      return {
        label: `${count} Enem${count === 1 ? 'y' : 'ies'} Incoming!`,
        positive: false,
        apply: () => {
          this.floorManager.enemyManager.spawnExtra(count, this.player.currentBoxId)
        },
      }
    }
    return {
      label: '+1 Life!',
      positive: true,
      apply: () => {
        this.livesRemaining = Math.min(3, this.livesRemaining + 1)
        this.player.jumpSpeedMultiplier = this.player.jumpSpeedMultiplier  // no-op, just a hook
        this.refreshHUD()
      },
    }
  }

  private onMysteryLand(box: import('./engine/board').HexBox): void {
    this.floorManager.board.revealMystery(box)
    const reward = this.drawMysteryReward()
    const isBomb = reward.label.includes('Bomb')
    if (!isBomb) {
      showMysteryToast(this.uiRoot, reward.label, reward.positive)
      reward.apply()
      this.refreshHUD()
    } else {
      reward.apply()
    }
  }

  private resetLevelInPlace(): void {
    const config = getLevelConfig(this.currentLevel)
    this.multiplierBursts.forEach(mb => mb.dispose())
    this.multiplierBursts = []
    this.shrinkAura?.dispose()
    this.shrinkAura = null

    // Single-floor levels only (safe zone only exists for floorCount=1)
    this.floorManager.reconfigure(1, config.hexRadius)
    this.generateFloors(config)

    this.timeLeft = config.timeLimit
    this.levelTotalTime = config.timeLimit
    this.timerRunning = false
    this.gameStarted = false

    this.player.dispose()
    this.player = new Player(this.renderer.scene, this.floorManager.board)
    const topBox = this.floorManager.board.getBox(0, 0)!
    this.player.spawnAt(topBox)
    this.floorManager.board.highlightBox(topBox)
    this.casino.revealBox(topBox)
    this.player.setOnLand(box => this.onPlayerLand(box))
    this.player.setOnMove(() => this.onFirstMove())

    this.floorManager.spawnAll(config.enemySpawns, config.enemySpeed, config.seed, this.player.currentBoxId)

    this.safeZoneCooldown = false
    this.refreshHUD()
  }

  private onFirstMove(): void {
    if (this.gameStarted) return
    this.gameStarted = true
    this.timerRunning = true
    this.floorManager.enemyManager.enableMovement()
  }

  private onResumeAfterLifeLoss(): void {
    this.timerRunning = true
    this.floorManager.enemyManager.enableMovement()
    this.player.setOnMove(() => {})
  }

  private showLevelComplete(result: import('./systems/casino').LevelResult): void {
    audioManager.stopBgm()
    if (this.currentLevel === 50) audioManager.playFinalBoss()
    else audioManager.playLevelComplete()
    this.floorManager.clear()
    this.hud.classList.add('hidden')
    this.touchControls?.classList.add('hidden')
    const screen = buildLevelCompleteScreen(
      result,
      this.casino.bankroll,
      () => {
        audioManager.playAccept()
        if (this.currentLevel < 50) {
          this.currentLevel++
          this.showBetScreen()
        } else {
          this.triggerGameOver()
        }
      },
      () => {
        audioManager.playAccept()
        this.showBetScreen()
      },
      () => {
        audioManager.playAccept()
        this.showSplash()
      },
    )
    this.setScreen(screen)
  }

  private triggerGameOver(): void {
    saveSession(this.currentLevel, this.casino.bankroll, this.runSeed, 3)
    audioManager.stopBgm()
    audioManager.playGameOver()
    this.timerRunning = false
    this.hud.classList.add('hidden')
    this.touchControls?.classList.add('hidden')
    const top = this.leaderboard.getTop(10)
    const screen = buildGameOverScreen(
      this.casino.bankroll,
      this.currentLevel,
      top,
      null,
      null,
      (initials) => {
        audioManager.playAccept()
        const r = this.leaderboard.submit(initials, this.casino.bankroll, this.currentLevel)
        const entry = { initials, score: this.casino.bankroll, level: this.currentLevel, fake: false }
        const updated = buildGameOverScreen(
          this.casino.bankroll, this.currentLevel,
          this.leaderboard.getTop(10), entry, r,
          () => {}, () => { audioManager.playAccept(); this.showSplash() }
        )
        this.setScreen(updated)
      },
      () => { audioManager.playAccept(); this.showSplash() },
    )
    this.setScreen(screen)
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  private bindInput(): void {
    window.addEventListener('keydown', e => this.onKey(e))
    this.renderer.renderer.domElement.addEventListener('click', e => this.onCanvasClick(e))
    if (this.isTouch) this.bindTouchControls()
  }

  private performMove(dr: number, dc: number): void {
    if (this.currentScreen !== 'gameplay' || this.dying || this.dialogOpen) return
    const current = this.floorManager.board.getBoxById(this.player.currentBoxId)
    if (!current) return
    const targetBox = this.floorManager.board.getBox(current.row + dr, current.col + dc)
    if (targetBox) this.player.tryMove(targetBox.id)
  }

  private onKey(e: KeyboardEvent): void {
    if (this.currentScreen !== 'gameplay' || this.dying || this.dialogOpen) return

    const deltas: Record<string, [number, number]> = {
      'Numpad7': [ 0, -1], 'Numpad9': [ 1, -1], 'Numpad6': [ 1,  0],
      'Numpad3': [ 0,  1], 'Numpad1': [-1,  1], 'Numpad4': [-1,  0],
      'ArrowUp': [ 0, -1], 'ArrowRight': [1, -1], 'ArrowDown': [0, 1], 'ArrowLeft': [-1, 1],
      'KeyW':    [ 0, -1], 'KeyD':  [1, -1], 'KeyS': [0,  1], 'KeyA': [-1,  1],
    }

    const delta = deltas[e.code]
    if (!delta) return
    e.preventDefault()
    this.performMove(delta[0], delta[1])
  }

  private bindTouchControls(): void {
    if (!this.touchControls) return
    this.touchControls.querySelectorAll<HTMLElement>('.touch-btn').forEach(btn => {
      const dr = parseInt(btn.dataset.dr ?? '0')
      const dc = parseInt(btn.dataset.dc ?? '0')
      btn.addEventListener('pointerdown', e => {
        e.preventDefault()
        this.performMove(dr, dc)
      })
    })
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.currentScreen !== 'gameplay' || this.dialogOpen) return
    const rect = this.renderer.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.renderer.camera)
    const meshes = this.floorManager.board.boxes.map(b => b.topMesh)
    const hits = this.raycaster.intersectObjects(meshes)
    if (hits.length === 0) return

    const hitMesh = hits[0].object
    const box = this.floorManager.board.boxes.find(b => b.topMesh === hitMesh)
    if (box) this.player.tryMove(box.id)
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  private refreshHUD(): void {
    updateHUD(
      this.currentLevel,
      this.timeLeft,
      this.floorManager.highlightedCount,
      this.floorManager.totalBoxes,
      this.casino.runningAvgMultiplier,
      this.casino.bankroll,
      this.casino.currentBet,
      this.livesRemaining,
      this.floorManager.currentFloor + 1,
      this.floorManager.floorCount,
    )
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1)
    this.lastTimestamp = timestamp

    if (this.currentScreen === 'gameplay') {
      if (this.timerRunning) {
        this.timeLeft = Math.max(0, this.timeLeft - dt)
        this.refreshHUD()
        if (this.timeLeft <= 0) this.onTimeUp()
      }
      this.player?.update(dt)
      this.floorManager.update(dt)

      // Update all floor enemy managers; only check collision on current floor
      const collisionBoxId = this.player.state === 'jumping' ? -1 : this.player.currentBoxId
      let collisionStarted = false
      for (let i = 0; i < this.floorManager.floorCount; i++) {
        const { collisionStarted: hit, killedTypes } = this.floorManager.enemyManagers[i].update(
          dt,
          i === this.floorManager.currentFloor ? collisionBoxId : -1
        )
        if (hit) collisionStarted = true
        killedTypes.forEach(t => markHUDEnemyDied(t))
      }
      if (collisionStarted && this.gameStarted && !this.player.isInvincible) this.onPlayerHit()

      // VFX tick
      this.particleBurst?.update(dt)
      this.shockwave?.update(dt)
      if (this.shrinkAura) {
        this.shrinkAura.update(dt)
        if (this.shrinkAura.done) this.shrinkAura = null
      }
      if (this.cameraShake) {
        const alive = this.cameraShake.update(dt, this.renderer.camera)
        if (!alive) this.cameraShake = null
      }
      for (const mb of this.multiplierBursts) mb.update(dt)
      this.multiplierBursts = this.multiplierBursts.filter(mb => !mb.done)
    }

    this.renderer.updateReflectionProbe()
    this.renderer.render()
    requestAnimationFrame(ts => this.loop(ts))
  }

  private onPlayerHit(): void {
    if (this.currentScreen !== 'gameplay' || this.dying) return
    this.dying = true

    const origin = this.player.mesh.position.clone()
    this.particleBurst?.dispose()
    this.particleBurst = new ParticleBurst(this.renderer.scene, origin, 32)
    this.shockwave = new ShockwaveRing(this.renderer.scene, origin)
    this.cameraShake = new CameraShake(this.renderer.camera, 0.55, 0.22)
    triggerScreenFlash(this.uiRoot)

    this.livesRemaining--
    audioManager.playLifeLost()

    if (this.livesRemaining > 0) {
      this.timerRunning = false
      this.floorManager.enemyManager.freeze()
      this.shrinkAura?.dispose()
      this.shrinkAura = new ShrinkAura(this.renderer.scene, origin)
      this.player.shrinkToLives(this.livesRemaining)
      showLifeLostToast(this.uiRoot, this.livesRemaining)
      this.refreshHUD()

      setTimeout(() => {
        this.dying = false
        this.particleBurst?.dispose()
        this.particleBurst = null
        this.player.startInvincibility(2.5)
        this.floorManager.enemyManager.unfreeze()
        this.floorManager.enemyManager.disableMovement()
        this.player.setOnMove(() => this.onResumeAfterLifeLoss())
      }, 2000)
    } else {
      this.timerRunning = false
      this.floorManager.enemyManager.freeze()
      this.player.playDeath()

      setTimeout(() => {
        this.dying = false
        this.casino.loseLevel()
        this.floorManager.clear()
        this.shrinkAura?.dispose()
        this.shrinkAura = null
        this.particleBurst?.dispose()
        this.particleBurst = null
        this.triggerGameOver()
      }, 2100)
    }
  }

  private onTimeUp(): void {
    this.timerRunning = false
    this.casino.loseLevel()
    this.floorManager.clear()
    this.triggerGameOver()
  }
}


;(async () => {
  try {
    await Promise.all([Board.preload(), Player.preload(), EnemyManager.preload(), audioManager.preload()])
    new Game()
  } catch (err) {
    const msg = document.createElement('div')
    msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#ff4466;font-size:1rem;padding:2em;text-align:center;white-space:pre-wrap;z-index:9999;'
    msg.textContent = String(err)
    document.body.appendChild(msg)
    throw err
  }
})()
