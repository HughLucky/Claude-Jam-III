import * as THREE from 'three'
import { Board } from './board'
import { EnemyManager } from './enemies'
import { EnemySpawn } from '../systems/levels'

export class FloorManager {
  private scene: THREE.Scene
  public boards: Board[] = []
  public enemyManagers: EnemyManager[] = []
  public currentFloor = 0

  constructor(scene: THREE.Scene, floorCount: number) {
    this.scene = scene
    this.reconfigure(floorCount)
  }

  get board(): Board { return this.boards[this.currentFloor] }
  get enemyManager(): EnemyManager { return this.enemyManagers[this.currentFloor] }
  get floorCount(): number { return this.boards.length }

  reconfigure(floorCount: number, hexRadius: number = Board.tileRadius): void {
    this.clear()
    this.boards = Array.from({ length: floorCount }, () => new Board(this.scene, hexRadius))
    this.enemyManagers = this.boards.map(b => new EnemyManager(this.scene, b))
    this.currentFloor = 0
  }

  generateFloors(seed: number, tilesPerFloor: number): void {
    for (let i = 0; i < this.boards.length; i++) {
      const floorSeed = (seed ^ ((i + 1) * 2_654_435_761)) >>> 0
      this.boards[i].generateRandom(floorSeed, tilesPerFloor)
      const hasDown = i < this.boards.length - 1
      const hasUp = i > 0
      this.boards[i].designatePortals(hasDown, hasUp)
    }

    this.setCurrentFloor(0)
  }

  setCurrentFloor(floor: number): void {
    this.currentFloor = Math.max(0, Math.min(floor, this.boards.length - 1))
    for (let i = 0; i < this.boards.length; i++) {
      const dist = Math.abs(i - this.currentFloor)
      if (dist === 0) {
        this.boards[i].setGlobalOpacity(1.0)
        this.boards[i].setVisible(true)
        this.enemyManagers[i].setOpacity(1.0)
        this.enemyManagers[i].setMeshVisible(true)
      } else {
        this.boards[i].setVisible(false)
        this.enemyManagers[i].setMeshVisible(false)
      }
    }
  }

  spawnAll(spawns: EnemySpawn[], speed: number, seed: number, playerBoxId: number): void {
    for (let i = 0; i < this.enemyManagers.length; i++) {
      const floorSeed = (seed ^ (i * 999_983)) >>> 0
      const exclusionBoxId = i === 0 ? playerBoxId : -1
      this.enemyManagers[i].spawn(spawns, speed, floorSeed, exclusionBoxId)
    }
    // Re-apply floor visibility so enemies spawned on hidden floors start invisible
    this.setCurrentFloor(this.currentFloor)
  }

  update(dt: number): void {
    for (const b of this.boards) b.update(dt)
  }

  get totalBoxes(): number {
    return this.boards.reduce((sum, b) => sum + b.totalBoxes, 0)
  }

  get highlightedCount(): number {
    return this.boards.reduce((sum, b) => sum + b.highlightedCount, 0)
  }

  get isComplete(): boolean {
    return this.boards.every(b => b.isComplete)
  }

  clear(): void {
    for (const b of this.boards) b.clear()
    for (const em of this.enemyManagers) em.clear()
    this.boards = []
    this.enemyManagers = []
    this.currentFloor = 0
  }
}
