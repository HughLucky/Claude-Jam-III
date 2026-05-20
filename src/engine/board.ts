import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { COLORS, HEX_RADIUS, HEX_HEIGHT, HEX_GAP, PYRAMID_ROWS } from '../constants'
import { SeededRng } from '../utils/rng'

let _tileTemplate: THREE.Group | null = null
let _tileRadius: number = HEX_RADIUS
let _tileHeight: number = HEX_HEIGHT

export type BoxState = 'default' | 'highlighted' | 'safeZone' | 'safeZoneUsed' | 'portalDown' | 'portalUp'

export interface HexBox {
  id: number
  row: number
  col: number
  state: BoxState
  multiplier: number | null  // null = plain tile (no casino effect, no VFX)
  mesh: THREE.Group
  topMesh: THREE.Mesh
  worldPos: THREE.Vector3
  portalArrow: THREE.Group | null
}

export class Board {
  public boxes: HexBox[] = []
  public safeZoneId: number = -1
  public portalDownId: number = -1
  public portalUpId: number = -1
  private scene: THREE.Scene
  private rng: SeededRng

  // Hex geometry constants
  private readonly R: number
  private readonly H: number
  private readonly gap: number
  private readonly colSpacing: number
  private readonly rowSpacing: number

  constructor(scene: THREE.Scene, hexRadius: number = HEX_RADIUS) {
    this.scene = scene
    this.rng = new SeededRng(1)
    this.R = hexRadius
    this.H = HEX_HEIGHT * (hexRadius / HEX_RADIUS)
    this.gap = HEX_GAP * (hexRadius / HEX_RADIUS)
    this.colSpacing = Math.sqrt(3) * (this.R + this.gap)
    this.rowSpacing = 1.5 * (this.R + this.gap)
  }

  private _tileTopY = 0

  get hexRadius(): number { return this.R }
  get hexHeight(): number { return this.H }
  get tileTopY(): number { return this._tileTopY > 0 ? this._tileTopY : this.H }

  static get tileRadius(): number { return _tileRadius }

