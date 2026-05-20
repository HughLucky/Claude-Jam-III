export interface LeaderboardEntry {
  initials: string
  score: number
  level: number
  fake: boolean
}

const STORAGE_KEY = 'quackstack_leaderboard'

const FAKE_ENTRIES: LeaderboardEntry[] = [
  { initials: 'ACE', score: 48200, level: 50, fake: true },
  { initials: 'VIP', score: 31500, level: 47, fake: true },
  { initials: 'BIG', score: 24800, level: 44, fake: true },
  { initials: 'FAT', score: 18200, level: 39, fake: true },
  { initials: 'MAX', score: 14750, level: 35, fake: true },
  { initials: 'ROY', score: 11200, level: 31, fake: true },
  { initials: 'CAP', score:  8400, level: 28, fake: true },
  { initials: 'GLD', score:  5600, level: 25, fake: true },
  { initials: 'PRO', score:  3200, level: 23, fake: true },
]

export class Leaderboard {
  private entries: LeaderboardEntry[] = []

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const player: LeaderboardEntry[] = raw ? JSON.parse(raw) : []
      this.entries = this.merge(player)
    } catch {
      this.entries = [...FAKE_ENTRIES]
    }
  }

  private merge(playerEntries: LeaderboardEntry[]): LeaderboardEntry[] {
    const all = [...FAKE_ENTRIES, ...playerEntries]
    return all.sort((a, b) => b.score - a.score)
  }

  submit(initials: string, score: number, level: number): number {
    const entry: LeaderboardEntry = { initials: initials.toUpperCase().slice(0, 3), score, level, fake: false }
    const playerEntries = this.playerEntries()
    playerEntries.push(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playerEntries))
    this.entries = this.merge(playerEntries)
    return this.getRank(score)
  }

  getRank(score: number): number {
    return this.entries.filter(e => e.score > score).length + 1
  }

  getTop(n = 10): LeaderboardEntry[] {
    return this.entries.slice(0, n)
  }

  getPlayerBest(): LeaderboardEntry | null {
    const best = this.playerEntries().sort((a, b) => b.score - a.score)[0]
    return best ?? null
  }

  private playerEntries(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }
}
