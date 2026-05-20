import { STARTING_BANKROLL } from '../constants'
import { HexBox } from '../engine/board'

export interface LevelResult {
  bet: number
  revealedMultipliers: number[]
  totalBoxes: number
  completed: boolean
  cashedOut: boolean
  payout: number
}

export class CasinoSystem {
  public bankroll: number
  public currentBet: number = 0
  public revealedMultipliers: number[] = []

  constructor() {
    this.bankroll = STARTING_BANKROLL
  }

  reset(): void {
    this.bankroll = STARTING_BANKROLL
    this.currentBet = 0
    this.revealedMultipliers = []
  }

  placeBet(amount: number): boolean {
    const min = Math.ceil(this.bankroll * 0.10)
    const max = Math.floor(this.bankroll * 0.50)
    if (amount < min || amount > max || amount > this.bankroll) return false
    this.currentBet = amount
    this.bankroll -= amount
    this.revealedMultipliers = []
    return true
  }

  revealBox(box: HexBox): number | null {
    if (box.multiplier === null) return null
    this.revealedMultipliers.push(box.multiplier)
    return box.multiplier
  }

  get runningAvgMultiplier(): number {
    if (this.revealedMultipliers.length === 0) return 1.0  // baseline when no specials found
    return this.revealedMultipliers.reduce((a, b) => a + b, 0) / this.revealedMultipliers.length
  }

  calculatePayout(_totalBoxes: number, completed: boolean): number {
    if (this.revealedMultipliers.length === 0) return 0
    const avg = this.runningAvgMultiplier
    const completionBonus = completed ? 2.0 : 1.0
    return Math.round(this.currentBet * avg * completionBonus)
  }

  completeLevelPayout(totalBoxes: number): LevelResult {
    const payout = this.calculatePayout(totalBoxes, true)
    this.bankroll += payout
    return {
      bet: this.currentBet,
      revealedMultipliers: [...this.revealedMultipliers],
      totalBoxes,
      completed: true,
      cashedOut: false,
      payout,
    }
  }

  // Safe zone: payout scales with elapsed time × avg multiplier, then resets the level
  safeZoneCashOut(elapsedTime: number, totalTime: number): number {
    const elapsedRatio = Math.min(1, elapsedTime / totalTime)
    const avg = this.revealedMultipliers.length > 0 ? this.runningAvgMultiplier : 0
    const payout = Math.round(this.currentBet * elapsedRatio * avg)
    this.bankroll += payout
    // Reset multiplier trail for the fresh attempt
    this.revealedMultipliers = []
    return payout
  }

  loseLevel(): void {
    // Bet already deducted on placeBet — nothing more to do
  }

  get isBankrupt(): boolean {
    return this.bankroll <= 0
  }

  get minBet(): number {
    return Math.ceil(this.bankroll * 0.10)
  }

  get maxBet(): number {
    return Math.floor(this.bankroll * 0.50)
  }
}
