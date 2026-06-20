// ---------------------------------------------------------------------------
// XP & LEVELING
// ---------------------------------------------------------------------------
// XP is lifetime/cumulative (it persists across runs and never resets on
// Game Over) — it's the progression currency that unlocks new orchards, not
// a per-run score. Level is *derived* from total XP via a geometric curve
// rather than stored separately, so there's only ever one source of truth.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

let totalXP = loadTotalXP();
const listeners = [];

function loadTotalXP() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_XP);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

function saveTotalXP(value) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_XP, String(value));
  } catch (e) {
    /* ignore — XP just won't persist this session */
  }
}

// XP required to go from level N to level N+1. Grows geometrically so early
// levels click by quickly (satisfying early hooks) while later ones take
// real investment.
function xpRequiredForLevel(level) {
  return Math.round(CONFIG.XP_BASE_PER_LEVEL * Math.pow(CONFIG.XP_GROWTH_RATE, level - 1));
}

// Derives { level, xpIntoLevel, xpForNextLevel, progress01 } from a total XP
// value. O(level) but levels are small numbers in practice (geometric growth
// means even very large XP totals only need a few dozen iterations).
export function computeLevelInfo(xp) {
  let level = 1;
  let remaining = xp;
  let need = xpRequiredForLevel(level);
  while (remaining >= need) {
    remaining -= need;
    level++;
    need = xpRequiredForLevel(level);
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: need,
    progress01: need > 0 ? remaining / need : 0,
    totalXP: xp,
  };
}

export function getTotalXP() {
  return totalXP;
}

export function getLevelInfo() {
  return computeLevelInfo(totalXP);
}

// Adds XP (e.g. from a merge), persists it, and notifies listeners with
// both the before/after level info so callers can detect a level-up
// crossing (to trigger the flash) without recomputing anything themselves.
// Also returns { ...after, leveledUp } directly, for call sites that want
// to react synchronously (e.g. game.js spawning a "LEVEL UP!" floating text
// at the exact merge point) without subscribing a listener.
export function addXP(amount) {
  if (amount <= 0) {
    const info = computeLevelInfo(totalXP);
    return { ...info, leveledUp: false };
  }
  const before = computeLevelInfo(totalXP);
  totalXP += amount;
  saveTotalXP(totalXP);
  const after = computeLevelInfo(totalXP);
  const leveledUp = after.level > before.level;

  for (const fn of listeners) fn({ before, after, gained: amount, leveledUp });
  return { ...after, leveledUp };
}

// Lets UI code react live to XP changes (bar fill animation, level-up flash)
// without polling.
export function onXPChange(fn) {
  listeners.push(fn);
}
