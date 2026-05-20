import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Board, HexBox } from './board'
import { EnemySpawn } from '../systems/levels'
import { SeededRng } from '../utils/rng'

let _enemy01Template: THREE.Group | null = null
let _enemy02Template: THREE.Group | null = null
let _enemy03Template: THREE.Group | null = null
let _enemy04Template: THREE.Group | null = null
let _enemy05Template: THREE.Group | null = null
let _finalBossTemplate: THREE.Group | null = null

export type EnemyType = 'chaser' | 'bouncer' | 'eraser' | 'lateral' | 'stalker' | 'boss'

export interface Enemy {
  id: number
  type: EnemyType
  currentBoxId: number
  mesh: THREE.Group
  stepTimer: number
  stepInterval: number
  lateralDir: number
  alive: boolean
  warmupTimer: number
  totalWarmupTime: number
  isActive: boolean
  spawnWorldPos: THREE.Vector3
  collidingTimer: number
  landY: number
  eraserToggle: boolean
  stalkerPhase: 'hover' | 'dive' | 'land' | null
  stalkerTimer: number
  stalkerDiveFrom: THREE.Vector3 | null
}

export class EnemyManager {
  private enemies: Enemy[] = []
  private scene: THREE.Scene
  private board: Board
  private rng: SeededRng
  private nextId = 0
  private frozen = false
  private movementEnabled = false
  private stepInterval = 1.5
  private pendingWaves: Array<{ entries: { type: EnemyType; count: number }[]; delay: number }> = []
  private waveAccum = 0
  private static readonly WAVE_INTERVAL = 25  // seconds between waves

  private readonly S: number

  static async preload(): Promise<void> {
    const loader = new GLTFLoader()
    const load = async (url: string) => {
      const gltf = await loader.loadAsync(url)
      const model = gltf.scene as THREE.Group
      model.traverse(obj => { if (obj instanceof THREE.Mesh) obj.castShadow = true })
      return model
    }
    ;[_enemy01Template, _enemy02Template, _enemy03Template,
      _enemy04Template, _enemy05Template, _finalBossTemplate] = await Promise.all([
      load(`${import.meta.env.BASE_URL}assets/models/Q_enemy_01.glb`),
      load(`${import.meta.env.BASE_URL}assets/models/Q_enemy_02.glb`),
      load(`${import.meta.env.BASE_URL}assets/models/Q_enemy_03.glb`),
      load(`${import.meta.env.BASE_URL}assets/models/Q_enemy_04.glb`),
      load(`${import.meta.env.BASE_URL}assets/models/Q_enemy_05.glb`),
      load(`${import.meta.env.BASE_URL}assets/models/Q_finalBoss_01.glb`),
    ])
  }

  constructor(scene: THREE.Scene, board: Board) {
    this.scene = scene
    this.board = board
    this.rng = new SeededRng(42)
    this.S = board.hexRadius
  }

  spawn(spawns: EnemySpawn[], enemySpeed: number, seed: number, playerBoxId: number): void {
    this.clear()
    this.movementEnabled = false
    this.waveAccum = 0
    this.pendingWaves = []
    this.rng = new SeededRng(seed + 9000)
    this.stepInterval = 1.5 / enemySpeed

    const waves = this.splitIntoWaves(spawns)
    // Wave 1 drops in immediately so the board feels populated before the player moves
    this.spawnBatch(waves[0], playerBoxId)
    // Subsequent waves are queued and arrive during gameplay
    for (let i = 1; i < waves.length; i++) {
      this.pendingWaves.push({ entries: waves[i], delay: i * EnemyManager.WAVE_INTERVAL })
    }
  }

  freeze(): void { this.frozen = true }
  unfreeze(): void { this.frozen = false }
  enableMovement(): void { this.movementEnabled = true }
  disableMovement(): void { this.movementEnabled = false }

