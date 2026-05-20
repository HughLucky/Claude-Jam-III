import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  life: number
  maxLife: number
}

const PARTICLE_COLORS = [0xffd700, 0xff3300, 0xffffff, 0xff0088, 0x00ffcc, 0xcc00ff]

// ── Screen flash ──────────────────────────────────────────────────────────────
function injectVfxStyles(): void {
  if (document.getElementById('qs-vfx-style')) return
  const s = document.createElement('style')
  s.id = 'qs-vfx-style'
  s.textContent = `
    .vfx-flash {
      position: absolute; inset: 0; z-index: 50; pointer-events: none;
      background: radial-gradient(circle at center,
        rgba(255,60,0,0.9) 0%, rgba(160,0,0,0.5) 50%, transparent 100%);
      animation: vfxFlash 1.6s ease-out forwards;
    }
    @keyframes vfxFlash {
      0%   { opacity: 1; }
      15%  { opacity: 0.7; }
      35%  { opacity: 0.9; }
      100% { opacity: 0; }
    }
    .vfx-darken {
      position: absolute; inset: 0; z-index: 49; pointer-events: none;
      background: #000; opacity: 0;
      animation: vfxDarken 2.0s ease-in forwards;
    }
    @keyframes vfxDarken {
      0%   { opacity: 0; }
      60%  { opacity: 0; }
      100% { opacity: 0.88; }
    }
  `
  document.head.appendChild(s)
}

export function triggerScreenFlash(uiRoot: HTMLElement): void {
  injectVfxStyles()
  const flash = document.createElement('div')
  flash.className = 'vfx-flash'
  uiRoot.appendChild(flash)
  const darken = document.createElement('div')
  darken.className = 'vfx-darken'
  uiRoot.appendChild(darken)
  setTimeout(() => { flash.remove(); darken.remove() }, 2200)
}

// ── Camera shake ──────────────────────────────────────────────────────────────
export class CameraShake {
  private elapsed = 0
  private duration: number
  private intensity: number
  private base: THREE.Vector3

  constructor(camera: THREE.Camera, duration = 0.5, intensity = 0.18) {
    this.duration = duration
    this.intensity = intensity
    this.base = camera.position.clone()
  }

  update(dt: number, camera: THREE.Camera): boolean {
    if (this.elapsed >= this.duration) {
      camera.position.copy(this.base)
      return false
    }
    this.elapsed += dt
    const decay = 1 - this.elapsed / this.duration
    camera.position.set(
      this.base.x + (Math.random() - 0.5) * this.intensity * decay,
      this.base.y + (Math.random() - 0.5) * this.intensity * decay * 0.5,
      this.base.z + (Math.random() - 0.5) * this.intensity * decay,
    )
    return true
  }
}

// ── Particle burst ─────────────────────────────────────────────────────────────
export class ParticleBurst {
  private particles: Particle[] = []
  private scene: THREE.Scene
  public done = false

  constructor(scene: THREE.Scene, origin: THREE.Vector3, count = 28) {
    this.scene = scene
    this.spawn(origin, count)
  }

  private spawn(origin: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const isOcta = Math.random() > 0.45
      const size = 0.07 + Math.random() * 0.13
      const geo = isOcta
        ? new THREE.OctahedronGeometry(size, 0)
        : new THREE.SphereGeometry(size, 5, 5)
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.6),
        transparent: true,
        opacity: 1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(origin).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4,
      ))
      mesh.castShadow = false

      const angle = Math.random() * Math.PI * 2
      const hSpeed = 2.5 + Math.random() * 4.5
      const vSpeed = 2.0 + Math.random() * 4.0
      const velocity = new THREE.Vector3(
        Math.cos(angle) * hSpeed,
        vSpeed,
        Math.sin(angle) * hSpeed,
      )
      const spin = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      )
      const maxLife = 0.7 + Math.random() * 0.9

      this.scene.add(mesh)
      this.particles.push({ mesh, velocity, spin, life: maxLife, maxLife })
    }
  }

  update(dt: number): void {
    if (this.done) return
    let alive = 0
    for (const p of this.particles) {
      if (p.life <= 0) continue
      alive++
      p.life -= dt
      p.velocity.y -= 6 * dt  // gravity
      p.mesh.position.addScaledVector(p.velocity, dt)
      p.mesh.rotation.x += p.spin.x * dt
      p.mesh.rotation.y += p.spin.y * dt
      p.mesh.rotation.z += p.spin.z * dt
      const t = Math.max(0, p.life / p.maxLife)
      p.mesh.scale.setScalar(t * 0.9 + 0.1)
      ;(p.mesh.material as THREE.MeshStandardMaterial).opacity = t
    }
    if (alive === 0) {
      this.dispose()
      this.done = true
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.MeshStandardMaterial).dispose()
    }
    this.particles = []
  }
}

