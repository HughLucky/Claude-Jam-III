export type DifficultyTier = 'tutorial' | 'easy' | 'intermediate' | 'advanced' | 'hard' | 'final'

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
    case 'tutorial':
    case 'easy':         return 0.20
    case 'intermediate':
    case 'advanced':     return 0.16
    case 'hard':         return 0.12
    case 'final':        return 0.088
  }
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  // ── Tutorial 1–5 (1 floor, 25-33 tiles, 140-150s) ──────────────────────────
  { level:  1, tier: 'tutorial', timeLimit: 150, enemySpawns: spawns(0,1,0,0), enemySpeed: 0.5, floorCount: 1, tilesPerFloor: 25, seed: 1001, hexRadius: 0.20 },
  { level:  2, tier: 'tutorial', timeLimit: 148, enemySpawns: spawns(0,1,1,0), enemySpeed: 0.5, floorCount: 1, tilesPerFloor: 27, seed: 1002, hexRadius: 0.20 },
  { level:  3, tier: 'tutorial', timeLimit: 145, enemySpawns: spawns(1,1,0,0), enemySpeed: 0.6, floorCount: 1, tilesPerFloor: 29, seed: 1003, hexRadius: 0.20 },
  { level:  4, tier: 'tutorial', timeLimit: 143, enemySpawns: spawns(1,1,0,1), enemySpeed: 0.6, floorCount: 1, tilesPerFloor: 31, seed: 1004, hexRadius: 0.20 },
  { level:  5, tier: 'tutorial', timeLimit: 140, enemySpawns: spawns(1,1,1,0), enemySpeed: 0.7, floorCount: 1, tilesPerFloor: 33, seed: 1005, hexRadius: 0.20 },

  // ── Easy 6–20 (1 floor, 33-50 tiles, 133-160s) ──────────────────────────────
  { level:  6, tier: 'easy', timeLimit: 160, enemySpawns: spawns(1,1,1,0), enemySpeed: 0.7, floorCount: 1, tilesPerFloor: 33, seed: 1006, hexRadius: 0.20 },
  { level:  7, tier: 'easy', timeLimit: 158, enemySpawns: spawns(1,2,0,0), enemySpeed: 0.7, floorCount: 1, tilesPerFloor: 35, seed: 1007, hexRadius: 0.20 },
  { level:  8, tier: 'easy', timeLimit: 155, enemySpawns: spawns(1,2,1,0), enemySpeed: 0.8, floorCount: 1, tilesPerFloor: 37, seed: 1008, hexRadius: 0.20 },
  { level:  9, tier: 'easy', timeLimit: 153, enemySpawns: spawns(2,1,1,0), enemySpeed: 0.8, floorCount: 1, tilesPerFloor: 38, seed: 1009, hexRadius: 0.20 },
  { level: 10, tier: 'easy', timeLimit: 150, enemySpawns: spawns(2,2,0,0), enemySpeed: 0.9, floorCount: 1, tilesPerFloor: 40, seed: 1010, hexRadius: 0.20 },
  { level: 11, tier: 'easy', timeLimit: 150, enemySpawns: spawns(2,2,0,0), enemySpeed: 0.9, floorCount: 1, tilesPerFloor: 40, seed: 1011, hexRadius: 0.20 },
  { level: 12, tier: 'easy', timeLimit: 147, enemySpawns: spawns(2,2,1,0), enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1012, hexRadius: 0.20 },
  { level: 13, tier: 'easy', timeLimit: 145, enemySpawns: spawns(2,2,1,0), enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 42, seed: 1013, hexRadius: 0.20 },
  { level: 14, tier: 'easy', timeLimit: 143, enemySpawns: spawns(2,2,0,1), enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 44, seed: 1014, hexRadius: 0.20 },
  { level: 15, tier: 'easy', timeLimit: 142, enemySpawns: spawns(2,2,1,1), enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 44, seed: 1015, hexRadius: 0.20 },
  { level: 16, tier: 'easy', timeLimit: 140, enemySpawns: spawns(2,3,0,0), enemySpeed: 1.0, floorCount: 1, tilesPerFloor: 45, seed: 1016, hexRadius: 0.20 },
  { level: 17, tier: 'easy', timeLimit: 138, enemySpawns: spawns(2,3,1,0), enemySpeed: 1.1, floorCount: 1, tilesPerFloor: 46, seed: 1017, hexRadius: 0.20 },
  { level: 18, tier: 'easy', timeLimit: 136, enemySpawns: spawns(2,3,1,0), enemySpeed: 1.1, floorCount: 1, tilesPerFloor: 47, seed: 1018, hexRadius: 0.20 },
  { level: 19, tier: 'easy', timeLimit: 135, enemySpawns: spawns(2,3,1,1), enemySpeed: 1.1, floorCount: 1, tilesPerFloor: 48, seed: 1019, hexRadius: 0.20 },
  { level: 20, tier: 'easy', timeLimit: 133, enemySpawns: spawns(3,3,1,0), enemySpeed: 1.2, floorCount: 1, tilesPerFloor: 50, seed: 1020, hexRadius: 0.20 },

  // ── Intermediate 21–30 (2 floors, 35-50/floor, 175-200s) ──────────────────────
  { level: 21, tier: 'intermediate', timeLimit: 200, enemySpawns: spawns(1,1,1,0), enemySpeed: 1.2, floorCount: 2, tilesPerFloor: 35, seed: 1021, hexRadius: 0.16 },
  { level: 22, tier: 'intermediate', timeLimit: 195, enemySpawns: spawns(1,2,0,0), enemySpeed: 1.2, floorCount: 2, tilesPerFloor: 36, seed: 1022, hexRadius: 0.16 },
  { level: 23, tier: 'intermediate', timeLimit: 193, enemySpawns: spawns(1,2,1,0), enemySpeed: 1.3, floorCount: 2, tilesPerFloor: 38, seed: 1023, hexRadius: 0.16 },
  { level: 24, tier: 'intermediate', timeLimit: 190, enemySpawns: spawns(2,1,1,0), enemySpeed: 1.3, floorCount: 2, tilesPerFloor: 38, seed: 1024, hexRadius: 0.16 },
  { level: 25, tier: 'intermediate', timeLimit: 188, enemySpawns: spawns(2,2,1,0), enemySpeed: 1.3, floorCount: 2, tilesPerFloor: 40, seed: 1025, hexRadius: 0.16 },
  { level: 26, tier: 'intermediate', timeLimit: 185, enemySpawns: spawns(2,2,0,1), enemySpeed: 1.4, floorCount: 2, tilesPerFloor: 42, seed: 1026, hexRadius: 0.16 },
  { level: 27, tier: 'intermediate', timeLimit: 183, enemySpawns: spawns(2,2,1,0), enemySpeed: 1.4, floorCount: 2, tilesPerFloor: 44, seed: 1027, hexRadius: 0.16 },
  { level: 28, tier: 'intermediate', timeLimit: 180, enemySpawns: spawns(2,2,1,1), enemySpeed: 1.4, floorCount: 2, tilesPerFloor: 46, seed: 1028, hexRadius: 0.16 },
  { level: 29, tier: 'intermediate', timeLimit: 178, enemySpawns: spawns(2,3,0,1), enemySpeed: 1.5, floorCount: 2, tilesPerFloor: 48, seed: 1029, hexRadius: 0.16 },
  { level: 30, tier: 'intermediate', timeLimit: 175, enemySpawns: spawns(3,2,1,0), enemySpeed: 1.5, floorCount: 2, tilesPerFloor: 50, seed: 1030, hexRadius: 0.16 },

  // ── Advanced 31–39 (3 floors, 40-55/floor, 235-280s) ─────────────────────────
  { level: 31, tier: 'advanced', timeLimit: 280, enemySpawns: spawns(1,2,0,0), enemySpeed: 1.5, floorCount: 3, tilesPerFloor: 40, seed: 1031, hexRadius: 0.16 },
  { level: 32, tier: 'advanced', timeLimit: 270, enemySpawns: spawns(1,2,1,0), enemySpeed: 1.6, floorCount: 3, tilesPerFloor: 42, seed: 1032, hexRadius: 0.16 },
  { level: 33, tier: 'advanced', timeLimit: 265, enemySpawns: spawns(2,2,0,0), enemySpeed: 1.6, floorCount: 3, tilesPerFloor: 44, seed: 1033, hexRadius: 0.16 },
  { level: 34, tier: 'advanced', timeLimit: 260, enemySpawns: spawns(2,2,0,1), enemySpeed: 1.6, floorCount: 3, tilesPerFloor: 45, seed: 1034, hexRadius: 0.16 },
  { level: 35, tier: 'advanced', timeLimit: 255, enemySpawns: spawns(2,2,1,0), enemySpeed: 1.7, floorCount: 3, tilesPerFloor: 47, seed: 1035, hexRadius: 0.16 },
  { level: 36, tier: 'advanced', timeLimit: 250, enemySpawns: spawns(2,2,1,1), enemySpeed: 1.7, floorCount: 3, tilesPerFloor: 49, seed: 1036, hexRadius: 0.16 },
  { level: 37, tier: 'advanced', timeLimit: 245, enemySpawns: spawns(2,3,1,0), enemySpeed: 1.7, floorCount: 3, tilesPerFloor: 50, seed: 1037, hexRadius: 0.16 },
  { level: 38, tier: 'advanced', timeLimit: 240, enemySpawns: spawns(2,3,0,1), enemySpeed: 1.8, floorCount: 3, tilesPerFloor: 52, seed: 1038, hexRadius: 0.16 },
  { level: 39, tier: 'advanced', timeLimit: 235, enemySpawns: spawns(3,2,1,0), enemySpeed: 1.8, floorCount: 3, tilesPerFloor: 55, seed: 1039, hexRadius: 0.16 },

  // ── Hard 40–49 (3 floors, 45-66/floor, 205-250s) ─────────────────────────────
  { level: 40, tier: 'hard', timeLimit: 250, enemySpawns: spawns(2,2,1,1), enemySpeed: 1.8, floorCount: 3, tilesPerFloor: 45, seed: 1040, hexRadius: 0.12 },
  { level: 41, tier: 'hard', timeLimit: 242, enemySpawns: spawns(2,2,2,0), enemySpeed: 1.9, floorCount: 3, tilesPerFloor: 48, seed: 1041, hexRadius: 0.12 },
  { level: 42, tier: 'hard', timeLimit: 238, enemySpawns: spawns(3,2,1,0), enemySpeed: 1.9, floorCount: 3, tilesPerFloor: 50, seed: 1042, hexRadius: 0.12 },
  { level: 43, tier: 'hard', timeLimit: 233, enemySpawns: spawns(3,2,1,1), enemySpeed: 1.9, floorCount: 3, tilesPerFloor: 52, seed: 1043, hexRadius: 0.12 },
  { level: 44, tier: 'hard', timeLimit: 228, enemySpawns: spawns(3,2,1,1), enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 55, seed: 1044, hexRadius: 0.12 },
  { level: 45, tier: 'hard', timeLimit: 225, enemySpawns: spawns(3,3,1,0), enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 57, seed: 1045, hexRadius: 0.12 },
  { level: 46, tier: 'hard', timeLimit: 220, enemySpawns: spawns(3,3,1,1), enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 59, seed: 1046, hexRadius: 0.12 },
  { level: 47, tier: 'hard', timeLimit: 215, enemySpawns: spawns(3,3,2,0,1), enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 62, seed: 1047, hexRadius: 0.12 },
  { level: 48, tier: 'hard', timeLimit: 210, enemySpawns: spawns(3,3,2,1,1), enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 64, seed: 1048, hexRadius: 0.12 },
  { level: 49, tier: 'hard', timeLimit: 205, enemySpawns: spawns(4,3,1,1,2), enemySpeed: 2.0, floorCount: 3, tilesPerFloor: 66, seed: 1049, hexRadius: 0.12 },

  // ── Final 50 (4 floors, 60/floor, 320s) ──────────────────────────────────────
  { level: 50, tier: 'final', timeLimit: 320, enemySpawns: spawns(2,3,2,1,2,1), enemySpeed: 2.0, floorCount: 4, tilesPerFloor: 60, seed: 1050, hexRadius: 0.088 },
]

export function getLevelConfig(level: number): LevelConfig {
  return LEVEL_CONFIGS[level - 1] ?? LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1]
}

export function tierLabel(tier: DifficultyTier): string {
  const map: Record<DifficultyTier, string> = {
    tutorial:     'Tutorial',
    easy:         'Easy',
    intermediate: 'Intermediate',
    advanced:     'Advanced',
    hard:         'Hard',
    final:        'FINAL BOSS',
  }
  return map[tier]
}
