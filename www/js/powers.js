// ---------------------------------------------------------------------------
// SPECIAL POWERS SYSTEM
// ---------------------------------------------------------------------------
// Four purchasable powers. Each has a coin cost, an XP-level requirement
// to unlock, and an effect callback that the Game wires up.
//
// These were previously cheap, level-gate-free, and strong enough that a
// player could buy Bomb early and use it to bail out of a near-loss stack
// indefinitely — which defeated the actual point of the danger line.
// Freeze added little (it only paused physics, no real skill use) and has
// been removed entirely. The remaining four are now: meaningfully weaker
// in effect, much more expensive in coins, and locked behind a player
// level — so a power is something you earn through real progress, not a
// way to skip the challenge from the very first chapter.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';
import { spendCoins, getTotalCoins } from './coins.js';
import { getLevelInfo } from './xp.js';

export const POWER_DEFS = [
  {
    id: 'lightning',
    name: 'Lightning',
    desc: 'Instantly merges a random matching pair.',
    cost: 220,
    unlockLevel: 5,
  },
  {
    id: 'magnet',
    name: 'Magnet',
    desc: 'Gently pulls matching fruits together for 3 seconds.',
    cost: 320,
    unlockLevel: 8,
    durationMs: 3000,   // was 5000 — shorter, weaker pull
    pullForce: 0.00035, // was 0.0006 — noticeably gentler
  },
  {
    id: 'bomb',
    name: 'Bomb',
    desc: 'Destroys the 2 highest fruits in the jar.',
    cost: 450,
    unlockLevel: 12,
    clearCount: 2, // was 4 — half the old clearing power
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    desc: 'Next dropped fruit matches anything.',
    cost: 600,
    unlockLevel: 16,
  },
];

// Persistent power inventory stored in localStorage
let inventory = _loadInventory();

function _loadInventory() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_POWERS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function _saveInventory() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_POWERS, JSON.stringify(inventory));
  } catch (e) {/* ignore */}
}

export function getPowerCount(id) {
  return inventory[id] || 0;
}

export function addPower(id, count = 1) {
  inventory[id] = (inventory[id] || 0) + count;
  _saveInventory();
}

// A power is unlocked once the player's XP level reaches its requirement.
// This is the "achieve it" gate — coins alone are no longer enough.
export function isPowerUnlocked(id) {
  const def = POWER_DEFS.find((p) => p.id === id);
  if (!def) return false;
  return getLevelInfo().level >= def.unlockLevel;
}

export function buyPower(id) {
  const def = POWER_DEFS.find((p) => p.id === id);
  if (!def) return false;
  if (!isPowerUnlocked(id)) return false;
  if (getTotalCoins() < def.cost) return false;
  if (!spendCoins(def.cost)) return false;
  addPower(id);
  return true;
}

export function usePower(id) {
  if (!inventory[id] || inventory[id] <= 0) return false;
  inventory[id]--;
  _saveInventory();
  return true;
}
