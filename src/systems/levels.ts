export type DifficultyTier = 'tutorial' | 'easy' | 'medium' | 'hard' | 'final'

export interface EnemySpawn {
  type: 'chaser' | 'bouncer' | 'eraser' | 'lateral' | 'stalker' | 'boss'
  count: number
}

export interface LevelConfig {
  level: number
  tier: DifficultyTier
  timeLimit: number
  enemySpawns: EnemySpawn[]
  enemySpeed: number
  floorCount: number
  tilesPerFloor: number
  seed: number
  hexRadius: number
}

function spawns(chaser: number, bouncer: number, eraser: number, lateral: number, stalker = 0, boss = 0): EnemySpawn[] {
  return [
    { type: 'chaser',  count: chaser  },
    { type: 'bouncer', count: bouncer },
    { type: 'eraser',  count: eraser  },
    { type: 'lateral', count: lateral },
    { type: 'stalker', count: stalker },
    { type: 'boss',    count: boss    },
  ]
}

export function getTileRadius(tier: DifficultyTier): number {
  switch (tier) {
    case 'tutorial': return 0.20
    case 'easy':     return 0.17
    case 'medium':   return 0.14
    case 'hard':     return 0.11
    case 'final':    return 0.088
  }
}

// tilesPerFloor is FIXED per tier so fitCamera always produces the same frustum,
// giving identical visual tile size for every level within a tier.
// Difficulty within a tier scales via enemy count, speed, and floor count.

