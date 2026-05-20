import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Board, HexBox } from './board'

let _duckyTemplate: THREE.Group | null = null

export type PlayerState = 'idle' | 'jumping' | 'dead'

export class Player {
  public currentBoxId: number = 0
  public state: PlayerState = 'idle'
  public mesh: THREE.Group

  private board: Board
  private scene: THREE.Scene
  private jumpTween: { active: boolean; t: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null
  private deathTween: { t: number; startY: number } | null = null

  private lifeScale = 1.0
  private shrinkTween: { t: number; fromScale: number; toScale: number } | null = null
  private invincibilityTime = 0

  private onLand: ((box: HexBox) => void) | null = null
  private onMove: (() => void) | null = null

  get isInvincible(): boolean { return this.invincibilityTime > 0 }

  static async preload(): Promise<void> {
    if (_duckyTemplate) return
    const gltf = await new GLTFLoader().loadAsync('/assets/models/Q_ducky_01.glb')
    _duckyTemplate = gltf.scene as THREE.Group

    // Center XZ on pivot, base at y=0
    const bbox = new THREE.Box3().setFromObject(_duckyTemplate)
    const center = bbox.getCenter(new THREE.Vector3())
    _duckyTemplate.position.x -= center.x
    _duckyTemplate.position.z -= center.z
    _duckyTemplate.position.y -= bbox.min.y
    _duckyTemplate.updateMatrixWorld(true)

    _duckyTemplate.traverse(obj => {
      if (obj instanceof THREE.Mesh) obj.castShadow = true
    })
  }

  constructor(scene: THREE.Scene, board: Board) {
    this.scene = scene
    this.board = board
    this.mesh = this.buildMesh()
    this.scene.add(this.mesh)
  }

  private buildMesh(): THREE.Group {
    const S = this.board.hexRadius
    const group = new THREE.Group()

    if (_duckyTemplate) {
      const clone = _duckyTemplate.clone(true)
      clone.scale.setScalar(this.board.hexRadius / Board.tileRadius)
      group.add(clone)
    } else {
      // Fallback geometric duck
      const bodyGeo = new THREE.SphereGeometry(0.38 * S, 16, 12)
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.4, metalness: 0.1 })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.position.y = 0.38 * S
      body.castShadow = true
      group.add(body)

      const headGeo = new THREE.SphereGeometry(0.22 * S, 12, 10)
      const head = new THREE.Mesh(headGeo, bodyMat)
      head.position.set(0.18 * S, 0.68 * S, 0)
      head.castShadow = true
      group.add(head)

      const billGeo = new THREE.BoxGeometry(0.18 * S, 0.07 * S, 0.12 * S)
      const billMat = new THREE.MeshStandardMaterial({ color: 0xff8800 })
      const bill = new THREE.Mesh(billGeo, billMat)
      bill.position.set(0.37 * S, 0.64 * S, 0)
      group.add(bill)
    }

    return group
  }

  spawnAt(box: HexBox): void {
    this.currentBoxId = box.id
    this.mesh.position.copy(box.worldPos).add(new THREE.Vector3(0, this.board.tileTopY, 0))
    this.state = 'idle'
  }

  tryMove(targetBoxId: number): boolean {
    if (this.state !== 'idle') return false
    const adjacent = this.board.getAdjacentIds(this.board.getBoxById(this.currentBoxId)!)
    if (!adjacent.includes(targetBoxId)) return false

    const targetBox = this.board.getBoxById(targetBoxId)
    if (!targetBox) return false

    this.jumpTo(targetBox)
    return true
  }

  private jumpTo(targetBox: HexBox): void {
    this.state = 'jumping'
    const from = this.mesh.position.clone()
    const to = targetBox.worldPos.clone().add(new THREE.Vector3(0, this.board.tileTopY, 0))

    const dx = to.x - from.x
    const dz = to.z - from.z
    if (dx * dx + dz * dz > 0.0001) this.mesh.rotation.y = Math.atan2(dx, dz)

    this.jumpTween = { active: true, t: 0, from, to }
    this.currentBoxId = targetBox.id
    this.onMove?.()
  }

  playDeath(): void {
    this.state = 'dead'
    this.jumpTween = null
    this.deathTween = { t: 0, startY: this.mesh.position.y }

    this.mesh.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial
        mat.emissive.setHex(0xff0000)
        mat.emissiveIntensity = 3
      }
    })
  }

  update(dt: number): void {
    const S = this.board.hexRadius

    if (this.deathTween) {
      this.deathTween.t = Math.min(1, this.deathTween.t + dt * 0.9)
      const t = this.deathTween.t
      this.mesh.rotation.y += dt * 18
      this.mesh.position.y = this.deathTween.startY + t * S * 5
      const scale = Math.max(0, 1 - t * t) * this.lifeScale
      this.mesh.scale.setScalar(scale)
      return
    }

    if (this.shrinkTween) {
      this.shrinkTween.t = Math.min(1, this.shrinkTween.t + dt * 1.2)
      const ease = 1 - Math.pow(1 - this.shrinkTween.t, 3)
      this.lifeScale = this.shrinkTween.fromScale + (this.shrinkTween.toScale - this.shrinkTween.fromScale) * ease
      this.mesh.scale.setScalar(this.lifeScale)
      if (this.shrinkTween.t >= 1) this.shrinkTween = null
    }

    if (this.invincibilityTime > 0) {
      this.invincibilityTime -= dt
      this.mesh.visible = Math.sin(this.invincibilityTime * 18) > 0
      if (this.invincibilityTime <= 0) {
        this.invincibilityTime = 0
        this.mesh.visible = true
      }
    }

    if (this.jumpTween?.active) {
      this.jumpTween.t = Math.min(1, this.jumpTween.t + dt * 4)
      const t = this.jumpTween.t
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      this.mesh.position.lerpVectors(this.jumpTween.from, this.jumpTween.to, ease)
      this.mesh.position.y += Math.sin(t * Math.PI) * S * 1.6

      if (t >= 1) {
        this.jumpTween.active = false
        this.state = 'idle'
        const landedBox = this.board.getBoxById(this.currentBoxId)
        if (landedBox) this.onLand?.(landedBox)
      }
    }

    if (this.state === 'idle') {
      const bob = Math.sin(Date.now() * 0.003) * S * 0.05
      this.mesh.position.y = (this.board.getBoxById(this.currentBoxId)?.worldPos.y ?? 0) + this.board.tileTopY + bob
    }
  }

  shrinkToLives(lives: number): void {
    const scales = [1.0, 0.67, 0.33]
    const target = scales[3 - lives] ?? 0.15
    this.shrinkTween = { t: 0, fromScale: this.lifeScale, toScale: target }
  }

  startInvincibility(duration: number): void {
    this.invincibilityTime = duration
  }

  resetForNewLevel(): void {
    this.lifeScale = 1.0
    this.shrinkTween = null
    this.invincibilityTime = 0
    this.mesh.scale.setScalar(1.0)
    this.mesh.visible = true
    this.mesh.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial
        mat.emissive.setHex(0x000000)
        mat.emissiveIntensity = 0
      }
    })
  }

  setBoard(board: Board): void {
    this.board = board
  }

  setOnLand(fn: (box: HexBox) => void): void { this.onLand = fn }
  setOnMove(fn: () => void): void { this.onMove = fn }

  dispose(): void {
    this.scene.remove(this.mesh)
  }
}
