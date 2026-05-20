export const COLORS = {
  bg: 0x0a0012,
  boxDefault: 0x1a0535,
  boxHighlighted: 0x00ff88,
  boxSafeZone: 0xffd700,
  boxHover: 0x4400aa,
  boxEdge: 0x6600cc,
  playerLight: 0xffd700,
  ambientLight: 0x221133,
  neonPurple: 0xcc00ff,
  neonGold: 0xffd700,
  neonGreen: 0x00ff88,
  neonPink: 0xff0088,
}

export const HEX_RADIUS = 0.4
export const HEX_HEIGHT = 0.2
export const HEX_GAP = 0.10
export const PYRAMID_ROWS = 6

export const GAME_ASPECT = 16 / 9

export const MULTIPLIER_TABLE: { value: number; weight: number }[] = [
  { value: 0.2, weight: 10 },
  { value: 0.5, weight: 20 },
  { value: 0.8, weight: 22 },
  { value: 1.0, weight: 18 },
  { value: 1.5, weight: 12 },
  { value: 2.0, weight: 9  },
  { value: 5.0, weight: 6  },
  { value: 10.0, weight: 2 },
  { value: 25.0, weight: 1 },
]

export const STARTING_BANKROLL = 1000
