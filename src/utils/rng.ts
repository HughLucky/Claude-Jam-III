// Seeded pseudo-random number generator (mulberry32)
export class SeededRng {
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0
  }

  next(): number {
    this.seed |= 0
    this.seed = this.seed + 0x6d2b79f5 | 0
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}