  setOpacity(alpha: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      enemy.mesh.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.transparent = alpha < 1
            mat.opacity = alpha
            mat.depthWrite = alpha >= 1
          }
        }
      })
    }
  }

  setMeshVisible(visible: boolean): void {
    for (const enemy of this.enemies) enemy.mesh.visible = visible
  }

  // ── Wave helpers ──────────────────────────────────────────────────────────

  private splitIntoWaves(spawns: EnemySpawn[]): Array<{ type: EnemyType; count: number }[]> {
    const total = spawns.reduce((s, e) => s + e.count, 0)
    const numWaves = total <= 4 ? 1 : total <= 12 ? 2 : 3

    const waves: Array<Array<{ type: EnemyType; count: number }>> =
      Array.from({ length: numWaves }, () => [])

    for (const s of spawns) {
      if (s.count === 0) continue
      let rem = s.count
      for (let w = 0; w < numWaves && rem > 0; w++) {
        const take = Math.ceil(rem / (numWaves - w))
        waves[w].push({ type: s.type as EnemyType, count: take })
        rem -= take
      }
    }

    return waves.filter(w => w.some(e => e.count > 0))
  }

  private spawnBatch(entries: { type: EnemyType; count: number }[], playerBoxId: number): void {
    const excludeIds = new Set<number>()
    const playerBox = this.board.getBoxById(playerBoxId)
    if (playerBox) {
      excludeIds.add(playerBox.id)
      for (const id of this.board.getAdjacentIds(playerBox)) excludeIds.add(id)
    }
    for (const enemy of this.enemies) {
      if (enemy.alive) excludeIds.add(enemy.currentBoxId)
    }

    let i = 0
    for (const entry of entries) {
      for (let n = 0; n < entry.count; n++) {
        const box = this.pickSpawnBox(entry.type, excludeIds)
        if (!box) { i++; continue }
        excludeIds.add(box.id)

        const isStalker = entry.type === 'stalker'
        const landY = isStalker
          ? this.board.tileTopY + 5 * this.S
          : this.board.tileTopY

        const mesh = buildPlaceholderMesh(entry.type, n, this.S)
        const landingPos = box.worldPos.clone().add(new THREE.Vector3(0, landY, 0))
        mesh.position.copy(landingPos).setY(landingPos.y + 20)
        this.scene.add(mesh)

        const warmupTime = 0.3 + i * 0.07 + this.rng.next() * 0.05

        this.enemies.push({
          id: this.nextId++,
          type: entry.type,
          currentBoxId: box.id,
          mesh,
          stepTimer: this.stepInterval * (0.5 + this.rng.next() * 0.5),
          stepInterval: entry.type === 'boss' ? this.stepInterval * 0.5 : this.stepInterval,
          lateralDir: this.rng.next() > 0.5 ? 1 : -1,
          alive: true,
          warmupTimer: warmupTime,
          totalWarmupTime: warmupTime,
          isActive: false,
          spawnWorldPos: landingPos,
          collidingTimer: 0,
          landY,
          eraserToggle: false,
          stalkerPhase: isStalker ? 'hover' : null,
          stalkerTimer: isStalker ? 2.0 : 0,
          stalkerDiveFrom: null,
        })
        i++
      }
    }
  }

  update(dt: number, playerBoxId: number): { collisionStarted: boolean } {
    // Tick wave queue — spawn next wave when its delay is reached
    if (this.movementEnabled && !this.frozen) {
      this.waveAccum += dt
      while (this.pendingWaves.length > 0 && this.waveAccum >= this.pendingWaves[0].delay) {
        this.spawnBatch(this.pendingWaves.shift()!.entries, playerBoxId)
      }
    }

    let collisionStarted = false

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue

      // Warmup drop-in: always ticks regardless of frozen/movementEnabled
      if (!enemy.isActive) {
        enemy.warmupTimer -= dt

        const DROP_DURATION = 0.5
        if (enemy.warmupTimer <= DROP_DURATION) {
          const t = 1 - Math.max(0, enemy.warmupTimer) / DROP_DURATION
          const eased = t * t
          const startY = enemy.spawnWorldPos.y + 5 * this.S
          enemy.mesh.position.set(
            enemy.spawnWorldPos.x,
            startY + (enemy.spawnWorldPos.y - startY) * eased,
            enemy.spawnWorldPos.z,
          )
        }

        if (enemy.warmupTimer <= 0) {
          enemy.isActive = true
          enemy.mesh.position.copy(enemy.spawnWorldPos)
        }
        continue
      }

      // ── Stalker: fully custom falcon update ──────────────────────────────
      if (enemy.type === 'stalker') {
        if (!this.frozen && this.movementEnabled) this.updateStalker(enemy, dt)
        if (enemy.stalkerPhase === 'land' && enemy.currentBoxId === playerBoxId && enemy.collidingTimer === 0) {
          enemy.collidingTimer = 0.25
          collisionStarted = true
        }
        if (enemy.collidingTimer > 0) {
          enemy.collidingTimer -= dt
          if (enemy.collidingTimer <= 0) {
            enemy.alive = false
            this.scene.remove(enemy.mesh)
            enemy.mesh.traverse(obj => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose()
                ;(Array.isArray(obj.material) ? obj.material : [obj.material])
                  .forEach((m: THREE.Material) => m.dispose())
              }
            })
          }
        }
        continue
      }

      // ── Normal enemy update ───────────────────────────────────────────────
      if (!this.frozen && this.movementEnabled && enemy.collidingTimer === 0) {
        enemy.stepTimer -= dt
        if (enemy.stepTimer <= 0) {
          enemy.stepTimer = enemy.stepInterval
          this.stepEnemy(enemy, playerBoxId)
        }
      }

      if (enemy.currentBoxId === playerBoxId && enemy.collidingTimer === 0) {
        enemy.collidingTimer = 0.25
        collisionStarted = true
      }

      const lerpFactor = enemy.collidingTimer > 0 ? 0.5 : 0.18
      const target = this.board.getBoxById(enemy.currentBoxId)
      if (target) {
        const dest = target.worldPos.clone().add(new THREE.Vector3(0, enemy.landY, 0))
        enemy.mesh.position.lerp(dest, lerpFactor)
      }

      // Bob only for eraser and boss; lateral/chaser/bouncer stay grounded
      const hasBob = enemy.type === 'eraser' || enemy.type === 'boss'
      if (hasBob && enemy.collidingTimer === 0) {
        enemy.mesh.position.y += Math.sin(Date.now() * 0.002 + enemy.id) * 0.002
      }

      if (enemy.collidingTimer > 0) {
        enemy.collidingTimer -= dt
        if (enemy.collidingTimer <= 0) {
          enemy.alive = false
          this.scene.remove(enemy.mesh)
          enemy.mesh.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose()
              ;(Array.isArray(obj.material) ? obj.material : [obj.material])
                .forEach((m: THREE.Material) => m.dispose())
            }
          })
        }
      }
    }

    return { collisionStarted }
  }

  checkCollision(playerBoxId: number): boolean {
    return this.enemies.some(e => e.alive && e.currentBoxId === playerBoxId)
  }

  clear(): void {
    this.frozen = false
    this.movementEnabled = false
    this.pendingWaves = []
    this.waveAccum = 0
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh)
      enemy.mesh.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
    }
    this.enemies = []
  }

  // ── Movement logic per type ───────────────────────────────────────────────

  private stepEnemy(enemy: Enemy, playerBoxId: number): void {
    switch (enemy.type) {
      case 'chaser':  this.stepChaser(enemy, playerBoxId); break
      case 'bouncer': this.stepBouncer(enemy); break
      case 'eraser':  this.stepEraser(enemy); break
      case 'lateral': this.stepLateral(enemy); break
      case 'boss':    this.stepBoss(enemy, playerBoxId); break
    }
  }

  private faceToward(enemy: Enemy, from: HexBox, to: HexBox): void {
    const dx = to.worldPos.x - from.worldPos.x
    const dz = to.worldPos.z - from.worldPos.z
    if (dx * dx + dz * dz > 0.0001) enemy.mesh.rotation.y = Math.atan2(dx, dz)
  }

  private isPortal(boxId: number): boolean {
    return this.board.isPortalBox(boxId)
  }

  private stepChaser(enemy: Enemy, playerBoxId: number): void {
    const current = this.board.getBoxById(enemy.currentBoxId)
    const player = this.board.getBoxById(playerBoxId)
    if (!current || !player) return

    const adjacent = this.board.getAdjacentIds(current)
      .map(id => this.board.getBoxById(id)!)
      .filter(b => Boolean(b) && !this.isPortal(b.id))

    if (adjacent.length === 0) return

    // Move to the adjacent box with minimum distance to player
    const best = adjacent.reduce((prev, box) => {
      const d = Math.abs(box.row - player.row) + Math.abs(box.col - player.col)
      const dp = Math.abs(prev.row - player.row) + Math.abs(prev.col - player.col)
      return d < dp ? box : prev
    })

    this.faceToward(enemy, current, best)
    enemy.currentBoxId = best.id
  }

  private stepBouncer(enemy: Enemy): void {
    const current = this.board.getBoxById(enemy.currentBoxId)
    if (!current) return

    // Only consider adjacent tiles (no teleport)
    const neighbors = this.board.getAdjacentIds(current)
      .map(id => this.board.getBoxById(id)!)
      .filter(b => b && b.id !== this.board.safeZoneId && !this.isPortal(b.id))

    // Move in current direction (lateralDir +1 = increasing row, -1 = decreasing)
    let targets = neighbors.filter(b => Math.sign(b.row - current.row) === enemy.lateralDir)

    if (targets.length === 0) {
      // Edge reached — reverse and move back
      enemy.lateralDir *= -1
      targets = neighbors.filter(b => Math.sign(b.row - current.row) === enemy.lateralDir)
    }

    if (targets.length > 0) {
      const next = targets[Math.floor(this.rng.next() * targets.length)]
      this.faceToward(enemy, current, next)
      enemy.currentBoxId = next.id
    }
  }

  private stepEraser(enemy: Enemy): void {
    const current = this.board.getBoxById(enemy.currentBoxId)
    if (!current) return

    const adjacent = this.board.getAdjacentIds(current)
      .filter(id => !this.isPortal(id))
    if (adjacent.length === 0) return

    const targetId = adjacent[Math.floor(this.rng.next() * adjacent.length)]
    enemy.currentBoxId = targetId

    // Only erase every other tile
    enemy.eraserToggle = !enemy.eraserToggle
    if (enemy.eraserToggle) {
      const targetBox = this.board.getBoxById(targetId)
      if (targetBox && targetBox.state === 'highlighted') {
        this.board.resetBox(targetBox)
      }
    }
  }

  private stepLateral(enemy: Enemy): void {
    const current = this.board.getBoxById(enemy.currentBoxId)
    if (!current) return

    // Prefers horizontal movement (same row), falls back to random adjacent
    const adjacent = this.board.getAdjacentIds(current)
      .filter(id => !this.isPortal(id))
    const sameRow = adjacent
      .map(id => this.board.getBoxById(id)!)
      .filter(b => b && b.row === current.row)

    if (sameRow.length > 0) {
      const preferred = sameRow.find(b => Math.sign(b.col - current.col) === enemy.lateralDir)
      if (preferred) {
        this.faceToward(enemy, current, preferred)
        enemy.currentBoxId = preferred.id
        return
      }
      enemy.lateralDir *= -1
      const reversed = sameRow.find(b => Math.sign(b.col - current.col) === enemy.lateralDir)
      if (reversed) {
        this.faceToward(enemy, current, reversed)
        enemy.currentBoxId = reversed.id
        return
      }
    }

    // No same-row option — move to an adjacent row
    const fallback = adjacent[Math.floor(this.rng.next() * adjacent.length)]
    if (fallback !== undefined) {
      const fallbackBox = this.board.getBoxById(fallback)
      if (fallbackBox) this.faceToward(enemy, current, fallbackBox)
      enemy.currentBoxId = fallback
    }
  }

  private updateStalker(enemy: Enemy, dt: number): void {
    const DIVE_DURATION = 0.55
    const LAND_DURATION = 0.35
    const HOVER_DURATION = 3.0

    const currentBox = this.board.getBoxById(enemy.currentBoxId)
    if (!currentBox) return

    switch (enemy.stalkerPhase) {
      case 'hover': {
        const hoverY = currentBox.worldPos.y + this.board.tileTopY + 5 * this.S
        enemy.mesh.position.set(currentBox.worldPos.x, hoverY, currentBox.worldPos.z)
        enemy.stalkerTimer -= dt
        if (enemy.stalkerTimer <= 0) {
          const boxes = this.board.boxes.filter(b => !this.isPortal(b.id) && b.id !== this.board.safeZoneId)
          if (boxes.length === 0) break
          const target = boxes[Math.floor(this.rng.next() * boxes.length)]
          enemy.stalkerDiveFrom = enemy.mesh.position.clone()
          enemy.currentBoxId = target.id
          enemy.stalkerPhase = 'dive'
          enemy.stalkerTimer = DIVE_DURATION
        }
        break
      }
      case 'dive': {
        const targetBox = this.board.getBoxById(enemy.currentBoxId)
        if (!targetBox || !enemy.stalkerDiveFrom) break
        const targetGroundY = targetBox.worldPos.y + this.board.tileTopY
        const t = 1 - enemy.stalkerTimer / DIVE_DURATION
        const eased = t * t
        enemy.mesh.position.set(
          enemy.stalkerDiveFrom.x + (targetBox.worldPos.x - enemy.stalkerDiveFrom.x) * eased,
          enemy.stalkerDiveFrom.y + (targetGroundY - enemy.stalkerDiveFrom.y) * eased,
          enemy.stalkerDiveFrom.z + (targetBox.worldPos.z - enemy.stalkerDiveFrom.z) * eased,
        )
        enemy.stalkerTimer -= dt
        if (enemy.stalkerTimer <= 0) {
          enemy.mesh.position.set(targetBox.worldPos.x, targetGroundY, targetBox.worldPos.z)
          enemy.stalkerPhase = 'land'
          enemy.stalkerTimer = LAND_DURATION
        }
        break
      }
      case 'land': {
        enemy.stalkerTimer -= dt
        if (enemy.stalkerTimer <= 0) {
          enemy.stalkerPhase = 'hover'
          enemy.stalkerTimer = HOVER_DURATION
        }
        break
      }
    }
  }

  private stepBoss(enemy: Enemy, playerBoxId: number): void {
    // Double-steps toward the player each turn, erasing every tile it touches
    for (let i = 0; i < 2; i++) {
      this.stepChaser(enemy, playerBoxId)
      const landed = this.board.getBoxById(enemy.currentBoxId)
      if (landed && landed.state === 'highlighted') this.board.resetBox(landed)
    }
  }

  private pickSpawnBox(type: EnemyType, excludeIds: Set<number>): HexBox | undefined {
    const boxes = this.board.boxes
    const safeId = this.board.safeZoneId

    const safe = (b: HexBox) => b.id !== safeId && !excludeIds.has(b.id) && !this.isPortal(b.id)

    switch (type) {
      case 'bouncer': {
        const top = this.board.getTopBoxes().filter(safe)
        if (top.length > 0) return top[Math.floor(this.rng.next() * top.length)]
        break
      }
      case 'lateral': {
        const rows = boxes.map(b => b.row)
        const minR = Math.min(...rows), maxR = Math.max(...rows)
        const lo = minR + Math.floor((maxR - minR) * 0.25)
        const hi = minR + Math.floor((maxR - minR) * 0.75)
        const mid = boxes.filter(b => b.row >= lo && b.row <= hi && safe(b))
        if (mid.length > 0) return mid[Math.floor(this.rng.next() * mid.length)]
        break
      }
    }

    const pool = boxes.filter(safe)
    return pool[Math.floor(this.rng.next() * pool.length)]
  }
}

