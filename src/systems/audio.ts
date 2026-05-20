const BASE = '/assets/audio/'

class AudioManager {
  private sfxMap = new Map<string, HTMLAudioElement>()
  private loopTracks: HTMLAudioElement[] = []
  private finalTrack: HTMLAudioElement | null = null
  private currentBgm: HTMLAudioElement | null = null
  private loopOrder: number[] = []
  private loopPos = 0
  private multiplierToggle = false

  async preload(): Promise<void> {
    const load = (src: string) => {
      const el = new Audio(BASE + src)
      el.preload = 'auto'
      return el
    }

    const entries: [string, string][] = [
      ['intro',        'Intro.wav'],
      ['accept',       'Accept.wav'],
      ['jump',         'jump.wav'],
      ['lifeLost',     'life-1.wav'],
      ['gameOver',     'game-over.wav'],
      ['levelComplete','levelComplete.wav'],
      ['multiplier01', 'multiplier01.wav'],
      ['multiplier02', 'multiplier02.wav'],
      ['bigMultiplier','bigMultiplier.wav'],
      ['finalboss',    'finalboss.wav'],
    ]
    for (const [key, file] of entries) this.sfxMap.set(key, load(file))

    for (let i = 1; i <= 8; i++) {
      this.loopTracks.push(load(`gamePlay_loop-0${i}.wav`))
    }
    this.finalTrack = load('finalLevel_loop.wav')
    this.finalTrack.loop = true
  }

  // ── BGM ───────────────────────────────────────────────────────────────────

  playIntro(): void {
    this.stopBgm()
    const intro = this.sfxMap.get('intro')!
    intro.loop = true
    intro.volume = 0.7
    intro.currentTime = 0
    this.currentBgm = intro

    const attempt = intro.play()
    if (attempt) {
      attempt.catch(() => {
        // Autoplay blocked — resume on first user gesture
        const resume = () => {
          if (this.currentBgm === intro) intro.play().catch(() => {})
          document.removeEventListener('click', resume)
          document.removeEventListener('keydown', resume)
          document.removeEventListener('touchstart', resume)
        }
        document.addEventListener('click', resume, { once: true })
        document.addEventListener('keydown', resume, { once: true })
        document.addEventListener('touchstart', resume, { once: true })
      })
    }
  }

  playGameplayBgm(isFinalLevel: boolean): void {
    this.stopBgm()
    if (isFinalLevel) {
      const ft = this.finalTrack!
      ft.volume = 0.7
      ft.currentTime = 0
      ft.play().catch(() => {})
      this.currentBgm = ft
    } else {
      this.loopOrder = this.shuffled(8, -1)
      this.loopPos = 0
      this.advanceLoop()
    }
  }

  stopBgm(): void {
    if (this.currentBgm) {
      this.currentBgm.pause()
      this.currentBgm.onended = null
      this.currentBgm = null
    }
  }

  private advanceLoop(): void {
    if (this.loopPos >= this.loopOrder.length) {
      const last = this.loopOrder[this.loopOrder.length - 1]
      this.loopOrder = this.shuffled(8, last)
      this.loopPos = 0
    }
    const track = this.loopTracks[this.loopOrder[this.loopPos++]]
    track.volume = 0.7
    track.currentTime = 0
    track.onended = () => this.advanceLoop()
    track.play().catch(() => {})
    this.currentBgm = track
  }

  private shuffled(count: number, avoid: number): number[] {
    const arr = Array.from({ length: count }, (_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    if (arr[0] === avoid && arr.length > 1) [arr[0], arr[1]] = [arr[1], arr[0]]
    return arr
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  private playSfx(key: string): void {
    const src = this.sfxMap.get(key)
    if (!src) return
    const clone = src.cloneNode() as HTMLAudioElement
    clone.play().catch(() => {})
  }

  playAccept():       void { this.playSfx('accept') }
  playJump():         void { this.playSfx('jump') }
  playLifeLost():     void { this.playSfx('lifeLost') }
  playGameOver():     void { this.playSfx('gameOver') }
  playLevelComplete():void { this.playSfx('levelComplete') }
  playFinalBoss():    void { this.playSfx('finalboss') }

  playMultiplier(value: number): void {
    if (value >= 5) {
      this.playSfx('bigMultiplier')
    } else {
      this.multiplierToggle = !this.multiplierToggle
      this.playSfx(this.multiplierToggle ? 'multiplier01' : 'multiplier02')
    }
  }
}

export const audioManager = new AudioManager()
