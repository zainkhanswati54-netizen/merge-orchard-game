// ---------------------------------------------------------------------------
// SPECIAL POWERS SYSTEM
// ---------------------------------------------------------------------------
// Five purchasable/earnable powers. Each has a coin cost, cooldown, and
// an effect callback that the Game wires up.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';
import { spendCoins, getTotalCoins } from './coins.js';

export const POWER_DEFS = [
  {
    id: 'bomb',
    name: 'Bomb',
    emoji: '💣',
    desc: 'Destroys the 4 highest fruits in the jar.',
    cost: 80,
    cooldownMs: 0,
  },
  {
    id: 'freeze',
    name: 'Freeze',
    emoji: '❄️',
    desc: 'Stops all movement for 6 seconds.',
    cost: 60,
    cooldownMs: 0,
  },
  {
    id: 'magnet',
    name: 'Magnet',
    emoji: '🧲',
    desc: 'Pulls matching fruits together for 5 seconds.',
    cost: 70,
    cooldownMs: 0,
  },
  {
    id: 'lightning',
    name: 'Lightning',
    emoji: '⚡',
    desc: 'Instantly merges a random matching pair.',
    cost: 50,
    cooldownMs: 0,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    emoji: '🌈',
    desc: 'Next dropped fruit matches anything.',
    cost: 100,
    cooldownMs: 0,
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

export function buyPower(id) {
  const def = POWER_DEFS.find((p) => p.id === id);
  if (!def) return false;
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