export const LEVEL_CONFIGS: LevelConfig[] = [
  // ── Tutorial 1–5 · 1 floor · 25 tiles · hexRadius 0.20 ───────────────────────
  { level:  1, tier: 'tutorial', timeLimit: 150, enemySpawns: spawns(0,1,0,0),     enemySpeed: 0.5, floorCount: 1, tilesPerFloor: 25, seed: 1001, hexRadius: 0.20 },
  { level:  2, tier: 'tutorial', timeLimit: 148, enemySpawns: spawns(0,1,1,0),     enemySpeed: 0.5, floorCount: 1, tilesPerFloor: 25, seed: 1002, hexRadius: 0.20 },
  { level:  3, tier: 'tutorial', timeLimit: 145, enemySpawns: spawns(1,1,0,0),     enemySpeed: 0.6, floorCount: 1, tilesPerFloor: 25, seed: 1003, hexRadius: 0.20 },
  { level:  4, tier: 'tutorial', timeLimit: 143, enemySpawns: spawns(1,1,0,1),     enemySpeed: 0.6, floorCount: 1, tilesPerFloor: 25, seed: 1004, hexRadius: 0.20 },
  { level:  5, tier: 'tutorial', timeLimit: 140, enemySpawns: spawns(1,1,1,1),     enemySpeed: 0.7, floorCount: 1, tilesPerFloor: 25, seed: 1005, hexRadius: 0.20 },

  // ── Easy 6–20 · 1 floor · 42 tiles · hexRadius 0.17 ──────────────────────────
  { level:  6, tier: 'easy', timeLimit: 160, enemySpawns: spawns(1,1,0,0),     enemySpeed: 0.7, floorCount: 1, tilesPerFloor: 42, seed: 1006, hexRadius: 0.17 },
  { level:  7, tier: 'easy', timeLimit: 158, enemySpawns: spawns(1,1,1,0),     enemySpeed: 0.7, floorCount: 1, tilesPerFloor: 42, seed: 1007, hexRadius: 0.17 },
  { level:  8, tier: 'easy', timeLimit: 155, enemySpawns: spawns(1,2,0,0),     enemySpeed: 0.8, floorCount: 1, tilesPerFloor: 42, seed: 1008, hexRadius: 0.17 },
  { level:  9, tier: 'easy', timeLimit: 153, enemySpawns: spawns(1,2,1,0),     enemySpeed: 0.8, floorCount: 1, tilesPerFloor: 42, seed: 1009, hexRadius: 0.17 },
  { level: 10, tier: 'easy', timeLimit: 150, enemySpawns: spawns(2,1,1,0),     enemySpeed: 0.9, floorCount: 1, tilesPerFloor: 42, seed: 1010, hexRadius: 0.17 },
  { level: 11, tier: 'easy', timeLimit: 150, enemySpawns: spawns(2,2,0,0),     enemySpeed: 0.9, floorCount: 1, tilesPerFloor: 42, seed: 1011, hexRadius: 0.17 },
  { level: 12, tier: 'easy', timeLimit: 147, enemySpawns: spawns(2,2,1,0),     enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1012, hexRadius: 0.17 },
  { level: 13, tier: 'easy', timeLimit: 145, enemySpawns: spawns(2,2,0,1),     enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1013, hexRadius: 0.17 },
  { level: 14, tier: 'easy', timeLimit: 143, enemySpawns: spawns(2,2,1,1),     enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1014, hexRadius: 0.17 },
  { level: 15, tier: 'easy', timeLimit: 142, enemySpawns: spawns(2,2,1,1),     enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1015, hexRadius: 0.17 },
  { level: 16, tier: 'easy', timeLimit: 140, enemySpawns: spawns(2,3,0,0),     enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1016, hexRadius: 0.17 },
  { level: 17, tier: 'easy', timeLimit: 138, enemySpawns: spawns(2,3,1,0),     enemySpeed: 1.1, floorCount: 1, tilesPerFloor: 42, seed: 1017, hexRadius: 0.17 },
  { level: 18, tier: 'easy', timeLimit: 136, enemySpawns: spawns(3,2,1,0),     enemySpeed: 1.1, floorCount: 1, tilesPerFloor: 42, seed: 1018, hexRadius: 0.17 },
  { level: 19, tier: 'easy', timeLimit: 135, enemySpawns: spawns(3,3,1,0),     enemySpeed: 1.1, floorCount: 1, tilesPerFloor: 42, seed: 1019, hexRadius: 0.17 },
  { level: 20, tier: 'easy', timeLimit: 133, enemySpawns: spawns(3,3,1,1),     enemySpeed: 1.2, floorCount: 1, tilesPerFloor: 42, seed: 1020, hexRadius: 0.17 },

  // ── Medium 21–35 · 2 floors · 55 tiles · hexRadius 0.14 ──────────────────────
  { level: 21, tier: 'medium', timeLimit: 200, enemySpawns: spawns(1,1,1,0),   enemySpeed: 1.2, floorCount: 2, tilesPerFloor: 55, seed: 1021, hexRadius: 0.14 },
  { level: 22, tier: 'medium', timeLimit: 195, enemySpawns: spawns(1,2,0,0),   enemySpeed: 1.2, floorCount: 2, tilesPerFloor: 55, seed: 1022, hexRadius: 0.14 },
  { level: 23, tier: 'medium', timeLimit: 193, enemySpawns: spawns(1,2,1,0),   enemySpeed: 1.3, floorCount: 2, tilesPerFloor: 55, seed: 1023, hexRadius: 0.14 },
  { level: 24, tier: 'medium', timeLimit: 190, enemySpawns: spawns(2,1,1,0),   enemySpeed: 1.3, floorCount: 2, tilesPerFloor: 55, seed: 1024, hexRadius: 0.14 },
  { level: 25, tier: 'medium', timeLimit: 188, enemySpawns: spawns(2,2,0,1),   enemySpeed: 1.3, floorCount: 2, tilesPerFloor: 55, seed: 1025, hexRadius: 0.14 },
  { level: 26, tier: 'medium', timeLimit: 185, enemySpawns: spawns(2,2,1,0),   enemySpeed: 1.4, floorCount: 2, tilesPerFloor: 55, seed: 1026, hexRadius: 0.14 },
  { level: 27, tier: 'medium', timeLimit: 183, enemySpawns: spawns(2,2,1,1),   enemySpeed: 1.4, floorCount: 2, tilesPerFloor: 55, seed: 1027, hexRadius: 0.14 },
  { level: 28, tier: 'medium', timeLimit: 180, enemySpawns: spawns(2,3,0,1),   enemySpeed: 1.4, floorCount: 2, tilesPerFloor: 55, seed: 1028, hexRadius: 0.14 },
  { level: 29, tier: 'medium', timeLimit: 178, enemySpawns: spawns(3,2,1,0),   enemySpeed: 1.5, floorCount: 2, tilesPerFloor: 55, seed: 1029, hexRadius: 0.14 },
  { level: 30, tier: 'medium', timeLimit: 175, enemySpawns: spawns(3,2,1,1),   enemySpeed: 1.5, floorCount: 2, tilesPerFloor: 55, seed: 1030, hexRadius: 0.14 },
  { level: 31, tier: 'medium', timeLimit: 230, enemySpawns: spawns(1,2,1,0),   enemySpeed: 1.5, floorCount: 3, tilesPerFloor: 55, seed: 1031, hexRadius: 0.14 },
  { level: 32, tier: 'medium', timeLimit: 225, enemySpawns: spawns(2,2,0,1),   enemySpeed: 1.6, floorCount: 3, tilesPerFloor: 55, seed: 1032, hexRadius: 0.14 },
  { level: 33, tier: 'medium', timeLimit: 220, enemySpawns: spawns(2,2,1,0),   enemySpeed: 1.6, floorCount: 3, tilesPerFloor: 55, seed: 1033, hexRadius: 0.14 },
  { level: 34, tier: 'medium', timeLimit: 215, enemySpawns: spawns(2,2,1,1),   enemySpeed: 1.6, floorCount: 3, tilesPerFloor: 55, seed: 1034, hexRadius: 0.14 },
  { level: 35, tier: 'medium', timeLimit: 210, enemySpawns: spawns(2,3,1,0),   enemySpeed: 1.7, floorCount: 3, tilesPerFloor: 55, seed: 1035, hexRadius: 0.14 },

  // ── Hard 36–49 · 3 floors · 65 tiles · hexRadius 0.11 ────────────────────────
  { level: 36, tier: 'hard', timeLimit: 275, enemySpawns: spawns(2,2,1,0),     enemySpeed: 1.7, floorCount: 3, tilesPerFloor: 65, seed: 1036, hexRadius: 0.11 },
  { level: 37, tier: 'hard', timeLimit: 268, enemySpawns: spawns(2,2,1,1),     enemySpeed: 1.7, floorCount: 3, tilesPerFloor: 65, seed: 1037, hexRadius: 0.11 },
  { level: 38, tier: 'hard', timeLimit: 262, enemySpawns: spawns(2,3,0,1),     enemySpeed: 1.8, floorCount: 3, tilesPerFloor: 65, seed: 1038, hexRadius: 0.11 },
  { level: 39, tier: 'hard', timeLimit: 257, enemySpawns: spawns(2,3,1,0),     enemySpeed: 1.8, floorCount: 3, tilesPerFloor: 65, seed: 1039, hexRadius: 0.11 },
  { level: 40, tier: 'hard', timeLimit: 252, enemySpawns: spawns(3,2,1,1),     enemySpeed: 1.8, floorCount: 3, tilesPerFloor: 65, seed: 1040, hexRadius: 0.11 },
  { level: 41, tier: 'hard', timeLimit: 245, enemySpawns: spawns(3,2,2,0),     enemySpeed: 1.9, floorCount: 3, tilesPerFloor: 65, seed: 1041, hexRadius: 0.11 },
  { level: 42, tier: 'hard', timeLimit: 240, enemySpawns: spawns(3,3,1,0),     enemySpeed: 1.9, floorCount: 3, tilesPerFloor: 65, seed: 1042, hexRadius: 0.11 },
  { level: 43, tier: 'hard', timeLimit: 235, enemySpawns: spawns(3,3,1,1),     enemySpeed: 1.9, floorCount: 3, tilesPerFloor: 65, seed: 1043, hexRadius: 0.11 },
  { level: 44, tier: 'hard', timeLimit: 230, enemySpawns: spawns(3,3,2,0,1),   enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 65, seed: 1044, hexRadius: 0.11 },
  { level: 45, tier: 'hard', timeLimit: 226, enemySpawns: spawns(3,3,2,1,1),   enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 65, seed: 1045, hexRadius: 0.11 },
  { level: 46, tier: 'hard', timeLimit: 222, enemySpawns: spawns(4,3,1,1,1),   enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 65, seed: 1046, hexRadius: 0.11 },
  { level: 47, tier: 'hard', timeLimit: 218, enemySpawns: spawns(4,3,2,0,1),   enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 65, seed: 1047, hexRadius: 0.11 },
  { level: 48, tier: 'hard', timeLimit: 213, enemySpawns: spawns(4,3,2,1,2),   enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 65, seed: 1048, hexRadius: 0.11 },
  { level: 49, tier: 'hard', timeLimit: 208, enemySpawns: spawns(4,4,2,1,2),   enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 65, seed: 1049, hexRadius: 0.11 },

  // ── Final 50 · 4 floors · 72 tiles · hexRadius 0.088 ─────────────────────────
  { level: 50, tier: 'final', timeLimit: 320, enemySpawns: spawns(2,3,2,1,2,1), enemySpeed: 2.0, floorCount: 4, tilesPerFloor: 72, seed: 1050, hexRadius: 0.088 },
]

export function getLevelConfig(level: number): LevelConfig {
  return LEVEL_CONFIGS[level - 1] ?? LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1]
}

export function tierLabel(tier: DifficultyTier): string {
  const map: Record<DifficultyTier, string> = {
    tutorial: 'Tutorial',
    easy:     'Easy',
    medium:   'Medium',
    hard:     'Hard',
    final:    'FINAL BOSS',
  }
  return map[tier]
}
