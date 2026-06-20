// All tunable game constants live here so balancing the feel of the game
// never requires touching gameplay logic elsewhere.
export const CONFIG = {
  // Logical play-field size (independent of actual screen pixels).
  BOX_WIDTH: 360,
  BOX_HEIGHT: 560,
  WALL_THICKNESS: 16,

  // Physics
  GRAVITY: 1.0,
  RESTITUTION: 0.22,       // bounciness
  FRICTION: 0.25,
  FRICTION_AIR: 0.0015,
  FRICTION_STATIC: 0.4,

  // Dropper
  DROPPER_Y: 38,
  DROPPER_MOVE_SPEED: 280, // px/sec for keyboard + on-screen buttons
  DROP_COOLDOWN_MS: 350,

  // Only these tier indices can be dropped by the player.
  // Higher tiers are earned exclusively through merging.
  DROPPABLE_TIER_INDICES: [0, 1, 2],

  // Danger / game-over line
  DANGER_LINE_Y: 92,
  DANGER_TIME_LIMIT_MS: 2000, // a fruit resting above the line this long ends the game
  DANGER_SETTLE_SPEED: 0.6, // bodies slower than this count as "stacked", not "flying through"
  DANGER_GRACE_MS: 450,     // ignore a body for this long after it spawns (lets it fall past the line)

  // Juice
  SCREEN_SHAKE_DROP: 2.5,
  SCREEN_SHAKE_BASE_MERGE: 4,
  SCREEN_SHAKE_PER_TIER: 3.6,
  SCREEN_SHAKE_BIG_MERGE_TIER: 3, // merges at/above this tier count as "massive" for shake+combo purposes
  POP_TWEEN_MS: 320,        // covers both the pop (scale) and squish (juicy stretch) tween

  // Landing squash — a brief squash-and-stretch the moment a dropped fruit
  // first hits something (floor, wall, or another fruit), separate from the
  // merge spawn pop above.
  LANDING_SQUASH_MS: 220,
  LANDING_MIN_IMPACT_SPEED: 1.8, // below this relative speed, don't bother squashing (too gentle to read)

  // Combo system — merges chained within this window of each other count as
  // one combo; each step bumps the multiplier and grows the on-screen text.
  COMBO_WINDOW_MS: 700,

  STORAGE_KEY_HIGHSCORE: 'suika_merge_high_score',
  STORAGE_KEY_SETTINGS: 'suika_merge_settings',
  STORAGE_KEY_LEADERBOARD: 'suika_merge_leaderboard',
  STORAGE_KEY_XP: 'suika_merge_xp',
  LEADERBOARD_SIZE: 5,

  // XP / leveling — requirement grows geometrically per level, see js/xp.js.
  XP_BASE_PER_LEVEL: 100,
  XP_GROWTH_RATE: 1.15,

  // Loading screen — a floor on how long it stays up, so it reads as a real
  // loading screen even when everything technically finishes loading instantly.
  MIN_LOADING_SCREEN_MS: 900,
};