  static async preload(): Promise<void> {
    if (_tileTemplate) return
    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/models/Q_tile_01.glb`)
    _tileTemplate = gltf.scene as THREE.Group

    // Measure actual tile dimensions at natural scale
    const bbox = new THREE.Box3().setFromObject(_tileTemplate)
    const size = bbox.getSize(new THREE.Vector3())
    _tileRadius = Math.max(size.x, size.z) / 2
    _tileHeight = size.y

    // XZ center, Y base at 0 so worldPos = tile base and tileTopY is always positive
    const center = bbox.getCenter(new THREE.Vector3())
    _tileTemplate.position.x -= center.x
    _tileTemplate.position.y -= bbox.min.y
    _tileTemplate.position.z -= center.z
    _tileTemplate.updateMatrixWorld(true)
  }

  // Level 1 only — fixed pyramid shape
  generate(seed: number): void {
    this.clear()
    this.rng = new SeededRng(seed)

    let id = 0
    for (let row = 0; row < PYRAMID_ROWS; row++) {
      const colsInRow = row + 1
      for (let col = 0; col < colsInRow; col++) {
        const worldPos = this.hexToWorldPyramid(row, col)
        const box = this.createBox(id, row, col, worldPos)
        this.boxes.push(box)
        this.scene.add(box.mesh)
        id++
      }
    }

    const safeBox = this.getBox(PYRAMID_ROWS - 1, 0)
    if (safeBox) {
      this.safeZoneId = safeBox.id
      this.setBoxState(safeBox, 'safeZone')
    }
    this.computeTileTopY()
  }

  // Levels 2+ — organic blob, unique per run+level combo
  generateRandom(seed: number, targetCount: number): void {
    this.clear()
    this.rng = new SeededRng(seed)

    // Axial hex directions: [Δrow=Δq, Δcol=Δr]
    const DIRS: [number, number][] = [[0,-1],[0,1],[1,0],[-1,0],[1,-1],[-1,1]]
    const coordSet = new Set<string>()
    const coords: [number, number][] = []

    const add = (r: number, c: number) => {
      const key = `${r},${c}`
      if (!coordSet.has(key)) { coordSet.add(key); coords.push([r, c]) }
    }

    add(0, 0)  // player spawn always the origin

    while (coords.length < targetCount) {
      // Collect every possible expansion frontier edge
      const expansions: [number, number][] = []
      for (const [r, c] of coords) {
        for (const [dr, dc] of DIRS) {
          if (!coordSet.has(`${r+dr},${c+dc}`)) expansions.push([r+dr, c+dc])
        }
      }
      if (expansions.length === 0) break
      const [nr, nc] = expansions[Math.floor(this.rng.next() * expansions.length)]
      add(nr, nc)
    }

    // Center the blob so the camera's lookAt(origin) sits in the middle
    let sumR = 0, sumC = 0
    for (const [r, c] of coords) { sumR += r; sumC += c }
    const cR = sumR / coords.length
    const cC = sumC / coords.length

    let id = 0
    for (const [r, c] of coords) {
      const worldPos = this.hexToWorldGeneral(r, c, cR, cC)
      const box = this.createBox(id, r, c, worldPos)
      this.boxes.push(box)
      this.scene.add(box.mesh)
      id++
    }

    // Safe zone: box farthest from player spawn using axial hex distance
    let safeBox = this.boxes[0]
    let maxDist = 0
    for (const box of this.boxes) {
      const d = (Math.abs(box.row) + Math.abs(box.col) + Math.abs(box.row + box.col)) / 2
      if (d > maxDist) { maxDist = d; safeBox = box }
    }
    this.safeZoneId = safeBox.id
    this.setBoxState(safeBox, 'safeZone')
    this.computeTileTopY()
  }

  private computeTileTopY(): void {
    if (this.boxes.length === 0) return
    const box = this.boxes[0]
    box.mesh.updateMatrixWorld(true)
    const bbox = new THREE.Box3().setFromObject(box.mesh)
    this._tileTopY = bbox.max.y - box.mesh.position.y
  }

  // Returns the "top" boxes (closest to player spawn origin) — used by enemy bouncer
  getTopBoxes(): HexBox[] {
    if (this.boxes.length === 0) return []
    const minRow = Math.min(...this.boxes.map(b => b.row))
    return this.boxes.filter(b => b.row <= minRow + 1)
  }

  private hexToWorldPyramid(row: number, col: number): THREE.Vector3 {
    const totalColsInRow = row + 1
    const offsetX = -(totalColsInRow - 1) * this.colSpacing / 2
    const localX = offsetX + col * this.colSpacing
    const localZ = row * this.rowSpacing
    const c45 = Math.SQRT1_2
    const x = localX * c45 + localZ * c45
    const z = -localX * c45 + localZ * c45
    const centerOffset = ((PYRAMID_ROWS - 1) / 2) * this.rowSpacing * c45
    // Each successive row steps down by scaled tile thickness + gap
    const scaledH = _tileHeight * (this.R / _tileRadius)
    const y = -row * (scaledH + this.gap)
    return new THREE.Vector3(x - centerOffset, y, z - centerOffset)
  }

  private hexToWorldGeneral(row: number, col: number, centerRow: number, centerCol: number): THREE.Vector3 {
    const dq = row - centerRow
    const dr = col - centerCol
    const localX = this.colSpacing * (dq + dr * 0.5)
    const localZ = this.rowSpacing * dr
    const c45 = Math.SQRT1_2
    const x = localX * c45 + localZ * c45
    const z = -localX * c45 + localZ * c45
    // Tiles further from camera (larger dq+dr) sit lower — creates staircase depth illusion
    const scaledH = _tileHeight * (this.R / _tileRadius)
    const y = -(dq + dr) * (scaledH + this.gap)
    return new THREE.Vector3(x, y, z)
  }

  getBox(row: number, col: number): HexBox | undefined {
    return this.boxes.find(b => b.row === row && b.col === col)
  }

  getBoxById(id: number): HexBox | undefined {
    return this.boxes.find(b => b.id === id)
  }

  getAdjacentIds(box: HexBox): number[] {
    const { row, col } = box
    // Axial hex neighbors — all appear as horizontal or 60° diagonal on screen (none vertical)
    const candidates = [
      { row: row,     col: col - 1 }, // upper-left
      { row: row,     col: col + 1 }, // lower-right
      { row: row + 1, col: col     }, // right
      { row: row - 1, col: col     }, // left
      { row: row + 1, col: col - 1 }, // upper-right
      { row: row - 1, col: col + 1 }, // lower-left
    ]
    return candidates
      .map(c => this.getBox(c.row, c.col))
      .filter((b): b is HexBox => b !== undefined)
      .map(b => b.id)
  }

  highlightBox(box: HexBox): void {
    if (box.state === 'safeZone' || box.state === 'safeZoneUsed' || box.state === 'portalDown' || box.state === 'portalUp') return
    this.setBoxState(box, 'highlighted')
  }

  resetBox(box: HexBox): void {
    if (box.state === 'safeZone' || box.state === 'safeZoneUsed') return
    this.setBoxState(box, 'default')
  }

  get totalBoxes(): number {
    return this.boxes.filter(b =>
      b.state !== 'safeZone' && b.state !== 'safeZoneUsed' &&
      b.state !== 'portalDown' && b.state !== 'portalUp'
    ).length
  }

  get highlightedCount(): number {
    return this.boxes.filter(b => b.state === 'highlighted').length
  }

  get isComplete(): boolean {
    return this.boxes.every(b =>
      b.state === 'highlighted' || b.state === 'safeZone' || b.state === 'safeZoneUsed' ||
      b.state === 'portalDown' || b.state === 'portalUp'
    )
  }

  isPortalBox(id: number): boolean {
    return id === this.portalDownId || id === this.portalUpId
  }

  private setBoxState(box: HexBox, state: BoxState): void {
    box.state = state
    const color = state === 'highlighted'   ? COLORS.boxHighlighted
                : state === 'safeZone'      ? 0xffee44
                : state === 'safeZoneUsed'  ? 0x332211
                : state === 'portalDown'    ? 0xff6600
                : state === 'portalUp'      ? 0x00ccff
                : COLORS.boxDefault
    const emissive = state === 'highlighted'   ? 0x004422
                   : state === 'safeZone'      ? 0x997700
                   : state === 'safeZoneUsed'  ? 0x110800
                   : state === 'portalDown'    ? 0x441100
                   : state === 'portalUp'      ? 0x001144
                   : 0x000000
    const emissiveIntensity = (state === 'portalDown' || state === 'portalUp') ? 2
                            : state === 'safeZone' ? 2
                            : 1
    const mats = Array.isArray(box.topMesh.material) ? box.topMesh.material : [box.topMesh.material]
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.setHex(color)
        mat.emissive.setHex(emissive)
        mat.emissiveIntensity = emissiveIntensity
      }
    }
  }

  private createBox(id: number, row: number, col: number, pos: THREE.Vector3): HexBox {
    const group = new THREE.Group()
    group.position.copy(pos)

    let topMesh!: THREE.Mesh

    if (_tileTemplate) {
      const clone = _tileTemplate.clone(true)
      clone.scale.setScalar(this.R / _tileRadius)

      // Deep-clone materials so each tile can be coloured independently
      clone.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return
        obj.castShadow = true
        obj.receiveShadow = true
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(m => m.clone())
          : (obj.material as THREE.Material).clone()
      })

      group.add(clone)

      // Identify the top face: mesh whose world-Y centre is highest
      clone.updateMatrixWorld(true)
      let maxY = -Infinity
      clone.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return
        const wp = new THREE.Vector3()
        obj.getWorldPosition(wp)
        if (wp.y > maxY) { maxY = wp.y; topMesh = obj }
      })
    } else {
      // Procedural fallback (used if preload() was not called)
      const bodyGeo = this.makeHexPrismGeo(this.R * 0.97, this.H)
      const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x110022, metalness: 0.8, roughness: 0.3 }))
      bodyMesh.castShadow = true
      bodyMesh.receiveShadow = true
      group.add(bodyMesh)

      const topGeo = this.makeHexCapGeo(this.R * 0.90)
      const tMesh = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: COLORS.boxDefault, metalness: 0.3, roughness: 0.5, emissive: 0x000000 }))
      tMesh.position.y = this.H / 2 + 0.001
      group.add(tMesh)
      topMesh = tMesh

      const edgeGeo = new THREE.TorusGeometry(this.R * 0.92, 0.04, 6, 6)
      const edgeMesh = new THREE.Mesh(edgeGeo, new THREE.MeshStandardMaterial({ color: COLORS.boxEdge, metalness: 1, roughness: 0.1 }))
      edgeMesh.rotation.x = Math.PI / 2
      edgeMesh.position.y = this.H / 2
      group.add(edgeMesh)
    }

    const multiplier = this.drawMultiplier()
    return { id, row, col, state: 'default', multiplier, mesh: group, topMesh, worldPos: pos.clone(), portalArrow: null }
  }

  private makeHexPrismGeo(radius: number, height: number): THREE.CylinderGeometry {
    return new THREE.CylinderGeometry(radius, radius, height, 6, 1)
  }

  private makeHexCapGeo(radius: number): THREE.CylinderGeometry {
    return new THREE.CylinderGeometry(radius, radius, 0.02, 6, 1)
  }

  private drawMultiplier(): number | null {
    // ~60% of tiles are plain — no multiplier effect
    if (this.rng.next() < 0.60) return null

    const table = [
      { value: 0.2, weight: 10 },
      { value: 0.5, weight: 20 },
      { value: 0.8, weight: 15 },
      { value: 1.5, weight: 20 },
      { value: 2.0, weight: 18 },
      { value: 5.0, weight: 10 },
      { value: 10.0, weight: 5  },
      { value: 25.0, weight: 2  },
    ]
    const total = table.reduce((s, e) => s + e.weight, 0)
    let r = this.rng.next() * total
    for (const entry of table) {
      r -= entry.weight
      if (r <= 0) return entry.value
    }
    return 1.5
  }

  setGlobalOpacity(alpha: number): void {
    for (const box of this.boxes) {
      box.mesh.traverse(obj => {
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

  setVisible(visible: boolean): void {
    for (const box of this.boxes) box.mesh.visible = visible
  }

  designatePortals(hasDown: boolean, hasUp: boolean): void {
    const candidates = this.boxes.filter(b => b.id !== 0 && b.id !== this.safeZoneId)
    if (candidates.length === 0) return
    const sorted = [...candidates].sort((a, b) =>
      (a.worldPos.x + a.worldPos.z) - (b.worldPos.x + b.worldPos.z)
    )
    if (hasDown && sorted.length > 0) {
      const tile = sorted[sorted.length - 1]
      this.portalDownId = tile.id
      this.setBoxState(tile, 'portalDown')
      tile.portalArrow = this.buildPortalArrow('down')
      tile.mesh.add(tile.portalArrow)
    }
    if (hasUp && sorted.length > 1) {
      const tile = sorted[0]
      this.portalUpId = tile.id
      this.setBoxState(tile, 'portalUp')
      tile.portalArrow = this.buildPortalArrow('up')
      tile.mesh.add(tile.portalArrow)
    }
  }

  private buildPortalArrow(dir: 'up' | 'down'): THREE.Group {
    const R = this.R
    const color = dir === 'down' ? 0xff6600 : 0x00ccff
    const emissive = dir === 'down' ? 0x441100 : 0x001144

    const group = new THREE.Group()

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(R * 0.08, R * 0.08, R * 0.55, 8)
    const shaftMat = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 3, transparent: true, opacity: 0.92,
    })
    const shaft = new THREE.Mesh(shaftGeo, shaftMat)
    shaft.position.y = dir === 'down' ? -R * 0.28 : R * 0.28
    group.add(shaft)

    // Arrowhead
    const headGeo = new THREE.ConeGeometry(R * 0.24, R * 0.42, 8)
    const headMat = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 4, transparent: true, opacity: 0.95,
    })
    const head = new THREE.Mesh(headGeo, headMat)
    if (dir === 'down') {
      head.rotation.z = Math.PI   // flip to point down
      head.position.y = -R * 0.78
    } else {
      head.position.y = R * 0.78
    }
    group.add(head)

    // Second smaller arrow for visual emphasis
    const head2Geo = new THREE.ConeGeometry(R * 0.16, R * 0.30, 8)
    const head2 = new THREE.Mesh(head2Geo, headMat)
    if (dir === 'down') {
      head2.rotation.z = Math.PI
      head2.position.y = -R * 1.18
    } else {
      head2.position.y = R * 1.18
    }
    group.add(head2)


    // Position the group above the tile surface
    group.position.y = this._tileTopY + R * 0.9

    return group
  }

  update(dt: number): void {
    const t = Date.now() * 0.001
    for (const box of this.boxes) {
      if (box.portalArrow) {
        const baseY = this._tileTopY + this.R * 0.9
        const bob = Math.sin(t * 2.8 + box.id * 0.9) * this.R * 0.22
        box.portalArrow.position.y = baseY + (box.state === 'portalDown' ? -bob : bob)
        box.portalArrow.rotation.y += dt * 2.0
        const pulse = 0.88 + Math.sin(t * 3.5 + box.id * 0.5) * 0.12
        box.portalArrow.scale.setScalar(pulse)
      }

      if (box.state === 'safeZone') {
        const ei = 1.6 + Math.sin(t * 3.2) * 0.9
        const mats = Array.isArray(box.topMesh.material) ? box.topMesh.material : [box.topMesh.material]
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) mat.emissiveIntensity = ei
        }
      }
    }
  }

  markSafeZoneUsed(): void {
    if (this.safeZoneId === -1) return
    const box = this.getBoxById(this.safeZoneId)
    if (box) this.setBoxState(box, 'safeZoneUsed')
  }

  clearSafeZone(): void {
    if (this.safeZoneId === -1) return
    const box = this.getBoxById(this.safeZoneId)
    if (box) this.setBoxState(box, 'default')
    this.safeZoneId = -1
  }

  clear(): void {
    for (const box of this.boxes) {
      this.scene.remove(box.mesh)
      box.mesh.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return
        // GLB geometry is shared with the template — only dispose procedural geometry
        if (!_tileTemplate) obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      })
    }
    this.boxes = []
  }
}