// ── Placeholder mesh builders ─────────────────────────────────────────────────

function buildPlaceholderMesh(type: EnemyType, index: number, S: number): THREE.Group {
  switch (type) {
    case 'lateral':  return buildGlbEnemy(_enemy01Template, index, S)
    case 'chaser':   return buildGlbEnemy(_enemy02Template, index, S)
    case 'eraser':   return buildGlbEnemy(_enemy03Template, index, S)
    case 'bouncer':  return buildGlbEnemy(_enemy04Template, index, S)
    case 'stalker':  return buildGlbEnemy(_enemy05Template, index, S)
    case 'boss':     return buildGlbEnemy(_finalBossTemplate, index, S)
  }
}

function buildGlbEnemy(template: THREE.Group | null, index: number, S: number): THREE.Group {
  if (!template) return buildLuckyChip(index, S)
  const outer = new THREE.Group()
  const clone = template.clone(true)
  clone.scale.setScalar(S / Board.tileRadius)
  outer.add(clone)
  return outer
}

// Lucky Chip — flat casino chip cylinder with colored rings (fallback when GLB missing)
function buildLuckyChip(index: number, S: number): THREE.Group {
  const g = new THREE.Group()
  const colors = [0xffd700, 0xff4400, 0x00aaff, 0x00ff88]
  const chipColor = colors[index % colors.length]

  // Main chip body
  const chipGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.14, 24)
  const chipMat = new THREE.MeshStandardMaterial({ color: chipColor, metalness: 0.4, roughness: 0.3 })
  const chip = new THREE.Mesh(chipGeo, chipMat)
  chip.castShadow = true
  g.add(chip)

  // White edge stripe segments (6 notches around rim)
  for (let i = 0; i < 6; i++) {
    const stripeGeo = new THREE.BoxGeometry(0.1, 0.16, 0.08)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    const stripe = new THREE.Mesh(stripeGeo, stripeMat)
    const angle = (i / 6) * Math.PI * 2
    stripe.position.set(Math.cos(angle) * 0.33, 0, Math.sin(angle) * 0.33)
    stripe.rotation.y = angle
    g.add(stripe)
  }

  // Top face — dark center circle with suit symbol (sphere stand-in)
  const faceGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.02, 16)
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })
  const face = new THREE.Mesh(faceGeo, faceMat)
  face.position.y = 0.08
  g.add(face)

  // Dollar sign stand-in: small gold torus on face
  const torusGeo = new THREE.TorusGeometry(0.09, 0.025, 6, 12)
  const torusMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.1, emissive: 0x443300 })
  const torus = new THREE.Mesh(torusGeo, torusMat)
  torus.position.y = 0.10
  torus.rotation.x = Math.PI / 2
  g.add(torus)

  g.scale.setScalar(S)
  return g
}

