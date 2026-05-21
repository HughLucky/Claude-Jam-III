import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { COLORS, HEX_RADIUS } from '../constants'

export class Renderer {
  public renderer: THREE.WebGLRenderer
  public scene: THREE.Scene
  public camera: THREE.OrthographicCamera
  private container: HTMLElement
  private frustumSize = 12

  private cubeRenderTarget: THREE.WebGLCubeRenderTarget
  private cubeCamera: THREE.CubeCamera
  private _reflFrame = 0
  private roomEnvTexture: THREE.Texture | null = null
  private bgLoader = new THREE.TextureLoader()

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(COLORS.bg)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.8
    container.appendChild(this.renderer.domElement)

    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    })
    this.cubeCamera = new THREE.CubeCamera(0.1, 50, this.cubeRenderTarget)
    this.cubeCamera.position.set(0, 1.5, 0)
    this.scene.add(this.cubeCamera)

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
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(8, 16, 8)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 60
    dirLight.shadow.camera.left = -15
    dirLight.shadow.camera.right = 15
    dirLight.shadow.camera.top = 15
    dirLight.shadow.camera.bottom = -15
    dirLight.shadow.bias = -0.001
    dirLight.shadow.normalBias = 0.05
    dirLight.shadow.intensity = 1
    dirLight.shadow.radius = 5
    dirLight.shadow.camera.updateProjectionMatrix()
    this.scene.add(dirLight)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.roomEnvTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environment = this.roomEnvTexture
    this.scene.environmentIntensity = 1.2
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

  // Lock the frustum to a pre-computed size so secondary floors show tiles at
  // the same visual size as floor 0, regardless of blob shape variation.
  lockFrustum(): number { return this.frustumSize }
  applyLockedFrustum(size: number): void { this.frustumSize = size; this.resize() }

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

  setBackground(url: string, intensity = 0.15): void {
    this.bgLoader.load(url, texture => {
      this.scene.background = texture
      this.scene.backgroundIntensity = intensity
    })
  }

  get reflectionTexture(): THREE.Texture { return this.cubeRenderTarget.texture }

  updateReflectionProbe(): void {
    if (++this._reflFrame % 3 !== 0) return
    this.cubeCamera.update(this.renderer, this.scene)
    // Restore RoomEnvironment so IBL lighting stays consistent
    this.scene.environment = this.roomEnvTexture
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
