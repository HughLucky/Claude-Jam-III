import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { COLORS, HEX_RADIUS } from '../constants'

export class Renderer {
  public renderer: THREE.WebGLRenderer
  public scene: THREE.Scene
  public camera: THREE.OrthographicCamera
  private container: HTMLElement
  private frustumSize = 12

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(COLORS.bg)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.camera = this.createIsometricCamera()
    this.setupLighting()
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  private createIsometricCamera(): THREE.OrthographicCamera {
    const w = window.innerWidth
    const h = window.innerHeight
    const aspect = w / h
    const frustumSize = 12
    const cam = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
       frustumSize * aspect / 2,
       frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    )
    // Classic isometric angle: 45° azimuth, ~35.26° elevation
    cam.position.set(10, 12, 10)
    cam.lookAt(0, 0, 0)
    return cam
  }

  private setupLighting(): void {
    const dirLight = new THREE.DirectionalLight(0xffffff, 2)
    dirLight.position.set(8, 16, 8)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 60
    dirLight.shadow.camera.left = -15
    dirLight.shadow.camera.right = 15
    dirLight.shadow.camera.top = 15
    dirLight.shadow.camera.bottom = -15
    this.scene.add(dirLight)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
  }

  fitCamera(tilePositions: THREE.Vector3[], tileRadius?: number): void {
    if (tilePositions.length === 0) return
    this.camera.updateMatrixWorld()
    const inv = this.camera.matrixWorldInverse
    const R = (tileRadius ?? HEX_RADIUS) * 1.3

    let maxCamX = 0, maxCamY = 0
    for (const p of tilePositions) {
      for (const [dx, dz] of [[R, R], [-R, R], [R, -R], [-R, -R]]) {
        const v = new THREE.Vector3(p.x + dx, p.y + R * 0.5, p.z + dz).applyMatrix4(inv)
        maxCamX = Math.max(maxCamX, Math.abs(v.x))
        maxCamY = Math.max(maxCamY, Math.abs(v.y))
      }
    }

    const aspect = window.innerWidth / window.innerHeight
    // Pick whichever axis is the binding constraint, add 12% breathing room
    this.frustumSize = Math.max(maxCamY * 2, maxCamX * 2 / aspect) * 1.12
    this.resize()
  }

  resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    const aspect = w / h

    this.camera.left   = -this.frustumSize * aspect / 2
    this.camera.right  =  this.frustumSize * aspect / 2
    this.camera.top    =  this.frustumSize / 2
    this.camera.bottom = -this.frustumSize / 2
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    window.removeEventListener('resize', () => this.resize())
    this.container.removeChild(this.renderer.domElement)
    this.renderer.dispose()
  }
}
