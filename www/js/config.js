// All tunable game constants live here so balancing the feel of the game
// never requires touching gameplay logic elsewhere.
export const CONFIG = {
  // Logical play-field size (independent of actual screen pixels).
  BOX_WIDTH: 360,
  BOX_HEIGHT: 560,
  WALL_THICKNESS: 16,

  // Physics
  GRAVITY: 1.0,
  RESTITUTION: 0.22,
  FRICTION: 0.25,
  FRICTION_AIR: 0.0015,
  FRICTION_STATIC: 0.4,

  // Dropper
  DROPPER_Y: 38,
  DROPPER_MOVE_SPEED: 280,
  DROP_COOLDOWN_MS: 350,

  DROPPABLE_TIER_INDICES: [0, 1, 2],

  // Danger / game-over line
  DANGER_LINE_Y: 92,
  DANGER_TIME_LIMIT_MS: 2000,
  DANGER_SETTLE_SPEED: 0.6,
  DANGER_GRACE_MS: 450,

  // Risk/Reward zone — merges above this Y get a 2x bonus
  RISK_ZONE_Y: 180,

  // Juice
  SCREEN_SHAKE_DROP: 2.5,
  SCREEN_SHAKE_BASE_MERGE: 4,
  SCREEN_SHAKE_PER_TIER: 3.6,
  SCREEN_SHAKE_BIG_MERGE_TIER: 3,
  POP_TWEEN_MS: 320,

  LANDING_SQUASH_MS: 220,
  LANDING_MIN_IMPACT_SPEED: 1.8,

  // Combo system
  COMBO_WINDOW_MS: 700,
  COMBO_LEGENDARY_THRESHOLD: 10,

  // Fear escalation
  HEARTBEAT_INTERVAL_MAX_MS: 850,
  HEARTBEAT_INTERVAL_MIN_MS: 260,

  // Storage keys
  STORAGE_KEY_HIGHSCORE:      'suika_merge_high_score',
  STORAGE_KEY_SETTINGS:       'suika_merge_settings',
  STORAGE_KEY_LEADERBOARD:    'suika_merge_leaderboard',
  STORAGE_KEY_XP:             'suika_merge_xp',
  STORAGE_KEY_COINS:          'suika_merge_coins',
  STORAGE_KEY_STATS:          'suika_merge_stats',
  STORAGE_KEY_ACHIEVEMENTS:   'suika_merge_achievements',
  STORAGE_KEY_DAILY_MISSIONS: 'suika_merge_daily_missions',
  STORAGE_KEY_POWERS:         'suika_merge_powers',
  STORAGE_KEY_PEAK_Y:         'suika_merge_peak_y',
  LEADERBOARD_SIZE: 5,

  // XP / leveling
  XP_BASE_PER_LEVEL: 100,
  XP_GROWTH_RATE: 1.15,

  // Powers
  FREEZE_DURATION_MS: 6000,
  MAGNET_DURATION_MS: 5000,

  // Loading screen
  MIN_LOADING_SCREEN_MS: 200,
};