// ── Multiplier pop ────────────────────────────────────────────────────────────
export class MultiplierBurst {
  private sprite: THREE.Sprite
  private scene: THREE.Scene
  private elapsed = 0
  private readonly duration = 1.8
  private readonly driftSpeed: number
  public done = false

  constructor(scene: THREE.Scene, position: THREE.Vector3, multiplier: number, hexRadius = 0.4) {
    this.scene = scene
    const scale = hexRadius / 0.4

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    const ctx = canvas.getContext('2d')!

    const color = multiplier >= 2.0  ? '#00ff88'
                : multiplier >= 1.5  ? '#aaff44'
                : multiplier >= 1.0  ? '#ffdd00'
                : multiplier >= 0.5  ? '#ff8800'
                : '#ff2222'

    const label = multiplier >= 10 ? `×${multiplier}` : `×${multiplier.toFixed(1)}`
    ctx.font = 'bold 68px Arial Black, Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = color
    ctx.shadowBlur = 28
    ctx.fillStyle = color
    ctx.fillText(label, 128, 48)

    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.position.copy(position).add(new THREE.Vector3(0, 0.6 * scale, 0))
    this.sprite.scale.set(1.4 * scale, 0.525 * scale, 1)
    this.driftSpeed = 0.7 * scale
    scene.add(this.sprite)
  }

  update(dt: number): void {
    if (this.done) return
    this.elapsed += dt
    const t = this.elapsed / this.duration
    this.sprite.position.y += dt * this.driftSpeed
    const mat = this.sprite.material as THREE.SpriteMaterial
    // Hold full opacity for first 60%, then fade out
    mat.opacity = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4)
    if (t >= 1) {
      this.scene.remove(this.sprite)
      mat.map?.dispose()
      mat.dispose()
      this.done = true
    }
  }

  dispose(): void {
    if (this.done) return
    this.scene.remove(this.sprite)
    const mat = this.sprite.material as THREE.SpriteMaterial
    mat.map?.dispose()
    mat.dispose()
    this.done = true
  }
}

// ── Shrink aura (life-loss) ───────────────────────────────────────────────────
export class ShrinkAura {
  private ring: THREE.Mesh
  private scene: THREE.Scene
  private elapsed = 0
  private readonly duration = 1.5
  public done = false

  constructor(scene: THREE.Scene, origin: THREE.Vector3) {
    this.scene = scene
    const geo = new THREE.TorusGeometry(2.0, 0.07, 8, 32)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcc00ff, emissive: 0x9900cc, emissiveIntensity: 3,
      transparent: true, opacity: 0.9,
    })
    this.ring = new THREE.Mesh(geo, mat)
    this.ring.position.copy(origin)
    this.ring.rotation.x = Math.PI / 2
    this.scene.add(this.ring)
  }

  update(dt: number): void {
    if (this.done) return
    this.elapsed += dt
    const t = this.elapsed / this.duration
    // Contracts inward and brightens as it shrinks
    this.ring.scale.setScalar(Math.max(0.01, 1 - t))
    const mat = this.ring.material as THREE.MeshStandardMaterial
    mat.opacity = Math.max(0, 1 - t * 1.2)
    mat.emissiveIntensity = 3 + t * 6
    if (t >= 1) {
      this.scene.remove(this.ring)
      this.ring.geometry.dispose()
      mat.dispose()
      this.done = true
    }
  }

  dispose(): void {
    if (this.done) return
    this.scene.remove(this.ring)
    this.ring.geometry.dispose()
    ;(this.ring.material as THREE.MeshStandardMaterial).dispose()
    this.done = true
  }
}

// ── Shockwave ring ────────────────────────────────────────────────────────────
export class ShockwaveRing {
  private mesh: THREE.Mesh
  private scene: THREE.Scene
  private elapsed = 0
  private readonly duration = 0.55
  public done = false

  constructor(scene: THREE.Scene, origin: THREE.Vector3) {
    this.scene = scene
    const geo = new THREE.TorusGeometry(0.1, 0.06, 6, 24)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 1,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.copy(origin)
    this.mesh.position.y += 0.5
    this.mesh.rotation.x = Math.PI / 2
    this.scene.add(this.mesh)
  }

  update(dt: number): void {
    if (this.done) return
    this.elapsed += dt
    const t = this.elapsed / this.duration
    const scale = 1 + t * 6
    this.mesh.scale.setScalar(scale)
    ;(this.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - t)
    if (t >= 1) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      ;(this.mesh.material as THREE.MeshStandardMaterial).dispose()
      this.done = true
    }
  }
}
