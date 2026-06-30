// All tunable game constants live here so balancing the feel of the game
// never requires touching gameplay logic elsewhere.
export const CONFIG = {
  // Logical play-field size (independent of actual screen pixels).
  BOX_WIDTH: 360,
  BOX_HEIGHT: 560,
  WALL_THICKNESS: 16,

  // Physics — increased gravity for faster, more chaotic stacking.
  // Bumped further (1.4 -> 1.55): fruit settles a bit heavier/faster,
  // leaving less time to react to a messy drop.
  GRAVITY: 1.55,
  RESTITUTION: 0.18,
  FRICTION: 0.3,
  FRICTION_AIR: 0.001,
  FRICTION_STATIC: 0.5,

  // Dropper — slightly slower move speed, longer cooldown = harder to aim.
  // Cooldown raised slightly (500 -> 560ms) so drops are a bit more
  // deliberate and spam-dropping is less effective.
  DROPPER_Y: 38,
  DROPPER_MOVE_SPEED: 220,
  DROP_COOLDOWN_MS: 560,

  // Drop bigger fruits more often — tiers 0,1,2,3 now possible
  DROPPABLE_TIER_INDICES: [0, 1, 2, 3],

  // Danger / game-over line — shorter grace period = harder.
  // DANGER_TIME_LIMIT_MS lowered (1500 -> 1200ms): a messy stack near the
  // top now busts about 20% faster, punishing careless play more while
  // still leaving a real window to recover.
  DANGER_LINE_Y: 92,
  DANGER_TIME_LIMIT_MS: 1200,
  DANGER_SETTLE_SPEED: 0.6,
  DANGER_GRACE_MS: 300,

  // Approach zone — ambient tension (visual glow + heartbeat) starts
  // building once the stack's peak rises into this band ABOVE the danger
  // line, well before anything actually settles there. This gives the
  // player real advance warning ("uh oh, getting close") instead of the
  // alarm only firing after a fruit has already parked on the line.
  APPROACH_ZONE_Y: 70,

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

  // Combo system — tighter window makes combos harder.
  // Lowered 550 -> 480ms: chaining merges back-to-back now demands
  // noticeably better setup and timing to keep a combo alive.
  COMBO_WINDOW_MS: 480,
  COMBO_LEGENDARY_THRESHOLD: 10,

  // Fear escalation — heartbeat kicks in faster
  HEARTBEAT_INTERVAL_MAX_MS: 700,
  HEARTBEAT_INTERVAL_MIN_MS: 220,

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

  // Powers — these are fallback defaults; POWER_DEFS in powers.js holds
  // the authoritative per-power values (and is what's actually used).
  MAGNET_DURATION_MS: 3000,

  // Loading screen
  MIN_LOADING_SCREEN_MS: 200,
};
